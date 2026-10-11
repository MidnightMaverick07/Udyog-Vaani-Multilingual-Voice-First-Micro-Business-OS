"""
Database models and initialization for Udyog-Vaani.
Uses aiosqlite for async SQLite operations.
"""

import sqlite3
import json
import os
from datetime import datetime

DATABASE_PATH = os.getenv("DATABASE_URL", "sqlite:///./udyog_vaani.db").replace("sqlite:///", "")


def get_db_connection():
    """Get a synchronous SQLite connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


async def init_db():
    """Initialize all database tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Merchants table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS merchants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            location TEXT,
            business_type TEXT,
            preferred_language TEXT DEFAULT 'hi-IN',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Ledger entries table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ledger_entries (
            id TEXT PRIMARY KEY,
            merchant_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            description TEXT,
            counterparty TEXT,
            raw_transcript TEXT,
            timestamp TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        )
    """)

    # Receipts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS receipts (
            id TEXT PRIMARY KEY,
            merchant_id TEXT NOT NULL,
            image_path TEXT NOT NULL,
            image_hash TEXT NOT NULL,
            extracted_data TEXT,
            extraction_hash TEXT,
            vendor_name TEXT,
            total_amount REAL,
            bill_date TEXT,
            reconciliation_status TEXT DEFAULT 'pending',
            matched_ledger_id TEXT,
            audit_anchor_id TEXT,
            uploaded_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        )
    """)

    # Audit log table (tamper-evident)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            merchant_id TEXT NOT NULL,
            record_type TEXT NOT NULL,
            record_id TEXT NOT NULL,
            data_hash TEXT NOT NULL,
            previous_hash TEXT,
            merkle_root TEXT,
            timestamp TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Scheme profiles table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scheme_profiles (
            id TEXT PRIMARY KEY,
            merchant_id TEXT NOT NULL,
            business_type TEXT,
            annual_revenue REAL,
            location TEXT,
            gender TEXT,
            caste_category TEXT,
            collateral_available INTEGER DEFAULT 0,
            has_bank_account INTEGER DEFAULT 0,
            family_members INTEGER,
            raw_interview TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        )
    """)

    # Seed default merchant for demo
    cursor.execute("""
        INSERT OR IGNORE INTO merchants (id, name, phone, location, business_type, preferred_language)
        VALUES ('merchant_001', 'Ramesh Kumar', '9876543210', 'Delhi', 'Street Vendor', 'hi-IN')
    """)

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully")
