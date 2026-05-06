type IconProps = { size?: number; className?: string };

export const ArrowIcon = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`btn-arrow ${className ?? ""}`.trim()}
    aria-hidden="true"
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const CheckIcon = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const CalendarIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const ClockIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const CardIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export const LockIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const UsersIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const MapIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2zM9 3v16M15 5v16" />
  </svg>
);

export const MonitorIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

export const WhatsappIcon = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.6 6.32A8 8 0 0 0 4.6 16.06L4 20l4.05-1.07a8 8 0 0 0 11.96-7.06 7.93 7.93 0 0 0-2.41-5.55zM12 18.5a6.5 6.5 0 0 1-3.32-.91l-.24-.14-2.4.63.64-2.34-.16-.25a6.5 6.5 0 1 1 12.04-3.49 6.5 6.5 0 0 1-6.56 6.5zm3.56-4.87c-.2-.1-1.16-.57-1.34-.64s-.31-.1-.44.1c-.13.2-.5.64-.62.78-.11.13-.23.15-.42.05-.2-.1-.83-.3-1.59-.97a5.96 5.96 0 0 1-1.1-1.36c-.11-.2-.01-.3.09-.4.09-.09.2-.23.3-.34.1-.12.13-.2.2-.33.06-.13.03-.25-.02-.34-.05-.1-.44-1.05-.6-1.44-.16-.38-.32-.33-.44-.33h-.38a.73.73 0 0 0-.53.25c-.18.2-.7.68-.7 1.65 0 .98.71 1.92.81 2.05.1.13 1.4 2.13 3.4 2.99 1.99.85 1.99.57 2.35.53.36-.03 1.16-.47 1.32-.93.16-.46.16-.85.11-.93-.05-.08-.18-.13-.38-.23z" />
  </svg>
);

export const SparkleIcon = ({ size = 14 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2z" />
  </svg>
);
