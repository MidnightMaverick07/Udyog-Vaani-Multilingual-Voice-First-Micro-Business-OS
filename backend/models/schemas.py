"""Pydantic models for all API requests and responses."""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class MerchantBase(BaseModel):
    name: str
    phone: Optional[str] = None
    location: Optional[str] = None
    business_type: Optional[str] = None
    preferred_language: str = "hi-IN"


class Merchant(MerchantBase):
    id: str
    created_at: str


class LedgerEntryCreate(BaseModel):
    merchant_id: str = "merchant_001"
    transaction_type: str  # CREDIT / DEBIT / EXPENSE / INVENTORY_PURCHASE
    amount: float
    currency: str = "INR"
    description: Optional[str] = None
    counterparty: Optional[str] = None
    raw_transcript: Optional[str] = None
    timestamp: Optional[str] = None


class LedgerEntry(LedgerEntryCreate):
    id: str
    created_at: str


class LedgerSummary(BaseModel):
    merchant_id: str
    total_credit: float
    total_debit: float
    net_balance: float
    entry_count: int
    period: str


class VoiceLedgerRequest(BaseModel):
    merchant_id: str = "merchant_001"
    language_code: str = "hi-IN"


class VoiceTranscriptionResponse(BaseModel):
    transcript: str
    language_code: str
    entities: dict
    ledger_entry: Optional[LedgerEntry] = None
    confirmation_audio_b64: Optional[str] = None
    confirmation_text: str


class ReceiptUploadResponse(BaseModel):
    receipt_id: str
    image_hash: str
    extracted_data: dict
    reconciliation: dict
    audit_anchor: dict


class SchemeMatchRequest(BaseModel):
    merchant_id: str = "merchant_001"
    business_type: Optional[str] = None
    annual_revenue: Optional[float] = None
    location: Optional[str] = None
    gender: Optional[str] = None
    caste_category: Optional[str] = None
    collateral_available: bool = False
    has_bank_account: bool = False
    family_members: Optional[int] = None


class SchemeMatch(BaseModel):
    id: str
    name: str
    full_name: str
    category: str
    max_loan: Optional[float]
    description: str
    hindi_description: str
    eligibility_score: int
    eligibility_reasons: List[str]
    apply_url: str
    documents: List[str]


class UnderwritingReport(BaseModel):
    merchant_id: str
    chain_valid: bool
    verification_message: str
    total_revenue: float
    total_expenses: float
    record_count: int
    audit_chain: List[dict]
    receipts: List[dict]


class InterviewAnswerRequest(BaseModel):
    merchant_id: str = "merchant_001"
    question_id: str
    answer_text: str
    language_code: str = "hi-IN"
    audio_response: bool = True
