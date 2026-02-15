"use client";

import { useState, useRef, useEffect } from "react";

interface SuggestImprovementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "שלום! אשמח לשמוע את ההצעה שלך לשיפור המערכת. ספר/י לי מה חסר לך או מה היית רוצה שישופר ב-FBM Studio.",
};

export default function SuggestImprovementPanel({
  isOpen,
  onClose,
}: SuggestImprovementPanelProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Reset state on close
  const handleClose = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setSubmitted(false);
    setError("");
    onClose();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/suggest-improvement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: updatedMessages,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const aiMessage: Message = {
        role: "assistant",
        content:
          data.reply ||
          "תודה! קיבלתי. יש עוד משהו שהיית רוצה להוסיף?",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "מצטער, משהו השתבש. נסה שוב.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToDavid = async () => {
    setIsLoading(true);
    setError("");

    // Auto-generate title from the first user message
    const firstUserMessage = messages.find((m) => m.role === "user");
    const title = firstUserMessage
      ? firstUserMessage.content.slice(0, 100)
      : "הצעת שיפור";

    try {
      const res = await fetch("/api/suggest-improvement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          title,
          conversation: messages,
        }),
      });

      if (!res.ok) throw new Error("Failed to send");

      setSubmitted(true);
    } catch {
      setError("שגיאה בשליחה. נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Check if user has sent at least one message (to enable "send to David")
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const canSubmit = userMessageCount >= 1;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
      />

      {/* Sliding Panel from Left */}
      <div
        className="fixed top-0 left-0 h-screen z-50 flex flex-col"
        style={{
          width: "min(420px, 100vw)",
          backgroundColor: "#0F1117",
          boxShadow: "8px 0 32px rgba(0, 0, 0, 0.3)",
          animation: "slideInFromLeft 0.3s ease-out",
        }}
        dir="rtl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{
            borderBottom: "1px solid #2A2D3A",
            background:
              "linear-gradient(135deg, rgba(212, 168, 67, 0.08) 0%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D4A843"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <circle cx="12" cy="12" r="4" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
            <span className="font-bold text-sm text-white">
              הצעה לשיפור המערכת
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "#9DA3B4" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FFFFFF";
              e.currentTarget.style.backgroundColor = "#1A1D2A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9DA3B4";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className="flex-1 flex items-center justify-center px-6 animate-in">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-4"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-lg font-bold mb-2 text-white">
                ההצעה נשלחה בהצלחה!
              </p>
              <p className="text-sm" style={{ color: "#9DA3B4" }}>
                תודה על המשוב
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    style={
                      msg.role === "user"
                        ? {
                            backgroundColor: "var(--gold, #D4A843)",
                            color: "#0F1117",
                            borderBottomRightRadius: "6px",
                          }
                        : {
                            backgroundColor: "#1A1D2A",
                            color: "#FFFFFF",
                            border: "1px solid #2A2D3A",
                            borderBottomLeftRadius: "6px",
                          }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Loading dots animation */}
              {isLoading && (
                <div className="flex justify-end">
                  <div
                    className="px-4 py-3 rounded-2xl text-sm"
                    style={{
                      backgroundColor: "#1A1D2A",
                      border: "1px solid #2A2D3A",
                      color: "#9DA3B4",
                    }}
                  >
                    <span className="inline-flex gap-1 items-center">
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{
                          backgroundColor: "#D4A843",
                          animation: "dotBounce 1.4s infinite ease-in-out",
                          animationDelay: "0ms",
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{
                          backgroundColor: "#D4A843",
                          animation: "dotBounce 1.4s infinite ease-in-out",
                          animationDelay: "200ms",
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{
                          backgroundColor: "#D4A843",
                          animation: "dotBounce 1.4s infinite ease-in-out",
                          animationDelay: "400ms",
                        }}
                      />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* "Send to David" button */}
            {canSubmit && (
              <div
                className="px-4 py-3 flex-shrink-0"
                style={{ borderTop: "1px solid #2A2D3A" }}
              >
                {error && (
                  <p className="text-xs text-red-400 mb-2">{error}</p>
                )}
                <button
                  type="button"
                  onClick={handleSendToDavid}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--gold, #D4A843)",
                    color: "#0F1117",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.opacity = "0.9";
                      e.currentTarget.style.transform = "scale(1.01)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {isLoading ? "שולח..." : "שלח לדוד"}
                </button>
              </div>
            )}

            {/* Chat Input */}
            <div
              className="px-4 py-3 flex-shrink-0"
              style={{ borderTop: "1px solid #2A2D3A" }}
            >
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  border: "1.5px solid #2A2D3A",
                  backgroundColor: "#1A1D2A",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="כתוב את ההצעה שלך..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm outline-none text-white placeholder-[#6B7084]"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: input.trim()
                      ? "var(--gold, #D4A843)"
                      : "transparent",
                    color: input.trim() ? "#0F1117" : "#6B7084",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: "rotate(180deg)" }}
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        <style jsx>{`
          @keyframes slideInFromLeft {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
          @keyframes dotBounce {
            0%,
            80%,
            100% {
              transform: scale(0.6);
              opacity: 0.4;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </>
  );
}
