"""Voice router - handles audio upload, STT, entity extraction, TTS confirmation."""

import uuid
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from services.sarvam_client import speech_to_text, text_to_speech, extract_entities_from_transcript
from database.db import get_db_connection
from models.schemas import VoiceTranscriptionResponse

router = APIRouter()


def save_ledger_entry(merchant_id: str, entities: dict) -> dict:
    """Persist the extracted ledger entry to SQLite."""
    entry_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO ledger_entries (id, merchant_id, transaction_type, amount, currency,
           description, counterparty, raw_transcript, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            entry_id,
            merchant_id,
            entities.get("transaction_type", "CREDIT"),
            entities.get("amount", 0),
            "INR",
            entities.get("description", ""),
            entities.get("counterparty", ""),
            entities.get("original_transcript", ""),
            timestamp,
        ),
    )
    conn.commit()
    conn.close()

    return {
        "id": entry_id,
        "merchant_id": merchant_id,
        "transaction_type": entities.get("transaction_type", "CREDIT"),
        "amount": entities.get("amount", 0),
        "currency": "INR",
        "description": entities.get("description", ""),
        "counterparty": entities.get("counterparty", ""),
        "raw_transcript": entities.get("original_transcript", ""),
        "timestamp": timestamp,
        "created_at": timestamp,
    }


def build_confirmation_text(entities: dict, language_code: str = "hi-IN") -> str:
    """Build a natural confirmation message in the user's language."""
    tx_type = entities.get("transaction_type", "CREDIT")
    amount = entities.get("amount", 0)
    description = entities.get("description", "")
    counterparty = entities.get("counterparty", "")

    if language_code.startswith("hi"):
        type_word = "जमा" if tx_type in ("CREDIT",) else "खर्च"
        msg = f"ठीक है! ₹{amount:.0f} का {type_word} दर्ज किया गया।"
        if description:
            msg += f" {description} के लिए।"
        if counterparty:
            msg += f" {counterparty} से।"
        msg += " आपका हिसाब अपडेट हो गया।"
    else:
        type_word = "credit" if tx_type == "CREDIT" else "expense"
        msg = f"Done! ₹{amount:.0f} {type_word} recorded."
        if description:
            msg += f" For {description}."
        if counterparty:
            msg += f" From {counterparty}."
        msg += " Your ledger is updated."

    return msg


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(
    audio: UploadFile = File(...),
    merchant_id: str = Form(default="merchant_001"),
    language_code: str = Form(default="hi-IN"),
    tts_response: bool = Form(default=True),
):
    """
    Main voice ledger endpoint:
    1. Receive audio -> Sarvam STT
    2. Extract financial entities via Sarvam Analyze
    3. Save to ledger
    4. Generate TTS confirmation
    5. Return all data
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file received")

    # Step 1: Speech to Text
    try:
        stt_result = await speech_to_text(audio_bytes, language_code, audio.filename or "audio.wav")
        transcript = stt_result.get("transcript", "")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"STT failed: {str(e)}")

    if not transcript:
        raise HTTPException(status_code=422, detail="Could not transcribe audio - please speak clearly")

    # Step 2: Entity Extraction
    try:
        entities = await extract_entities_from_transcript(transcript)
    except Exception as e:
        # Fallback: create a generic entry
        entities = {
            "transaction_type": "CREDIT",
            "amount": 0,
            "description": transcript,
            "counterparty": "",
            "original_transcript": transcript,
            "english_translation": transcript,
        }

    # Step 3: Save to ledger
    ledger_entry = save_ledger_entry(merchant_id, entities)

    # Step 4: TTS Confirmation
    confirmation_text = build_confirmation_text(entities, language_code)
    confirmation_audio_b64 = None

    if tts_response:
        try:
            audio_bytes_out = await text_to_speech(confirmation_text, language_code)
            confirmation_audio_b64 = base64.b64encode(audio_bytes_out).decode("utf-8")
        except Exception:
            pass  # TTS failure is non-critical

    return VoiceTranscriptionResponse(
        transcript=transcript,
        language_code=language_code,
        entities=entities,
        ledger_entry=ledger_entry,
        confirmation_audio_b64=confirmation_audio_b64,
        confirmation_text=confirmation_text,
    )


@router.post("/tts")
async def text_to_speech_endpoint(text: str, language_code: str = "hi-IN"):
    """Convert text to speech and return WAV audio."""
    try:
        audio_bytes = await text_to_speech(text, language_code)
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS failed: {str(e)}")
