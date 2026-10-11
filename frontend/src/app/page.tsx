"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import VoiceLedger from "@/components/VoiceLedger";
import ReceiptScanner from "@/components/ReceiptScanner";
import UnderwritingDashboard from "@/components/UnderwritingDashboard";
import SchemeMatcher from "@/components/SchemeMatcher";
import LedgerTable from "@/components/LedgerTable";

export type Tab = "ledger" | "receipts" | "underwriting" | "schemes";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("ledger");
  const [merchantId] = useState("merchant_001");
  const [language, setLanguage] = useState("hi-IN");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: "32px 32px 32px 32px" }}>
        {activeTab === "ledger" && (
          <div>
            <VoiceLedger
              merchantId={merchantId}
              language={language}
              onEntryAdded={refresh}
            />
            <div style={{ marginTop: 32 }}>
              <LedgerTable merchantId={merchantId} refreshKey={refreshKey} />
            </div>
          </div>
        )}
        {activeTab === "receipts" && (
          <ReceiptScanner merchantId={merchantId} onUploaded={refresh} />
        )}
        {activeTab === "underwriting" && (
          <UnderwritingDashboard merchantId={merchantId} refreshKey={refreshKey} />
        )}
        {activeTab === "schemes" && (
          <SchemeMatcher merchantId={merchantId} language={language} />
        )}
      </main>
    </div>
  );
}
