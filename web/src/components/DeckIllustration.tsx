/** Small ink-and-paper objects for the daily deck; no meaning depends on their colour. */
export function DeckIllustration({ kind }: { kind: "tea" | "book" | "mic" }) {
  return <svg className="sd-illustration" viewBox="0 0 88 88" aria-hidden="true" fill="none">
    <ellipse cx="44" cy="75" rx="31" ry="4" fill="currentColor" opacity=".08" />
    {kind === "tea" ? <>
      <path d="M61 37h8c15 0 13 24-4 24h-6" stroke="var(--sd-line)" strokeWidth="4" />
      <path d="M20 36h44v21c0 12-8 17-22 17S20 69 20 57Z" fill="var(--sd-sage)" stroke="var(--sd-line)" strokeWidth="1.5" />
      <ellipse cx="42" cy="36" rx="22" ry="5" fill="var(--sd-paper)" stroke="var(--sd-line)" strokeWidth="1.5" />
      <ellipse cx="42" cy="37" rx="17" ry="2.5" fill="var(--sd-clay)" />
      <path d="M33 26c-7-9 8-10 2-19m13 18c-6-7 6-9 3-16" stroke="var(--sd-line)" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
      <path d="M29 48v10c0 5 3 8 7 9" stroke="var(--sd-paper)" strokeWidth="2" strokeLinecap="round" />
    </> : kind === "book" ? <>
      <path d="m10 23 33 5 33-5v44l-33 7-33-7Z" fill="var(--sd-sage)" stroke="var(--sd-line)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 18c11-2 21 1 29 7 9-6 19-9 29-7v43c-11-1-20 1-29 7-8-6-18-8-29-7Z" fill="var(--sd-paper)" stroke="var(--sd-line)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M43 25v43M21 30l15 3m-15 7 15 3m-15 7 15 3m15-20 14-3m-14 13 14-3m-14 13 14-3" stroke="var(--sd-line)" opacity=".5" />
      <path d="M57 20v25l5-5 5 3V18" fill="var(--sd-clay)" />
    </> : <>
      <path d="M32 63v10m24-10v10M27 74h34" stroke="var(--sd-line)" strokeWidth="3" strokeLinecap="round" />
      <path d="M25 40v9c0 24 38 24 38 0v-9" stroke="var(--sd-line)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="31" y="12" width="26" height="45" rx="13" fill="var(--sd-clay)" stroke="var(--sd-line)" strokeWidth="1.5" />
      <path d="M36 22h16m-16 6h16m-16 6h16m-16 6h16m-10 6h4" stroke="var(--sd-paper)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 23c-5 8-5 17 0 25m54-25c5 8 5 17 0 25" stroke="var(--sd-sage)" strokeWidth="2" strokeLinecap="round" />
    </>}
  </svg>;
}
