interface StepIndicatorProps {
  current: number;
  total: number;
  label?: string;
}

export default function StepIndicator({ current, total, label }: StepIndicatorProps) {
  const progress = Math.min((current / total) * 100, 100);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label || `שאלה ${current} מתוך ${total}`}
        </span>
        <span className="text-sm font-medium text-[var(--gold)]">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: 'var(--gold)' }}
        />
      </div>
    </div>
  );
}
