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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow p-5">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">
        {project.name}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{date}</p>
      <Link
        href={`/project/${project.id}`}
        className="inline-block text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        פתח
      </Link>
    </div>
  );
}
