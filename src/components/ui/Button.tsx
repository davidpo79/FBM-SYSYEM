import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-[var(--gold)] to-[#C49A38] text-[#0F1117] font-bold shadow-[0_2px_8px_rgba(212,168,67,0.3)] hover:shadow-[0_4px_16px_rgba(212,168,67,0.5)]",
  secondary:
    "bg-transparent border-[1.5px] border-[var(--card-border)] text-[var(--text-secondary)] font-semibold hover:border-[var(--gold)] hover:text-[var(--gold)] hover:bg-[var(--gold-soft)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] hover:bg-gray-100",
  success:
    "bg-gradient-to-br from-[#22C55E] to-[#16A34A] text-white font-bold shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_16px_rgba(34,197,94,0.5)]",
  danger:
    "bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white font-bold shadow-[0_2px_8px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.5)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm rounded-[10px]",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-8 py-3.5 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center gap-2
          transition-all duration-200 ease-out cursor-pointer
          active:scale-[0.97]
          hover:translate-y-[-1px]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:translate-y-0 disabled:active:scale-100
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
