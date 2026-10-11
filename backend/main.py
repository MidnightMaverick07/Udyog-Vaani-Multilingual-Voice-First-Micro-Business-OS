"""
Udyog-Vaani Backend - FastAPI Application Entry Point
Voice-first micro-business operating system powered by Sarvam AI
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database.db import init_db
from routers import ledger, receipts, underwriting, schemes, voice

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and resources on startup."""
    await init_db()
    os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)
    yield


app = FastAPI(
    title="Udyog-Vaani API",
    description="Voice-first micro-business operating system for rural entrepreneurs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(ledger.router, prefix="/api/ledger", tags=["Ledger"])
app.include_router(receipts.router, prefix="/api/receipts", tags=["Receipts"])
app.include_router(underwriting.router, prefix="/api/underwriting", tags=["Underwriting"])
app.include_router(schemes.router, prefix="/api/schemes", tags=["Schemes"])


@app.get("/")
async def root():
    return {
        "message": "Udyog-Vaani API is running",
        "version": "1.0.0",
        "features": ["voice_ledger", "receipt_ocr", "underwriting", "scheme_matcher"],
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
