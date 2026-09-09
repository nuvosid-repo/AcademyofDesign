"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

// Multi-select dropdown with search + checkboxes. `values` is an array of the
// selected option strings; `onChange` receives the new array.
export default function MultiSelect({ options, values = [], onChange, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const toggle = (o) => onChange(values.includes(o) ? values.filter((x) => x !== o) : [...values, o]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f]"
      >
        <span className={values.length ? "text-gray-800" : "text-gray-400"}>
          {values.length ? `${values.length} selected` : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-[#db254f]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
            {filtered.length === 0 && <div className="px-2 py-2 text-sm text-gray-400">No results</div>}
            {filtered.map((o) => {
              const checked = values.includes(o);
              return (
                <button
                  type="button"
                  key={o}
                  onClick={() => toggle(o)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left"
                >
                  <span
                    className={`w-[18px] h-[18px] rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${
                      checked ? "bg-[#db254f] border-[#db254f]" : "bg-white border-gray-300"
                    }`}
                  >
                    {checked && <Check size={12} strokeWidth={3.5} className="text-white" />}
                  </span>
                  <span className="text-sm text-gray-700">{o}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
