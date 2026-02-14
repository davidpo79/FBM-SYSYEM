import type { Question } from "@/lib/questions";

interface QuestionCardProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function QuestionCard({
  question,
  value,
  onChange,
  error,
}: QuestionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
      {/* Section badge */}
      <span className="inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full mb-4">
        {question.section}
      </span>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        {question.title}
      </h2>

      {/* Question text */}
      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        {question.text}
      </p>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="הקלד/י את התשובה כאן..."
        rows={5}
        className={`w-full rounded-xl border px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-400 focus:ring-red-400"
            : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"
        }`}
      />

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {/* Character count */}
      <p className="mt-2 text-xs text-gray-400 text-left" dir="ltr">
        {value.length} / 10 min
      </p>
    </div>
  );
}
