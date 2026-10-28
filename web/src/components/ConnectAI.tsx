import { ReactNode, useEffect, useState } from "react";
import { api, ConnectInfo } from "../api";
import { Callout } from "./bits";

/** "3 min ago", "yesterday", or the date. */
function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return "yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** A command or address to copy, with a Copy button. */
function Snippet({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = () => void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1600); });
  return (
    <div className="st-snip">
      <pre aria-label={label}>{text}</pre>
      <button className="btn-secondary" onClick={copy}>{done ? "Copied" : "Copy"}</button>
    </div>
  );
}

/**
 * Settings → AI connections: pick your app first (ChatGPT, Claude Desktop, Claude Code, others),
 * then its steps. Apps on this computer connect directly; ChatGPT and other cloud apps through a
 * public tunnel address and a one-time code.
 */
type App = "chatgpt" | "claude-desktop" | "claude-code" | "other";

export function ConnectAI() {
  const [c, setC] = useState<ConnectInfo | null>(null);
  const [app, setApp] = useState<App>("chatgpt");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState<{ code: string; until: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState<string | null>(null);
  const load = () => api.connectInfo().then((x) => { setC(x); setAddress(x.public_url ?? ""); });
  useEffect(() => { void load(); }, []);
  // While a code is showing, count down, and look for the app that uses it.
  useEffect(() => {
    if (!code) return;
    const t = setInterval(() => { setNow(Date.now()); void api.connectInfo().then(setC); }, 2000);
    return () => clearInterval(t);
  }, [code]);
  if (!c) return null;

  const run = async (f: () => Promise<unknown>) => { setErr(null); try { await f(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } };
  const saveAddress = () => run(async () => { await api.setPublicAddress(address); await load(); });
  const getCode = () => run(async () => { const r = await api.pairingCode(); setCode({ code: r.code, until: Date.now() + r.expires_in * 1000 }); setNow(Date.now()); });
  const left = code ? Math.max(0, Math.round((code.until - now) / 1000)) : 0;
  const desktop = JSON.stringify({ mcpServers: { lilt: c.stdio } }, null, 2);

  const apps: { id: App; name: string; where: string }[] = [
    { id: "chatgpt", name: "ChatGPT", where: "Web, desktop and phone" },
    { id: "claude-desktop", name: "Claude Desktop", where: "On this Mac" },
    { id: "claude-code", name: "Claude Code", where: "In a terminal" },
    { id: "other", name: "Other apps", where: "Cursor, Hermes, claude.ai" },
  ];
  const chatgpt = (
    <div className="st-box">
      <div className="st-field">
        <p className="st-help st-why">ChatGPT runs on OpenAI's servers, so it can't reach this computer directly. You give Lilt a temporary public address, add it in ChatGPT, and sign in with a code only Lilt shows you. Through that address only Lilt's AI connection and sign-in page can be reached: not the app, not your recordings.</p>
      </div>
      <div className="st-field">
        <span className="st-label">1. Give Lilt a public address</span>
        <p className="st-help">Run this on this computer and paste the https address it prints. It needs cloudflared (<code>brew install cloudflared</code>). A quick tunnel gets a new address each time it starts; a named Cloudflare tunnel or Tailscale Funnel keeps the same one.</p>
        <Snippet label="Tunnel command" text="cloudflared tunnel --url http://127.0.0.1:7878" />
        <div className="st-inline">
          <input type="url" inputMode="url" aria-label="Public address" placeholder="https://something.trycloudflare.com" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button className="btn-secondary" onClick={() => void saveAddress()} disabled={address.trim().replace(/\/$/, "") === (c.public_url ?? "")}>Save address</button>
        </div>
      </div>
      <div className="st-field">
        <span className="st-label">2. Add Lilt in ChatGPT</span>
        <p className="st-help">In ChatGPT, turn on developer mode and add a custom MCP server (Settings → Apps &amp; Connectors; on some plans it's under Plugins). Paste this address and choose OAuth.</p>
        {c.public_mcp_url ? <Snippet label="Public MCP address" text={c.public_mcp_url} /> : <p className="st-help st-wait">Save the public address first.</p>}
      </div>
      <div className="st-field">
        <span className="st-label">3. Sign in with a code</span>
        <p className="st-help">ChatGPT opens Lilt's sign-in page. Get a code here and type it there. Each code works once, for 10 minutes, so only you can connect.</p>
        {code && left > 0 ? (
          <p className="st-code" aria-live="polite"><b>{code.code}</b><span>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left</span></p>
        ) : (
          <button className="btn-secondary" onClick={() => void getCode()} disabled={!c.public_url}>Get a code</button>
        )}
      </div>
      {c.connections.map((x) => (
        <div className="st-row" key={x.id}>
          <div><span className="st-label">{x.client_name}</span><p className="st-help">Connected {ago(x.connected)}, last used {ago(x.last_used)}</p></div>
          <button className="btn-secondary" onClick={() => void run(async () => { await api.disconnectApp(x.id); await load(); })}>Disconnect</button>
        </div>
      ))}
    </div>
  );
  const pane: Record<App, ReactNode> = {
    chatgpt,
    "claude-desktop": (
      <div className="st-box">
        <div className="st-field">
          <span className="st-label">Add Lilt to Claude Desktop</span>
          <p className="st-help">Open Claude → Settings → Developer → Edit Config, paste this into <code>claude_desktop_config.json</code>, then restart Claude. It runs on this computer; nothing goes through the internet to reach Lilt.{c.stdio.command === "docker" && " Lilt's container needs to be running."}</p>
          <Snippet label="Claude Desktop configuration" text={desktop} />
        </div>
      </div>
    ),
    "claude-code": (
      <div className="st-box">
        <div className="st-field">
          <span className="st-label">Add Lilt to Claude Code</span>
          <p className="st-help">Run this once in a terminal. Then ask Claude about your practice, or to change your chapters.</p>
          <Snippet label="Claude Code command" text={`claude mcp add --transport http lilt ${c.local_url}${c.token_required ? " --header \"Authorization: Bearer $LILT_MCP_TOKEN\"" : ""}`} />
        </div>
      </div>
    ),
    other: (
      <div className="st-box">
        <div className="st-field">
          <span className="st-label">Apps on this computer</span>
          <p className="st-help">Cursor, Hermes and other apps that speak MCP over HTTP can use this address. Apps that start Lilt themselves can use the command in Claude Desktop's setup.</p>
          <Snippet label="Lilt's MCP address" text={c.local_url} />
        </div>
        <div className="st-field">
          <span className="st-label">claude.ai on the web</span>
          <p className="st-help">Like ChatGPT, it runs in the cloud: follow ChatGPT's steps, then add the address under Settings → Connectors → Add custom connector.</p>
        </div>
      </div>
    ),
  };

  return (
    <section className="st-group" id="st-ai" aria-label="Connect your AI">
      <div className="st-apps" role="tablist" aria-label="Choose your app">
        {apps.map((a) => (
          <button key={a.id} role="tab" aria-selected={app === a.id} className={app === a.id ? "on" : ""} onClick={() => setApp(a.id)}>
            <b>{a.name}</b><span>{a.where}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={apps.find((a) => a.id === app)?.name}>{pane[app]}</div>

      <h3 className="st-sub">Recently used by</h3>
      <div className="st-box">
        {c.activity.length === 0
          ? <div className="st-row"><p className="st-help">No AI app has used Lilt yet. Once one does, it shows here, so you know it worked.</p></div>
          : c.activity.slice(0, 5).map((a) => (
            <div className="st-row" key={a.client}><span className="st-label">{a.client}</span><span className="st-help">{a.last_tool.replace(/_/g, " ")}, {ago(a.last_used)}</span></div>
          ))}
      </div>
      {err && <Callout kind="warn"><p>{err}</p></Callout>}
    </section>
  );
}
