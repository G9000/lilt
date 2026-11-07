import { PLAYERS, playerImage } from './player';
import { choosePlayer, retryPlayerArt, usePlayer } from './playerState';

export function PlayerPicker() {
  const { selected, shown, failed, unsaved } = usePlayer();
  return <details className="room-player-picker mt-4 border-t border-[var(--hair)] pt-2">
    <summary className="min-h-11 cursor-pointer rounded-lg px-2 py-3 text-sm text-[var(--ink-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
      Change player <span className="ml-2 text-[var(--ink)]">{PLAYERS.find(player => player.id === selected)!.name}</span>
    </summary>
    <div className="grid grid-cols-4 gap-2 pt-2" role="group" aria-label="Room player designs">
      {PLAYERS.map(player => <button type="button" key={player.id} aria-label={player.name} title={player.name} aria-pressed={selected === player.id} onClick={() => choosePlayer(player.id)}
        className="flex min-h-11 items-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] p-1 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
        <img src={playerImage(player.id)} alt="" className="aspect-[3/2] w-full object-contain" />
      </button>)}
    </div>
    <p className="mb-0 mt-2 text-xs text-[var(--ink-2)]">Changes the player on your desk. Your choice stays in this browser.</p>
    {failed ? <p role="status" className="mb-0 mt-2 text-xs text-[var(--ink-2)]">Couldn't load this player. Your previous one is still here. <button type="button" onClick={retryPlayerArt} className="underline">Try again</button></p>
      : shown !== selected && <p role="status" className="mb-0 mt-2 text-xs text-[var(--ink-2)]">Getting your player ready…</p>}
    {unsaved && <p role="status" className="mb-0 mt-2 text-xs text-[var(--ink-2)]">Your player changed here, but this browser couldn't save it for next time.</p>}
  </details>;
}
