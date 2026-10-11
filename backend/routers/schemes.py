"""
Schemes router - voice-driven interview, eligibility matching, and scheme guidance.
"""

import uuid
import json
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from services.schemes import match_schemes, INTERVIEW_QUESTIONS, SCHEMES_DB
from services.sarvam_client import speech_to_text, text_to_speech, translate_text
from database.db import get_db_connection
from models.schemas import SchemeMatchRequest, InterviewAnswerRequest

router = APIRouter()


@router.get("/list")
async def list_all_schemes():
    """Return all available government schemes."""
    return SCHEMES_DB


@router.post("/match")
async def match_schemes_for_merchant(request: SchemeMatchRequest):
    """
    Match a merchant profile against all government schemes.
    Returns ranked eligible schemes.
    """
    profile = request.model_dump()
    matched = match_schemes(profile)
    return {
        "merchant_id": request.merchant_id,
        "profile": profile,
        "matched_schemes": matched,
        "total_matched": len(matched),
    }


@router.get("/interview/questions")
async def get_interview_questions(language_code: str = "hi-IN"):
    """Get the list of interview questions for scheme triage."""
    questions = []
    for q in INTERVIEW_QUESTIONS:
        questions.append({
            "id": q["id"],
            "question": q["question_hi"] if language_code.startswith("hi") else q["question_en"],
            "field": q["field"],
        })
    return {"questions": questions, "language_code": language_code}


@router.get("/interview/question/{question_index}/audio")
async def get_question_audio(question_index: int, language_code: str = "hi-IN"):
    """Get TTS audio for a specific interview question."""
    if question_index >= len(INTERVIEW_QUESTIONS):
        raise HTTPException(status_code=404, detail="Question not found")

    q = INTERVIEW_QUESTIONS[question_index]
    text = q["question_hi"] if language_code.startswith("hi") else q["question_en"]

    try:
        audio_bytes = await text_to_speech(text, language_code)
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS failed: {str(e)}")


@router.post("/interview/answer")
async def process_interview_answer(request: InterviewAnswerRequest):
    """
    Process a voice answer from the scheme interview.
    Translates, extracts value, saves to profile, returns next question audio.
    """
    merchant_id = request.merchant_id
    language_code = request.language_code

    # Translate answer to English for processing
    answer_english = request.answer_text
    try:
        if not language_code.startswith("en"):
            answer_english = await translate_text(request.answer_text, language_code, "en-IN")
    except Exception:
        answer_english = request.answer_text

    # Parse the answer based on question type
    answer_lower = answer_english.lower()
    parsed_value = answer_english

    question_id = request.question_id
    if question_id == "has_bank_account" or question_id == "collateral":
        parsed_value = "yes" in answer_lower or "hai" in request.answer_text.lower() or "haan" in request.answer_text.lower()
    elif question_id == "annual_revenue":
        # Extract number from text
        import re
        numbers = re.findall(r'\d+(?:,\d+)*(?:\.\d+)?', answer_english.replace(",", ""))
        if numbers:
            monthly = float(numbers[0])
            parsed_value = monthly * 12  # annualize

    # Update scheme profile
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get or create profile
    cursor.execute(
        "SELECT id FROM scheme_profiles WHERE merchant_id = ?",
        (merchant_id,),
    )
    existing = cursor.fetchone()

    if existing:
        field = next((q["field"] for q in INTERVIEW_QUESTIONS if q["id"] == question_id), question_id)
        cursor.execute(
            f"UPDATE scheme_profiles SET {field} = ? WHERE merchant_id = ?",
            (parsed_value if not isinstance(parsed_value, bool) else int(parsed_value), merchant_id),
        )
    else:
        profile_id = str(uuid.uuid4())
        field = next((q["field"] for q in INTERVIEW_QUESTIONS if q["id"] == question_id), question_id)
        cursor.execute(
            f"INSERT INTO scheme_profiles (id, merchant_id, {field}) VALUES (?, ?, ?)",
            (profile_id, merchant_id, parsed_value if not isinstance(parsed_value, bool) else int(parsed_value)),
        )

    conn.commit()

    # Check if interview is complete and run matching
    question_ids = [q["id"] for q in INTERVIEW_QUESTIONS]
    current_idx = question_ids.index(question_id) if question_id in question_ids else -1
    is_last = current_idx == len(INTERVIEW_QUESTIONS) - 1

    result = {
        "question_id": question_id,
        "answer_english": answer_english,
        "parsed_value": parsed_value,
        "is_interview_complete": is_last,
        "next_question_index": current_idx + 1 if not is_last else None,
        "matched_schemes": None,
        "audio_b64": None,
    }

    if is_last:
        # Run matching
        cursor.execute(
            "SELECT * FROM scheme_profiles WHERE merchant_id = ?",
            (merchant_id,),
        )
        profile_row = cursor.fetchone()
        conn.close()

        if profile_row:
            profile = dict(profile_row)
            matched = match_schemes(profile)
            result["matched_schemes"] = matched[:5]

            # Generate TTS result message
            if matched:
                scheme_names = ", ".join(s["name"] for s in matched[:3])
                if language_code.startswith("hi"):
                    msg = f"बधाई हो! आप इन योजनाओं के लिए पात्र हैं: {scheme_names}। हमें आपकी मदद करके खुशी होगी।"
                else:
                    msg = f"Great! You are eligible for: {scheme_names}. We'll help you apply."
            else:
                msg = "हमें खेद है, आप अभी किसी योजना के लिए पात्र नहीं हैं।" if language_code.startswith("hi") else "No matching schemes found at this time."

            if request.audio_response:
                try:
                    audio_bytes = await text_to_speech(msg, language_code)
                    result["audio_b64"] = base64.b64encode(audio_bytes).decode()
                except Exception:
                    pass
    else:
        conn.close()
        # Generate next question audio
        next_q = INTERVIEW_QUESTIONS[current_idx + 1]
        next_text = next_q["question_hi"] if language_code.startswith("hi") else next_q["question_en"]
        if request.audio_response:
            try:
                audio_bytes = await text_to_speech(next_text, language_code)
                result["audio_b64"] = base64.b64encode(audio_bytes).decode()
                result["next_question_text"] = next_text
            except Exception:
                pass

    return result


@router.get("/profile/{merchant_id}")
async def get_scheme_profile(merchant_id: str):
    """Get the scheme interview profile for a merchant."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scheme_profiles WHERE merchant_id = ?", (merchant_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"merchant_id": merchant_id, "profile": None, "matched_schemes": []}

    profile = dict(row)
    matched = match_schemes(profile)
    return {"merchant_id": merchant_id, "profile": profile, "matched_schemes": matched}
