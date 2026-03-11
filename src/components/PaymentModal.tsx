"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface CustomerDetails {
  customerName: string;
  customerIdNumber: string;
}

interface PaymentModalProps {
  /** When set, skip the form and show the iframe directly */
  url: string | null;
  /** Called when the user submits the customer details form */
  onSubmitDetails: (details: CustomerDetails) => void;
  /** Loading state while fetching payment URL after form submission */
  loading?: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export default function PaymentModal({
  url,
  onSubmitDetails,
  loading,
  onComplete,
  onClose,
}: PaymentModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [formError, setFormError] = useState("");

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data === "payment-complete") {
        onComplete();
      }
    },
    [onComplete],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmedName = name.trim();
    const trimmedId = idNumber.trim();

    if (!trimmedName) {
      setFormError("נא להזין שם לקוח או שם חברה");
      return;
    }
    if (!trimmedId) {
      setFormError("נא להזין ת.ז / ח.פ / עוסק מורשה");
      return;
    }

    onSubmitDetails({
      customerName: trimmedName,
      customerIdNumber: trimmedId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      {!url ? (
        /* Step 1: Customer details form */
        <div
          className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl p-8"
          dir="rtl"
          style={{ background: "#fff" }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition-all"
            style={{ fontSize: "16px" }}
          >
            ✕
          </button>
          <h3 className="text-lg font-bold text-gray-900 mb-1">פרטים לחשבונית</h3>
          <p className="text-sm text-gray-500 mb-6">
            הפרטים יופיעו בחשבונית המס שתונפק
          </p>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                שם לקוח / שם חברה
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: ישראל ישראלי / חברת אקמה בע״מ"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-right text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ת.ז / ח.פ / עוסק מורשה
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="מספר תעודת זהות או מספר עוסק"
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-left text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-500">{formError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
              }}
            >
              {loading ? "טוען..." : "המשך לתשלום"}
            </button>
          </form>
        </div>
      ) : (
        /* Step 2: Payment iframe */
        <div
          className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            height: "min(85vh, 700px)",
            background: "#fff",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-500 hover:bg-gray-200 cursor-pointer transition-all shadow-md"
            style={{ fontSize: "16px" }}
          >
            ✕
          </button>
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            allow="payment"
            title="תשלום"
          />
        </div>
      )}
    </div>
  );
}
