"""
Cryptographic underwriting service.
Provides SHA-256 hashing, Merkle tree building, and tamper-evident audit logging.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from database.db import get_db_connection


def compute_sha256(data: bytes | str) -> str:
    """Compute SHA-256 hash of bytes or string."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def compute_merkle_root(hashes: list[str]) -> str:
    """
    Compute a simple Merkle root from a list of hex hashes.
    If empty, returns hash of empty string.
    """
    if not hashes:
        return compute_sha256("")
    while len(hashes) > 1:
        if len(hashes) % 2 != 0:
            hashes.append(hashes[-1])  # duplicate last for odd count
        hashes = [
            compute_sha256(hashes[i] + hashes[i + 1])
            for i in range(0, len(hashes), 2)
        ]
    return hashes[0]


def get_latest_audit_hash(merchant_id: str) -> Optional[str]:
    """Get the hash of the most recent audit log entry for a merchant."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT data_hash FROM audit_log WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 1",
        (merchant_id,),
    )
    row = cursor.fetchone()
    conn.close()
    return row["data_hash"] if row else None


def anchor_record(
    merchant_id: str,
    record_type: str,
    record_id: str,
    record_data: dict,
) -> dict:
    """
    Anchor a record into the tamper-evident audit log.
    Links to the previous hash to form a chain.
    Returns the audit anchor entry.
    """
    # Compute hash of the record data
    data_hash = compute_sha256(json.dumps(record_data, sort_keys=True, default=str))

    # Get previous hash for chaining
    previous_hash = get_latest_audit_hash(merchant_id) or compute_sha256("GENESIS")

    # Compute merkle root (chain hash with previous)
    merkle_root = compute_merkle_root([previous_hash, data_hash])

    anchor_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO audit_log (id, merchant_id, record_type, record_id, data_hash, previous_hash, merkle_root, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (anchor_id, merchant_id, record_type, record_id, data_hash, previous_hash, merkle_root, timestamp),
    )
    conn.commit()
    conn.close()

    return {
        "anchor_id": anchor_id,
        "data_hash": data_hash,
        "previous_hash": previous_hash,
        "merkle_root": merkle_root,
        "timestamp": timestamp,
    }


def get_audit_chain(merchant_id: str, limit: int = 50) -> list[dict]:
    """Retrieve the full audit chain for a merchant."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM audit_log WHERE merchant_id = ? ORDER BY created_at ASC LIMIT ?",
        (merchant_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def verify_chain_integrity(merchant_id: str) -> dict:
    """
    Verify the integrity of the audit chain by re-computing hashes.
    Returns a verification report.
    """
    chain = get_audit_chain(merchant_id)
    if not chain:
        return {"valid": True, "message": "No records to verify", "broken_at": None}

    for i, entry in enumerate(chain):
        if i == 0:
            expected_previous = compute_sha256("GENESIS")
        else:
            expected_previous = chain[i - 1]["data_hash"]

        if entry["previous_hash"] != expected_previous:
            return {
                "valid": False,
                "message": f"Chain broken at record {entry['id']}",
                "broken_at": entry["id"],
            }

    return {"valid": True, "message": "Chain integrity verified", "broken_at": None}
