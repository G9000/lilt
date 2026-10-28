import { useEffect, useState } from "react";
import { api } from "../api";

/** The ChatGPT account Lilt's AI features will use (Practice first): connect, or connected with Disconnect. For Settings. */
export function ChatGPTAccount() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const local = window.location.hostname === "127.0.0.1" && window.location.protocol === "http:";
  useEffect(() => {
    if (local) void api.chatgptStatus().then((s) => setConnected(s.connected), (e) => setNotice(e.message));
  }, [local]);
  const login = async () => {
    setBusy(true); setNotice("");
    try {
      const { url } = await api.chatgptLogin();
      const target = new URL(url);
      if (target.origin !== "https://auth.openai.com" || target.pathname !== "/api/accounts/authorize") throw new Error("Unexpected sign-in address.");
      window.location.assign(target.href);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Couldn't start sign-in."); setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setNotice("");
    try {
      const result = await api.chatgptDisconnect(); setConnected(false);
      if (!result.revoked) setNotice("Signed out here. OpenAI could not confirm revocation; you can remove Lilt in ChatGPT settings.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Couldn't disconnect."); }
    finally { setBusy(false); }
  };
  return <div className="lc-account">
    {!local ? <div className="lc-row"><div><b>ChatGPT</b><p>To connect your account, open Lilt on this computer at <a href={`http://127.0.0.1:${window.location.port || "7878"}/#/settings/ai`}>its local address</a>.</p></div></div>
      : connected === null ? <p role="status" className="lc-row">Checking your connection…</p>
      : connected ? <div className="lc-row"><div><b>Connected</b><p>Your ChatGPT account. Audio is never sent.</p></div><button className="btn-secondary" onClick={() => void disconnect()} disabled={busy}>Disconnect</button></div>
      : <div className="lc-row"><div><b>Not connected</b><p>Sign in with your ChatGPT plan. OpenAI asks you to approve it.</p></div><button className="btn-primary" disabled={busy} onClick={() => void login()}>Continue with ChatGPT</button></div>}
    {notice && <p className="lc-error" role="alert">{notice}</p>}
  </div>;
}
