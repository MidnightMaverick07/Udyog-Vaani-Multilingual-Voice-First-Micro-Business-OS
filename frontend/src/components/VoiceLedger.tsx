"use client";

import { useState, useRef, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface VoiceLedgerProps {
  merchantId: string;
  language: string;
  onEntryAdded: () => void;
}

type RecordState = "idle" | "recording" | "processing" | "done" | "error";

const PLACEHOLDERS: Record<string, string[]> = {
  "hi-IN": [
    "\"आज सब्जी बेची ₹450\"",
    "\"राम को ₹200 उधार दिया\"",
    "\"चाय की पत्ती ₹180 में खरीदी\"",
    "\"मोहन से ₹500 मिले\"",
  ],
  "en-IN": [
    '"Sold vegetables for ₹450"',
    '"Gave ₹200 credit to Ram"',
    '"Bought tea leaves for ₹180"',
    '"Received ₹500 from Mohan"',
  ],
};

export default function VoiceLedger({ merchantId, language, onEntryAdded }: VoiceLedgerProps) {
  const [state, setState] = useState<RecordState>("idle");
  const [transcript, setTranscript] = useState("");
  const [entities, setEntities] = useState<Record<string, unknown> | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState("");
  const [audioBars, setAudioBars] = useState<number[]>(Array(12).fill(0.3));
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const confirmAudioRef = useRef<HTMLAudioElement | null>(null);

  const placeholders = PLACEHOLDERS[language] || PLACEHOLDERS["en-IN"];
  const [phIdx] = useState(Math.floor(Math.random() * placeholders.length));

  // Animate audio bars during recording
  useEffect(() => {
    if (state === "recording" && analyserRef.current) {
      const animate = () => {
        const data = new Uint8Array(analyserRef.current!.frequencyBinCount);
        analyserRef.current!.getByteFrequencyData(data);
        const bars = Array(12).fill(0).map((_, i) => {
          const idx = Math.floor((i / 12) * data.length * 0.5);
          return Math.max(0.15, data[idx] / 255);
        });
        setAudioBars(bars);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animFrameRef.current);
      if (state !== "recording") {
        setAudioBars(Array(12).fill(0.3));
      }
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state]);

  const startRecording = async () => {
    setError("");
    setTranscript("");
    setEntities(null);
    setConfirmationText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analyser for visualization
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = handleStop;
      recorder.start(100);
      setState("recording");
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
      setState("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
      setState("processing");
    }
  };

  const handleStop = async () => {
    const blob = new Blob(audioChunks.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("merchant_id", merchantId);
    formData.append("language_code", language);
    formData.append("tts_response", "true");

    try {
      const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Transcription failed");
      }

      const data = await res.json();
      setTranscript(data.transcript);
      setEntities(data.entities);
      setConfirmationText(data.confirmation_text);

      // Play TTS confirmation
      if (data.confirmation_audio_b64) {
        const binary = atob(data.confirmation_audio_b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const audioBlob = new Blob([bytes], { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        confirmAudioRef.current = audio;
        audio.play().catch(() => {});
      }

      setState("done");
      onEntryAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setTranscript("");
    setEntities(null);
    setConfirmationText("");
    setError("");
  };

  const txType = entities?.transaction_type as string | undefined;
  const amount = entities?.amount as number | undefined;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            background: "linear-gradient(135deg, #FF6B2B, #FFD166)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: 6,
          }}
        >
          🎙️ {language.startsWith("hi") ? "आवाज़ बही-खाता" : "Voice Ledger"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {language.startsWith("hi")
            ? "अपने दैनिक लेन-देन बोलकर दर्ज करें"
            : "Speak your daily transactions in your language"}
        </p>
      </div>

      {/* Main recorder card */}
      <div className="glass-card" style={{ padding: 32, maxWidth: 680 }}>
        {/* Example prompt */}
        {state === "idle" && (
          <div
            style={{
              background: "rgba(255,107,43,0.05)",
              border: "1px dashed rgba(255,107,43,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 28,
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            💬 Try saying: {placeholders[phIdx]}
          </div>
        )}

        {/* Waveform + button */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Audio waveform visualization */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              height: 60,
              opacity: state === "recording" ? 1 : 0.3,
              transition: "opacity 0.3s",
            }}
          >
            {audioBars.map((bar, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  height: `${bar * 60}px`,
                  animationDelay: `${i * 0.07}s`,
                  animationPlayState: state === "recording" ? "running" : "paused",
                }}
              />
            ))}
          </div>

          {/* Record button */}
          <button
            onClick={state === "idle" ? startRecording : state === "recording" ? stopRecording : reset}
            className={`record-btn ${state === "recording" ? "recording" : "idle"}`}
            disabled={state === "processing"}
            title={state === "recording" ? "Stop recording" : "Start recording"}
          >
            {state === "processing" ? (
              <div className="spinner" />
            ) : state === "recording" ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : state === "done" || state === "error" ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {/* Status text */}
          <div style={{ textAlign: "center" }}>
            {state === "idle" && (
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                {language.startsWith("hi") ? "माइक बटन दबाएं और बोलें" : "Tap the mic and speak"}
              </p>
            )}
            {state === "recording" && (
              <p style={{ color: "#F43F5E", fontSize: 14, fontWeight: 500 }}>
                {language.startsWith("hi") ? "🔴 रिकॉर्डिंग हो रही है... रोकने के लिए फिर दबाएं" : "🔴 Recording... tap again to stop"}
              </p>
            )}
            {state === "processing" && (
              <p style={{ color: "#F59E0B", fontSize: 14 }}>
                {language.startsWith("hi") ? "⏳ Sarvam AI प्रोसेस कर रहा है..." : "⏳ Processing with Sarvam AI..."}
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        {state === "done" && entities && (
          <div
            className="animate-slide-up"
            style={{
              marginTop: 28,
              paddingTop: 24,
              borderTop: "1px solid var(--border)",
            }}
          >
            {/* Transcript */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Transcript
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: "var(--text-primary)",
                  fontStyle: "italic",
                }}
              >
                "{transcript}"
              </div>
            </div>

            {/* Extracted entities */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>TYPE</div>
                <span
                  className={txType === "CREDIT" ? "badge-credit" : "badge-debit"}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {txType === "CREDIT" ? "💰 CREDIT" : txType === "DEBIT" ? "💸 DEBIT" : `📦 ${txType}`}
                </span>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>AMOUNT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: txType === "CREDIT" ? "#10B981" : "#F43F5E" }}>
                  ₹{Number(amount || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>ITEM</div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                  {(entities.description as string) || "—"}
                </div>
              </div>
            </div>

            {/* Confirmation */}
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>✅</span>
              <div>
                <div style={{ fontSize: 13, color: "#10B981", fontWeight: 500 }}>
                  {language.startsWith("hi") ? "दर्ज हो गया!" : "Entry saved!"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {confirmationText}
                </div>
              </div>
            </div>

            <button
              onClick={reset}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                borderRadius: 10,
                background: "rgba(255,107,43,0.1)",
                border: "1px solid rgba(255,107,43,0.3)",
                color: "#FF6B2B",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              🎙️ {language.startsWith("hi") ? "फिर से बोलें" : "Record another"}
            </button>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div
            style={{
              marginTop: 20,
              background: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.2)",
              borderRadius: 10,
              padding: "14px 16px",
              color: "#F43F5E",
              fontSize: 13,
            }}
          >
            ❌ {error}
            <button onClick={reset} style={{ display: "block", marginTop: 10, color: "#FF6B2B", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
              Try again →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
