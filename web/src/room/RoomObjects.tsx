import { roomStyles } from "../desk/roomStyles";
import { createPortal } from "react-dom";
import { openMusic, openMusicArtwork, useMusic } from "../desk/musicState";
import { openRoomPlant } from './RoomPlant';
import { openTeaBreak } from './TeaBreak';
import { openChairPicker } from './ChairPicker';
import { usePlayer } from './playerState';
import { openRoomProp } from './RoomProps';
import { useArtworkHold } from './useArtworkHold';

/** Transparent targets follow the painted objects; narrow screens keep the same shortcuts. */
export function RoomObjects({ inside, onEnter }: { inside: boolean; onEnter: () => void }) {
  const music = useMusic();
  const { shown } = usePlayer();
  const musicHold = useArtworkHold({ onHold: openMusicArtwork, onClick: openMusic, disabled: inside });
  return <>
    <button type="button" className={["room-object room-music", roomStyles["room-object"], roomStyles["room-music"]].join(" ")} aria-label="Open music player" tabIndex={inside ? -1 : 0}
      disabled={inside} aria-haspopup="dialog" aria-expanded={music.open} data-outlined={!!shown}
      {...musicHold} title="Click for music · Hold to change player">
      <span aria-hidden="true">Music · Hold to change player</span>
    </button>
    {!inside && createPortal(
      <div className={["room-object-shortcuts", roomStyles["room-object-shortcuts"]].join(" ")} role="group" aria-label="Room shortcuts"
        onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
        <a href="#/photos">Photos</a>
        <button type="button" onClick={onEnter}>Practice</button>
        <button type="button" className="room-music-shortcut" onClick={openMusic} aria-haspopup="dialog" aria-expanded={music.open}>Music</button>
        <button type="button" onClick={openRoomPlant}>Plants</button>
        <button type="button" onClick={openTeaBreak}>Tea</button>
        <button type="button" className="room-chair-shortcut" onClick={openChairPicker} aria-haspopup="dialog">Chair</button>
        <button type="button" className="room-coffee-shortcut" onClick={() => openRoomProp('coffee')} aria-haspopup="dialog">Coffee</button>
        <button type="button" className="room-camera-shortcut" onClick={() => openRoomProp('camera')} aria-haspopup="dialog">Camera</button>
      </div>, document.body)}
  </>;
}
