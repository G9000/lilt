import { PLAYERS, playerImage } from './player';
import { choosePlayer, retryPlayerArt, usePlayer } from './playerState';

export function PlayerPicker() {
  const { selected, shown, failed, unsaved } = usePlayer();
  return <details className="room-player-picker mb-6 border-b border-[var(--hair)] pb-4">
    <summary className="min-h-11 cursor-pointer rounded-lg px-2 py-3 text-sm text-[var(--ink-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
      Your room player <span className="ml-2 text-[var(--ink)]">{PLAYERS.find(player => player.id === selected)!.name}</span>
    </summary>
    <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4" role="group" aria-label="Room player designs">
      {PLAYERS.map(player => <button type="button" key={player.id} aria-pressed={selected === player.id} onClick={() => choosePlayer(player.id)}
        className="flex min-h-11 flex-col! items-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-2 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
        <img src={playerImage(player.id)} alt="" className="aspect-[3/2] w-full object-contain" />
        <span className="text-xs">{player.name}</span>
      </button>)}
    </div>
    <p className="mb-0 mt-3 text-xs text-[var(--ink-2)]">A little music beside your desk. Your choice stays in this browser.</p>
    {failed ? <p role="status" className="mb-0 mt-2 text-xs text-[var(--ink-2)]">Couldn't load this player. Your previous one is still here. <button type="button" onClick={retryPlayerArt} className="underline">Try again</button></p>
      : shown !== selected && <p role="status" className="mb-0 mt-2 text-xs text-[var(--ink-2)]">Getting your player ready…</p>}
    {unsaved && <p role="status" className="mb-0 mt-2 text-xs text-[var(--ink-2)]">Your player changed here, but this browser couldn't save it for next time.</p>}
  </details>;
}
