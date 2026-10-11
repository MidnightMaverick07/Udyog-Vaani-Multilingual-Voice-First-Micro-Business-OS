"use client";

import { useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LedgerEntry {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  raw_transcript: string;
  timestamp: string;
}

interface Summary {
  total_credit: number;
  total_debit: number;
  net_balance: number;
  entry_count: number;
}

export default function LedgerTable({ merchantId, refreshKey }: { merchantId: string; refreshKey: number }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/ledger/entries?merchant_id=${merchantId}&limit=100`),
        fetch(`${API_BASE}/api/ledger/summary?merchant_id=${merchantId}`),
      ]);
      if (entriesRes.ok) setEntries(await entriesRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch {
      // API not running - use demo data
      setEntries([
        { id: "1", transaction_type: "CREDIT", amount: 850, currency: "INR", description: "Vegetables sold", counterparty: "Market customers", raw_transcript: "आज सब्जी बेची ₹850", timestamp: new Date().toISOString() },
        { id: "2", transaction_type: "EXPENSE", amount: 250, currency: "INR", description: "Tomatoes & onions", counterparty: "Wholesale market", raw_transcript: "टमाटर प्याज खरीदे ₹250", timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: "3", transaction_type: "CREDIT", amount: 420, currency: "INR", description: "Fruits sold", counterparty: "Ram Babu", raw_transcript: "राम बाबू को फल बेचे ₹420", timestamp: new Date(Date.now() - 172800000).toISOString() },
      ]);
      setSummary({ total_credit: 1270, total_debit: 250, net_balance: 1020, entry_count: 3 });
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.transaction_type === filter);

  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    CREDIT: { label: "💰 Credit", color: "#10B981", bg: "rgba(16,185,129,0.1)" },
    DEBIT: { label: "💸 Debit", color: "#F43F5E", bg: "rgba(244,63,94,0.1)" },
    EXPENSE: { label: "🧾 Expense", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
    INVENTORY_PURCHASE: { label: "📦 Inventory", color: "#6366F1", bg: "rgba(99,102,241,0.1)" },
  };

  return (
    <div>
      {/* Summary cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Revenue", labelHi: "कुल आय", value: summary.total_credit, color: "#10B981", icon: "📈" },
            { label: "Total Expenses", labelHi: "कुल खर्च", value: summary.total_debit, color: "#F43F5E", icon: "📉" },
            { label: "Net Balance", labelHi: "शुद्ध बैलेंस", value: summary.net_balance, color: summary.net_balance >= 0 ? "#10B981" : "#F43F5E", icon: "⚖️" },
          ].map((card) => (
            <div key={card.label} className="metric-card">
              <div style={{ fontSize: 20, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>
                ₹{Math.abs(card.value).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {summary.entry_count} entries total
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Table header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
            📋 Ledger Entries ({filtered.length})
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["all", "CREDIT", "EXPENSE", "DEBIT"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: `1px solid ${filter === f ? "rgba(255,107,43,0.5)" : "var(--border)"}`,
                  background: filter === f ? "rgba(255,107,43,0.1)" : "transparent",
                  color: filter === f ? "#FF6B2B" : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {f === "all" ? "All" : typeConfig[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            No entries yet. Start recording your transactions! 🎙️
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Type", "Amount", "Description", "Counterparty", "Date", "Transcript"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const cfg = typeConfig[entry.transaction_type] || { label: entry.transaction_type, color: "#8B92A8", bg: "rgba(139,146,168,0.1)" };
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            color: cfg.color,
                            background: cfg.bg,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 15, fontWeight: 700, color: cfg.color }}>
                        ₹{entry.amount.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-primary)" }}>
                        {entry.description || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                        {entry.counterparty || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(entry.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.raw_transcript ? `"${entry.raw_transcript}"` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
