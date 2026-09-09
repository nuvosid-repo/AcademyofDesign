"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// Searchable single-select dropdown (like the reference's Role picker).
export default function SearchSelect({ options, value, onChange, placeholder = "--Select--" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const pick = (v) => { onChange(v); setOpen(false); setQuery(""); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ borderRadius: "0.75rem" }}
        className="w-full flex items-center justify-between border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f]"
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>{value || placeholder}</span>
        <ChevronDown size={16} className="text-gray-400" />
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
          <div className="max-h-52 overflow-y-auto py-1">
            <button type="button" onClick={() => pick("")} className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
              {placeholder}
            </button>
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pick(o)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-rose-50 ${value === o ? "bg-rose-50 text-[#db254f] font-medium" : "text-gray-700"}`}
              >
                {o}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}
