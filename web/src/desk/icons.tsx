/** Dock icons, drawn like macOS app icons. Each one is a full squircle with its own gradient ids. */

export function TodayIcon({ date }: { date: Date }) {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <defs><linearGradient id="di-today" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e9e9ee" /></linearGradient></defs>
      <rect width="52" height="52" rx="12" fill="url(#di-today)" />
      <text x="26" y="16.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#ff3b30" fontFamily="Geist Variable, -apple-system, sans-serif" letterSpacing=".5">
        {date.toLocaleDateString("en", { weekday: "short" }).toUpperCase()}
      </text>
      <text x="26" y="41" textAnchor="middle" fontSize="25" fontWeight="400" fill="#1d1d23" fontFamily="Geist Variable, -apple-system, sans-serif" letterSpacing="-1">{date.getDate()}</text>
    </svg>
  );
}

export const StudioIcon = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true">
    <defs>
      <linearGradient id="di-studio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b3150" /><stop offset="1" stopColor="#151320" /></linearGradient>
      <linearGradient id="di-studio-m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d9d9e2" /><stop offset=".45" stopColor="#ffffff" /><stop offset="1" stopColor="#a8a9b8" /></linearGradient>
      <radialGradient id="di-studio-g" cx=".5" cy=".42" r=".5"><stop offset="0" stopColor="#ff8a5c" stopOpacity=".55" /><stop offset="1" stopColor="#ff8a5c" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width="52" height="52" rx="12" fill="url(#di-studio)" />
    <circle cx="26" cy="22" r="17" fill="url(#di-studio-g)" />
    <rect x="19" y="9" width="14" height="22" rx="7" fill="url(#di-studio-m)" />
    <path d="M19.5 16h13M19.5 20h13M19.5 24h13" stroke="#8c8da0" strokeWidth="1" opacity=".7" />
    <path d="M14.5 25a11.5 11.5 0 0023 0" stroke="#c9c9d4" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M26 36.5v5M20 42.5h12" stroke="#c9c9d4" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const TextsIcon = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true">
    <defs>
      <linearGradient id="di-texts" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffbe5c" /><stop offset="1" stopColor="#f2780f" /></linearGradient>
      <linearGradient id="di-texts-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" /><stop offset=".85" stopColor="#f6efe6" /><stop offset="1" stopColor="#e3d6c6" /></linearGradient>
      <linearGradient id="di-texts-r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#fff" /><stop offset=".85" stopColor="#f6efe6" /><stop offset="1" stopColor="#e3d6c6" /></linearGradient>
    </defs>
    <rect width="52" height="52" rx="12" fill="url(#di-texts)" />
    <path d="M26 15c-4-2.6-9-3.3-14-2.6v24c5-.7 10 0 14 2.6z" fill="url(#di-texts-l)" />
    <path d="M26 15c4-2.6 9-3.3 14-2.6v24c-5-.7-10 0-14 2.6z" fill="url(#di-texts-r)" />
    <path d="M15.5 19.5c2.8-.3 5.6 0 8 1M15.5 24c2.8-.3 5.6 0 8 1M15.5 28.5c2.8-.3 5.6 0 8 1M28.5 20.5c2.4-1 5.2-1.3 8-1M28.5 25c2.4-1 5.2-1.3 8-1" stroke="#d8c3a8" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <path d="M26 15v24" stroke="#c9b293" strokeWidth="1" />
  </svg>
);

export const ProgressIcon = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true">
    <defs>
      <linearGradient id="di-prog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#46d3a0" /><stop offset="1" stopColor="#0c8a66" /></linearGradient>
      <linearGradient id="di-prog-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#d9f5ea" /></linearGradient>
    </defs>
    <rect width="52" height="52" rx="12" fill="url(#di-prog)" />
    <rect x="12" y="29" width="7" height="11" rx="2.5" fill="url(#di-prog-b)" opacity=".75" />
    <rect x="22.5" y="22" width="7" height="18" rx="2.5" fill="url(#di-prog-b)" opacity=".88" />
    <rect x="33" y="13" width="7" height="27" rx="2.5" fill="url(#di-prog-b)" />
    <path d="M11 43h30" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const RecordingsIcon = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true">
    <defs><linearGradient id="di-rec" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6f8dff" /><stop offset="1" stopColor="#3550d1" /></linearGradient></defs>
    <rect width="52" height="52" rx="12" fill="url(#di-rec)" />
    <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
      <path d="M12 23v6" opacity=".7" /><path d="M17 19v14" opacity=".85" /><path d="M22 14v24" /><path d="M27 20v12" opacity=".9" />
      <path d="M32 16v20" /><path d="M37 21v10" opacity=".85" /><path d="M42 24v4" opacity=".7" />
    </g>
  </svg>
);

export const LeaveIcon = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true">
    <defs>
      <linearGradient id="di-leave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a3a44" /><stop offset="1" stopColor="#16161b" /></linearGradient>
      <linearGradient id="di-leave-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffcf8a" /><stop offset="1" stopColor="#ff9a5c" /></linearGradient>
    </defs>
    <rect width="52" height="52" rx="12" fill="url(#di-leave)" />
    <rect x="15" y="11" width="18" height="30" rx="2.5" fill="url(#di-leave-d)" />
    <path d="M15 11l10 3.5v29L15 41z" fill="#2a2a32" />
    <circle cx="22" cy="27.5" r="1.4" fill="#ffcf8a" />
    <path d="M31 26h11M38.5 22.5L42 26l-3.5 3.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Mark = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M3 12c2-6 4-6 5.5 0s3.5 6 5.5 0 2.5-4 3-4" /></svg>
);

/** A gear outline with `n` teeth between radii `r1` (root) and `r2` (tip), centred on 50,50. */
function gear(n: number, r1: number, r2: number) {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, w = (Math.PI * 2) / n;
    // root, rise, flat tip, fall: a trapezoid tooth
    for (const [da, r] of [[0, r1], [w * 0.18, r2], [w * 0.5, r2], [w * 0.68, r1]] as const) {
      pts.push(`${(50 + r * Math.cos(a + da)).toFixed(2)},${(50 + r * Math.sin(a + da)).toFixed(2)}`);
    }
  }
  return `M${pts.join("L")}Z`;
}
const OUTER = gear(32, 33.2, 36);
const INNER = gear(10, 18.5, 22.5);

/**
 * The Settings app icon in the current macOS style: a light, glassy rounded tile, a dark bezel,
 * a fine-toothed metal gear and a smaller one inside it. Drawn for Lilt, not Apple's artwork.
 */
export function SettingsAppIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="sai-tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbfbfd" /><stop offset="1" stopColor="#c7c8ce" /></linearGradient>
        <radialGradient id="sai-well" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stopColor="#4a4b52" /><stop offset="1" stopColor="#17181b" /></radialGradient>
        <linearGradient id="sai-metal" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#f4f4f6" /><stop offset="0.45" stopColor="#b9bac1" /><stop offset="0.55" stopColor="#d6d7dc" /><stop offset="1" stopColor="#7c7d85" /></linearGradient>
        <linearGradient id="sai-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.85" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="23" fill="url(#sai-tile)" />
      <rect x="2.5" y="2.5" width="95" height="95" rx="22.5" fill="none" stroke="#fff" strokeOpacity="0.9" />
      <circle cx="50" cy="50" r="40" fill="url(#sai-well)" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#000" strokeOpacity="0.35" />
      <path d={OUTER} fill="url(#sai-metal)" />
      <circle cx="50" cy="50" r="29.5" fill="#26272c" />
      <circle cx="50" cy="50" r="29.5" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="1.2" />
      <path d={INNER} fill="url(#sai-metal)" />
      <circle cx="50" cy="50" r="12" fill="#2d2e33" />
      <circle cx="50" cy="50" r="6.5" fill="url(#sai-metal)" />
      <circle cx="50" cy="50" r="2.4" fill="#2d2e33" />
      <path d="M8 26 Q8 8 26 8 H74 Q92 8 92 26 V40 Q50 30 8 40 Z" fill="url(#sai-shine)" opacity="0.35" />
    </svg>
  );
}

/** Courses: three books on a shelf, on violet. */
export const CoursesIcon = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true">
    <defs>
      <linearGradient id="di-courses" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a08bff" /><stop offset="1" stopColor="#5b3fd1" /></linearGradient>
      <linearGradient id="di-courses-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#e7e1ff" /></linearGradient>
    </defs>
    <rect width="52" height="52" rx="12" fill="url(#di-courses)" />
    <rect x="12" y="13" width="8" height="26" rx="2" fill="url(#di-courses-a)" />
    <rect x="21.5" y="16" width="8" height="23" rx="2" fill="#ffd2bd" />
    <rect x="31" y="14.5" width="8" height="24.5" rx="2" fill="url(#di-courses-a)" opacity=".9" transform="rotate(10 35 27)" />
    <path d="M14.5 18h3M14.5 21h3M24 21h3M24 24h3" stroke="#8a7ad6" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M10 41h32" stroke="#fff" strokeOpacity=".6" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
