"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const BTN = "w-full flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-left outline-none focus:border-[#db254f] focus:bg-white transition cursor-pointer";
const POP = "absolute z-50 mt-2 rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 p-3";

/* Close a popover when clicking outside of it or pressing Escape. */
function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

/* ---------------- Date Picker ---------------- */
export function DatePicker({ value, onChange, placeholder = "Select date" }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  // Parse "yyyy-mm-dd" without timezone drift.
  const parsed = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null;
  })();

  const today = new Date();
  const [view, setView] = useState(() => parsed ? { y: parsed.y, mo: parsed.mo } : { y: today.getFullYear(), mo: today.getMonth() });

  useEffect(() => { if (parsed) setView({ y: parsed.y, mo: parsed.mo }); /* eslint-disable-next-line */ }, [value]);

  const label = parsed
    ? new Date(parsed.y, parsed.mo, parsed.d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const firstDay = new Date(view.y, view.mo, 1).getDay();
  const daysInMonth = new Date(view.y, view.mo + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const shift = (dy, dmo) => setView((v) => {
    let mo = v.mo + dmo, y = v.y + dy;
    if (mo < 0) { mo = 11; y -= 1; } if (mo > 11) { mo = 0; y += 1; }
    return { y, mo };
  });

  const pick = (d) => {
    const mm = String(view.mo + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${view.y}-${mm}-${dd}`);
    setOpen(false);
  };

  const isSel = (d) => parsed && parsed.y === view.y && parsed.mo === view.mo && parsed.d === d;
  const isToday = (d) => today.getFullYear() === view.y && today.getMonth() === view.mo && today.getDate() === d;

  return (
    <div className="relative dtp" ref={ref}>
      <div role="button" tabIndex={0} onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }} className={BTN}>
        <Calendar size={16} className="text-[#db254f] shrink-0" />
        <span className={`flex-1 ${label ? "text-gray-800" : "text-gray-400"}`}>{label || placeholder}</span>
        {label && <X size={14} className="text-gray-300 hover:text-rose-500 shrink-0" onClick={(e) => { e.stopPropagation(); onChange(""); }} />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }} className={`${POP} w-[17rem]`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => shift(-1, 0)} title="Previous year" className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"><ChevronsLeft size={15} /></button>
                <button type="button" onClick={() => shift(0, -1)} title="Previous month" className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"><ChevronLeft size={15} /></button>
              </div>
              <div className="text-sm font-semibold text-gray-800">{MONTHS[view.mo]} {view.y}</div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => shift(0, 1)} title="Next month" className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"><ChevronRight size={15} /></button>
                <button type="button" onClick={() => shift(1, 0)} title="Next year" className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"><ChevronsRight size={15} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => <div key={w} className="text-[11px] font-medium text-gray-400 text-center py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => d === null ? <div key={i} /> : (
                <button key={i} type="button" onClick={() => pick(d)}
                  className={`h-8 rounded-lg text-sm flex items-center justify-center transition
                    ${isSel(d) ? "bg-[#db254f] text-white font-semibold" : isToday(d) ? "text-[#db254f] font-semibold ring-1 ring-rose-200" : "text-gray-700 hover:bg-rose-50"}`}>
                  {d}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => pick(today.getDate()) || setView({ y: today.getFullYear(), mo: today.getMonth() })} className="text-xs font-medium text-[#db254f] hover:underline">Today</button>
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-700">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Time Picker ---------------- */
export function TimePicker({ value, onChange, placeholder = "Select time" }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  // value is 24h "HH:mm". Convert to 12h parts for display.
  const m = /^(\d{2}):(\d{2})$/.exec(value || "");
  const h24 = m ? +m[1] : null;
  const min = m ? +m[2] : null;
  const ampm = h24 == null ? "AM" : h24 >= 12 ? "PM" : "AM";
  const h12 = h24 == null ? null : (h24 % 12 === 0 ? 12 : h24 % 12);

  const label = m ? `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}` : "";

  const commit = (nh12, nmin, nap) => {
    const hh = nap === "PM" ? (nh12 % 12) + 12 : nh12 % 12;
    onChange(`${String(hh).padStart(2, "0")}:${String(nmin).padStart(2, "0")}`);
  };

  const curH = h12 ?? 12;
  const curM = min ?? 0;

  const Col = ({ items, active, render, onPick }) => (
    <div className="h-44 overflow-y-auto no-scrollbar flex flex-col gap-1 px-1">
      {items.map((it) => (
        <button key={it} type="button" onClick={() => onPick(it)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition ${active === it ? "bg-[#db254f] text-white font-semibold" : "text-gray-700 hover:bg-rose-50"}`}>
          {render ? render(it) : it}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative dtp" ref={ref}>
      <div role="button" tabIndex={0} onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }} className={BTN}>
        <Clock size={16} className="text-[#db254f] shrink-0" />
        <span className={`flex-1 ${label ? "text-gray-800" : "text-gray-400"}`}>{label || placeholder}</span>
        {label && <X size={14} className="text-gray-300 hover:text-rose-500 shrink-0" onClick={(e) => { e.stopPropagation(); onChange(""); }} />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }} className={`${POP} w-[15rem]`}>
            <div className="flex items-stretch gap-1">
              <div className="flex-1">
                <div className="text-[11px] font-medium text-gray-400 text-center mb-1">Hour</div>
                <Col items={Array.from({ length: 12 }, (_, i) => i + 1)} active={curH} render={(n) => String(n).padStart(2, "0")} onPick={(n) => commit(n, curM, ampm)} />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-medium text-gray-400 text-center mb-1">Minute</div>
                <Col items={Array.from({ length: 60 }, (_, i) => i)} active={curM} render={(n) => String(n).padStart(2, "0")} onPick={(n) => commit(curH, n, ampm)} />
              </div>
              <div className="w-14">
                <div className="text-[11px] font-medium text-gray-400 text-center mb-1">&nbsp;</div>
                <div className="flex flex-col gap-1 px-1">
                  {["AM", "PM"].map((ap) => (
                    <button key={ap} type="button" onClick={() => commit(curH, curM, ap)}
                      className={`px-2 py-1.5 rounded-lg text-sm transition ${ampm === ap ? "bg-[#db254f] text-white font-semibold" : "text-gray-700 hover:bg-rose-50"}`}>{ap}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => { const n = new Date(); const hh = n.getHours() % 12 === 0 ? 12 : n.getHours() % 12; commit(hh, n.getMinutes(), n.getHours() >= 12 ? "PM" : "AM"); }} className="text-xs font-medium text-[#db254f] hover:underline">Now</button>
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-700">Done</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
