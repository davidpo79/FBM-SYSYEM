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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectCount, setProjectCount] = useState(0);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--content-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin" />
          <span className="text-[var(--text-muted)] text-sm">טוען...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--content-bg)]" dir="rtl">
      <Sidebar
        userEmail={user?.email ?? ""}
        projectId={activeProjectId}
        projectCount={projectCount}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="lg:mr-[260px]">
        <main className="p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile menu toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-4 right-4 lg:hidden w-12 h-12 bg-[var(--sidebar-bg)] text-white rounded-full shadow-lg flex items-center justify-center z-30 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}
