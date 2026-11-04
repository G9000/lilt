import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { finishSignIn } from "./desk/spotifyAuth";
import "./styles.css";

const PaintedCorner = lazy(() => import('./painted-corner/PaintedCorner'));
function Root() {
  const [preview, setPreview] = useState(() => location.hash.split('?')[0] === '#/painted-corner');
  useEffect(() => {
    const on = () => setPreview(location.hash.split('?')[0] === '#/painted-corner');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // Branch before App mounts: the art preview does not recover recordings or request practice data.
  return preview ? <Suspense fallback={<main style={{ padding: 32 }}>Opening the room…</main>}><PaintedCorner /></Suspense> : <App />;
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
