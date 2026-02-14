"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ProjectData {
  id: string;
  name: string;
  user_name: string;
  status: string;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("projects")
        .select("id, name, user_name, status, created_at")
        .order("created_at", { ascending: false });

      setProjects((data as ProjectData[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">הפרויקטים שלי</h1>
        <Link
          href="/questionnaire"
          className="px-5 py-2.5 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          פרויקט חדש
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">טוען פרויקטים...</div>
      ) : projects.length === 0 ? (
        <div className="bg-[var(--card-bg)] border-2 border-dashed border-[var(--card-border)] rounded-[16px] p-12 text-center">
          <p className="text-[var(--text-muted)] mb-4">עדיין אין לך פרויקטים</p>
          <Link
            href="/questionnaire"
            className="px-5 py-2.5 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity inline-block"
          >
            צור את הפרויקט הראשון
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const date = new Date(project.created_at).toLocaleDateString("he-IL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const isCompleted = project.status === "completed";

            return (
              <Link
                key={project.id}
                href={`/project/${project.id}/strategy`}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-6 hover:shadow-md hover:border-[var(--gold)] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors">
                    {project.user_name || project.name}
                  </h3>
                  <span
                    className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                      isCompleted
                        ? "bg-green-50 text-[var(--success)]"
                        : "bg-[var(--gold-soft)] text-[var(--gold)]"
                    }`}
                  >
                    {isCompleted ? "הושלם" : "בתהליך"}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">{date}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
