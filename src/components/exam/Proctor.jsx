"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck, Loader2, Radio } from "lucide-react";

// MediaPipe is loaded on-demand from a CDN (no npm dependency / bundle bloat).
const MP_VERSION = "0.10.14";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// A violation must persist this long (ms) before it's flagged — avoids false alarms.
const SUSTAIN = { no_face: 3000, multiple_faces: 1500, looking_away: 3000 };
const COOLDOWN = 8000; // min gap (ms) between repeated flags of the same type

// Bundler-proof native dynamic import (works under webpack AND turbopack).
const dynamicImport = (url) => new Function("u", "return import(u)")(url);

// MediaPipe / TFLite print harmless init logs (e.g. "INFO: Created TensorFlow
// Lite XNNPACK delegate for CPU.") via console.error, which Next's dev overlay
// flags as a "Console Error". Swallow just those lines while proctoring runs.
function filterMpLogs() {
  if (typeof window === "undefined" || window.__mpLogFiltered) return () => {};
  const orig = console.error;
  const noisy = /XNNPACK|TensorFlow Lite|Created .*delegate|\bGL version\b|gl_context|OpenGL/i;
  console.error = (...args) => { if (typeof args[0] === "string" && noisy.test(args[0])) return; orig.apply(console, args); };
  window.__mpLogFiltered = true;
  return () => { console.error = orig; window.__mpLogFiltered = false; };
}

export default function Proctor({ stream, active, startAt, onFlag, controlsRef }) {
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const stopResolveRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const sinceRef = useRef({});     // when each violation started
  const lastFlagRef = useRef({});  // when each violation was last reported
  const runningRef = useRef(false);

  const [status, setStatus] = useState("starting"); // starting | ok | warn
  const [label, setLabel] = useState("Starting camera…");

  /* Attach stream + start recording */
  useEffect(() => {
    if (!stream) return;
    const v = videoRef.current;
    if (v && v.srcObject !== stream) { v.srcObject = stream; v.muted = true; v.playsInline = true; v.play().catch(() => {}); }
    try {
      chunksRef.current = [];
      const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
        : (MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "");
      // Low bitrate — a full 30-min exam stays small enough to upload (proctoring
      // only needs the face to be visible, not high quality).
      const recOpts = { videoBitsPerSecond: 250000, audioBitsPerSecond: 24000 };
      const mr = type ? new MediaRecorder(stream, { mimeType: type, ...recOpts }) : new MediaRecorder(stream, recOpts);
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => { const blob = new Blob(chunksRef.current, { type: "video/webm" }); if (stopResolveRef.current) { stopResolveRef.current(blob); stopResolveRef.current = null; } };
      mr.start(2000);
      recorderRef.current = mr;
    } catch { recorderRef.current = null; }
    return () => { try { if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop(); } catch { /* noop */ } };
  }, [stream]);

  /* Expose stop() to the exam page (returns the recorded blob) */
  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      stop: () => new Promise((resolve) => {
        const mr = recorderRef.current;
        const blobNow = () => new Blob(chunksRef.current, { type: "video/webm" });
        if (!mr || mr.state === "inactive") { resolve(blobNow()); return; }
        stopResolveRef.current = resolve;
        try { mr.stop(); } catch { resolve(blobNow()); }
        setTimeout(() => { if (stopResolveRef.current) { stopResolveRef.current(blobNow()); stopResolveRef.current = null; } }, 4000);
      }),
    };
  }, [controlsRef]);

  /* Load MediaPipe + run the head/eye tracking loop */
  useEffect(() => {
    if (!stream || !active) return;
    let cancelled = false;
    runningRef.current = true;
    const restoreLogs = filterMpLogs(); // hide MediaPipe/TFLite console noise

    const now = () => performance.now();
    const raise = (type) => {
      const t = Date.now();
      if (lastFlagRef.current[type] && t - lastFlagRef.current[type] < COOLDOWN) return;
      lastFlagRef.current[type] = t;
      onFlag?.(type, startAt ? Math.round((Date.now() - startAt) / 1000) : 0);
    };
    const track = (type, violating, sustainMs) => {
      if (violating) {
        if (!sinceRef.current[type]) sinceRef.current[type] = now();
        else if (now() - sinceRef.current[type] >= sustainMs) raise(type);
      } else { sinceRef.current[type] = 0; }
    };

    let lastRun = 0;
    const loop = () => {
      if (cancelled || !runningRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
      const v = videoRef.current, lm = landmarkerRef.current;
      if (!v || !lm || v.readyState < 2) return;
      const t = now();
      if (t - lastRun < 450) return; // throttle to ~2 fps
      lastRun = t;
      let res; try { res = lm.detectForVideo(v, t); } catch { return; }
      const faces = res?.faceLandmarks || [];
      const n = faces.length;
      track("no_face", n === 0, SUSTAIN.no_face);
      track("multiple_faces", n > 1, SUSTAIN.multiple_faces);
      const away = n === 1 ? isLookingAway(faces[0], res?.faceBlendshapes?.[0]) : false;
      track("looking_away", away, SUSTAIN.looking_away);
      if (n === 0) { setStatus("warn"); setLabel("Face not visible"); }
      else if (n > 1) { setStatus("warn"); setLabel("Multiple people detected"); }
      else if (away) { setStatus("warn"); setLabel("Please look at the screen"); }
      else { setStatus("ok"); setLabel("Proctoring active"); }
    };

    (async () => {
      let vision, fileset, landmarker;
      try {
        vision = await dynamicImport(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`);
        fileset = await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`);
        const opts = { baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" }, runningMode: "VIDEO", numFaces: 3, outputFaceBlendshapes: true };
        try { landmarker = await vision.FaceLandmarker.createFromOptions(fileset, opts); }
        catch { landmarker = await vision.FaceLandmarker.createFromOptions(fileset, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "CPU" } }); }
      } catch {
        if (!cancelled) { setStatus("ok"); setLabel("Recording (tracking off)"); } // degrade gracefully
        return;
      }
      if (cancelled) { try { landmarker.close(); } catch { /* noop */ } return; }
      landmarkerRef.current = landmarker;
      if (!cancelled) { setStatus("ok"); setLabel("Proctoring active"); }
      loop();
    })();

    return () => {
      cancelled = true; runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { landmarkerRef.current?.close(); } catch { /* noop */ }
      landmarkerRef.current = null;
      restoreLogs();
    };
  }, [stream, active, startAt, onFlag]);

  const warn = status === "warn";
  return (
    <div className="fixed bottom-4 right-4 z-40 rounded-xl overflow-hidden shadow-xl border pf-border" style={{ width: 168, background: "#000" }}>
      <div className="relative" style={{ width: 168, height: 112 }}>
        <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} playsInline muted autoPlay />
        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: "rgba(220,38,38,0.85)" }}><Radio size={9} /> REC</span>
      </div>
      <div className={`px-2 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${warn ? "text-amber-300" : "text-emerald-300"}`} style={{ background: "#111" }}>
        {status === "starting" ? <Loader2 size={12} className="animate-spin" /> : warn ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

// Head-turn (landmarks) + eye-gaze (blendshapes) heuristic → true when looking away.
function isLookingAway(landmarks, blendshapes) {
  try {
    const nose = landmarks[1], L = landmarks[234], R = landmarks[454];
    if (nose && L && R) {
      const w = R.x - L.x;
      if (Math.abs(w) > 0.001) {
        const ratio = (nose.x - L.x) / w; // ~0.5 when facing forward
        if (ratio < 0.34 || ratio > 0.66) return true; // head turned sideways
      }
    }
    const cats = blendshapes?.categories || [];
    const get = (name) => cats.find((c) => c.categoryName === name)?.score || 0;
    const horiz = Math.max(get("eyeLookOutLeft"), get("eyeLookOutRight"), get("eyeLookInLeft"), get("eyeLookInRight"));
    const down = Math.max(get("eyeLookDownLeft"), get("eyeLookDownRight"));
    if (horiz > 0.7 || down > 0.78) return true; // eyes strongly off-centre / looking down
    return false;
  } catch { return false; }
}
