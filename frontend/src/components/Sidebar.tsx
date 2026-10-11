"use client";

import { Tab } from "@/app/page";

const LANGUAGES = [
  { code: "hi-IN", label: "हिंदी", flag: "🇮🇳" },
  { code: "en-IN", label: "English", flag: "🇮🇳" },
  { code: "ta-IN", label: "தமிழ்", flag: "🇮🇳" },
  { code: "te-IN", label: "తెలుగు", flag: "🇮🇳" },
  { code: "bn-IN", label: "বাংলা", flag: "🇮🇳" },
  { code: "mr-IN", label: "मराठी", flag: "🇮🇳" },
  { code: "gu-IN", label: "ગુજરાતી", flag: "🇮🇳" },
];

const NAV_ITEMS: { id: Tab; icon: string; label: string; labelHi: string; desc: string }[] = [
  { id: "ledger", icon: "🎙️", label: "Voice Ledger", labelHi: "आवाज़ बही-खाता", desc: "Daily transactions" },
  { id: "receipts", icon: "📷", label: "Receipt Scanner", labelHi: "पर्ची स्कैनर", desc: "Digitize bills" },
  { id: "underwriting", icon: "🔐", label: "Underwriting", labelHi: "ऋण सत्यापन", desc: "Lender dashboard" },
  { id: "schemes", icon: "🏛️", label: "Scheme Matcher", labelHi: "योजना खोजें", desc: "Govt. benefits" },
];

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  language: string;
  setLanguage: (l: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab, language, setLanguage }: SidebarProps) {
  const isHindi = language.startsWith("hi");

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #FF6B2B, #FFD166)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🏪
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                background: "linear-gradient(135deg, #FF6B2B, #FFD166)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Udyog-Vaani
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: -2 }}>
              उद्योग वाणी
            </div>
          </div>
        </div>
        <div
          style={{
            height: 1,
            background: "linear-gradient(90deg, rgba(255,107,43,0.5), transparent)",
            marginTop: 12,
          }}
        />
      </div>

      {/* Merchant info */}
      <div
        style={{
          background: "rgba(255, 107, 43, 0.08)",
          border: "1px solid rgba(255, 107, 43, 0.15)",
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF6B2B30, #FFD16630)",
              border: "1px solid rgba(255, 107, 43, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            👤
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Ramesh Kumar
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Street Vendor · Delhi</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 8 }}>
          Features
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              style={{ border: activeTab === item.id ? undefined : "1px solid transparent", width: "100%", textAlign: "left" }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {isHindi ? item.labelHi : item.label}
                </div>
                <div style={{ fontSize: 11, color: activeTab === item.id ? "rgba(255,107,43,0.6)" : "var(--text-muted)", marginTop: 1 }}>
                  {item.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Language selector */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>
          Language / भाषा
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: `1px solid ${language === lang.code ? "rgba(255,107,43,0.5)" : "var(--border)"}`,
                background: language === lang.code ? "rgba(255,107,43,0.1)" : "transparent",
                color: language === lang.code ? "#FF6B2B" : "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sarvam badge */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
          Powered by
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, textAlign: "center", color: "var(--text-secondary)", marginTop: 2 }}>
          🤖 Sarvam AI
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 2 }}>
          Saarika · Bulbul · Mayura
        </div>
      </div>
    </aside>
  );
}
