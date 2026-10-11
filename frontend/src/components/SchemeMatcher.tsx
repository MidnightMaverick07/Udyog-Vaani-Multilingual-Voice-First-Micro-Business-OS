"use client";

import { useState, useRef, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SchemeMatcherProps {
  merchantId: string;
  language: string;
}

interface Scheme {
  id: string;
  name: string;
  full_name: string;
  category: string;
  max_loan: number | null;
  description: string;
  hindi_description: string;
  eligibility_score?: number;
  eligibility_reasons?: string[];
  apply_url: string;
  eligibility?: { documents: string[] };
}

const INTERVIEW_QUESTIONS_DEMO = [
  { id: "business_type", question: "आपका व्यवसाय क्या है? जैसे कि सब्जी बेचना, कपड़े सिलना, चाय की दुकान, या कुछ और?", field: "business_type" },
  { id: "annual_revenue", question: "एक महीने में आप लगभग कितना कमाते हैं?", field: "annual_revenue" },
  { id: "location", question: "आप किस शहर या गांव में रहते हैं?", field: "location" },
  { id: "has_bank_account", question: "क्या आपके पास बैंक खाता है?", field: "has_bank_account" },
  { id: "collateral", question: "क्या आपके पास कोई संपत्ति है जिसे गारंटी के रूप में दे सकते हैं?", field: "collateral_available" },
  { id: "gender", question: "आप पुरुष हैं या महिला?", field: "gender" },
];

const DEMO_SCHEMES: Scheme[] = [
  {
    id: "pm_svanidhi", name: "PM SVANidhi", full_name: "PM Street Vendor's AtmaNirbhar Nidhi",
    category: "Credit", max_loan: 50000,
    description: "Collateral-free working capital loan for street vendors.",
    hindi_description: "सड़क विक्रेताओं के लिए बिना गारंटी का ₹50,000 तक का ऋण।",
    eligibility_score: 85, eligibility_reasons: ["✅ No collateral required", "✅ Your business type qualifies", "✅ Bank account available"],
    apply_url: "https://pmsvanidhi.mohua.gov.in",
    eligibility: { documents: ["Aadhaar", "Vending Certificate or ULB Letter"] },
  },
  {
    id: "mudra_shishu", name: "Mudra Shishu", full_name: "PMMY Mudra Shishu (Up to ₹50,000)",
    category: "Credit", max_loan: 50000,
    description: "Micro-enterprise loan up to ₹50,000 in working capital.",
    hindi_description: "₹50,000 तक के सूक्ष्म उद्यम ऋण के लिए।",
    eligibility_score: 75, eligibility_reasons: ["✅ No collateral required", "✅ Your business type qualifies"],
    apply_url: "https://www.mudra.org.in",
    eligibility: { documents: ["Aadhaar", "PAN", "Bank Statements"] },
  },
  {
    id: "e_shram", name: "e-Shram Card", full_name: "e-Shram National Database",
    category: "Social Security", max_loan: null,
    description: "Registration for unorganized workers with ₹2 lakh accident insurance.",
    hindi_description: "₹2 लाख दुर्घटना बीमा और सरकारी योजनाओं तक पहुंच।",
    eligibility_score: 70, eligibility_reasons: ["✅ No collateral required", "✅ No bank account required"],
    apply_url: "https://eshram.gov.in",
    eligibility: { documents: ["Aadhaar", "Mobile number linked to Aadhaar"] },
  },
];

type Mode = "browse" | "interview" | "results";

export default function SchemeMatcher({ merchantId, language }: SchemeMatcherProps) {
  const [mode, setMode] = useState<Mode>("browse");
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [matchedSchemes, setMatchedSchemes] = useState<Scheme[]>([]);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isHindi = language.startsWith("hi");
  const questions = INTERVIEW_QUESTIONS_DEMO;
  const currentQ = questions[questionIdx];

  // Play question audio
  useEffect(() => {
    if (mode === "interview") {
      playQuestionAudio(questionIdx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdx, mode]);

  const playQuestionAudio = async (idx: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/schemes/interview/question/${idx}/audio?language_code=${language}`);
      if (!res.ok) return;
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {
      // TTS not available, that's fine
    }
  };

  const startVoiceAnswer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = handleVoiceAnswer;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopVoiceAnswer = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setProcessing(true);
    }
  };

  const handleVoiceAnswer = async () => {
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "answer.webm");
    formData.append("merchant_id", merchantId);
    formData.append("language_code", language);

    try {
      // STT to get transcript
      const sttRes = await fetch(`${API_BASE}/api/voice/transcribe`, { method: "POST", body: formData });
      if (sttRes.ok) {
        const sttData = await sttRes.json();
        submitAnswer(sttData.transcript);
      } else {
        submitAnswer(`[Voice answer ${questionIdx + 1}]`);
      }
    } catch {
      submitAnswer(`[Voice answer ${questionIdx + 1}]`);
    } finally {
      setProcessing(false);
    }
  };

  const submitAnswer = async (answerText: string) => {
    const newAnswers = { ...answers, [currentQ.id]: answerText };
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (questionIdx < questions.length - 1) {
      setQuestionIdx((i) => i + 1);
    } else {
      // Interview complete - run matching
      await runMatching(newAnswers);
      setMode("results");
    }
  };

  const runMatching = async (finalAnswers: Record<string, string>) => {
    try {
      // Build profile from answers
      const profile: Record<string, unknown> = {
        merchant_id: merchantId,
        business_type: finalAnswers.business_type || "",
        location: finalAnswers.location || "",
        gender: finalAnswers.gender || "",
        has_bank_account: /हाँ|han|yes|hai/i.test(finalAnswers.has_bank_account || ""),
        collateral_available: /हाँ|han|yes|hai/i.test(finalAnswers.collateral || ""),
        annual_revenue: parseFloat((finalAnswers.annual_revenue || "").replace(/[^0-9.]/g, "") || "0") * 12,
      };

      const res = await fetch(`${API_BASE}/api/schemes/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const data = await res.json();
        setMatchedSchemes(data.matched_schemes || DEMO_SCHEMES);
      } else {
        setMatchedSchemes(DEMO_SCHEMES);
      }
    } catch {
      setMatchedSchemes(DEMO_SCHEMES);
    }
  };

  const categoryColors: Record<string, string> = {
    Credit: "#6366F1",
    "Social Security": "#10B981",
    "Subsidy + Credit": "#F59E0B",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            background: "linear-gradient(135deg, #F59E0B, #FCD34D)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: 6,
          }}
        >
          🏛️ {isHindi ? "सरकारी योजना खोजें" : "Scheme Matcher"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {isHindi
            ? "अपनी आवाज़ में बताएं, हम सही सरकारी योजना ढूंढेंगे"
            : "Tell us about your business via voice, we'll find the right government schemes"}
        </p>
      </div>

      {/* Mode switcher */}
      {mode === "browse" && (
        <div>
          {/* Start interview CTA */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(252,211,77,0.05))",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 16,
              padding: 28,
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div style={{ fontSize: 48 }}>🎙️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                {isHindi ? "आवाज़ में बताएं, योजना पाएं" : "Voice Interview to Find Your Schemes"}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
                {isHindi
                  ? "हम कुछ सवाल पूछेंगे और आपके लिए सबसे उचित योजनाएं ढूंढेंगे।"
                  : "We'll ask a few questions about your business and find the most relevant government schemes for you."}
              </p>
              <button
                onClick={() => { setMode("interview"); setQuestionIdx(0); setAnswers({}); }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #F59E0B, #FCD34D)",
                  border: "none",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {isHindi ? "🎙️ साक्षात्कार शुरू करें" : "🎙️ Start Voice Interview"}
              </button>
            </div>
          </div>

          {/* All schemes */}
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: "var(--text-primary)" }}>
            📋 {isHindi ? "सभी योजनाएं" : "All Available Schemes"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {DEMO_SCHEMES.concat([
              {
                id: "pmegp", name: "PMEGP", full_name: "PM Employment Generation Programme",
                category: "Subsidy + Credit", max_loan: 2500000,
                description: "15-35% subsidy on project cost for new enterprises.",
                hindi_description: "नए उद्यम के लिए 15-35% सब्सिडी।",
                apply_url: "https://www.kviconline.gov.in/pmegpeportal",
                eligibility: { documents: ["Aadhaar", "PAN", "Project Report"] },
              },
            ]).map((scheme) => (
              <div key={scheme.id} className="scheme-card" onClick={() => setSelectedScheme(scheme)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: categoryColors[scheme.category] || "#8B92A8",
                      background: `${categoryColors[scheme.category] || "#8B92A8"}20`,
                      padding: "2px 10px",
                      borderRadius: 20,
                    }}
                  >
                    {scheme.category}
                  </span>
                  {scheme.max_loan && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#10B981" }}>
                      Up to ₹{(scheme.max_loan / 100000).toFixed(1)}L
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{scheme.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
                  {isHindi ? scheme.hindi_description : scheme.description}
                </div>
                <a href={scheme.apply_url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 12, color: "#6366F1", textDecoration: "none", fontWeight: 500 }}>
                  Apply Now →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview mode */}
      {mode === "interview" && (
        <div style={{ maxWidth: 600 }}>
          {/* Progress */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              <span>{isHindi ? "प्रश्न" : "Question"} {questionIdx + 1} / {questions.length}</span>
              <span>{Math.round(((questionIdx) / questions.length) * 100)}% {isHindi ? "पूर्ण" : "complete"}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((questionIdx) / questions.length) * 100}%` }} />
            </div>
          </div>

          {/* Question card */}
          <div className="glass-card animate-slide-up" style={{ padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              {isHindi ? "प्रश्न" : "Question"} {questionIdx + 1}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20, lineHeight: 1.5 }}>
              {currentQ.question}
            </div>

            {/* Voice answer button */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <button
                onClick={recording ? stopVoiceAnswer : startVoiceAnswer}
                disabled={processing}
                className={`record-btn ${recording ? "recording" : "idle"}`}
              >
                {processing ? <div className="spinner" /> : recording ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
                {recording ? (isHindi ? "🔴 बोलें... फिर रोकें" : "🔴 Speak... tap to stop") :
                  processing ? (isHindi ? "⏳ प्रोसेस हो रहा है..." : "⏳ Processing...") :
                    (isHindi ? "माइक दबाकर जवाब दें" : "Tap mic to answer by voice")}
              </p>
            </div>

            {/* Or type answer */}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 10 }}>
                — {isHindi ? "या टाइप करें" : "or type your answer"} —
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && currentAnswer.trim()) submitAnswer(currentAnswer.trim()); }}
                  placeholder={isHindi ? "यहाँ टाइप करें..." : "Type here..."}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => currentAnswer.trim() && submitAnswer(currentAnswer.trim())}
                  disabled={!currentAnswer.trim()}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    background: currentAnswer.trim() ? "linear-gradient(135deg, #F59E0B, #FCD34D)" : "rgba(255,255,255,0.05)",
                    border: "none",
                    color: currentAnswer.trim() ? "#000" : "var(--text-muted)",
                    fontWeight: 600,
                    cursor: currentAnswer.trim() ? "pointer" : "not-allowed",
                    fontSize: 13,
                  }}
                >
                  {isHindi ? "आगे →" : "Next →"}
                </button>
              </div>
            </div>
          </div>

          {/* Previous answers */}
          {Object.entries(answers).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(answers).map(([qId, ans]) => {
                const q = questions.find((q) => q.id === qId);
                return (
                  <div key={qId} style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)", padding: "6px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                    <span>✓</span>
                    <span style={{ color: "var(--text-secondary)" }}>{q?.question.slice(0, 50)}...</span>
                    <span style={{ marginLeft: "auto", color: "#F59E0B", fontWeight: 600 }}>{ans}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => { setMode("browse"); setQuestionIdx(0); }}
            style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            ← {isHindi ? "वापस जाएं" : "Back to Browse"}
          </button>
        </div>
      )}

      {/* Results mode */}
      {mode === "results" && (
        <div>
          <div
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 14,
              padding: "20px 24px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 36 }}>🎉</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981", marginBottom: 4 }}>
                {matchedSchemes.length} {isHindi ? "योजनाएं मिलीं" : "schemes found for you!"}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {isHindi ? "नीचे आपके लिए सबसे उचित योजनाएं दी गई हैं।" : "Below are the most relevant government schemes based on your profile."}
              </p>
            </div>
            <button onClick={() => { setMode("interview"); setQuestionIdx(0); setAnswers({}); }}
              style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {isHindi ? "फिर से करें" : "Retake Interview"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {matchedSchemes.map((scheme, i) => (
              <div
                key={scheme.id}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${i === 0 ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
                  borderRadius: 14,
                  padding: 22,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {i === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "linear-gradient(135deg, #F59E0B, #FCD34D)",
                      color: "#000",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: 20,
                    }}
                  >
                    ⭐ BEST MATCH
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                      {scheme.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{scheme.full_name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {scheme.max_loan && (
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>
                        ₹{(scheme.max_loan / 100000).toFixed(1)}L
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>max loan</div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
                  {isHindi ? scheme.hindi_description : scheme.description}
                </p>

                {/* Eligibility score */}
                {scheme.eligibility_score !== undefined && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: "var(--text-muted)" }}>Eligibility Score</span>
                      <span style={{ color: "#F59E0B", fontWeight: 600 }}>{scheme.eligibility_score}/100</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${scheme.eligibility_score}%`, background: "linear-gradient(90deg, #F59E0B, #FCD34D)" }} />
                    </div>
                  </div>
                )}

                {/* Reasons */}
                {scheme.eligibility_reasons && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {scheme.eligibility_reasons.map((r, idx) => (
                      <span key={idx} style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 20 }}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Documents needed */}
                {scheme.eligibility?.documents && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>
                      📄 {isHindi ? "जरूरी दस्तावेज" : "Required Documents"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {scheme.eligibility.documents.map((doc: string) => (
                        <span key={doc} style={{ fontSize: 11, color: "#6366F1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", padding: "2px 10px", borderRadius: 20 }}>
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <a
                  href={scheme.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                >
                  {isHindi ? "आवेदन करें →" : "Apply Now →"}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheme detail modal */}
      {selectedScheme && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setSelectedScheme(null)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 28,
              maxWidth: 480,
              width: "100%",
              animation: "slide-up 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selectedScheme.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{selectedScheme.full_name}</div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
              {selectedScheme.description}
            </p>
            {selectedScheme.max_loan && (
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981", marginBottom: 16 }}>
                Max: ₹{selectedScheme.max_loan.toLocaleString("en-IN")}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <a href={selectedScheme.apply_url} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                Apply Now
              </a>
              <button onClick={() => setSelectedScheme(null)}
                style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
