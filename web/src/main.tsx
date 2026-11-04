import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { finishSignIn } from "./desk/spotifyAuth";
import "./styles.css";

// Back from signing in to Spotify: finish it, then open the app as usual.
void finishSignIn().then((err) => {
  if (err) console.warn("Spotify sign-in:", err);
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
