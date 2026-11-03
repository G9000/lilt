/** Only the simple labelled-paragraph convention becomes numbered tips.
 * Any richer Markdown must be rendered together to preserve blocks and references. */
export function introductionSteps(src: string): { lede: string; tips: { label: string; body: string }[] } | null {
  const [lede, ...paras] = src.replace(/\r\n?/g, "\n").replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "").split(/\n[ \t]*\n/);
  const block = /^(?: {4}|\t|\s*(?:[#>`~|<]|[-+*](?:\s|$)|[-*_]{3,}|={3,}|\d+[.)]\s|\[[^\]]*\]:))/m;
  if (!lede || !paras.length || block.test(lede)) return null;
  const tips = [];
  for (const p of paras) {
    const match = p.match(/^\*\*(.+?)\*\*[ \t]*([^\n][\s\S]*)$/);
    if (!match || block.test(match[2])) return null;
    tips.push({ label: match[1], body: match[2] });
  }
  return { lede, tips };
}
