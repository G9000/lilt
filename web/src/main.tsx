import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { finishSignIn } from "./desk/spotifyAuth";
import "./styles.css";

const PaintedCorner = lazy(() => import('./painted-corner/PaintedCorner'));
function Root() {
  const read = () => location.hash.split('?')[0];
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => setPath(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const preview = path === '#/painted-corner' || path === '#/sketched-corner';
  const style = path === '#/sketched-corner' ? 'sketch' : 'painted';
  // Branch before App mounts: the art preview does not recover recordings or request practice data.
  return preview ? <Suspense fallback={<main style={{ padding: 32 }}>Opening the room…</main>}><PaintedCorner key={style} style={style} /></Suspense> : <App />;
}

// Back from signing in to Spotify: finish it, then open the app as usual.
void finishSignIn().then((err) => {
  if (err) console.warn("Spotify sign-in:", err);
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
  );
});
