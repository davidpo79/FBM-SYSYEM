"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FBMLogo from "@/components/FBMLogo";

interface SidebarProps {
  userEmail: string;
  userName?: string;
  projectId?: string | null;
  projectName?: string;
  projectCount?: number;
  onLogout: () => void;
}

export default function Sidebar({
  userEmail,
  userName,
  projectId,
  projectName,
  projectCount = 0,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  const mainNav = [
    { href: "/dashboard", label: "דשבורד", emoji: "\u{1F3E0}" },
    { href: "/projects", label: "הפרויקטים שלי", emoji: "\u{1F4C1}", badge: projectCount > 0 ? projectCount : undefined },
  ];

  const fbmNav = projectId
    ? [
        { href: `/project/${projectId}/strategy`, label: "אסטרטגיית FBM", emoji: "\u{1F3AF}" },
        { href: `/project/${projectId}/niches`, label: "מחקר נישות", emoji: "\u{1F50D}" },
        { href: `/project/${projectId}/pains`, label: "ניתוח כאבים", emoji: "\u{1F494}" },
        { href: `/project/${projectId}/scripts`, label: "תסריטים", emoji: "\u{1F4DD}" },
        { href: `/project/${projectId}/creative`, label: "קריאייטיב", emoji: "\u{1F3A8}" },
        { href: `/project/${projectId}/album`, label: "אלבום וסיכום", emoji: "\u{1F4F8}" },
      ]
    : [];

  const toolsNav = [
    { href: "#", label: "AI יועץ", emoji: "\u{1F916}", badge: "בקרוב", disabled: true },
    { href: "/settings", label: "הגדרות", emoji: "\u2699\uFE0F", disabled: false },
  ];

  const displayName = userName || userEmail?.split("@")[0] || "";

  return (
    <aside
      style={{ backgroundColor: "#0F1117", borderColor: "#2A2D3A" }}
      className="fixed top-0 right-0 h-screen w-[260px] border-l flex-col hidden lg:flex z-50"
      dir="rtl"
    >
      {/* Logo header */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid #2A2D3A" }}>
        <div style={{ color: "#D4A843", filter: "drop-shadow(0 2px 8px rgba(212, 168, 67, 0.3))" }}>
          <FBMLogo size={36} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">FBM Studio</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: "rgba(212, 168, 67, 0.12)", color: "#D4A843" }}
          >
            Beta
          </span>
        </div>
      </div>

      {/* Project selector (if on project page) */}
      {projectId && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #2A2D3A" }}>
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{ backgroundColor: "#1A1D2A" }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#22C55E" }} />
            <span className="text-white text-sm font-medium truncate">
              {projectName || displayName}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-4 space-y-6">
        {/* Main section */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>
            ראשי
          </p>
          <div className="space-y-1">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative"
                style={
                  isActive(item.href)
                    ? { backgroundColor: "#1E2235", color: "#FFFFFF", fontWeight: 500 }
                    : { color: "#9DA3B4" }
                }
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "#1A1D2A";
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {isActive(item.href) && (
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l"
                    style={{ backgroundColor: "#D4A843" }}
                  />
                )}
                <span className="text-base">{item.emoji}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#1A1D2A", color: "#9DA3B4" }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Divider */}
        {fbmNav.length > 0 && <hr style={{ borderColor: "#2A2D3A" }} />}

        {/* FBM Process section */}
        {fbmNav.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>
              תהליך FBM
            </p>
            <div className="space-y-1">
              {fbmNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative"
                  style={
                    isActive(item.href)
                      ? { backgroundColor: "#1E2235", color: "#FFFFFF", fontWeight: 500 }
                      : { color: "#9DA3B4" }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "#1A1D2A";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {isActive(item.href) && (
                    <span
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l"
                      style={{ backgroundColor: "#D4A843" }}
                    />
                  )}
                  <span className="text-base">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <hr style={{ borderColor: "#2A2D3A" }} />

        {/* Tools section */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>
            כלים
          </p>
          <div className="space-y-1">
            {toolsNav.map((item) =>
              item.disabled ? (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm opacity-40 cursor-not-allowed"
                  style={{ color: "#9DA3B4" }}
                >
                  <span className="text-base">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#60A5FA" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative"
                  style={
                    isActive(item.href)
                      ? { backgroundColor: "#1E2235", color: "#FFFFFF", fontWeight: 500 }
                      : { color: "#9DA3B4" }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "#1A1D2A";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href)) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {isActive(item.href) && (
                    <span
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l"
                      style={{ backgroundColor: "#D4A843" }}
                    />
                  )}
                  <span className="text-base">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                </Link>
              ),
            )}
          </div>
        </div>
      </nav>

      {/* User profile at bottom */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #2A2D3A" }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: "rgba(212, 168, 67, 0.12)", color: "#D4A843" }}
          >
            {displayName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{displayName}</p>
            <p className="text-[11px] truncate" style={{ color: "#9DA3B4" }}>
              תוכנית Pro
            </p>
          </div>
          <button
            onClick={onLogout}
            className="transition-colors cursor-pointer"
            style={{ color: "#9DA3B4" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#9DA3B4"; }}
            title="יציאה"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
