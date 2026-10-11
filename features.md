# Role & Objective
You are an expert full-stack AI engineer and system architect. Your goal is to build the end-to-end working implementation of **"Udyog-Vaani"**—a voice-first micro-business operating system, underwriting copilot, and welfare navigator designed for micro-entrepreneurs, street vendors, and artisans. The application must leverage Sarvam AI's Indic models across voice, language, and vision pipelines.

---

# STOP & CHECK: Missing Information & Environment Setup
Before writing project files, scaffolding code, or generating implementation scripts, you MUST inspect what configuration items are missing and explicitly ask me for them. 

Prompt me for:
1. **API Credentials:** `SARVAM_API_KEY` (and any vector database or cloud credentials needed).
2. **Database & Storage Preference:** SQLite, PostgreSQL, or a lightweight structured JSON file-based database for local MVP persistence.
3. **Frontend Platform Preference:** Lightweight modern web client (e.g., Next.js / React + Tailwind, or Vanilla HTML5/JS audio recorder) vs. an automated messaging webhook (e.g., WhatsApp Business API simulator).
4. **Target Regional Languages:** Primary Indic languages to configure for initial testing (e.g., Hindi, Bengali, Tamil, Telugu, Marathi).

Wait for my response to these prompts before scaffolding the code.

---

# Full Application Architecture & Feature Specifications

Once setup parameters are confirmed, implement the end-to-end system following this modular architecture:

### 1. Voice-Activated Daily Financial Ledger
* **Audio Capture & Streaming:** A client-side audio handler capturing continuous or chunked microphone input (WAV/WebM).
* **ASR (Speech-to-Text):** Route incoming audio payloads to **Saaras v4** (Sarvam Speech-to-Text) with Indic code-mixing support.
* **Intent & Entity Extraction:** Send the transcribed text to **Sarvam-105B** with strict schema constraints to parse:
  * Transaction type (`CREDIT` / `DEBIT` / `EXPENSE` / `INVENTORY_PURCHASE`)
  * Amount (`float`) and Currency
  * Item/Description (`string`)
  * Counterparty/Customer/Vendor name (if mentioned)
  * Timestamp (defaulting to current ISO timestamp)
* **Structured Persistence:** Store the validated record in the ledger database under the merchant's profile.
* **Spoken Audio Confirmation:** Generate a concise, natural confirmation message, pass it to **Bulbul v3** (Sarvam Text-to-Speech) in the user's spoken language, and stream back the audio response for hands-free confirmation.

---

### 2. Crumpled Bill & Receipt Digitization (Document Intelligence)
* **Image Capture:** Receive photos of handwritten, crumpled, or informal paper receipts, challans, or invoices.
* **Indic OCR & Extraction:** Process the image via **Sarvam Vision** to extract:
  * Vendor/Store Name
  * Line items with quantity and unit price
  * Subtotals, taxes, and total amounts
  * Invoice/Bill date
* **Discrepancy & Reconciliation Engine:** Cross-check extracted receipt totals against the user's recent voice-logged expense transactions to automatically match records or flag discrepancies (e.g., overcharges or missing line items).

---

### 3. Tamper-Evident Cryptographic Underwriting Pipeline
* **Evidence Anchoring:**
  * Compute a cryptographic hash (`SHA-256`) of the original uploaded receipt/bill image.
  * Compute a cryptographic hash of the extracted JSON output from Sarvam Vision.
* **Audit Ledger / Merkle Tree:**
  * Anchor each record into an append-only, tamper-evident log linking the raw media hash, extracted claim hash, and timestamp.
* **Lender Underwriting Dashboard:**
  * Build a lightweight dashboard endpoint for micro-finance institutions (MFIs) and banks.
  * Display verified financial statements, revenue graphs, and side-by-side verification allowing underwriters to inspect extracted data crops directly against the raw document image.

---

### 4. Proactive Welfare & MSME Scheme Navigator (Conversational RAG)
* **Knowledge Base:** Set up a vector retrieval index (e.g., ChromaDB / FAISS) populated with government scheme data (e.g., PM SVANidhi, Mudra loans, PMEGP, state-specific artisan subsidies, and gig-worker protections).
* **Voice-Driven Interactive Triage:**
  * Run a multi-turn voice Q&A interview: Saaras v4 (STT) $\rightarrow$ Scheme Evaluation Agent $\rightarrow$ Bulbul v3 (TTS).
  * Collect business type, annual revenue, location, gender/caste categories (if applicable for reservations/subsidies), and collateral status.
* **Eligibility Evaluation & Form Assistance:**
  * Retrieve qualifying schemes with cited clauses.
  * Guide the user step-by-step through required KYC documents and pre-fill application templates.

---

# Technical Requirements & Code Quality Directives
* **Backend:** Python (FastAPI) structured cleanly into `routers/`, `services/sarvam_client.py`, `models/`, and `database/`.
* **Sarvam AI Integration:** Create clean wrapper utilities for Saaras v4, Sarvam-105B, Sarvam Vision, and Bulbul v3 handling headers, streaming, multipart file uploads, and timeouts.
* **Resilience:** Graceful error handling for noisy audio, low-confidence OCR scans, and network retries.
* **Data Schemas:** Use Pydantic models for all API requests, responses, and database entries to guarantee strict validation.

Please review these specifications, list all missing keys and environment preferences you need from me, and wait for my go-ahead before generating the codebase.