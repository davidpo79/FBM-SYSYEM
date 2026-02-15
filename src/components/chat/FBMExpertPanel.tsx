"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import SuggestedQuestions from "./SuggestedQuestions";
import TypingIndicator from "./TypingIndicator";
import { getSuggestedQuestions } from "@/lib/fbm-expert-prompt";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface FBMExpertPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string | null;
  currentPage?: string;
}

const WELCOME_MESSAGE = `שלום! 👋 אני מומחה FBM — היועץ האישי שלך לשיווק מבוסס תדר.

אני יכול לעזור לך עם:
🎯 חידוד האסטרטגיה והתדר שלך
📝 כתיבה ושיפור תסריטים
🎨 ייעוץ על קריאייטיבים
📊 הגדרת קמפיינים בפייסבוק
💡 כל שאלה על שיטת FBM

במה אוכל לעזור?`;

export default function FBMExpertPanel({
  isOpen,
  onClose,
  projectId,
  currentPage,
}: FBMExpertPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = projectId
    ? `fbm-expert-${projectId}`
    : "fbm-expert-general";

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore
    }
    // Set initial suggestions
    setSuggestedQuestions(getSuggestedQuestions(currentPage));
  }, [storageKey, currentPage]);

  // Save history
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages, storageKey]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Build context from localStorage
  const getContext = useCallback(() => {
    if (!projectId) return undefined;
    try {
      const pipelineKey = `fbm-pipeline-${projectId}`;
      const saved = localStorage.getItem(pipelineKey);
      if (!saved) return undefined;
      const data = JSON.parse(saved);
      return {
        currentPage,
        strategyDoc: data.strategy || undefined,
        niches: data.niches
          ? JSON.stringify(
              data.niches.map((n: { name: string }) => n.name),
            )
          : undefined,
        pains: data.painAnalysis || undefined,
        scripts: data.scripts || undefined,
      };
    } catch {
      return undefined;
    }
  }, [projectId, currentPage]);

  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: Message = {
        role: "user",
        content: text.trim(),
        timestamp: formatTime(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);
      setSuggestedQuestions([]);

      // Build history for API
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/fbm-expert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history: history.slice(0, -1), // Don't include current message in history
            context: getContext(),
          }),
        });

        if (!res.ok) throw new Error("API error");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let assistantText = "";

        // Add empty assistant message
        const assistantMsg: Message = {
          role: "assistant",
          content: "",
          timestamp: formatTime(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              if (data.error) {
                assistantText += "\n\n⚠️ " + data.error;
              } else if (data.done) {
                if (data.suggestedQuestions?.length) {
                  setSuggestedQuestions(data.suggestedQuestions);
                } else {
                  setSuggestedQuestions(
                    getSuggestedQuestions(currentPage),
                  );
                }
              } else if (data.text) {
                assistantText += data.text;
              }

              // Update last message
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: assistantText,
                };
                return updated;
              });
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev.slice(0, -1), // Remove empty assistant msg if it exists
          {
            role: "assistant" as const,
            content:
              "מצטער, משהו השתבש. נסה שוב.",
            timestamp: formatTime(),
          },
        ]);
        setSuggestedQuestions(getSuggestedQuestions(currentPage));
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, getContext, currentPage],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
    setSuggestedQuestions(getSuggestedQuestions(currentPage));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 h-screen z-50 flex flex-col"
        style={{
          width: "min(380px, 100vw)",
          backgroundColor: "#0F1117",
          borderRight: "1px solid #2A2D3A",
          animation: "slideInLeft 0.3s ease-out",
        }}
        dir="rtl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid #2A2D3A" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="text-white font-bold text-sm">מומחה FBM</span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--success)]">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "#22C55E" }}
              />
              מחובר
            </span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-[10px] px-2 py-1 rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                title="נקה היסטוריה"
              >
                🗑️
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
              style={{ backgroundColor: "#1A1D2A" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 sidebar-scroll">
          {/* Welcome message */}
          {messages.length === 0 && (
            <ChatMessage
              role="assistant"
              content={WELCOME_MESSAGE}
              timestamp={formatTime()}
            />
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}

          {/* Typing indicator */}
          {isStreaming &&
            messages.length > 0 &&
            messages[messages.length - 1].content === "" && (
              <TypingIndicator />
            )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {!isStreaming && suggestedQuestions.length > 0 && (
          <SuggestedQuestions
            questions={suggestedQuestions}
            onSelect={sendMessage}
          />
        )}

        {/* Input */}
        <div
          className="px-3 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid #2A2D3A" }}
        >
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: "#1A1D2A" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל את המומחה..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-[#9DA3B4] max-h-[100px]"
              style={{ minHeight: "36px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 100) + "px";
              }}
              disabled={isStreaming}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={isStreaming || !input.trim()}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: input.trim()
                  ? "#D4A843"
                  : "transparent",
                color: input.trim() ? "#0F1117" : "#9DA3B4",
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

        <style jsx>{`
          @keyframes slideInLeft {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>
      </div>
    </>
  );
}
