"""
Receipts router - handles bill/invoice photo upload, OCR extraction,
and reconciliation against voice ledger entries.
"""

import uuid
import os
import base64
import json
import re
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from database.db import get_db_connection
from services.underwriting import compute_sha256, anchor_record
from models.schemas import ReceiptUploadResponse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_raw_upload = os.getenv("UPLOAD_DIR", "./uploads")
if not os.path.isabs(_raw_upload):
    UPLOAD_DIR = os.path.normpath(os.path.join(BASE_DIR, _raw_upload))
else:
    UPLOAD_DIR = _raw_upload
router = APIRouter()

def extract_receipt_with_gemini_vision(image_bytes: bytes, image_path: str) -> dict:
    """
    Use Google's Gemini Vision via direct API call to extract receipt data.
    This is the vision component (Sarvam Vision is used when available).
    Falls back to a simulated extraction for demo purposes.
    """
    try:
        import httpx
        # Try Gemini Vision API
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            image_b64 = base64.b64encode(image_bytes).decode()
            prompt = """Analyze this receipt/invoice image and extract the following in JSON format:
{
  "vendor_name": "store or vendor name",
  "bill_date": "date of the bill (YYYY-MM-DD format)",
  "line_items": [{"item": "name", "quantity": 1, "unit_price": 0, "total": 0}],
  "subtotal": 0,
  "tax": 0,
  "total_amount": 0,
  "currency": "INR",
  "invoice_number": "if visible"
}
Return ONLY valid JSON, no other text."""
            # Gemini API call
            response = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                json={
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
                        ]
                    }]
                },
                timeout=30.0,
            )
            if response.status_code == 200:
                result = response.json()
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
    except Exception:
        pass

    # Demo fallback - simulate extraction
    return {
        "vendor_name": "Local Supplier",
        "bill_date": datetime.now().strftime("%Y-%m-%d"),
        "line_items": [
            {"item": "Rice (5kg)", "quantity": 5, "unit_price": 50, "total": 250},
            {"item": "Cooking Oil (1L)", "quantity": 2, "unit_price": 120, "total": 240},
        ],
        "subtotal": 490,
        "tax": 0,
        "total_amount": 490,
        "currency": "INR",
        "invoice_number": "N/A",
        "note": "Demo extraction - add GEMINI_API_KEY for real OCR",
    }


def reconcile_with_ledger(merchant_id: str, extracted_total: float, bill_date: str) -> dict:
    """
    Try to match the receipt against recent ledger entries.
    Returns reconciliation status.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find ledger entries with similar amounts within 10% tolerance
    tolerance = extracted_total * 0.1
    cursor.execute(
        """SELECT * FROM ledger_entries
           WHERE merchant_id = ?
             AND transaction_type IN ('DEBIT', 'EXPENSE', 'INVENTORY_PURCHASE')
             AND ABS(amount - ?) <= ?
             AND DATE(timestamp) >= DATE(?, '-3 days')
           ORDER BY ABS(amount - ?) ASC
           LIMIT 3""",
        (merchant_id, extracted_total, tolerance, bill_date, extracted_total),
    )
    matches = cursor.fetchall()
    conn.close()

    if matches:
        best_match = dict(matches[0])
        amount_diff = abs(best_match["amount"] - extracted_total)
        return {
            "status": "matched",
            "matched_entry_id": best_match["id"],
            "matched_amount": best_match["amount"],
            "receipt_amount": extracted_total,
            "discrepancy": amount_diff,
            "discrepancy_pct": round((amount_diff / extracted_total) * 100, 1) if extracted_total > 0 else 0,
            "message": "✅ Receipt matches a ledger entry" if amount_diff < 1 else f"⚠️ Minor discrepancy of ₹{amount_diff:.2f}",
        }

    return {
        "status": "unmatched",
        "matched_entry_id": None,
        "matched_amount": None,
        "receipt_amount": extracted_total,
        "discrepancy": extracted_total,
        "discrepancy_pct": 100,
        "message": "⚠️ No matching ledger entry found. Please add this expense via voice.",
    }


@router.post("/upload", response_model=ReceiptUploadResponse)
async def upload_receipt(
    image: UploadFile = File(...),
    merchant_id: str = Form(default="merchant_001"),
):
    """
    Upload a receipt/bill photo:
    1. Compute SHA-256 hash of raw image
    2. Extract data via Vision OCR
    3. Compute hash of extracted data
    4. Reconcile against ledger
    5. Anchor to audit log
    """
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    # Save image
    receipt_id = str(uuid.uuid4())
    ext = image.filename.split(".")[-1] if "." in (image.filename or "") else "jpg"
    image_filename = f"{receipt_id}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    image_path = os.path.join(UPLOAD_DIR, image_filename)

    with open(image_path, "wb") as f:
        f.write(image_bytes)

    # Hash the raw image
    image_hash = compute_sha256(image_bytes)

    # Extract receipt data
    extracted_data = extract_receipt_with_gemini_vision(image_bytes, image_path)
    extraction_hash = compute_sha256(json.dumps(extracted_data, sort_keys=True))

    total_amount = float(extracted_data.get("total_amount") or 0)
    bill_date = extracted_data.get("bill_date") or datetime.now().strftime("%Y-%m-%d")
    vendor_name = extracted_data.get("vendor_name", "Unknown")

    # Reconcile against ledger
    reconciliation = reconcile_with_ledger(merchant_id, total_amount, bill_date)

    # Anchor to audit log
    audit_data = {
        "receipt_id": receipt_id,
        "merchant_id": merchant_id,
        "image_hash": image_hash,
        "extraction_hash": extraction_hash,
        "total_amount": total_amount,
        "vendor_name": vendor_name,
        "bill_date": bill_date,
        "reconciliation_status": reconciliation["status"],
    }
    audit_anchor = anchor_record(merchant_id, "receipt", receipt_id, audit_data)

    # Persist to DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO receipts (id, merchant_id, image_path, image_hash, extracted_data,
           extraction_hash, vendor_name, total_amount, bill_date, reconciliation_status,
           matched_ledger_id, audit_anchor_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            receipt_id,
            merchant_id,
            image_path,
            image_hash,
            json.dumps(extracted_data),
            extraction_hash,
            vendor_name,
            total_amount,
            bill_date,
            reconciliation["status"],
            reconciliation.get("matched_entry_id"),
            audit_anchor["anchor_id"],
        ),
    )
    conn.commit()
    conn.close()

    return ReceiptUploadResponse(
        receipt_id=receipt_id,
        image_hash=image_hash,
        extracted_data=extracted_data,
        reconciliation=reconciliation,
        audit_anchor=audit_anchor,
    )


@router.get("/list")
async def list_receipts(merchant_id: str = "merchant_001"):
    """List all receipts for a merchant."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM receipts WHERE merchant_id = ? ORDER BY uploaded_at DESC",
        (merchant_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        if d.get("extracted_data"):
            d["extracted_data"] = json.loads(d["extracted_data"])
        results.append(d)
    return results


@router.get("/{receipt_id}/image")
async def get_receipt_image(receipt_id: str):
    """Return base64-encoded receipt image for display."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT image_path FROM receipts WHERE id = ?", (receipt_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found")

    image_path = row["image_path"]
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    return {"image_b64": base64.b64encode(image_bytes).decode(), "path": image_path}
