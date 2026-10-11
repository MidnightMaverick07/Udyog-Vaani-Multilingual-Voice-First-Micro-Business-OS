"""Ledger router - CRUD for financial ledger entries and summaries."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from database.db import get_db_connection
from models.schemas import LedgerEntry, LedgerEntryCreate, LedgerSummary

router = APIRouter()


@router.get("/entries")
async def get_ledger_entries(
    merchant_id: str = Query(default="merchant_001"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    transaction_type: Optional[str] = Query(default=None),
):
    """Get paginated ledger entries for a merchant."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if transaction_type:
        cursor.execute(
            """SELECT * FROM ledger_entries WHERE merchant_id = ? AND transaction_type = ?
               ORDER BY timestamp DESC LIMIT ? OFFSET ?""",
            (merchant_id, transaction_type, limit, offset),
        )
    else:
        cursor.execute(
            "SELECT * FROM ledger_entries WHERE merchant_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            (merchant_id, limit, offset),
        )

    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/summary")
async def get_ledger_summary(merchant_id: str = Query(default="merchant_001")) -> LedgerSummary:
    """Get financial summary for a merchant."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """SELECT
             SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as total_credit,
             SUM(CASE WHEN transaction_type IN ('DEBIT','EXPENSE','INVENTORY_PURCHASE') THEN amount ELSE 0 END) as total_debit,
             COUNT(*) as entry_count
           FROM ledger_entries WHERE merchant_id = ?""",
        (merchant_id,),
    )
    row = cursor.fetchone()
    conn.close()

    total_credit = row["total_credit"] or 0
    total_debit = row["total_debit"] or 0

    return LedgerSummary(
        merchant_id=merchant_id,
        total_credit=total_credit,
        total_debit=total_debit,
        net_balance=total_credit - total_debit,
        entry_count=row["entry_count"] or 0,
        period="all_time",
    )


@router.post("/entries", response_model=LedgerEntry)
async def create_ledger_entry(entry: LedgerEntryCreate):
    """Manually create a ledger entry."""
    entry_id = str(uuid.uuid4())
    timestamp = entry.timestamp or datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO ledger_entries (id, merchant_id, transaction_type, amount, currency,
           description, counterparty, raw_transcript, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            entry_id,
            entry.merchant_id,
            entry.transaction_type,
            entry.amount,
            entry.currency,
            entry.description,
            entry.counterparty,
            entry.raw_transcript,
            timestamp,
        ),
    )
    conn.commit()
    conn.close()

    return LedgerEntry(
        id=entry_id, created_at=timestamp, **entry.model_dump()
    )


@router.delete("/entries/{entry_id}")
async def delete_ledger_entry(entry_id: str):
    """Delete a ledger entry by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ledger_entries WHERE id = ?", (entry_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")
    conn.commit()
    conn.close()
    return {"message": "Entry deleted", "id": entry_id}


@router.get("/chart-data")
async def get_chart_data(
    merchant_id: str = Query(default="merchant_001"),
    days: int = Query(default=30),
):
    """Get daily revenue/expense data for charts (last N days)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT
             DATE(timestamp) as date,
             SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as revenue,
             SUM(CASE WHEN transaction_type IN ('DEBIT','EXPENSE','INVENTORY_PURCHASE') THEN amount ELSE 0 END) as expenses
           FROM ledger_entries
           WHERE merchant_id = ?
             AND timestamp >= datetime('now', '-' || ? || ' days')
           GROUP BY DATE(timestamp)
           ORDER BY date ASC""",
        (merchant_id, days),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
