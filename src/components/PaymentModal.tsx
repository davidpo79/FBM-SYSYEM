"use client";

import { useEffect, useRef, useCallback } from "react";

interface PaymentModalProps {
  url: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function PaymentModal({ url, onComplete, onClose }: PaymentModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-gray-700 hover:bg-white cursor-pointer transition-all shadow-lg"
        style={{ fontSize: "20px" }}
      >
        ✕
      </button>

      {/* Iframe container */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          height: "min(85vh, 700px)",
          background: "#fff",
        }}
      >
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          allow="payment"
          title="תשלום"
        />
      </div>
    </div>
  );
}
