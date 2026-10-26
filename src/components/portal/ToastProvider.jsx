"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { onToast, emitToast } from "@/lib/toastBus";

const ToastContext = createContext(null);

const TYPES = {
  success: { Icon: CheckCircle2, ic: "text-emerald-500", bar: "bg-emerald-500" },
  error:   { Icon: XCircle,      ic: "text-rose-500",    bar: "bg-rose-500" },
  info:    { Icon: Info,         ic: "text-indigo-500",  bar: "bg-indigo-500" },
};

// Stacked toast notifications. Mounted once in the admin layout. Any save /
// update / delete through apiFetch raises one automatically; pages can also
// call useToast().success("…") / .error("…") for custom messages.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((toast) => {
    setToasts((t) => [...t.slice(-3), toast]); // keep at most 4 on screen
    if (toast.duration !== 0) {
      setTimeout(() => remove(toast.id), toast.duration || 3200);
    }
  }, [remove]);

  // Subscribe to the global bus (apiFetch auto-toasts + manual emitToast calls).
  useEffect(() => onToast(push), [push]);

  return (
    <ToastContext.Provider value={emitToast}>
      {children}
      <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(16px) scale(.97)}to{opacity:1;transform:none}}`}</style>
        {toasts.map((t) => {
          const cfg = TYPES[t.type] || TYPES.info;
          const { Icon } = cfg;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-xl shadow-lg pl-0 pr-3 py-3 overflow-hidden"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid rgba(var(--fg-rgb),0.10)",
                color: "rgba(var(--fg-rgb),0.92)",
                animation: "toastIn .22s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <span className={`self-stretch w-1 rounded-full ${cfg.bar} shrink-0`} />
              <Icon size={19} className={`${cfg.ic} shrink-0 mt-0.5`} />
              <p className="text-sm font-medium leading-snug flex-1 min-w-0 break-words">
                {t.message}
              </p>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="shrink-0 -mt-0.5 opacity-50 hover:opacity-100 transition"
                style={{ color: "rgba(var(--fg-rgb),0.9)" }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Optional manual API: const toast = useToast(); toast.success("Saved");
export function useToast() {
  const emit = useContext(ToastContext) || emitToast;
  return {
    success: (message, opts) => emit({ type: "success", message, ...opts }),
    error: (message, opts) => emit({ type: "error", message, ...opts }),
    info: (message, opts) => emit({ type: "info", message, ...opts }),
    show: (opts) => emit(opts),
  };
}
