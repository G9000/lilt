/**
 * Small drawings for Flashcards, one per kind of card, each on its own warm wash: an open book for a
 * chapter's opening, a lightbulb for a step, a heart for voice care, a screen for a video, a
 * microphone for a text to say, a medal for a finished chapter, and tea for a rest. Drawn here so
 * the cards don't repeat the room's pictures. All share one 196×96 frame, sitting on its bottom edge.
 */

export type Art = "book" | "bulb" | "care" | "video" | "mic" | "medal" | "tea" | "yarn";

/** Each drawing's wash, light at the top to deep at the bottom. */
export const WASH: Record<Art, [string, string]> = {
  book: ["#ffb38a", "#e0643c"],
  bulb: ["#ffd98a", "#e39a2d"],
  care: ["#ffb3c4", "#d9577a"],
  video: ["#c8b4ff", "#7a5ce0"],
  mic: ["#ff9f9a", "#d8424f"],
  medal: ["#9fe6bf", "#2f9e6e"],
  tea: ["#bcc8ff", "#6474d6"],
  yarn: ["#ffc9a0", "#b8577a"],
};

const Sparkle = ({ x, y, r = 5, o = 0.85 }: { x: number; y: number; r?: number; o?: number }) => (
  <path d={`M${x} ${y - r}l${r * 0.4} ${r * 0.6} ${r * 0.6} ${r * 0.4}-${r * 0.6} ${r * 0.4}-${r * 0.4} ${r * 0.6}-${r * 0.4}-${r * 0.6}-${r * 0.6}-${r * 0.4} ${r * 0.6}-${r * 0.4}z`} fill="#fff" opacity={o} />
);
const PAPER = "#fff4ea", PAPER_2 = "#f6dccb", LINE = "#e8b9a2";

const DRAW: Record<Art, () => JSX.Element> = {
  book: () => (
    <>
      <path d="M40 80 L98 88 L156 80 L156 76 L98 84 L40 76Z" fill="#b8461f" />
      <path d="M42 46 Q70 40 97 50 L97 84 Q70 74 42 78Z" fill={PAPER_2} />
      <path d="M154 46 Q126 40 99 50 L99 84 Q126 74 154 78Z" fill={PAPER} />
      <path d="M50 54 Q70 50 89 57 M50 61 Q70 57 89 64 M50 68 Q68 64 89 71" stroke={LINE} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M107 57 Q126 50 146 54 M107 64 Q126 57 146 61" stroke={LINE} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M128 49 L128 66 L132 62 L136 66 L136 47" fill="#e0643c" />
      <g transform="rotate(-8 98 32)">
        <rect x="78" y="12" width="40" height="30" rx="5" fill="#fff" />
        <path d="M89 27l6 6 11-12" fill="none" stroke="#e0643c" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sparkle x={58} y={28} /><Sparkle x={142} y={18} r={4} o={0.7} />
    </>
  ),
  bulb: () => (
    <>
      <circle cx="98" cy="40" r="30" fill="#fff" opacity=".22" />
      <path d="M98 14a22 22 0 00-13 39.6c3 2.3 4.6 5.6 4.6 9.2v3.2h16.8v-3.2c0-3.6 1.6-6.9 4.6-9.2A22 22 0 0098 14z" fill={PAPER} />
      <path d="M92 52l6-10 6 10" fill="none" stroke="#e39a2d" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="89" y="68" width="18" height="6" rx="2" fill="#c98a3a" />
      <rect x="91" y="76" width="14" height="6" rx="2" fill="#a86f28" />
      <path d="M60 30l-9-4M58 46h-10M136 30l9-4M138 46h10M72 14l-5-7M124 14l5-7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".8" />
    </>
  ),
  care: () => (
    <>
      <path d="M98 82S62 62 62 38a18 18 0 0136-6 18 18 0 0136 6c0 24-36 44-36 44z" fill={PAPER} />
      <path d="M98 74S74 58 74 41a10 10 0 0124-3" fill="none" stroke="#f3b2c2" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M126 70c10-2 18-10 20-22-12 0-20 8-20 22z" fill="#7fc7a0" />
      <path d="M126 70c4-8 10-14 18-20" stroke="#4e9c75" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Sparkle x={56} y={24} /><Sparkle x={144} y={22} r={4} o={0.7} />
    </>
  ),
  video: () => (
    <>
      <rect x="54" y="18" width="88" height="58" rx="9" fill="#2b2440" />
      <rect x="59" y="23" width="78" height="48" rx="5" fill={PAPER} />
      <circle cx="98" cy="47" r="15" fill="#7a5ce0" />
      <path d="M94 40v14l12-7z" fill="#fff" />
      <rect x="90" y="78" width="16" height="6" rx="2" fill="#2b2440" />
      <Sparkle x={44} y={26} /><Sparkle x={154} y={60} r={4} o={0.7} />
    </>
  ),
  mic: () => (
    <>
      <path d="M58 38q-8 10 0 20M48 32q-14 16 0 32M138 38q8 10 0 20M148 32q14 16 0 32" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8" />
      <rect x="84" y="10" width="28" height="46" rx="14" fill={PAPER} />
      <path d="M90 24h16M90 31h16M90 38h16" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
      <path d="M76 46a22 22 0 0044 0" fill="none" stroke="#7a2430" strokeWidth="4" strokeLinecap="round" />
      <path d="M98 68v12M86 82h24" stroke="#7a2430" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  medal: () => (
    <>
      <path d="M84 8l-8 30h14l8-22zM112 8l8 30h-14l-8-22z" fill="#e0643c" />
      <circle cx="98" cy="54" r="26" fill="#ffd36e" />
      <circle cx="98" cy="54" r="19" fill="#f5b83f" />
      <path d="M98 41l4 8.2 9 1.3-6.5 6.3 1.5 9-8-4.2-8 4.2 1.5-9-6.5-6.3 9-1.3z" fill="#fff4d6" />
      <Sparkle x={56} y={34} /><Sparkle x={142} y={26} r={4} o={0.75} /><Sparkle x={146} y={66} r={3} o={0.6} />
    </>
  ),
  tea: () => (
    <>
      <path d="M86 26q-6-8 0-14M98 24q-6-8 0-14M110 26q-6-8 0-14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity=".75" />
      <path d="M66 36h64v18a26 26 0 01-26 26h-12a26 26 0 01-26-26z" fill={PAPER} />
      <path d="M130 42h6a10 10 0 010 20h-8" fill="none" stroke={PAPER} strokeWidth="5" />
      <path d="M70 46h56" stroke="#c9d1ff" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="98" cy="84" rx="44" ry="4" fill={PAPER_2} />
    </>
  ),
  // The voice game: a ball of yarn up in the air, its thread trailing back in a wave (the pitch
  // line it drew), a loop of yarn ahead of it, and the cat peeking up from below.
  yarn: () => (
    <>
      <path d="M22 70 C40 70 46 52 62 50 S84 62 96 50" fill="none" stroke={PAPER} strokeWidth="2.6" strokeLinecap="round" opacity=".9" />
      <ellipse cx="150" cy="40" rx="9" ry="19" fill="none" stroke="#ffd36e" strokeWidth="4.5" />
      <path d="M150 21 L150 4" stroke={PAPER} strokeWidth="1.4" opacity=".7" />
      <circle cx="110" cy="44" r="20" fill="#e99b75" />
      <path d="M94 33q15 1 32 15M98 29q15 2 30 13M105 25q13 4 24 12M91 42q18-1 34 13M91 47q17-2 30 13M94 54q12-3 22 9" fill="none" stroke="#b97052" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M94 33q15 1 32 15M98 29q15 2 30 13M105 25q13 4 24 12M91 42q18-1 34 13M91 47q17-2 30 13M94 54q12-3 22 9" fill="none" stroke="#ffd2a7" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M57 96q-3-10 2-19l-1-14q1-4 14 9q9-4 18 0q15-14 15-9l-1 17q4 12-2 16Z" fill="#536361" />
      <path d="M62 69l2 10 6-5M100 69l-2 10-6-5" fill="#e1a598" />
      <path d="M81 74q-1 10-10 13q-7 9 10 9q18 0 11-9q-9-4-11-13" fill="#fff0d9" />
      <ellipse cx="70" cy="83" rx="4.3" ry="5.5" fill="#f6e5b5" /><ellipse cx="92" cy="83" rx="4.3" ry="5.5" fill="#f6e5b5" />
      <ellipse cx="71" cy="83" rx="2.2" ry="3.6" fill="#283f3b" /><ellipse cx="93" cy="83" rx="2.2" ry="3.6" fill="#283f3b" />
      <circle cx="72" cy="81" r="1.2" fill="#fff" /><circle cx="94" cy="81" r="1.2" fill="#fff" />
      <path d="M78 89q3-2 6 0l-3 3Z" fill="#c57d72" />
      <Sparkle x={170} y={66} r={4} o={0.75} /><Sparkle x={130} y={12} r={3.5} o={0.7} /><Sparkle x={34} y={40} />
    </>
  ),
};

/** One drawing, sized to fill its box from the bottom. */
export function Illustration({ art, className }: { art: Art; className?: string }) {
  const D = DRAW[art];
  return <svg className={className} viewBox="0 0 196 96" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><D /></svg>;
}

/** The wash behind a drawing, as a CSS background. */
export const wash = (art: Art) => `radial-gradient(120% 95% at 50% 0%, ${WASH[art][0]} 0%, ${WASH[art][1]} 58%, #1c1c21 100%)`;
