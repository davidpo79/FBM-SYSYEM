"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FBMLogo from "@/components/FBMLogo";

interface SidebarProps {
  userEmail: string;
  userName?: string;
  projectId?: string | null;
  projectCount?: number;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
  badgeColor?: string;
  disabled?: boolean;
}

export default function Sidebar({
  userEmail,
  userName,
  projectId,
  projectCount = 0,
  onLogout,
  isOpen = true,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const mainNav: NavItem[] = [
    { href: "/dashboard", label: "דשבורד", icon: "home" },
    {
      href: "/projects",
      label: "הפרויקטים שלי",
      icon: "folder",
      badge: projectCount > 0 ? projectCount : undefined,
    },
  ];

  const fbmNav: NavItem[] = projectId
    ? [
        { href: `/project/${projectId}/strategy`, label: "אסטרטגיית FBM", icon: "target" },
        { href: `/project/${projectId}/niches`, label: "מחקר נישות", icon: "search" },
        { href: `/project/${projectId}/pains`, label: "ניתוח כאבים", icon: "heart" },
        { href: `/project/${projectId}/scripts`, label: "תסריטים", icon: "file-text" },
        { href: `/project/${projectId}/creative`, label: "קריאייטיב", icon: "palette" },
      ]
    : [];

  const toolsNav: NavItem[] = [
    { href: "#", label: "AI יועץ", icon: "bot", badge: "בקרוב", badgeColor: "blue", disabled: true },
    { href: "/settings", label: "הגדרות", icon: "settings" },
  ];

  const isActive = (href: string) => pathname === href;

  const renderIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      home: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      folder: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      target: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      ),
      search: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      heart: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      "file-text": (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      palette: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12" r="0.5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
      ),
      bot: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      ),
      settings: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    };
    return icons[name] || null;
  };

  const navItemClass = (href: string, disabled?: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-all relative ${
      disabled
        ? "opacity-40 cursor-not-allowed"
        : isActive(href)
          ? "bg-[var(--sidebar-active)] text-white font-medium"
          : "text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white cursor-pointer"
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 right-0 h-screen w-[260px] bg-[var(--sidebar-bg)] border-l border-[var(--sidebar-border)] z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        dir="rtl"
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-[var(--sidebar-border)]">
          <div className="text-[var(--gold)]" style={{ filter: "drop-shadow(0 2px 8px rgba(212, 168, 67, 0.3))" }}>
            <FBMLogo size={36} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">FBM Studio</span>
            <span className="text-[10px] bg-[var(--gold-soft)] text-[var(--gold)] px-1.5 py-0.5 rounded font-medium">
              Beta
            </span>
          </div>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-4 space-y-6">
          {/* Main section */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              ראשי
            </p>
            <div className="space-y-1">
              {mainNav.map((item) => (
                <Link key={item.href} href={item.href} className={navItemClass(item.href)}>
                  {isActive(item.href) && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--gold)] rounded-l" />
                  )}
                  <span className="text-inherit">{renderIcon(item.icon)}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="bg-[var(--sidebar-hover)] text-[var(--text-muted)] text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* FBM Process section */}
          {fbmNav.length > 0 && (
            <div>
              <p className="px-3 mb-2 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                תהליך FBM
              </p>
              <div className="space-y-1">
                {fbmNav.map((item) => (
                  <Link key={item.href} href={item.href} className={navItemClass(item.href)}>
                    {isActive(item.href) && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--gold)] rounded-l" />
                    )}
                    <span className="text-inherit">{renderIcon(item.icon)}</span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tools section */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              כלים
            </p>
            <div className="space-y-1">
              {toolsNav.map((item) =>
                item.disabled ? (
                  <div key={item.label} className={navItemClass(item.href, true)}>
                    <span className="text-inherit">{renderIcon(item.icon)}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.badgeColor === "blue" ? "bg-blue-500/20 text-blue-400" : "bg-[var(--sidebar-hover)] text-[var(--text-muted)]"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} className={navItemClass(item.href)}>
                    {isActive(item.href) && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--gold)] rounded-l" />
                    )}
                    <span className="text-inherit">{renderIcon(item.icon)}</span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        </nav>

        {/* User profile */}
        <div className="px-3 py-4 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[var(--gold-soft)] flex items-center justify-center text-[var(--gold)] text-sm font-bold flex-shrink-0">
              {(userName || userEmail)?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {userName || userEmail}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                תוכנית Pro
              </p>
            </div>
            <button
              onClick={onLogout}
              className="text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
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
    </>
  );
}
