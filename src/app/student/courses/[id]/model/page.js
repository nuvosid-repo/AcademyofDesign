"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Box, ArrowLeft, Maximize2, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";

// Wrap the admin-provided embed HTML in a minimal document so <model-viewer>,
// Sketchfab iframes, Three.js canvases etc. fill the stage cleanly.
function buildSrcDoc(html) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;width:100%;height:100%;background:#0b0b0e;overflow:hidden}
  body{display:flex;align-items:center;justify-content:center}
  iframe{width:100%;height:100%;border:0}
  model-viewer{width:100%;height:100%}
  canvas{max-width:100%;max-height:100%}
  img{max-width:100%;max-height:100%;object-fit:contain}
</style></head><body>${html}</body></html>`;
}

function ModelPreview() {
  const { id } = useParams();
  const search = useSearchParams();
  const ci = search.get("ci") || "0";

  const [state, setState] = useState("loading"); // loading | ready | error
  const [data, setData] = useState(null);         // { html, className, courseTitle }
  const [err, setErr] = useState("");
  const stageRef = useRef(null);

  useEffect(() => {
    apiFetch(`/api/student/courses/${id}/model/?ci=${encodeURIComponent(ci)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Could not load the 3D model.");
        return d;
      })
      .then((d) => { setData(d); setState("ready"); })
      .catch((e) => { setErr(e.message); setState("error"); });
  }, [id, ci]);

  const goFullscreen = () => { try { stageRef.current?.requestFullscreen?.(); } catch { /* noop */ } };

  useEffect(() => { document.title = data?.className ? `${data.className} · 3D Model` : "3D Model Preview"; }, [data]);

  return (
    <div className="pf-page h-screen w-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b pf-border" style={{ background: "var(--bg-elev)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/student/courses/${id}`} className="w-9 h-9 rounded-xl pf-chip flex items-center justify-center shrink-0 pf-hover" title="Back to course">
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#db254f] px-2 py-0.5 rounded-md" style={{ background: "rgba(219,37,79,0.1)" }}>
                <Box size={12} /> 3D Model
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold truncate mt-0.5">
              {data?.className || "3D Model Preview"}
              {data?.courseTitle ? <span className="pf-muted font-medium"> · {data.courseTitle}</span> : null}
            </h1>
          </div>
        </div>
        {state === "ready" && (
          <button onClick={goFullscreen} className="btn-pill inline-flex items-center gap-1.5 text-xs font-semibold border pf-border px-3.5 py-2 pf-hover shrink-0" title="Fullscreen">
            <Maximize2 size={14} /> <span className="hidden sm:inline">Fullscreen</span>
          </button>
        )}
      </header>

      {/* Stage */}
      <div ref={stageRef} className="flex-1 relative" style={{ background: "#0b0b0e" }}>
        {state === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
            <Loader2 className="animate-spin" size={28} />
            <p className="text-sm">Loading 3D model…</p>
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-amber-400" style={{ background: "rgba(245,158,11,0.15)" }}><AlertTriangle size={22} /></div>
            <p className="text-white/80 text-sm max-w-sm">{err}</p>
            <Link href={`/student/courses/${id}`} className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><ArrowLeft size={14} /> Back to course</Link>
          </div>
        )}
        {state === "ready" && data?.html && (
          <iframe
            title={data.className || "3D Model"}
            srcDoc={buildSrcDoc(data.html)}
            className="absolute inset-0 w-full h-full"
            // Admin-authored content, isolated in its own frame. allow-scripts
            // lets 3D libraries run; allow-same-origin keeps embeds (Sketchfab,
            // model-viewer) working.
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
            allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope; autoplay"
          />
        )}
      </div>
    </div>
  );
}

export default function ModelPreviewPage() {
  return (
    <Suspense fallback={<div className="pf-page h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#db254f]" size={28} /></div>}>
      <ModelPreview />
    </Suspense>
  );
}
