"use client";
import { Check } from "lucide-react";

// Light, custom-styled checkbox. Visibility of the tick is driven by the
// `checked` prop directly (not CSS peer selectors) so it always shows/hides
// reliably. `label` may be a string or a node.
export default function Checkbox({ checked, onChange, label, className = "" }) {
  return (
    <label className={`group inline-flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <input type="checkbox" checked={!!checked} onChange={onChange} className="sr-only" />
      <span
        className={`w-[18px] h-[18px] rounded-[6px] border flex items-center justify-center transition-colors ${
          checked
            ? "bg-[#db254f] border-[#db254f]"
            : "bg-white border-gray-300 group-hover:border-[#db254f]"
        }`}
      >
        <Check
          size={12}
          strokeWidth={3.5}
          className={`text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}
        />
      </span>
      {label != null && <span className="leading-none">{label}</span>}
    </label>
  );
}
