import Link from "next/link";

export interface Project {
  id: string;
  name: string;
  user_name?: string;
  status?: string;
  created_at: string;
}

export default function ProjectCard({ project }: { project: Project }) {
  const date = new Date(project.created_at).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isCompleted = project.status === "completed";

  return (
    <Link
      href={isCompleted ? `/project/${project.id}/album` : `/project/${project.id}/strategy`}
      className={`block bg-[var(--card-bg)] border rounded-[16px] p-5 hover:shadow-md transition-all group ${
        isCompleted
          ? "border-[var(--success)]/30 border-r-[3px] border-r-[var(--success)] hover:border-[var(--success)]/50"
          : "border-[var(--card-border)] hover:border-[var(--gold)]"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-1 group-hover:text-[var(--gold)] transition-colors">
          {project.user_name || project.name}
        </h3>
        <span
          className={`text-[10px] font-medium px-2 py-1 rounded-full flex-shrink-0 ${
            isCompleted
              ? "bg-green-50 text-[var(--success)]"
              : "bg-[var(--gold-soft)] text-[var(--gold)]"
          }`}
        >
          {isCompleted ? "הושלם" : "בתהליך"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">{date}</p>
        <span className="text-xs font-medium text-[var(--gold)] group-hover:underline">
          {isCompleted ? "צפה בסיכום \u2190" : "פתח פרויקט \u2190"}
        </span>
      </div>
    </Link>
  );
}
