import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AlertTriangle, CheckCircle2, XCircle, TrendingUp, Package, FileWarning, ChevronRight, X, Loader2, WifiOff } from "lucide-react";

// ---------- Backend connection ----------
// Live API — swap this if you redeploy under a different URL.
const API_BASE = "https://customs-risk-and-backend-1.onrender.com";

function riskTier(score) {
  if (score >= 55) return { label: "High", key: "high" };
  if (score >= 25) return { label: "Medium", key: "medium" };
  return { label: "Low", key: "low" };
}

// Normalizes a record from the API (snake_case, no tier object) into the
// shape the UI below expects.
function normalize(r) {
  return {
    ...r,
    declaredUnitPrice: r.declared_unit_price,
    expectedUnitPrice: r.expected_unit_price,
    declaredValue: r.declared_value,
    dutyPaid: r.duty_paid,
    historicalAvgFilings: r.historical_avg_filings,
    currentFilings: r.current_filings,
    date: r.filed_at ? r.filed_at.slice(0, 10) : "",
    unit: r.unit_label,
    score: r.risk_score,
    tier: riskTier(r.risk_score),
  };
}

// ---------- Design tokens ----------

const COLORS = {
  ink: "#12181C",
  inkRaised: "#1A2227",
  inkBorder: "#2A343A",
  paper: "#EDE6D6",
  paperDim: "#B8AF9B",
  amber: "#C68A2E",
  crimson: "#B23A34",
  teal: "#4F8577",
};

function StampBadge({ score, tier }) {
  const color = tier.key === "high" ? COLORS.crimson : tier.key === "medium" ? COLORS.amber : COLORS.teal;
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-6deg)",
        flexShrink: 0,
        background: "rgba(0,0,0,0.15)",
        boxShadow: `0 0 0 1px ${color}33 inset`,
      }}
    >
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>
        {score}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: 1, color, opacity: 0.85, marginTop: 1 }}>
        RISK
      </span>
    </div>
  );
}

export default function CustomsRiskReview() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterTier, setFilterTier] = useState("all");
  const [reviewLog, setReviewLog] = useState({ confirmed: 0, cleared: 0 });
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const fileInputRef = React.useRef(null);

  const loadDeclarations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const wakeTimer = setTimeout(() => setWaking(true), 4000); // free-tier can sleep; let the user know why it's slow
    try {
      const res = await fetch(`${API_BASE}/declarations?status=pending`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setRecords(data.map(normalize));
    } catch (err) {
      setError(err.message || "Could not reach the server");
    } finally {
      clearTimeout(wakeTimer);
      setWaking(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeclarations();
  }, [loadDeclarations]);

  const scored = useMemo(() => [...records].sort((a, b) => b.score - a.score), [records]);

  const filtered = filterTier === "all" ? scored : scored.filter((r) => r.tier.key === filterTier);

  const highCount = scored.filter((r) => r.tier.key === "high").length;
  const mediumCount = scored.filter((r) => r.tier.key === "medium").length;
  const revenueAtRisk = scored
    .filter((r) => r.tier.key !== "low")
    .reduce((sum, r) => sum + Math.abs(r.declaredValue * (1 - r.declaredUnitPrice / r.expectedUnitPrice)) * 0.15, 0);

  async function actOn(id, action) {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/declarations/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      // Case is now resolved on the backend — drop it from the pending queue here too.
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setReviewLog((prev) => ({
        ...prev,
        [action === "confirmed" ? "confirmed" : "cleared"]: prev[action === "confirmed" ? "confirmed" : "cleared"] + 1,
      }));
      setSelected(null);
    } catch (err) {
      setError(`Couldn't save that review: ${err.message || "unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/declarations/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Server responded with ${res.status}`);
      setUploadMessage({ ok: true, text: data.message + (data.errors && data.errors.length ? ` (${data.errors.length} row issue(s))` : "") });
      await loadDeclarations();
    } catch (err) {
      setUploadMessage({ ok: false, text: err.message || "Upload failed" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.ink,
        color: COLORS.paper,
        fontFamily: "'IBM Plex Sans', sans-serif",
        padding: "0 0 48px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        ::selection { background: ${COLORS.amber}55; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${COLORS.inkBorder}`,
          padding: "28px 32px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 2, color: COLORS.amber, marginBottom: 8 }}>
            REVENUE INTEGRITY — PILOT DEMO
          </div>
          <h1 style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 30, fontWeight: 600, margin: 0, color: COLORS.paper }}>
            Customs &amp; VAT Risk Review
          </h1>
          <p style={{ margin: "6px 0 0", color: COLORS.paperDim, fontSize: 14, maxWidth: 520 }}>
            Declarations ranked by anomaly score against sector pricing and filing history. Live data from the pilot backend — sample records for now, ready to swap for real declarations.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.paperDim }}>
            <span>Confirmed: <b style={{ color: COLORS.crimson }}>{reviewLog.confirmed}</b></span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>Cleared: <b style={{ color: COLORS.teal }}>{reviewLog.cleared}</b></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: error ? COLORS.crimson : COLORS.teal }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: error ? COLORS.crimson : COLORS.teal, display: "inline-block" }} />
            {error ? "Connection issue" : "Live — connected to backend"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <a
              href={`${API_BASE}/declarations/upload/template`}
              style={{
                fontSize: 11.5,
                color: COLORS.paperDim,
                textDecoration: "underline",
                alignSelf: "center",
              }}
            >
              Download CSV template
            </a>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={uploading}
              style={{
                background: COLORS.teal,
                border: "none",
                color: COLORS.ink,
                borderRadius: 3,
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {uploading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {uploading ? "Uploading…" : "Upload declarations CSV"}
            </button>
          </div>
          {uploadMessage && (
            <div style={{ fontSize: 11.5, color: uploadMessage.ok ? COLORS.teal : COLORS.crimson, maxWidth: 260, textAlign: "right" }}>
              {uploadMessage.text}
            </div>
          )}
        </div>
      </header>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", color: COLORS.paperDim, gap: 12 }}>
          <Loader2 size={22} className="spin" style={{ animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 13.5 }}>Loading declarations from the live backend…</div>
          {waking && (
            <div style={{ fontSize: 12, maxWidth: 320, textAlign: "center", opacity: 0.8 }}>
              The free-tier server goes to sleep when idle — first load can take up to a minute to wake it up.
            </div>
          )}
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            margin: "24px 32px 0",
            padding: "16px 18px",
            border: `1px solid ${COLORS.crimson}`,
            borderRadius: 4,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <WifiOff size={18} color={COLORS.crimson} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13.5 }}>
            <div style={{ marginBottom: 6 }}>{error}</div>
            <button
              onClick={loadDeclarations}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.crimson}`,
                color: COLORS.crimson,
                borderRadius: 3,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary strip */}
      {!loading && !error && (
      <div style={{ display: "flex", gap: 1, background: COLORS.inkBorder, margin: "0 32px", marginTop: 24 }}>
        {[
          { label: "Pending review", value: records.length, icon: Package, color: COLORS.paper },
          { label: "High risk", value: highCount, icon: AlertTriangle, color: COLORS.crimson },
          { label: "Medium risk", value: mediumCount, icon: FileWarning, color: COLORS.amber },
          { label: "Est. duty at risk", value: `$${revenueAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: COLORS.teal },
        ].map((stat) => (
          <div key={stat.label} style={{ flex: 1, background: COLORS.inkRaised, padding: "18px 20px", minWidth: 140 }}>
            <stat.icon size={16} color={stat.color} style={{ marginBottom: 10 }} />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: COLORS.paperDim, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      )}

      {/* Filter row */}
      {!loading && !error && (
      <div style={{ display: "flex", gap: 8, padding: "20px 32px 12px" }}>
        {[
          { key: "all", label: "All" },
          { key: "high", label: "High" },
          { key: "medium", label: "Medium" },
          { key: "low", label: "Low" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterTier(f.key)}
            style={{
              background: filterTier === f.key ? COLORS.paper : "transparent",
              color: filterTier === f.key ? COLORS.ink : COLORS.paperDim,
              border: `1px solid ${filterTier === f.key ? COLORS.paper : COLORS.inkBorder}`,
              borderRadius: 3,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      )}

      {/* Table */}
      {!loading && !error && (
      <div style={{ padding: "0 32px" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: COLORS.paperDim, fontSize: 14 }}>
            No declarations in this queue right now.
          </div>
        )}
        {filtered.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "16px 18px",
              borderBottom: `1px solid ${COLORS.inkBorder}`,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.inkRaised)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <StampBadge score={r.score} tier={r.tier} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.paperDim }}>{r.id}</span>
                <span style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 16, fontWeight: 600 }}>{r.company}</span>
              </div>
              <div style={{ fontSize: 13, color: COLORS.paperDim, marginTop: 2 }}>
                {r.sector} · {r.quantity} units · declared ${r.declaredValue.toLocaleString()} · {r.date}
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.paperDim} />
          </div>
        ))}
      </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 100%)",
              height: "100%",
              background: COLORS.inkRaised,
              borderLeft: `1px solid ${COLORS.inkBorder}`,
              padding: 28,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.paperDim }}>{selected.id}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: COLORS.paperDim }}>
                <X size={18} />
              </button>
            </div>
            <h2 style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 22, margin: "4px 0 20px" }}>{selected.company}</h2>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <StampBadge score={selected.score} tier={selected.tier} />
              <div>
                <div style={{ fontSize: 13, color: COLORS.paperDim }}>Risk tier</div>
                <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 17, fontWeight: 600 }}>{selected.tier.label}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {[
                ["Sector", selected.sector],
                ["Declaration date", selected.date],
                ["Declared unit price", `$${selected.declaredUnitPrice} (ref. $${selected.expectedUnitPrice})`],
                ["Quantity", `${selected.quantity} ${selected.unit.split("/")[1] || "units"}`],
                ["Declared value", `$${selected.declaredValue.toLocaleString()}`],
                ["Duty paid (15%)", `$${selected.dutyPaid.toLocaleString()}`],
                ["Filings this period", selected.currentFilings],
                ["Historical avg. filings", selected.historicalAvgFilings],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: COLORS.paperDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: COLORS.paperDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Why this was flagged
              </div>
              {selected.flags.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13.5, marginBottom: 8, lineHeight: 1.4 }}>
                  <AlertTriangle size={15} color={COLORS.amber} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => actOn(selected.id, "confirmed")}
                disabled={submitting}
                style={{
                  flex: 1,
                  background: COLORS.crimson,
                  color: COLORS.paper,
                  border: "none",
                  borderRadius: 3,
                  padding: "11px 0",
                  fontWeight: 600,
                  fontSize: 13.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <XCircle size={16} /> Confirm risk
              </button>
              <button
                onClick={() => actOn(selected.id, "cleared")}
                disabled={submitting}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: COLORS.teal,
                  border: `1px solid ${COLORS.teal}`,
                  borderRadius: 3,
                  padding: "11px 0",
                  fontWeight: 600,
                  fontSize: 13.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={16} /> {submitting ? "Saving…" : "Clear declaration"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: COLORS.paperDim, marginTop: 14, lineHeight: 1.5 }}>
              Officer decisions feed back into the scoring model over time, improving precision on future declarations from this sector.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
