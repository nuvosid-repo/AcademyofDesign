"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Award, Download, Loader2, Ban } from "lucide-react";

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; }
}

export default function CertificatePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | invalid

  useEffect(() => {
    fetch(`/api/public/certificate/${token}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.eligible) { setData(d); setState("ok"); } else setState("invalid"); })
      .catch(() => setState("invalid"));
  }, [token]);

  if (state === "loading") {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}><Loader2 className="animate-spin" color="#db254f" size={30} /></div>;
  }
  if (state === "invalid") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#f3f4f6", color: "#6b7280", fontFamily: "system-ui, sans-serif" }}>
        <Ban size={34} />
        <p>This certificate is not available — the course is not completed yet.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#eceef2", padding: "32px 16px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } .cert-wrap { padding: 0 !important; } }`}</style>
      <div className="cert-wrap" style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#db254f", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>
            <Download size={16} /> Download / Print
          </button>
        </div>

        {/* Certificate */}
        <div style={{ background: "#fff", border: "2px solid #db254f", borderRadius: 8, padding: 10, boxShadow: "0 20px 50px -20px rgba(0,0,0,0.3)" }}>
          <div style={{ border: "1px solid #e9b8c4", borderRadius: 4, padding: "48px 56px", textAlign: "center", position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#db254f,#e56b85)", color: "#fff", marginBottom: 18 }}>
              <Award size={32} />
            </div>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.3em", color: "#db254f", fontSize: 12, fontWeight: 700, margin: 0, fontFamily: "system-ui, sans-serif" }}>Nuvosid Academy of Design</p>
            <h1 style={{ fontSize: 40, color: "#1a1a1a", margin: "14px 0 6px", fontWeight: 400 }}>Certificate of Completion</h1>
            <p style={{ color: "#777", fontSize: 15, margin: 0 }}>This is proudly presented to</p>

            <h2 style={{ fontSize: 34, color: "#db254f", margin: "18px 0 10px", fontWeight: 700 }}>{data.studentName}</h2>

            <p style={{ color: "#555", fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
              for successfully completing the course
              <br />
              <strong style={{ color: "#1a1a1a", fontSize: 18 }}>{data.courseTitle}</strong>
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 52, fontFamily: "system-ui, sans-serif" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, color: "#1a1a1a", borderTop: "1px solid #999", paddingTop: 6, minWidth: 160 }}>{fmtDate(data.issuedDate)}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Date</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, color: "#db254f", fontFamily: "'Segoe Script', cursive", borderTop: "1px solid #999", paddingTop: 6, minWidth: 160 }}>Nuvosid</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Authorised Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
