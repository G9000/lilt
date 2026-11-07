// Explicit shared Tailwind recipes. Marker classes remain for interaction and browser checks.
// Course Markdown reads like a quiet, modern page: prose stops at about 68 characters, headings
// get more room above than below, links are ink with a fine underline (accent on hover), and
// quotes, tables and images stay flat, without filled boxes or zebra stripes.
export const markdown = {
  "md": `min-w-0 text-ink-2 [font:var(--md-body-size,_16px)/1.7_var(--font)] [overflow-wrap:anywhere] ` +
    `[&_:where(p,_ul,_ol,_blockquote,_h1,_h2,_h3,_h4,_h5,_h6,_.footnotes)]:[max-width:68ch] ` +
    `[&_:where(p,_ul,_ol,_blockquote,_pre,_.md-table,_hr)]:[margin:0_0_1.1em] [&_>_:first-child]:[margin-top:0] ` +
    `[&_>_:last-child]:[margin-bottom:0] [&_:where(li,_blockquote)_>_:last-child]:[margin-bottom:0] ` +
    `[&_p]:[text-wrap:pretty] ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:text-ink [&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:font-sans ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:font-semibold [&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:[line-height:1.25] ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:[text-wrap:balance] ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:[scroll-margin-top:24px] [&_h1]:[margin:0_0_0.6em] ` +
    `[&_h1]:[font-size:clamp(28px,_3vw,_36px)] [&_h1]:[line-height:1.12] [&_h1]:[letter-spacing:-0.03em] ` +
    `[&_h2]:[margin:2.2em_0_0.55em] [&_h2]:[font-size:21px] [&_h2]:[letter-spacing:-0.02em] ` +
    `[&_h3]:[margin:1.8em_0_0.45em] [&_h3]:[font-size:17px] [&_h3]:[letter-spacing:-0.01em] ` +
    `[&_h4]:[margin:1.6em_0_0.4em] [&_h4]:[font-size:16px] [&_h5]:[margin:1.5em_0_0.4em] [&_h5]:[font-size:15px] ` +
    `[&_h6]:[margin:1.5em_0_0.4em] [&_h6]:[font-size:14px] [&_h6]:text-ink-2 ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5)_+_:where(h2,_h3,_h4,_h5,_h6)]:[margin-top:0.8em] ` +
    `[&_:where(ul,_ol)]:[padding-inline-start:1.4em] [&_li]:[display:list-item] ` +
    `[&_li]:[padding-inline-start:0.3em] [&_li]:[margin-block:0.45em] [&_li::marker]:text-ink-3 ` +
    `[&_ol_>_li::marker]:font-medium [&_li::marker]:tabular-nums [&_li_>_:where(ul,_ol)]:[margin-block:0.45em_0] ` +
    `[&_li_>_p]:[margin-block:0.65em] ` +
    `[&_.contains-task-list]:list-none [&_.contains-task-list]:[padding-inline-start:0] ` +
    `[&_.task-list-item]:[padding-inline-start:1.65em] [&_.task-list-item]:relative ` +
    `[&_input[type="checkbox"]]:absolute [&_input[type="checkbox"]]:[inset-inline-start:0] ` +
    `[&_input[type="checkbox"]]:[top:0.4em] [&_input[type="checkbox"]]:[width:1em] ` +
    `[&_input[type="checkbox"]]:[height:1em] [&_input[type="checkbox"]]:m-0 ` +
    `[&_input[type="checkbox"]]:[accent-color:var(--accent-ink)] [&_strong]:text-ink [&_strong]:font-semibold ` +
    `[&_a]:text-ink [&_a]:underline [&_a]:[text-decoration-thickness:1px] [&_a]:[text-underline-offset:0.22em] ` +
    `[&_a]:[text-decoration-color:color-mix(in_srgb,_var(--accent-ink)_60%,_transparent)] ` +
    `[&_a]:[transition:color_0.15s_ease,_text-decoration-color_0.15s_ease] ` +
    `[&_a:hover]:text-accent-ink [&_a:hover]:[text-decoration-color:currentColor] ` +
    `[&_blockquote]:[padding:2px_0_2px_18px] [&_blockquote]:[border-left:1px_solid_var(--line-strong)] ` +
    `[&_blockquote]:text-ink-2 [&_:where(code,_pre)]:font-mono [&_:where(code,_pre)]:[font-size:0.875em] ` +
    `[&_:not(pre)_>_code]:[padding:0.12em_0.35em] [&_:not(pre)_>_code]:[border-radius:5px] ` +
    `[&_:not(pre)_>_code]:bg-fill-2 ` +
    `[&_:not(pre)_>_code]:[box-decoration-break:clone] [&_:not(pre)_>_code]:[-webkit-box-decoration-break:clone] ` +
    `[&_pre]:max-w-full [&_pre]:[padding:16px_18px] [&_pre]:overflow-auto ` +
    `[&_pre]:[border-radius:12px] [&_pre]:bg-fill [&_pre]:text-ink [&_pre]:[line-height:1.65] [&_pre]:[tab-size:2] ` +
    `[&_pre]:[overflow-wrap:normal] [&_pre_code]:p-0 [&_pre_code]:border-0 [&_pre_code]:[background:none] ` +
    `[&_pre_code]:[font-size:inherit] [&_pre_code]:[white-space:pre] [&_table]:w-full ` +
    `[&_table]:[border-collapse:collapse] [&_table]:[font-size:0.9em] [&_table]:[line-height:1.55] ` +
    `[&_table]:tabular-nums [&_:where(th,_td)]:[min-width:9em] [&_:where(th,_td)]:[padding:10px_14px_10px_0] ` +
    `[&_:where(th,_td)]:[border-bottom:1px_solid_var(--hair)] [&_:where(th,_td)]:[vertical-align:top] ` +
    `[&_:where(th,_td):last-child]:pr-0 [&_th]:text-ink-3 [&_th]:[font-size:0.92em] [&_th]:font-medium ` +
    `[&_th]:[border-bottom-color:var(--line-strong)] [&_tbody_tr:last-child_td]:border-b-0 ` +
    `[&_img]:block [&_img]:max-w-full [&_img]:[height:auto] [&_img]:[margin-block:28px] ` +
    `[&_img]:[border-radius:14px] [&_img]:[box-shadow:0_0_0_1px_var(--hair),_0_12px_32px_-18px_rgba(0,_0,_0,_0.35)] ` +
    `[&_hr]:border-0 [&_hr]:[border-top:1px_solid_var(--hair)] [&_hr]:[margin-block:40px] ` +
    `[&_.footnotes]:mt-8 [&_.footnotes]:border-t [&_.footnotes]:border-hair [&_.footnotes]:pt-4 ` +
    `[&_.footnotes]:text-[13px] [&_.footnotes_ol]:mb-0 ` +
    `[@media_(max-width:_480px)]:[&_h2]:[margin-top:1.8em] ` +
    `[@media_(max-width:_480px)]:[&_pre]:[padding:14px] ` +
    `[@media_(max-width:_480px)]:[&_:where(th,_td)]:[padding:9px_10px_9px_0]`,
  "md-table": `max-w-full overflow-x-auto`,
  "md-image-fallback": `text-ink-3 italic`,
} as const;
