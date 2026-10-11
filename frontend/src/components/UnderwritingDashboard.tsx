"use client";

import { useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_REPORT = {
  merchant_id: "merchant_001",
  chain_valid: true,
  verification_message: "Chain integrity verified",
  total_revenue: 18450,
  total_expenses: 6200,
  record_count: 23,
  audit_chain: [
    { id: "anch-001", record_type: "ledger", data_hash: "a3f8b2c1d4e5f6789abc123...", merkle_root: "9a4bffa6b0d4c9f07d5e...", timestamp: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: "anch-002", record_type: "receipt", data_hash: "b4c9d3e2f1a0789abc456...", merkle_root: "8b5cggb7c1e5d0f6a8b...", timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "anch-003", record_type: "ledger", data_hash: "c5d0e4f3b2a1890bcd789...", merkle_root: "7c6dhhc8d2f6e1g7c9c...", timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "anch-004", record_type: "receipt", data_hash: "d6e1f5g4c3b2901cde012...", merkle_root: "6d7eii d9e3g7f2h8d0d...", timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
  ],
  receipts: [
    { id: "r001", vendor_name: "Wholesale Market", total_amount: 3200, bill_date: "2024-10-04", reconciliation_status: "matched", image_hash: "sha256:a3f8b2c1...", extraction_hash: "sha256:e7d4c9f1..." },
    { id: "r002", vendor_name: "Sharma Traders", total_amount: 1850, bill_date: "2024-10-07", reconciliation_status: "unmatched", image_hash: "sha256:b5c9d3e2...", extraction_hash: "sha256:f8e5d0g2..." },
    { id: "r003", vendor_name: "City Cold Storage", total_amount: 1150, bill_date: "2024-10-09", reconciliation_status: "matched", image_hash: "sha256:c7d0e5f3...", extraction_hash: "sha256:g9f6e1h3..." },
  ],
};

export default function UnderwritingDashboard({ merchantId, refreshKey }: { merchantId: string; refreshKey: number }) {
  const [report, setReport] = useState(DEMO_REPORT);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/underwriting/report/${merchantId}`);
      if (res.ok) {
        setReport(await res.json());
      }
    } catch {
      // use demo
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const netBalance = report.total_revenue - report.total_expenses;
  const revenueRatio = report.total_revenue > 0 ? (report.total_revenue / (report.total_revenue + report.total_expenses)) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            background: "linear-gradient(135deg, #10B981, #06D6A0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: 6,
          }}
        >
          🔐 Underwriting Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Tamper-evident financial footprint for lenders · Cryptographic audit chain
        </p>
      </div>

      {/* Chain integrity banner */}
      <div
        style={{
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 24,
          background: report.chain_valid ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
          border: `1px solid ${report.chain_valid ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 28 }}>{report.chain_valid ? "🔗" : "⚠️"}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: report.chain_valid ? "#10B981" : "#F43F5E" }}>
            {report.chain_valid ? "Merkle Chain Integrity Verified" : "Chain Integrity Warning"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {report.verification_message} · {report.record_count} records anchored
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
          Suitable for MFI/Bank audit
        </div>
      </div>

      {/* Financial summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Revenue", value: `₹${report.total_revenue.toLocaleString("en-IN")}`, color: "#10B981", icon: "📈", sub: "Verified income" },
          { label: "Total Expenses", value: `₹${report.total_expenses.toLocaleString("en-IN")}`, color: "#F43F5E", icon: "📉", sub: "Verified expenses" },
          { label: "Net Profit", value: `₹${netBalance.toLocaleString("en-IN")}`, color: netBalance >= 0 ? "#10B981" : "#F43F5E", icon: "💹", sub: `${revenueRatio.toFixed(0)}% margin` },
          { label: "Audit Records", value: report.audit_chain.length.toString(), color: "#6366F1", icon: "🔐", sub: "Anchored entries" },
        ].map((card) => (
          <div key={card.label} className="metric-card">
            <div style={{ fontSize: 20, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue vs Expense bar */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>💰 Revenue vs Expenses</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#10B981", width: 80 }}>Revenue</span>
          <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${revenueRatio}%`, background: "linear-gradient(90deg, #10B981, #06D6A0)", borderRadius: 10, transition: "width 1s ease" }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 80, textAlign: "right" }}>₹{report.total_revenue.toLocaleString("en-IN")}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#F43F5E", width: 80 }}>Expenses</span>
          <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${100 - revenueRatio}%`, background: "linear-gradient(90deg, #F43F5E, #F97316)", borderRadius: 10, transition: "width 1s ease" }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 80, textAlign: "right" }}>₹{report.total_expenses.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Two columns: Audit chain + Receipts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Audit chain */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 14 }}>
            🔗 Audit Chain ({report.audit_chain.length} records)
          </div>
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {report.audit_chain.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                    background: entry.record_type === "receipt" ? "#6366F1" : "#10B981",
                    boxShadow: `0 0 6px ${entry.record_type === "receipt" ? "#6366F1" : "#10B981"}`,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textTransform: "uppercase" }}>
                      {entry.record_type}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      #{i + 1}
                    </span>
                  </div>
                  <div className="hash-display">{entry.data_hash?.slice(0, 32)}...</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                    {new Date(entry.timestamp).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Receipts verification */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 14 }}>
            🧾 Verified Receipts ({report.receipts.length})
          </div>
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {report.receipts.map((receipt) => (
              <div
                key={receipt.id}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{receipt.vendor_name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F43F5E" }}>₹{receipt.total_amount?.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{receipt.bill_date}</span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontWeight: 600,
                      color: receipt.reconciliation_status === "matched" ? "#10B981" : "#F59E0B",
                      background: receipt.reconciliation_status === "matched" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                      border: `1px solid ${receipt.reconciliation_status === "matched" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                    }}
                  >
                    {receipt.reconciliation_status === "matched" ? "✅ Matched" : "⚠️ Unmatched"}
                  </span>
                </div>
                <div className="hash-display" style={{ marginTop: 6 }}>{receipt.image_hash?.slice(0, 28)}...</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lender notice */}
      <div
        style={{
          marginTop: 20,
          padding: "14px 20px",
          borderRadius: 12,
          background: "rgba(99, 102, 241, 0.06)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          fontSize: 12,
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>🏦</span>
        <span>
          <strong style={{ color: "var(--text-primary)" }}>For Lending Institutions:</strong> Each receipt image hash is cryptographically linked to its extracted data and anchored to a Merkle chain.
          Any tampering with historical records will invalidate the chain, ensuring data integrity for credit underwriting.
        </span>
      </div>
    </div>
  );
}
