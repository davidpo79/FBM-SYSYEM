interface FBMLogoProps {
  size?: number;
  className?: string;
}

export default function FBMLogo({ size = 28, className }: FBMLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      {/* Broadcast signal arcs - left */}
      <path
        d="M6 16a10 10 0 0 1 10-10"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <path
        d="M10 16a6 6 0 0 1 6-6"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Broadcast signal arcs - right */}
      <path
        d="M26 16a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <path
        d="M22 16a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Center dot */}
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      {/* Bottom frequency wave */}
      <path
        d="M7 24c3-4 5 4 9 0s6-4 9 0"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
