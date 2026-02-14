"use client";

interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
  onMenuToggle?: () => void;
}

export default function TopBar({ breadcrumbs, actions, onMenuToggle }: TopBarProps) {
  return (
    <header className="h-[60px] bg-white border-b border-[var(--card-border)] flex items-center justify-between px-6 sticky top-0 z-30" dir="rtl">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              )}
              <span className={i === breadcrumbs.length - 1 ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
