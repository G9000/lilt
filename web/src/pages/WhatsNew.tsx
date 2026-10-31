import "../styles/whats-new.css";
import { Markdown } from "../components/Markdown";
import { WHATS_NEW } from "../release";

/** The release notes (whats-new.md): every version, newest first, in a window of their own. */
export function WhatsNewPage() {
  return <Markdown src={WHATS_NEW} className="wn" />;
}
