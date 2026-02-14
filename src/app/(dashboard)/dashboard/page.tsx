"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProjectCard, { type Project } from "@/components/dashboard/ProjectCard";

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? "");
      }

      const { data } = await supabase
        .from("projects")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

      setProjects(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          👋 שלום{email ? ` ${email}` : ""}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          ברוך הבא ל-FBM Studio
        </p>
      </div>

      {/* New Project Button */}
      <Link
        href="/questionnaire"
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all mb-8"
      >
        📝 פרויקט חדש
      </Link>

      {/* Projects List */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          הפרויקטים שלי
        </h2>

        {loading ? (
          <p className="text-gray-500">טוען פרויקטים...</p>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              עדיין אין לך פרויקטים. צור את הראשון! 🚀
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
