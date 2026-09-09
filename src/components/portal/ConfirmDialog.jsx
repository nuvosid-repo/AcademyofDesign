"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { AlertTriangle } from "lucide-react";

const ConfirmContext = createContext(null);

const TONES = {
  danger: { ring: "bg-rose-100 text-[#db254f]", btn: "bg-[#db254f] hover:bg-[#b91d40]" },
  warning: { ring: "bg-amber-100 text-amber-600", btn: "bg-amber-500 hover:bg-amber-600" },
};

// SweetAlert-style confirm popup. Wrap a subtree in <ConfirmProvider> and call
// the promise-returning function from useConfirm():
//   const confirm = useConfirm();
//   if (await confirm({ title, text, confirmText })) { ...delete... }
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts = {}) => {
    setState({
      title: opts.title || "Are you sure?",
      text: opts.text || "This action cannot be undone.",
      confirmText: opts.confirmText || "Yes, delete it!",
      cancelText: opts.cancelText || "Cancel",
      tone: opts.tone || "danger",
    });
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (val) => {
    setState(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(val);
  };

  const tone = state ? TONES[state.tone] || TONES.danger : null;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ "--fg-rgb": "31,41,55" }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => close(false)} />
          <div className="swal-pop relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 md:p-8 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5 ${tone.ring}`}>
              <AlertTriangle size={32} />
            </div>
            <div className="text-xl font-bold text-gray-900">{state.title}</div>
            <div className="text-sm text-gray-500 mt-2">{state.text}</div>
            <div className="grid grid-cols-2 gap-3 mt-7">
              <button
                onClick={() => close(false)}
                className="btn-pill w-full py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold whitespace-nowrap transition"
              >
                {state.cancelText}
              </button>
              <button
                onClick={() => close(true)}
                className={`btn-pill w-full py-2.5 text-white text-sm font-semibold whitespace-nowrap transition ${tone.btn}`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
