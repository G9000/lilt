import "../styles/editor.css";
import { Markdown } from "../components/Markdown";
import { WHATS_NEW } from "../release";

/** The release notes (whats-new.md), in a window of their own, read like the course pages. */
export function WhatsNewPage() {
  return <Markdown src={WHATS_NEW} className="ve-md" />;
}
