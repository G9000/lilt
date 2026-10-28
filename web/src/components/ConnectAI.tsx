import { useEffect, useState } from "react";
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
 * Settings → Connect your AI: how to connect AI apps on this computer (Claude Code, Claude Desktop,
 * others), and cloud apps such as ChatGPT through a public tunnel address with a one-time code.
 */
export function ConnectAI() {
  const [c, setC] = useState<ConnectInfo | null>(null);
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

  return (
    <section className="st-group" aria-labelledby="st-ai">
      <h2 id="st-ai">Connect your AI</h2>
      <p className="st-note st-lead">Let an AI assistant read your practice, write reviews, and rewrite your own copy of the chapters ("make the warm-ups shorter"). Lilt's original chapters stay as they are, and every change can be undone.</p>

      <h3 className="st-sub">On this computer</h3>
      <div className="st-box">
        <div className="st-field">
          <span className="st-label">Claude Code</span>
          <p className="st-help">Run this once in a terminal.</p>
          <Snippet label="Claude Code command" text={`claude mcp add --transport http lilt ${c.local_url}${c.token_required ? " --header \"Authorization: Bearer $LILT_MCP_TOKEN\"" : ""}`} />
        </div>
        <div className="st-field">
          <span className="st-label">Claude Desktop</span>
          <p className="st-help">Add this to <code>claude_desktop_config.json</code> (Claude → Settings → Developer → Edit Config), then restart Claude.{c.stdio.command === "docker" && " Lilt's container needs to be running."}</p>
          <Snippet label="Claude Desktop configuration" text={desktop} />
        </div>
        <div className="st-field">
          <span className="st-label">Other apps (Cursor, Hermes and others)</span>
          <p className="st-help">Use this address for MCP over HTTP, or the command above for apps that start Lilt themselves.</p>
          <Snippet label="Lilt's MCP address" text={c.local_url} />
        </div>
      </div>

      <h3 className="st-sub">ChatGPT, and other apps in the cloud</h3>
      <div className="st-box">
        <div className="st-field">
          <span className="st-label">1. Give Lilt a public address</span>
          <p className="st-help">Cloud apps can't reach this computer, so run a tunnel here and paste the https address it prints. Through it, only Lilt's AI connection and its sign-in page can be reached: not the app, not your recordings. Needs cloudflared (<code>brew install cloudflared</code>); a quick tunnel gets a new address each time it starts, while a named Cloudflare tunnel or Tailscale Funnel keeps the same one.</p>
          <Snippet label="Tunnel command" text="cloudflared tunnel --url http://127.0.0.1:7878" />
          <div className="st-inline">
            <input type="url" inputMode="url" aria-label="Public address" placeholder="https://something.trycloudflare.com" value={address} onChange={(e) => setAddress(e.target.value)} />
            <button className="btn-secondary" onClick={() => void saveAddress()} disabled={address.trim().replace(/\/$/, "") === (c.public_url ?? "")}>Save address</button>
          </div>
        </div>
        <div className="st-field">
          <span className="st-label">2. Add Lilt in ChatGPT</span>
          <p className="st-help">In ChatGPT, add a custom MCP server (Settings → Apps &amp; Connectors, with developer mode on; on some plans it's under Plugins). Use this address and choose OAuth. claude.ai works the same way (Settings → Connectors → Add custom connector).</p>
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
        {c.connections.length > 0 && c.connections.map((x) => (
          <div className="st-row" key={x.id}>
            <div><span className="st-label">{x.client_name}</span><p className="st-help">Connected {ago(x.connected)}, last used {ago(x.last_used)}</p></div>
            <button className="btn-secondary" onClick={() => void run(async () => { await api.disconnectApp(x.id); await load(); })}>Disconnect</button>
          </div>
        ))}
      </div>

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
