import "../styles/photos.css";
import { DragEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { ShuffleIcon } from "../desk/Desk";
import { pinnedPicture, pinPicture, refreshPhotos, setPhotoIndex, usePhotos } from "../desk/photos";
import type { Picture } from "../desk/pictures";
import { currentLight } from "../room/scene";

/**
 * Photos: every picture the clock can show, as an app. Add your own (drop them in, or Add photos),
 * look at one full size, put one on the clock or shuffle, and delete: a photo you added is deleted
 * from your computer; one of Lilt's own is only hidden, until Restore.
 */

/** Photos are shrunk before they're sent: big enough for any screen, small on disk, and without
 *  the camera's hidden details (location, device), which a redrawn image doesn't carry. */
const LONGEST = 1600;
async function prepare(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, LONGEST / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const as = (type: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.86));
  const blob = (await as("image/webp")) ?? (await as("image/jpeg"));
  if (!blob) throw new Error("This browser couldn't read that image.");
  return blob;
}
const nameOf = (file: File) => file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 80);

export function PhotosPage() {
  const { pictures, hidden, loaded } = usePhotos();
  const light = currentLight();
  const [pinned, setPinned] = useState(pinnedPicture);
  useEffect(() => {
    const on = () => setPinned(pinnedPicture());
    window.addEventListener("lilt:clock-picture", on);
    return () => window.removeEventListener("lilt:clock-picture", on);
  }, []);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!note) return; const id = window.setTimeout(() => setNote(null), 5000); return () => window.clearTimeout(id); }, [note]);

  const add = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) { setNote({ text: "Those aren't pictures Lilt can show.", bad: true }); return; }
    let done = 0;
    for (const f of images) {
      setBusy(`Adding ${images.length > 1 ? `${done + 1} of ${images.length}` : "your photo"}…`);
      try { await api.addPhoto(await prepare(f), nameOf(f)); done++; } catch (e: any) { setNote({ text: `${f.name}: ${e.message}`, bad: true }); }
    }
    setBusy(null);
    await refreshPhotos();
    if (done) setNote({ text: done === 1 ? "Added. It's in the clock's shuffle now." : `Added ${done} photos. They're in the clock's shuffle now.` });
  };
  const remove = async (p: Picture) => {
    setConfirm(null);
    try {
      setPhotoIndex(await api.deletePhoto(p.id));
      if (pinned === p.id) pinPicture(null);
      if (viewing === p.id) setViewing(null);
      setNote({ text: p.mine ? `Deleted ${p.name}.` : `Hid ${p.name}. Restore brings it back.` });
    } catch (e: any) { setNote({ text: e.message, bad: true }); }
  };
  const restore = async () => {
    try { setPhotoIndex(await api.restorePhotos()); setNote({ text: "Lilt's photos are back." }); } catch (e: any) { setNote({ text: e.message, bad: true }); }
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); void add([...e.dataTransfer.files]); };
  const mine = pictures.filter((p) => p.mine).length;
  const view = viewing ? pictures.find((p) => p.id === viewing) ?? null : null;

  return (
    <div className={`ph${dragging ? " dragging" : ""}`} onDragOver={(e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }} onDrop={onDrop}>
      <header className="ph-head">
        <div>
          <h1>Photos</h1>
          <p>{pictures.length} photo{pictures.length === 1 ? "" : "s"}{mine ? `, ${mine} of them yours` : ""}. The clock in the room shows {pinned ? "the one you picked" : "a different one each time you come in"}.</p>
        </div>
        <div className="ph-actions">
          <button className={`ph-shuffle${pinned ? "" : " on"}`} aria-pressed={!pinned} onClick={() => pinPicture(null)} title="A different photo on the clock each time you come in">
            <ShuffleIcon />Shuffle
          </button>
          <button className="ph-add" onClick={() => input.current?.click()} disabled={!!busy}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Add photos
          </button>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </div>
      </header>

      {!loaded && <p className="ph-quiet">Opening your photos…</p>}
      <ul className="ph-grid">
        {pictures.map((p) => (
          <li key={p.id} className={`ph-tile${p.id === pinned ? " pinned" : ""}`}>
            <button className="ph-img" onClick={() => setViewing(p.id)} aria-label={`View ${p.name}`}>
              <span style={{ backgroundImage: `url(${p.url(light)})`, ...p.clock }} />
            </button>
            <div className="ph-meta">
              <b title={p.name}>{p.name}</b>
              <small>{p.id === pinned ? "On the clock" : p.mine ? "Yours" : p.photo ? "Lilt's" : "A view of the room"}</small>
            </div>
            {confirm === p.id ? (
              <div className="ph-confirm" role="group" aria-label={`Delete ${p.name}?`}>
                <span>{p.mine ? "Delete it from your computer?" : "Hide this one? Restore brings it back."}</span>
                <div>
                  <button className="ph-danger" onClick={() => void remove(p)}>{p.mine ? "Delete" : "Hide"}</button>
                  <button onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="ph-tools">
                <button onClick={() => pinPicture(p.id)} disabled={p.id === pinned} title="Show this one on the clock" aria-label={`Show ${p.name} on the clock`}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 5v3.2l2 1.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
                <button onClick={() => setConfirm(p.id)} title={p.mine ? "Delete" : "Hide"} aria-label={`${p.mine ? "Delete" : "Hide"} ${p.name}`}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            )}
          </li>
        ))}
        <li className="ph-tile ph-drop">
          <button onClick={() => input.current?.click()} disabled={!!busy}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <b>Add photos</b>
            <small>or drop them anywhere here</small>
          </button>
        </li>
      </ul>
      {hidden > 0 && <p className="ph-quiet">{hidden} of Lilt's photos hidden. <button className="ph-link" onClick={() => void restore()}>Restore</button></p>}
      <p className="ph-quiet ph-small">Photos you add stay on this computer, in Lilt's data folder, and go into Export with everything else.</p>

      {(busy || note) && <p className={`ph-note${note?.bad ? " bad" : ""}`} role="status">{busy ?? note?.text}</p>}
      {dragging && <div className="ph-dropzone" aria-hidden="true"><span>Drop to add to Photos</span></div>}
      {view && <Viewer pictures={pictures} picture={view} pinned={pinned} onGo={setViewing} onClose={() => setViewing(null)} onDelete={() => setConfirm(view.id)} />}
    </div>
  );
}

/** One photo, full size: ← and → for the others, Esc to close. */
function Viewer({ pictures, picture, pinned, onGo, onClose, onDelete }: {
  pictures: Picture[]; picture: Picture; pinned: string | null; onGo: (id: string) => void; onClose: () => void; onDelete: () => void;
}) {
  const i = pictures.indexOf(picture);
  const step = (d: number) => onGo(pictures[(i + d + pictures.length) % pictures.length].id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="ph-viewer" role="dialog" aria-label={picture.name} onClick={onClose}>
      <img src={picture.url(currentLight())} alt={picture.name} onClick={(e) => e.stopPropagation()} />
      <button className="ph-nav prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous photo">‹</button>
      <button className="ph-nav next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next photo">›</button>
      <div className="ph-viewer-bar" onClick={(e) => e.stopPropagation()}>
        <b>{picture.name}</b>
        <span>{i + 1} of {pictures.length}</span>
        <button onClick={() => pinPicture(picture.id)} disabled={picture.id === pinned}>{picture.id === pinned ? "On the clock" : "Show on the clock"}</button>
        <button onClick={() => { onClose(); onDelete(); }}>{picture.mine ? "Delete" : "Hide"}</button>
        <button onClick={onClose} aria-label="Close">Close</button>
      </div>
    </div>
  );
}
