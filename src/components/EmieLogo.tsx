export function EmieLogo({
  className = '',
  compact = false,
  dark = false,
}: {
  className?: string;
  compact?: boolean;
  dark?: boolean;
}) {
  const strokeColor = dark ? '#FFFFFF' : '#444343';
  const accentColor = '#5B9D3F';

  return (
    <span className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={compact ? 30 : 36}
        height={compact ? 30 : 36}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle
          cx="32"
          cy="32"
          r="29"
          stroke={dark ? 'rgba(255,255,255,0.2)' : '#EDEADE'}
          strokeWidth="1.5"
        />
        {/* Minimalist interlocking e-c botanical curve inspired by official EMIE CLINIC mark */}
        <path
          d="M28 22C20.5 22 15.5 27.2 15.5 34C15.5 40.8 20.5 46 28 46C33 46 37 43.4 39 39.2"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M16 33.5H34C34 26.8 30 22 25.5 22"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M46.5 24.5C44.2 22.8 41.2 22 38 22C31.2 22 26.5 27.2 26.5 34C26.5 40.8 31.2 46 38 46C42 46 45.4 44.2 47.5 41.4"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`font-display font-light tracking-[0.18em] uppercase whitespace-nowrap ${
          compact ? 'text-sm' : 'text-base'
        } ${dark ? 'text-white' : 'text-[#444343]'}`}
      >
        EMIE CLINIC
      </span>
    </span>
  );
}
