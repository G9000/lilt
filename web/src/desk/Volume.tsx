import { radio, useRadio } from "./lofi";

/** The radio's volume: a speaker you can tap to mute, and a slim slider. Shared by both radios. */
export function Volume() {
  const { volume } = useRadio();
  const pct = Math.round(volume * 100);
  return (
    <span className="vol">
      <button className="vol-icon" onClick={() => radio.setVolume(volume > 0 ? 0 : 0.8)} aria-label={volume > 0 ? "Mute radio" : "Unmute radio"}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" fill="currentColor" />
          {volume > 0 && <path d="M10.6 6a2.8 2.8 0 010 4" />}
          {volume > 0.5 && <path d="M12.4 4.2a5.4 5.4 0 010 7.6" />}
          {volume === 0 && <path d="M10.5 6.2l3.4 3.6M13.9 6.2l-3.4 3.6" />}
        </svg>
      </button>
      <input type="range" min={0} max={100} step={1} value={pct} aria-label="Radio volume" aria-valuetext={`${pct}%`}
        style={{ ["--v" as string]: `${pct}%` }} onChange={(e) => radio.setVolume(Number(e.target.value) / 100)} />
    </span>
  );
}
