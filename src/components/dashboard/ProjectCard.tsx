import Link from "next/link";

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export default function ProjectCard({ project }: { project: Project }) {
  const date = new Date(project.created_at).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link
      href={`/project/${project.id}/strategy`}
      className="block bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-5 hover:shadow-md hover:border-[var(--gold)] transition-all group"
    >
      <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-1 group-hover:text-[var(--gold)] transition-colors">
        {project.name}
      </h3>
      <p className="text-sm text-[var(--text-muted)]">{date}</p>
    </Link>
  );
}
