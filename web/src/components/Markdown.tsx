import { ReactNode } from "react";

/**
 * A small Markdown renderer for content written by the owner (content/courses/voice/index.md): headings,
 * paragraphs, lists, quotes, **bold**, _italic_, `code`, [links](url) and ![pictures](images/x.webp).
 * It builds React elements, never HTML, so nothing in the file can inject markup. Picture paths are
 * relative to content/courses/voice, as Obsidian reads them, and served at /texts/images.
 */

/** A picture path from the texts' Markdown (`images/x.webp` or a web address) as a URL to load. */
export const picture = (src: string) => (/^https?:\/\//.test(src) ? src : /^images\/[\w.-]+$/.test(src) ? `/texts/${src}` : undefined);

function inline(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /!\[(.*?)\]\((\S+?)\)|\*\*(.+?)\*\*|_(.+?)_|`(.+?)`|\[(.+?)\]\((\S+?)\)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    if (m[2] !== undefined) out.push(<img key={k++} src={picture(m[2])} alt={m[1]} loading="lazy" />);
    else if (m[3] !== undefined) out.push(<strong key={k++}>{inline(m[3])}</strong>);
    else if (m[4] !== undefined) out.push(<em key={k++}>{inline(m[4])}</em>);
    else if (m[5] !== undefined) out.push(<code key={k++}>{m[5]}</code>);
    else {
      const href = /^(https?:|#|mailto:)/.test(m[7]) ? m[7] : undefined;
      out.push(<a key={k++} href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{inline(m[6])}</a>);
    }
    last = re.lastIndex;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export function Markdown({ src, className }: { src: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = src.split("\n");
  let i = 0;
  const joinWhile = (test: (l: string) => boolean, strip: (l: string) => string) => {
    const parts: string[] = [];
    while (i < lines.length && test(lines[i])) parts.push(strip(lines[i++]).trim());
    return parts.join(" ");
  };
  while (i < lines.length) {
    const line = lines[i];
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const pic = /^!\[(.*?)\]\((\S+?)\)\s*$/.exec(line.trim());
    if (!line.trim()) { i++; continue; }
    if (pic) {
      blocks.push(<figure key={i}><img src={picture(pic[2])} alt={pic[1]} /></figure>);
      i++;
    } else if (h) {
      const Tag = (["h1", "h2", "h3"] as const)[h[1].length - 1];
      blocks.push(<Tag key={i}>{inline(h[2])}</Tag>);
      i++;
    } else if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line), items: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^#/.test(lines[i])) {
        if (/^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        else items[items.length - 1] += " " + lines[i].trim();
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={i}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</List>);
    } else if (line.startsWith(">")) {
      const k = i;
      blocks.push(<blockquote key={k}>{inline(joinWhile((l) => l.startsWith(">"), (l) => l.replace(/^>\s?/, "")))}</blockquote>);
    } else {
      const k = i;
      blocks.push(<p key={k}>{inline(joinWhile((l) => !!l.trim() && !/^(#{1,3}\s|>|\s*([-*]|\d+\.)\s)/.test(l), (l) => l))}</p>);
    }
  }
  return <div className={className}>{blocks}</div>;
}
