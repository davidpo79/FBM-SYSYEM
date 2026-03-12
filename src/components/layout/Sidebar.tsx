"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { PLAN_LABELS } from "@/lib/plan-limits";
import {
  LayoutDashboard,
  FolderOpen,
  Target,
  Search,
  HeartCrack,
  FileText,
  Palette,
  Video,
  ClipboardList,
  Camera,
  BotMessageSquare,
  Lightbulb,
  Settings,
  Shield,
  GraduationCap,
  CreditCard,
  Phone,
  BarChart3,
  MessageSquareText,
  MessageCircle,
  Wrench,
  LogOut,
  BookOpen,
  Rocket,
  Crosshair,
  Users,
  TrendingUp,
  Megaphone,
} from "lucide-react";

interface SidebarProps {
  userEmail: string;
  userName?: string;
  projectId?: string | null;
  projectName?: string;
  projectCount?: number;
  albumCount?: number;
  isAdmin?: boolean;
  newSuggestionsCount?: number;
  currentPlan?: string;
  track?: "fbm" | "gtm";
  onLogout: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type NavItem = {
  href: string;
  label: string;
  icon: any;
  badge?: number | string;
  isExpert?: boolean;
  isSuggest?: boolean;
  disabled?: boolean;
};

export default function Sidebar({
  userEmail,
  userName,
  projectId,
  projectName,
  projectCount = 0,
  albumCount = 0,
  isAdmin = false,
  newSuggestionsCount = 0,
  currentPlan = "trial",
  track = "fbm",
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const isGTM = track === "gtm";
  const accent = isGTM ? "#00FF88" : "#D4A843";
  const accentSoft = isGTM ? "rgba(0,255,136,0.12)" : "rgba(212,168,67,0.12)";

  const isActive = (href: string) => pathname === href;

  const mainNav: NavItem[] = [
    { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
    { href: "/projects", label: "הפרויקטים שלי", icon: FolderOpen, badge: projectCount > 0 ? projectCount : undefined },
  ];

  const gtmNav: NavItem[] = projectId && isGTM
    ? [
        { href: `/project/${projectId}/gtm-strategy`, label: "תוכנית GTM BootCamp", icon: Rocket },
      ]
    : [];

  const gtmPublicNav: NavItem[] = isGTM
    ? [
        { href: "/ideator", label: "מעבדת רעיונות", icon: Lightbulb },
      ]
    : [];

  const fbmNav: NavItem[] = projectId && !isGTM
    ? [
        { href: `/project/${projectId}/strategy`, label: "אסטרטגיית FBM", icon: Target },
        { href: `/project/${projectId}/niches`, label: "מחקר נישות", icon: Search },
        { href: `/project/${projectId}/pains`, label: "ניתוח כאבים", icon: HeartCrack },
        { href: `/project/${projectId}/scripts`, label: "תסריטים", icon: FileText },
        { href: `/project/${projectId}/creative`, label: "קריאייטיב", icon: Palette },
        { href: `/project/${projectId}/video-creator`, label: "יצירת וידאו", icon: Video },
        { href: `/project/${projectId}/copy`, label: "קופי", icon: ClipboardList },
        { href: `/project/${projectId}/album`, label: "אלבום וסיכום", icon: Camera, badge: albumCount > 0 ? albumCount : undefined },
      ]
    : [];

  const pipelineNav = isGTM ? gtmNav : fbmNav;

  const toolsNav: NavItem[] = isGTM
    ? [] // No tools for GTM — settings hidden until registration
    : [
        { href: "#expert", label: "מומחה FBM", icon: BotMessageSquare, badge: "●", isExpert: true },
        { href: "#suggest", label: "הצעה לייעול", icon: Lightbulb, isSuggest: true },
        { href: "/guides/facebook-campaign", label: "מדריך קמפיין", icon: BookOpen },
        { href: "/settings", label: "הגדרות", icon: Settings },
      ];

  const adminNav: NavItem[] = isAdmin
    ? [
        { href: "/admin", label: "דשבורד אדמין", icon: Shield },
        { href: "/admin/students", label: "ניהול תלמידים", icon: GraduationCap },
        { href: "/admin/subscriptions", label: "מנויים ותשלומים", icon: CreditCard },
        { href: "/admin/consultations", label: "שעות ייעוץ", icon: Phone },
        { href: "/admin/analytics", label: "אנליטיקס API", icon: BarChart3 },
        { href: "/admin/funnel", label: "ניתוח משפך", icon: TrendingUp },
        { href: "/admin/feedback", label: "ניתוח פידבק", icon: MessageSquareText },
        { href: "/admin/suggestions", label: "הצעות ייעול", icon: MessageCircle, badge: newSuggestionsCount > 0 ? newSuggestionsCount : undefined },
        { href: "/admin/settings", label: "הגדרות מערכת", icon: Wrench },
      ]
    : [];

  const displayName = userName || userEmail?.split("@")[0] || "";

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    if (item.isExpert) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-fbm-expert"))}
          className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer"
          style={{ color: "#9DA3B4", transition: "all 0.2s ease" }}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span className="flex-1 text-right">{item.label}</span>
          <span className="text-[10px]" style={{ color: "#22C55E" }}>●</span>
        </button>
      );
    }

    if (item.isSuggest) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-suggest-improvement"))}
          className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer"
          style={{ color: "#9DA3B4", transition: "all 0.2s ease" }}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span className="flex-1 text-right">{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm relative"
        style={{
          transition: "all 0.2s ease",
          ...(active
            ? { backgroundColor: "#1E2235", color: "#FFFFFF", fontWeight: 500 }
            : { color: "#9DA3B4" }),
        }}
      >
        {active && (
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l"
            style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accentSoft}` }}
          />
        )}
        <Icon size={18} strokeWidth={1.8} style={active ? { color: accent } : undefined} />
        <span className="flex-1">{item.label}</span>
        {item.badge !== undefined && typeof item.badge === "number" && (
          <span
            className="text-[10px] min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center font-bold"
            style={
              adminNav.some((a) => a.href === item.href)
                ? { backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#EF4444" }
                : pipelineNav.some((f) => f.href === item.href)
                  ? { backgroundColor: accentSoft, color: accent }
                  : { backgroundColor: "#1A1D2A", color: "#9DA3B4" }
            }
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      style={{ backgroundColor: "#0F1117", borderColor: "#2A2D3A" }}
      className="fixed top-0 right-0 h-screen w-[260px] border-l flex-col hidden lg:flex z-50"
      dir="rtl"
    >
      {/* Logo header */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center gap-2 mb-1">
        {isGTM ? (
          <>
            <Image src="/gtm-logo.svg" alt="GTM BootCamp" width={200} height={28} style={{ height: "auto" }} />
            <p className="text-[11px] tracking-wide" style={{ color: "#6B7FA3", fontFamily: "monospace" }}>
              <span className="font-bold" style={{ color: "#00FF88" }}>G</span>o-
              <span className="font-bold" style={{ color: "#00FF88" }}>T</span>o-
              <span className="font-bold" style={{ color: "#00FF88" }}>M</span>arket
            </p>
          </>
        ) : (
          <>
            <Image src="/logo-fbm.png" alt="FBM" width={80} height={80} className="rounded" />
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">FBM Studio</span>
            </div>
            <p className="text-[11px] tracking-wide" style={{ color: "#9DA3B4" }}>
              <span className="font-bold" style={{ color: "#D4A843" }}>F</span>requency{" "}
              <span className="font-bold" style={{ color: "#D4A843" }}>B</span>ased{" "}
              <span className="font-bold" style={{ color: "#D4A843" }}>M</span>arketing
            </p>
          </>
        )}
      </div>
      <div className="mx-4 h-px" style={{ background: "linear-gradient(to left, transparent, #2A2D3A, transparent)" }} />

      {/* Project selector */}
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
        {/* Main section — hidden for GTM track (only shown after registration) */}
        {!isGTM && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>
              ראשי
            </p>
            <div className="space-y-1">{mainNav.map(renderNavItem)}</div>
          </div>
        )}

        {pipelineNav.length > 0 && !isGTM && (
          <div className="mx-1 h-px" style={{ background: "linear-gradient(to left, transparent, #2A2D3A, transparent)" }} />
        )}

        {/* Pipeline nav (FBM or GTM) */}
        {pipelineNav.length > 0 && (
          <div>
            <p
              className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider"
              style={{ color: isGTM ? "#6B7FA3" : "#9DA3B4", fontFamily: isGTM ? "monospace" : undefined }}
            >
              {isGTM ? "GTM Pipeline" : "תהליך FBM"}
            </p>
            <div className="space-y-1">{pipelineNav.map(renderNavItem)}</div>
          </div>
        )}

        <div className="mx-1 h-px" style={{ background: "linear-gradient(to left, transparent, #2A2D3A, transparent)" }} />

        {/* GTM Public Tools */}
        {gtmPublicNav.length > 0 && (
          <div>
            <p
              className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#6B7FA3", fontFamily: "monospace" }}
            >
              GTM Tools
            </p>
            <div className="space-y-1">{gtmPublicNav.map(renderNavItem)}</div>
          </div>
        )}

        {/* Tools section */}
        {toolsNav.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9DA3B4" }}>
              כלים
            </p>
            <div className="space-y-1">{toolsNav.map(renderNavItem)}</div>
          </div>
        )}

        {/* Admin section */}
        {adminNav.length > 0 && (
          <>
            <div className="mx-1 h-px" style={{ background: "linear-gradient(to left, transparent, #2A2D3A, transparent)" }} />
            <div>
              <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: accent }}>
                אדמין
              </p>
              <div className="space-y-1">{adminNav.map(renderNavItem)}</div>
            </div>
          </>
        )}
      </nav>

      {/* User profile at bottom */}
      <div className="px-3 py-4">
        <div className="h-px mb-3 mx-1" style={{ background: "linear-gradient(to left, transparent, #2A2D3A, transparent)" }} />
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: accentSoft, color: accent }}
          >
            {displayName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{displayName}</p>
            <p className="text-[11px] truncate" style={{ color: "#9DA3B4" }}>
              תוכנית {PLAN_LABELS[currentPlan] || currentPlan}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="sidebar-nav-item cursor-pointer p-1 rounded"
            style={{ color: "#9DA3B4", transition: "all 0.2s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#9DA3B4"; }}
            title="יציאה"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
