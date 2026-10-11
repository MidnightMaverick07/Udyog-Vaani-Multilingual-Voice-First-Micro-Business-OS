"""Underwriting router - lender dashboard, audit chain verification, financial reports."""

from fastapi import APIRouter, Query
from database.db import get_db_connection
from services.underwriting import get_audit_chain, verify_chain_integrity
from models.schemas import UnderwritingReport
import json

router = APIRouter()


@router.get("/report/{merchant_id}", response_model=UnderwritingReport)
async def get_underwriting_report(merchant_id: str):
    """
    Generate a comprehensive underwriting report for a merchant.
    Includes chain integrity verification, financial summary, and all receipts.
    """
    # Financial summary
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """SELECT
             SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as total_revenue,
             SUM(CASE WHEN transaction_type IN ('DEBIT','EXPENSE','INVENTORY_PURCHASE') THEN amount ELSE 0 END) as total_expenses,
             COUNT(*) as record_count
           FROM ledger_entries WHERE merchant_id = ?""",
        (merchant_id,),
    )
    fin = cursor.fetchone()

    # All receipts
    cursor.execute(
        "SELECT * FROM receipts WHERE merchant_id = ? ORDER BY uploaded_at DESC",
        (merchant_id,),
    )
    receipts_raw = cursor.fetchall()
    conn.close()

    receipts = []
    for r in receipts_raw:
        d = dict(r)
        if d.get("extracted_data"):
            try:
                d["extracted_data"] = json.loads(d["extracted_data"])
            except Exception:
                pass
        receipts.append(d)

    # Verify chain integrity
    integrity = verify_chain_integrity(merchant_id)
    audit_chain = get_audit_chain(merchant_id, limit=100)

    return UnderwritingReport(
        merchant_id=merchant_id,
        chain_valid=integrity["valid"],
        verification_message=integrity["message"],
        total_revenue=fin["total_revenue"] or 0,
        total_expenses=fin["total_expenses"] or 0,
        record_count=fin["record_count"] or 0,
        audit_chain=audit_chain,
        receipts=receipts,
    )


@router.get("/audit-chain/{merchant_id}")
async def get_full_audit_chain(merchant_id: str, limit: int = Query(default=100)):
    """Return the full tamper-evident audit chain for a merchant."""
    chain = get_audit_chain(merchant_id, limit)
    integrity = verify_chain_integrity(merchant_id)
    return {
        "merchant_id": merchant_id,
        "chain": chain,
        "integrity": integrity,
        "total_records": len(chain),
    }


@router.get("/verify/{merchant_id}")
async def verify_merchant_chain(merchant_id: str):
    """Quick integrity check for a merchant's audit chain."""
    return verify_chain_integrity(merchant_id)
