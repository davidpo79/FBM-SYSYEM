"use client";

import { useEffect } from "react";

export default function PaymentCompletePage() {
  useEffect(() => {
    // Notify parent window (PaymentModal iframe) that payment is done
    if (window.parent !== window) {
      window.parent.postMessage("payment-complete", "*");
    }
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      dir="rtl"
      style={{ background: "#f8f9fa" }}
    >
      <div className="text-center p-8">
        <div className="text-5xl mb-4">&#10003;</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "#22c55e" }}>
          התשלום בוצע בהצלחה!
        </h1>
        <p className="text-sm text-gray-500">
          החלון ייסגר אוטומטית...
        </p>
      </div>
    </div>
  );
}
