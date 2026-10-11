"""Sarvam AI API client wrapper for Udyog-Vaani."""

import os
import httpx
import base64
from typing import Optional

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = "https://api.sarvam.ai"

HEADERS = {
    "api-subscription-key": SARVAM_API_KEY,
}

SUPPORTED_LANGUAGES = {
    "hi-IN": "Hindi",
    "en-IN": "English (India)",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "bn-IN": "Bengali",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
    "kn-IN": "Kannada",
}

SPEAKER_MAP = {
    "hi-IN": "meera",
    "en-IN": "arvind",
    "ta-IN": "pavithra",
    "te-IN": "meera",
    "bn-IN": "meera",
    "mr-IN": "meera",
    "gu-IN": "meera",
    "kn-IN": "meera",
}


async def speech_to_text(audio_bytes: bytes, language_code: str = "hi-IN", filename: str = "audio.wav") -> dict:
    """
    Transcribe audio using Sarvam Saarika ASR model.
    Returns transcript text and confidence.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        files = {"file": (filename, audio_bytes, "audio/wav")}
        data = {
            "model": "saarika:v2",
            "language_code": language_code,
        }
        response = await client.post(
            f"{SARVAM_BASE_URL}/speech-to-text",
            headers=HEADERS,
            files=files,
            data=data,
        )
        response.raise_for_status()
        return response.json()


async def text_to_speech(
    text: str,
    language_code: str = "hi-IN",
    speaker: Optional[str] = None,
) -> bytes:
    """
    Convert text to speech using Sarvam Bulbul TTS model.
    Returns raw WAV audio bytes.
    """
    if speaker is None:
        speaker = SPEAKER_MAP.get(language_code, "meera")

    async with httpx.AsyncClient(timeout=60.0) as client:
        payload = {
            "inputs": [text],
            "target_language_code": language_code,
            "speaker": speaker,
            "model": "bulbul:v1",
            "pace": 1.0,
            "loudness": 1.5,
            "enable_preprocessing": True,
        }
        response = await client.post(
            f"{SARVAM_BASE_URL}/text-to-speech",
            headers={**HEADERS, "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        result = response.json()
        # Decode base64 audio
        audio_b64 = result.get("audios", [""])[0]
        return base64.b64decode(audio_b64)


async def translate_text(text: str, source_lang: str = "hi-IN", target_lang: str = "en-IN") -> str:
    """Translate text between Indian languages using Sarvam."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        payload = {
            "input": text,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "model": "mayura:v1",
            "enable_preprocessing": True,
        }
        response = await client.post(
            f"{SARVAM_BASE_URL}/translate",
            headers={**HEADERS, "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        return response.json().get("translated_text", text)


async def identify_language(text: str) -> str:
    """Identify the language of input text."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        payload = {"input": text}
        response = await client.post(
            f"{SARVAM_BASE_URL}/text-lid",
            headers={**HEADERS, "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        return response.json().get("language_code", "hi-IN")


async def extract_entities_from_transcript(transcript: str) -> dict:
    """
    Use Sarvam analyze API to extract financial entities from voice transcript.
    Returns structured ledger entry data.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # First translate to English for better entity extraction
        english_text = transcript
        try:
            english_text = await translate_text(transcript, "hi-IN", "en-IN")
        except Exception:
            pass

        payload = {
            "text_content": english_text,
            "questions": [
                {
                    "id": "transaction_type",
                    "text": "What type of transaction is this? (sale/income = CREDIT, purchase/expense/payment = DEBIT)",
                    "type": "enum",
                    "properties": {"options": ["CREDIT", "DEBIT", "EXPENSE", "INVENTORY_PURCHASE"]},
                },
                {
                    "id": "amount",
                    "text": "What is the monetary amount mentioned? Return only the number.",
                    "type": "number",
                },
                {
                    "id": "description",
                    "text": "What item or service is being bought/sold?",
                    "type": "short answer",
                },
                {
                    "id": "counterparty",
                    "text": "Who is the customer, vendor, or counterparty mentioned?",
                    "type": "short answer",
                },
            ],
        }
        response = await client.post(
            f"{SARVAM_BASE_URL}/text-analytics/analyze",
            headers={**HEADERS, "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        result = response.json()

        # Parse answers
        answers = {a["id"]: a.get("answer") for a in result.get("answers", [])}
        return {
            "transaction_type": answers.get("transaction_type", "CREDIT"),
            "amount": float(answers.get("amount") or 0),
            "description": answers.get("description", ""),
            "counterparty": answers.get("counterparty", ""),
            "original_transcript": transcript,
            "english_translation": english_text,
        }
