"use client";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({
  questions,
  onSelect,
}: SuggestedQuestionsProps) {
  if (!questions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2" dir="rtl">
      {questions.map((q, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(q)}
          className="text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:scale-[1.03]"
          style={{
            borderColor: "rgba(212, 168, 67, 0.3)",
            color: "var(--gold)",
            backgroundColor: "rgba(212, 168, 67, 0.06)",
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
