import { cx } from "../ui/cx";
import { accent } from "../ui/accent";
import { useEffect, useId, useState } from 'react';
import { ACCENTS, DEFAULT_ACCENT, parseAccent } from '../accent-colors';
import { setAccent, useAccent } from '../accent';

export function AccentPicker() {
  const { color, saved } = useAccent();
  const [draft, setDraft] = useState(color);
  const [error, setError] = useState(false);
  const id = useId();
  useEffect(() => { setDraft(color); setError(false); }, [color]);
  const choose = (value: string) => { setDraft(value); setError(false); setAccent(value); };
  const commit = () => {
    const value = parseAccent(draft);
    if (value) choose(value); else setError(true);
  };
  return <fieldset className={cx("accent-picker", accent["accent-picker"])}>
    <legend>Accent color</legend>
    <div className={cx("accent-presets", accent["accent-presets"])}>
      {ACCENTS.map(preset => <label key={preset.color} title={preset.name}>
        <input type="radio" name={`${id}-accent`} aria-label={preset.name} checked={color === preset.color}
          onChange={() => choose(preset.color)} />
        <span style={{ backgroundColor: preset.color }} aria-hidden="true" />
      </label>)}
    </div>
    <div className={cx("accent-custom", accent["accent-custom"])}>
      <label className="accent-native">Custom color<input type="color" value={color} onChange={e => choose(e.target.value)} /></label>
      <label className="accent-hex" htmlFor={`${id}-hex`}>Hex color
        <input id={`${id}-hex`} type="text" value={draft} spellCheck={false} autoComplete="off" maxLength={7}
          aria-invalid={error} aria-describedby={error ? `${id}-error` : undefined}
          onChange={e => { setDraft(e.target.value); setError(false); }} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
      </label>
    </div>
    {error && <p id={`${id}-error`} role="alert">Use a hex color, such as #467aca.</p>}
    <p className="accent-help">Across Lilt. Shades adjust to stay readable.</p>
    <button type="button" className="accent-reset" onClick={() => choose(DEFAULT_ACCENT)}>Reset to orange</button>
    {!saved && <p role="status">Applied for this visit. Your browser could not save the color.</p>}
  </fieldset>;
}
