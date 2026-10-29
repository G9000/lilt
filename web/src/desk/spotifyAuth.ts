/**
 * Signing in to your own Spotify, the way Spotify asks apps without a server secret to: Authorization
 * Code with PKCE, straight from this browser to accounts.spotify.com. Lilt never sees your password.
 * The tokens stay in this browser (localStorage) and are refreshed as they expire.
 *
 * You bring your own Spotify app (developer.spotify.com, free): its Client ID goes here, and its
 * Redirect URI must be exactly `redirectUri()`.
 */

const CLIENT = "lilt.spotify.client";
const TOKENS = "lilt.spotify.tokens";
const VERIFIER = "lilt.spotify.verifier";
const SCOPES = ["streaming", "user-read-email", "user-read-private", "playlist-read-private", "playlist-read-collaborative", "user-read-playback-state", "user-modify-playback-state"];

interface Tokens { access: string; refresh: string; expires: number }

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } };
const changed = () => window.dispatchEvent(new Event("lilt:spotify"));

export const clientId = () => get(CLIENT);
export function setClientId(id: string | null) { set(CLIENT, id?.trim() || null); changed(); }
/** Spotify accepts loopback addresses only as 127.0.0.1 (not "localhost"), over http. */
export const redirectUri = () => `${location.protocol}//${location.host.replace(/^localhost(?=:|$)/, "127.0.0.1")}/spotify-callback`;
export const signedIn = () => !!get(TOKENS);

const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signIn() {
  const id = clientId();
  if (!id) throw new Error("Add your Spotify Client ID first.");
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  set(VERIFIER, verifier);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const q = new URLSearchParams({ client_id: id, response_type: "code", redirect_uri: redirectUri(), code_challenge_method: "S256", code_challenge: challenge, scope: SCOPES.join(" ") });
  location.assign(`https://accounts.spotify.com/authorize?${q}`);
}

export function signOut() { set(TOKENS, null); changed(); }

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const r = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error || "Spotify sign-in failed");
  const old = readTokens();
  const t = { access: j.access_token, refresh: j.refresh_token ?? old?.refresh ?? "", expires: Date.now() + (j.expires_in - 60) * 1000 };
  set(TOKENS, JSON.stringify(t));
  changed();
  return t;
}
function readTokens(): Tokens | null { try { return JSON.parse(get(TOKENS) ?? "null"); } catch { return null; } }

/** Spotify sends you back to /spotify-callback?code=…: finish signing in, then return to the room. */
export async function finishSignIn(): Promise<string | null> {
  if (location.pathname !== "/spotify-callback") return null;
  const q = new URLSearchParams(location.search);
  let err: string | null = q.get("error");
  const code = q.get("code"), verifier = get(VERIFIER), id = clientId();
  if (!err && code && verifier && id) {
    try { await tokenRequest({ client_id: id, grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: verifier }); }
    catch (e) { err = e instanceof Error ? e.message : String(e); }
  }
  set(VERIFIER, null);
  try { localStorage.setItem("lilt.radio.source", "spotify"); } catch { /* private mode */ }
  history.replaceState(null, "", "/#/");
  return err;
}

/** A fresh access token (refreshed when it's about to run out), or null if you're signed out. */
export async function accessToken(): Promise<string | null> {
  const t = readTokens(), id = clientId();
  if (!t) return null;
  if (Date.now() < t.expires) return t.access;
  if (!id || !t.refresh) { signOut(); return null; }
  try { return (await tokenRequest({ client_id: id, grant_type: "refresh_token", refresh_token: t.refresh })).access; }
  catch { signOut(); return null; }
}

/** Calls the Spotify Web API as you. */
export async function spotify<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const token = await accessToken();
  if (!token) throw new Error("Signed out of Spotify");
  const r = await fetch(`https://api.spotify.com/v1${path}`, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  if (r.status === 204) return null;
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error?.message ?? `Spotify said ${r.status}`);
  return j as T;
}
