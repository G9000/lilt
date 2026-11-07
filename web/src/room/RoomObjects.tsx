import { roomStyles } from "../desk/roomStyles";
import { createPortal } from "react-dom";
import { openMusic, useMusic } from "../desk/musicState";
import { openRoomPlant } from './RoomPlant';
import { openTeaBreak } from './TeaBreak';

/** Transparent targets follow the painted objects; narrow screens keep the same shortcuts. */
export function RoomObjects({ inside, onEnter }: { inside: boolean; onEnter: () => void }) {
  const music = useMusic();
  return <>
    <a className={["room-object room-camera", roomStyles["room-object"], roomStyles["room-camera"]].join(" ")} href="#/photos" aria-label="Open Photos" tabIndex={inside ? -1 : 0}
      onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
      <span aria-hidden="true">Open Photos</span>
    </a>
    <button type="button" className={["room-object room-microphone", roomStyles["room-object"], roomStyles["room-microphone"]].join(" ")} aria-label="Open Practice" tabIndex={inside ? -1 : 0}
      disabled={inside} onClick={onEnter} onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
      <span aria-hidden="true">Open Practice</span>
    </button>
    <button type="button" className={["room-object room-music", roomStyles["room-object"], roomStyles["room-music"]].join(" ")} aria-label="Open music player" tabIndex={inside ? -1 : 0}
      disabled={inside} onClick={openMusic} aria-haspopup="dialog" aria-expanded={music.open}
      onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
      <span aria-hidden="true">Music</span>
    </button>
    {!inside && createPortal(
      <div className={["room-object-shortcuts", roomStyles["room-object-shortcuts"]].join(" ")} role="group" aria-label="Room shortcuts"
        onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
        <a href="#/photos">Photos</a>
        <button type="button" onClick={onEnter}>Practice</button>
        <button type="button" className="room-music-shortcut" onClick={openMusic} aria-haspopup="dialog" aria-expanded={music.open}>Music</button>
        <button type="button" onClick={openRoomPlant}>Plants</button>
        <button type="button" onClick={openTeaBreak}>Tea</button>
      </div>, document.body)}
  </>;
}
