import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useId, useMemo, type KeyboardEvent } from "react";
import "../styles/markdown.css";

/** Course-local images use the existing media endpoint; arbitrary local paths stay blocked. */
export const picture = (src: string) => (/^https?:\/\//i.test(src) ? src : /^images\/[\w.-]+$/.test(src) ? `/texts/${src}` : undefined);

// Keyboard scrolling inside a document must not trigger exercise/recording shortcuts.
function readingKeys(event: KeyboardEvent<HTMLElement>) {
  if (!event.metaKey && !event.ctrlKey && !event.altKey) event.stopPropagation();
}

const components: Components = {
  a: ({ node: _node, href, children, ...props }) => (
    <a {...props} href={href || undefined} target={/^https?:/i.test(href ?? "") ? "_blank" : undefined} rel="noreferrer" onClick={(event) => {
      // Document fragments (including footnotes) must not enter the app's hash router.
      if (!href?.startsWith("#") || href.startsWith("#/")) return;
      event.preventDefault();
      let id = href.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Keep a literal malformed fragment harmless. */ }
      const document = event.currentTarget.closest<HTMLElement>(".md");
      const target = id ? document?.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : document;
      if (target) {
        if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    }}>{children}</a>
  ),
  img: ({ node: _node, src, alt, ...props }) => src
    ? <img {...props} src={src} alt={alt ?? ""} loading="lazy" />
    : <span className="md-image-fallback">{alt}</span>,
  table: ({ node: _node, ...props }) => (
    <div className="md-table" role="region" aria-label="Scrollable table" tabIndex={0}><table {...props} /></div>
  ),
  pre: ({ node: _node, ...props }) => <pre {...props} tabIndex={0} aria-label="Code block" />,
};

/** One safe, shared reading surface for any course. Raw HTML is never executed. */
export function Markdown({ src, className, headingOffset = 0 }: { src: string; className?: string; headingOffset?: 0 | 1 | 2 }) {
  const id = useId();
  const renderers = useMemo<Components>(() => ({ ...components,
    ...(headingOffset ? Object.fromEntries([1, 2, 3, 4, 5, 6].map(level => [`h${level}`, `h${Math.min(6, level + headingOffset)}`])) : {}),
  }), [headingOffset]);
  return (
    <div className={["md", className].filter(Boolean).join(" ")} onKeyDown={readingKeys}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={{ clobberPrefix: `md-${id}-` }}
        components={renderers}
        skipHtml
        urlTransform={(url, key) => {
          if (key === "src") return picture(url);
          return /^(https?:|#|mailto:)/i.test(url) ? defaultUrlTransform(url) : undefined;
        }}
      >{src}</ReactMarkdown>
    </div>
  );
}
