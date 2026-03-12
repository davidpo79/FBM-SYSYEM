"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "עכשיו";
  if (diffMinutes < 60) return `לפני ${diffMinutes} דק׳`;
  if (diffHours < 24) return `לפני ${diffHours} שע׳`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL");
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data as Notification[]);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications(); // eslint-disable-line react-hooks/set-state-in-effect
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );

    try {
      await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", notificationId);
    } catch {
      // Revert on failure
      fetchNotifications();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef} dir="rtl">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all"
        style={{
          color: isOpen ? "var(--gold)" : "var(--text-secondary)",
          backgroundColor: isOpen ? "var(--gold-soft)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = "var(--gold-soft)";
            e.currentTarget.style.color = "var(--gold)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
      >
        {/* Bell SVG Icon (outline style) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{
              backgroundColor: "#EF4444",
              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full mt-2 left-0 w-[340px] max-h-80 rounded-2xl overflow-hidden animate-in z-50"
          style={{
            backgroundColor: "#0F1117",
            border: "1px solid #2A2D3A",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Dropdown Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #2A2D3A" }}
          >
            <span className="text-sm font-bold text-white">התראות</span>
            {unreadCount > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: "var(--gold-soft)",
                  color: "var(--gold)",
                }}
              >
                {unreadCount} חדשות
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[calc(20rem-3rem)]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B7084"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-2"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <p className="text-sm" style={{ color: "#9DA3B4" }}>
                  אין התראות חדשות
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-right px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    borderBottom: "1px solid #1A1D2A",
                    backgroundColor: notification.read
                      ? "transparent"
                      : "rgba(212, 168, 67, 0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1A1D2A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read
                      ? "transparent"
                      : "rgba(212, 168, 67, 0.05)";
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    <div className="mt-1.5 flex-shrink-0">
                      {!notification.read ? (
                        <span
                          className="block w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: "var(--gold)",
                            boxShadow: "0 0 6px rgba(212, 168, 67, 0.4)",
                          }}
                        />
                      ) : (
                        <span className="block w-2 h-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{
                          color: notification.read ? "#9DA3B4" : "#FFFFFF",
                        }}
                      >
                        {notification.title}
                      </p>
                      <p
                        className="text-xs mt-0.5 line-clamp-2"
                        style={{ color: "#9DA3B4" }}
                      >
                        {notification.message}
                      </p>
                      <p
                        className="text-[10px] mt-1"
                        style={{ color: "#6B7084" }}
                      >
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
