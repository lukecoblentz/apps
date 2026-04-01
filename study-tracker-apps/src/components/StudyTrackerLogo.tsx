type LogoProps = {
  className?: string;
  /** Accessible label; omit when decorative next to text title */
  title?: string;
};

/** Vector mark: open book + bookmark */
export default function StudyTrackerLogo({ className, title }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width={32}
      height={32}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <defs>
        <linearGradient id="st-logo-shine" x1="8" y1="0" x2="24" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.65" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#4f46e5" />
      <rect width="32" height="32" rx="9" fill="url(#st-logo-shine)" />
      <path
        fill="rgba(255,255,255,0.95)"
        d="M10 9.5c1.38 0 2.63.56 3.54 1.46l.46.48.46-.48A4.78 4.78 0 0 1 18 9.5c.9 0 1.76.25 2.5.7V22.2a.65.65 0 0 1-1 .55 6.1 6.1 0 0 0-3.5-1.1c-1.15 0-2.25.3-3.2.85a.65.65 0 0 1-.6 0 6.4 6.4 0 0 0-3.2-.85c-1.2 0-2.4.35-3.5 1.06a.65.65 0 0 1-1-.54V10.2c.74-.45 1.6-.7 2.5-.7Z"
      />
      <path fill="rgba(255,255,255,0.35)" d="M16 11.2v11.2l-.25-.14a7.2 7.2 0 0 0-3.25-.78c-1 0-2 .22-2.9.62V11.5a5.5 5.5 0 0 1 2.9-.78c1.1 0 2.15.32 3.05.9l.45.3V11.2Z" />
      <path
        fill="#fde68a"
        d="M15.2 8.2c.2-.45.75-.75 1.3-.75h.5c.55 0 1.1.3 1.3.75L19 11h-6l1.2-2.8Z"
      />
    </svg>
  );
}
