"use client";

import { useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Simple markdown rendering
  const renderContent = (text: string) => {
    // Bold
    let html = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Lists
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
    // Newlines to <br>
    html = html.replace(/\n/g, "<br />");
    return html;
  };

  return (
    <div
      className={`group flex ${isUser ? "justify-start" : "justify-end"} mb-3`}
      dir="rtl"
    >
      <div
        className="relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                backgroundColor: "#D4A843",
                color: "#0F1117",
                borderBottomRightRadius: "6px",
              }
            : {
                backgroundColor: "#1A1D2A",
                color: "#FFFFFF",
                borderBottomLeftRadius: "6px",
              }
        }
      >
        <div
          dangerouslySetInnerHTML={{ __html: renderContent(content) }}
          className="[&_strong]:font-bold [&_ul]:list-disc [&_ul]:pr-4 [&_ul]:my-1 [&_li]:my-0.5"
        />

        {/* Timestamp + Copy */}
        <div className="flex items-center justify-between mt-1.5 gap-2">
          {timestamp && (
            <span
              className="text-[10px] opacity-50"
              style={{ color: isUser ? "#0F1117" : "#9DA3B4" }}
            >
              {timestamp}
            </span>
          )}
          {!isUser && (
            <button
              type="button"
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] cursor-pointer"
              style={{ color: "#9DA3B4" }}
              title="העתק"
            >
              {copied ? "✓ הועתק" : "📋 העתק"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
