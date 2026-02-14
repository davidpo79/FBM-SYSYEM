"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/layout/Sidebar";
import type { User } from "@supabase/supabase-js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extract projectId from URL if on a project page
  const projectIdMatch = pathname.match(/\/project\/([^/]+)/);
  const currentProjectId = projectIdMatch ? projectIdMatch[1] : null;

  // Also check old results route for backwards compat
  const resultsMatch = pathname.match(/\/results\/([^/]+)/);
  const activeProjectId = currentProjectId || (resultsMatch ? resultsMatch[1] : null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
      } else {
        setUser(user);
        setLoading(false);

        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .then(({ count }) => {
            setProjectCount(count ?? 0);
          });
      }
    });
  }, [router]);

  // Fetch project name when activeProjectId changes
  useEffect(() => {
    if (!activeProjectId) {
      setProjectName("");
      return;
    }
    supabase
      .from("projects")
      .select("name, user_name")
      .eq("id", activeProjectId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProjectName(data.user_name || data.name || "");
        }
      });
  }, [activeProjectId]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F6FA" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{
              border: "3px solid rgba(212, 168, 67, 0.3)",
              borderTopColor: "#D4A843",
            }}
          />
          <span className="text-sm" style={{ color: "#9DA3B4" }}>טוען...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F6FA" }} dir="rtl">
      {/* Desktop sidebar */}
      <Sidebar
        userEmail={user?.email ?? ""}
        projectId={activeProjectId}
        projectName={projectName}
        projectCount={projectCount}
        onLogout={handleLogout}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside
            style={{ backgroundColor: "#0F1117", borderColor: "#2A2D3A" }}
            className="fixed top-0 right-0 h-screen w-[260px] border-l flex flex-col z-50"
            dir="rtl"
          >
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
              style={{ backgroundColor: "#1A1D2A", color: "#9DA3B4" }}
            >
              &times;
            </button>
            {/* Re-render sidebar content inline for mobile */}
            <MobileSidebarContent
              userEmail={user?.email ?? ""}
              projectId={activeProjectId}
              projectName={projectName}
              projectCount={projectCount}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="lg:mr-[260px]">
        <main className="p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile menu toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-4 right-4 lg:hidden w-12 h-12 text-white rounded-full shadow-lg flex items-center justify-center z-30 cursor-pointer"
        style={{ backgroundColor: "#0F1117" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Mobile sidebar content (duplicates Sidebar structure for mobile overlay)
function MobileSidebarContent({
  userEmail,
  projectId,
  projectName,
  projectCount = 0,
  onLogout,
}: {
  userEmail: string;
  projectId?: string | null;
  projectName?: string;
  projectCount?: number;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  const displayName = userEmail?.split("@")[0] || "";

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
      ]
    : [];

  const toolsNav = [
    { href: "#", label: "AI יועץ", emoji: "\u{1F916}", badge: "בקרוב", disabled: true },
    { href: "/settings", label: "הגדרות", emoji: "\u2699\uFE0F", disabled: false },
  ];

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid #2A2D3A" }}>
        <span className="text-white font-bold text-lg">FBM Studio</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ backgroundColor: "rgba(212, 168, 67, 0.12)", color: "#D4A843" }}
        >
          Beta
        </span>
      </div>

      {/* Project indicator */}
      {projectId && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #2A2D3A" }}>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "#1A1D2A" }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#22C55E" }} />
            <span className="text-white text-sm font-medium truncate">
              {projectName || displayName}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>ראשי</p>
          <div className="space-y-1">
            {mainNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                style={isActive(item.href) ? { backgroundColor: "#1E2235", color: "#FFFFFF", fontWeight: 500 } : { color: "#9DA3B4" }}
              >
                <span className="text-base">{item.emoji}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1A1D2A", color: "#9DA3B4" }}>
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        {fbmNav.length > 0 && <hr style={{ borderColor: "#2A2D3A" }} />}
        {fbmNav.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>תהליך FBM</p>
            <div className="space-y-1">
              {fbmNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                  style={isActive(item.href) ? { backgroundColor: "#1E2235", color: "#FFFFFF", fontWeight: 500 } : { color: "#9DA3B4" }}
                >
                  <span className="text-base">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <hr style={{ borderColor: "#2A2D3A" }} />
        <div>
          <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>כלים</p>
          <div className="space-y-1">
            {toolsNav.map((item) =>
              item.disabled ? (
                <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm opacity-40" style={{ color: "#9DA3B4" }}>
                  <span className="text-base">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#60A5FA" }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ) : (
                <a key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm" style={isActive(item.href) ? { backgroundColor: "#1E2235", color: "#FFFFFF", fontWeight: 500 } : { color: "#9DA3B4" }}>
                  <span className="text-base">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                </a>
              ),
            )}
          </div>
        </div>
      </nav>

      {/* User */}
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
            <p className="text-[11px] truncate" style={{ color: "#9DA3B4" }}>תוכנית Pro</p>
          </div>
          <button onClick={onLogout} className="cursor-pointer" style={{ color: "#9DA3B4" }} title="יציאה">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
