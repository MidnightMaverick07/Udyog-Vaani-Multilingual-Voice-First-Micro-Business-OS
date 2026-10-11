# 🏪 Udyog-Vaani (उद्योग वाणी)

> **Voice-First Micro-Business Operating System, Cryptographic Underwriting Copilot & Indic Welfare Navigator**  
> *Aawaz se hisaab* — empowering India's street vendors, artisans, and micro-entrepreneurs using Sarvam AI Indic models.

---

## 🌟 Overview

Millions of India's micro-entrepreneurs—street vendors, chai stalls, kirana stores, and craftspeople—run cash-heavy daily businesses without formal accounting tools. Traditional bookkeeping software requires complex typing, English fluency, and financial literacy.

**Udyog-Vaani** solves this with an Indic, voice-first operating system powered by **Sarvam AI**:
1. **🎙️ Voice-Activated Daily Financial Ledger**: Speak transactions naturally in vernacular languages (*"आज ₹450 की सब्जी बेची"* / *"राम को ₹200 उधार दिया"*). Automatically transcribed, parsed into financial entities, entered into the ledger, and confirmed via spoken voice.
2. **📷 Crumpled Bill & Receipt Digitization**: Photograph informal paper receipts, challans, or invoices. The document intelligence engine extracts line items, totals, and automatically reconciles against voice-logged expenses.
3. **🔐 Tamper-Evident Cryptographic Underwriting**: Every transaction and receipt is hashed (`SHA-256`) and anchored to an append-only **Merkle audit chain**. Lenders and Microfinance Institutions (MFIs) get a verifiable underwriting dashboard with mathematical proof against ledger tampering.
4. **🏛️ Proactive Welfare & MSME Scheme Navigator**: An interactive voice interview triages the merchant's profile and matches them with government loan and subsidy schemes (PM SVANidhi, Mudra, PMEGP, e-Shram, Stand-Up India).

---

## 🏛️ Architecture & System Design

```
                     ┌──────────────────────────────────────────┐
                     │          Next.js 16 Web Client           │
                     │  (Voice Recorder, Dashboard, Schemes)    │
                     └────────────────────┬─────────────────────┘
                                          │ HTTP / REST & Multipart
                                          ▼
                     ┌──────────────────────────────────────────┐
                     │          FastAPI Backend (8000)          │
                     │  (Routers: Voice, Ledger, Receipts, etc) │
                     └──────┬──────────────────────┬────────────┘
                            │                      │
             ┌──────────────┴──────────┐    ┌──────┴───────────────────┐
             │      Sarvam AI APIs     │    │      Local Storage       │
             │                         │    │                          │
             │ • Saarika (ASR / STT)   │    │ • SQLite Ledger & Audit  │
             │ • Bulbul (TTS Audio)    │    │ • Uploaded Receipts Store│
             │ • Mayura (Translation)  │    │ • Merkle Audit Chain     │
             │ • Text Analytics        │    │                          │
             └─────────────────────────┘    └──────────────────────────┘
```

---

## 🚀 Key Features

### 1. Voice Financial Ledger
- **Audio Capture**: Browser-native WebM recording with real-time waveform visualizer.
- **Indic Speech-to-Text**: Powered by Sarvam Saarika with code-mixing support across Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, and Indian English.
- **Entity Extraction**: Automatically parses transaction type (`CREDIT`, `DEBIT`, `EXPENSE`, `INVENTORY_PURCHASE`), amount, counterparty, and item description.
- **Audio Confirmation**: Bulbul TTS responds with natural spoken verification in the user's language.

### 2. Receipt Scanner & Discrepancy Reconciliation
- Extracts vendor names, line items, quantities, dates, and total amounts.
- Reconciles receipts against recent voice ledger entries within dynamic tolerance bands to highlight matching payments or overcharges.

### 3. Tamper-Evident Cryptographic Underwriting
- **Image Hash**: Raw receipt image `SHA-256` digest.
- **Data Hash**: Structured JSON claim digest.
- **Merkle Tree & Hash Chain**: Chains each anchor to the previous block hash (`previous_hash` + `data_hash` $\rightarrow$ `merkle_root`).
- **Audit Verification**: Instant cryptographic integrity check flagging broken links for institutional lenders.

### 4. Conversational Scheme Matcher
- Multi-turn voice interview assessing business type, revenue, location, bank account availability, and collateral.
- Intelligent ranking and scoring against government schemes:
  - **PM SVANidhi**: Collateral-free working capital up to ₹50,000 for street vendors.
  - **PMMY Mudra (Shishu & Kishore)**: Micro-loans up to ₹5 Lakh.
  - **PMEGP**: 15–35% project subsidy for new enterprises.
  - **e-Shram**: Accidental insurance and welfare protections.
  - **Stand-Up India**: SC/ST and women entrepreneur credit.

---

## 📁 Repository Structure

```
d:/sarvam/
├── backend/
│   ├── database/
│   │   ├── db.py               # SQLite schema & connection manager
│   │   └── __init__.py
│   ├── models/
│   │   ├── schemas.py          # Pydantic models for API validation
│   │   └── __init__.py
│   ├── routers/
│   │   ├── voice.py            # STT, TTS, & voice ledger endpoints
│   │   ├── ledger.py           # Ledger entries, summaries, & charts
│   │   ├── receipts.py         # Bill upload, OCR, & reconciliation
│   │   ├── underwriting.py     # Merkle audit chain & lender reports
│   │   ├── schemes.py          # Interactive interview & scheme triage
│   │   └── __init__.py
│   ├── services/
│   │   ├── sarvam_client.py    # Sarvam AI API client (Saarika, Bulbul, etc.)
│   │   ├── underwriting.py     # SHA-256 & Merkle tree cryptographic logic
│   │   ├── schemes.py          # Curated schemes DB & matching algorithm
│   │   └── __init__.py
│   ├── .env                    # Backend environment config
│   ├── main.py                 # FastAPI application instance & lifespan
│   ├── run.py                  # Uvicorn launcher script
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css     # Design system, glassmorphism & theme tokens
│   │   │   ├── layout.tsx      # Root HTML layout & fonts
│   │   │   └── page.tsx        # Main application dashboard
│   │   └── components/
│   │       ├── Sidebar.tsx              # Language picker & navigation
│   │       ├── VoiceLedger.tsx          # Audio recorder & entity viewer
│   │       ├── LedgerTable.tsx          # Real-time ledger entries table
│   │       ├── ReceiptScanner.tsx       # Bill upload & OCR reconciliation
│   │       ├── UnderwritingDashboard.tsx# Cryptographic audit chain & metrics
│   │       └── SchemeMatcher.tsx        # Voice interview & scheme cards
│   ├── .env.local              # Frontend API base URL
│   ├── next.config.ts          # Next.js configuration
│   ├── package.json            # Node dependencies
│   └── tsconfig.json           # TypeScript configuration
├── features.md                 # Product specifications & architectural vision
└── README.md                   # Project documentation
```

---

## 🛠️ Quick Start Guide

### Prerequisites
- **Node.js**: v18 or higher (v20+ recommended)
- **Python**: 3.10+ (Python 3.12 or 3.14 compatible)
- **Sarvam AI API Key**: Sign up at [sarvam.ai](https://www.sarvam.ai) to obtain your API key.

---

### 1. Backend Setup

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your `.env` file (`backend/.env`):
   ```env
   SARVAM_API_KEY=your_sarvam_api_key_here
   DATABASE_URL=sqlite:///./udyog_vaani.db
   UPLOAD_DIR=./uploads
   AUDIT_LOG_PATH=./audit_log.json
   CORS_ORIGINS=http://localhost:3000
   ```

5. Start the backend server:
   ```bash
   python run.py
   # Or directly with uvicorn:
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

6. Verify the backend is running:
   - Health check: `http://localhost:8000/health`
   - Interactive Swagger API docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup

1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Run the Next.js development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `POST` | `/api/voice/transcribe` | Upload voice audio, transcribe via Sarvam STT, extract entities, update ledger, generate TTS |
| `POST` | `/api/voice/tts` | Convert text to speech audio WAV |
| `GET` | `/api/ledger/entries` | Get paginated ledger transactions |
| `POST` | `/api/ledger/entries` | Manually record a ledger entry |
| `GET` | `/api/ledger/summary` | Get revenue, expenses, and net profit summary |
| `GET` | `/api/ledger/chart-data`| Time-series financial trends |
| `POST` | `/api/receipts/upload` | Upload receipt image, run OCR, reconcile with ledger, anchor into audit chain |
| `GET` | `/api/receipts/list` | List uploaded receipts and reconciliation statuses |
| `GET` | `/api/underwriting/report/{merchant_id}` | Generate underwriting summary with Merkle chain verification |
| `GET` | `/api/underwriting/verify/{merchant_id}` | Verify audit log cryptographic integrity |
| `GET` | `/api/schemes/list` | List all available government schemes |
| `POST` | `/api/schemes/match` | Evaluate merchant profile against schemes |
| `GET` | `/api/schemes/interview/questions` | Fetch questions for voice interview |
| `POST` | `/api/schemes/interview/answer` | Process voice answer and progress interview |

---

## 🔒 Cryptographic Verification Mechanism

Every financial record or receipt upload undergoes a multi-layer verification process:

1. **Raw Artifact Hashing**:  
   $$H_{\text{raw}} = \text{SHA-256}(\text{Raw Image Bytes})$$
2. **Extracted Data Hashing**:  
   $$H_{\text{claim}} = \text{SHA-256}(\text{Canonical JSON}(\text{Extracted Data}))$$
3. **Block Chaining**:  
   $$H_{\text{prev}} = \text{Previous Block Data Hash (or GENESIS)}$$
4. **Merkle Anchor**:  
   $$\text{Root} = \text{SHA-256}(H_{\text{prev}} \parallel H_{\text{claim}})$$

When an underwriter inspects the merchant's dashboard, the system re-computes every hash from the genesis block forward. Any altered amount, backdated record, or modified receipt invalidates the chain, ensuring reliable credit underwriting without traditional paper audit trails.

---

## 🌍 Supported Indic Languages

| Language Code | Language | Sarvam TTS Speaker |
|---|---|---|
| `hi-IN` | Hindi (हिंदी) | Meera |
| `en-IN` | English (India) | Arvind |
| `ta-IN` | Tamil (தமிழ்) | Pavithra |
| `te-IN` | Telugu (తెలుగు) | Meera |
| `bn-IN` | Bengali (বাংলা) | Meera |
| `mr-IN` | Marathi (मराठी) | Meera |
| `gu-IN` | Gujarati (ગુજરાતી) | Meera |
| `kn-IN` | Kannada (ಕನ್ನಡ) | Meera |

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add NewFeature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
