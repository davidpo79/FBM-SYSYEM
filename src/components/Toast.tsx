"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

/* ─── Types ─── */
type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/* ─── Icons ─── */
const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
};

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: "#22C55E" },
  error: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", icon: "#EF4444" },
  info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "#3B82F6" },
  warning: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", icon: "#F59E0B" },
};

/* ─── Toast Item ─── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const colors = COLORS[toast.type];

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), toast.duration - 300);
    const removeTimer = setTimeout(onDismiss, toast.duration);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, [toast.duration, onDismiss]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        animation: exiting ? "toastOut 0.3s ease forwards" : "toastIn 0.3s ease forwards",
      }}
      dir="rtl"
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: colors.icon, color: "white" }}
      >
        {ICONS[toast.type]}
      </span>
      <span className="text-sm font-medium flex-1" style={{ color: colors.text }}>
        {toast.message}
      </span>
      <button
        onClick={() => { setExiting(true); setTimeout(onDismiss, 300); }}
        className="text-sm opacity-50 hover:opacity-100 cursor-pointer flex-shrink-0"
        style={{ color: colors.text }}
      >
        ✕
      </button>
    </div>
  );
}

/* ─── Provider ─── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toasts,
    success: useCallback((msg, dur) => addToast("success", msg, dur), [addToast]),
    error: useCallback((msg, dur) => addToast("error", msg, dur), [addToast]),
    info: useCallback((msg, dur) => addToast("info", msg, dur), [addToast]),
    warning: useCallback((msg, dur) => addToast("warning", msg, dur), [addToast]),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container — fixed bottom-left for RTL */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2"
          style={{ pointerEvents: "auto" }}
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
