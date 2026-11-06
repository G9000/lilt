// Explicit shared Tailwind recipes. Marker classes remain for interaction and browser checks.
export const markdown = {
  "md": `min-w-0 text-ink-2 [font:var(--md-body-size,_16px)/1.75_var(--font)] [overflow-wrap:anywhere] ` +
    `[&_:where(p,_ul,_ol,_blockquote,_pre,_.md-table,_hr)]:[margin:0_0_1.25em] [&_>_:first-child]:[margin-top:0] ` +
    `[&_>_:last-child]:[margin-bottom:0] [&_:where(li,_blockquote)_>_:last-child]:[margin-bottom:0] ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:text-ink [&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:font-sans ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:[font-weight:650] [&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:[line-height:1.3] ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:[text-wrap:pretty] ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5,_h6)]:[scroll-margin-top:24px] [&_h1]:[margin:1.5em_0_0.5em] ` +
    `[&_h1]:[font-size:clamp(30px,_3.4vw,_40px)] [&_h1]:[line-height:1.15] [&_h1]:[letter-spacing:-0.035em] ` +
    `[&_h1]:font-bold [&_h2]:[margin:2em_0_0.65em] [&_h2]:[font-size:25px] [&_h2]:[letter-spacing:-0.025em] ` +
    `[&_h3]:[margin:1.65em_0_0.6em] [&_h3]:[font-size:21px] [&_h3]:[letter-spacing:-0.015em] ` +
    `[&_h4]:[margin:1.5em_0_0.6em] [&_h4]:[font-size:18px] [&_h5]:[margin:1.5em_0_0.6em] [&_h5]:[font-size:16px] ` +
    `[&_h6]:[margin:1.5em_0_0.6em] [&_h6]:[font-size:14px] [&_h6]:[letter-spacing:0.02em] ` +
    `[&_:where(h1,_h2,_h3,_h4,_h5)_+_:where(h2,_h3,_h4,_h5,_h6)]:[margin-top:1em] ` +
    `[&_:where(ul,_ol)]:[padding-inline-start:1.6em] [&_li]:[display:list-item] ` +
    `[&_li]:[padding-inline-start:0.25em] [&_li]:[margin-block:0.4em] [&_li::marker]:text-ink-2 ` +
    `[&_li::marker]:tabular-nums [&_li_>_:where(ul,_ol)]:[margin-block:0.45em_0] [&_li_>_p]:[margin-block:0.65em] ` +
    `[&_.contains-task-list]:list-none [&_.contains-task-list]:[padding-inline-start:0] ` +
    `[&_.task-list-item]:[padding-inline-start:1.65em] [&_.task-list-item]:relative ` +
    `[&_input[type="checkbox"]]:absolute [&_input[type="checkbox"]]:[inset-inline-start:0] ` +
    `[&_input[type="checkbox"]]:[top:0.4em] [&_input[type="checkbox"]]:[width:1em] ` +
    `[&_input[type="checkbox"]]:[height:1em] [&_input[type="checkbox"]]:m-0 ` +
    `[&_input[type="checkbox"]]:[accent-color:var(--accent-ink)] [&_strong]:text-ink [&_strong]:[font-weight:650] ` +
    `[&_a]:text-accent-ink [&_a]:underline [&_a]:[text-decoration-thickness:1px] [&_a]:[text-underline-offset:3px] ` +
    `[&_a]:[text-decoration-color:color-mix(in_srgb,_var(--accent-ink)_55%,_transparent)] ` +
    `[&_a:hover]:[text-decoration-color:currentColor] [&_blockquote]:[padding:16px_20px] ` +
    `[&_blockquote]:[border-inline-start:3px_solid_var(--accent)] [&_blockquote]:[border-radius:0_12px_12px_0] ` +
    `[&_blockquote]:bg-fill [&_:where(code,_pre)]:font-mono [&_:where(code,_pre)]:[font-size:0.875em] ` +
    `[&_:not(pre)_>_code]:[padding:0.15em_0.35em] [&_:not(pre)_>_code]:[border:1px_solid_var(--hair)] ` +
    `[&_:not(pre)_>_code]:[border-radius:5px] [&_:not(pre)_>_code]:bg-fill ` +
    `[&_:not(pre)_>_code]:[box-decoration-break:clone] [&_:not(pre)_>_code]:[-webkit-box-decoration-break:clone] ` +
    `[&_pre]:max-w-full [&_pre]:[padding:18px_20px] [&_pre]:overflow-auto [&_pre]:[border:1px_solid_var(--hair)] ` +
    `[&_pre]:[border-radius:12px] [&_pre]:bg-fill [&_pre]:text-ink [&_pre]:[line-height:1.65] [&_pre]:[tab-size:2] ` +
    `[&_pre]:[overflow-wrap:normal] [&_pre_code]:p-0 [&_pre_code]:border-0 [&_pre_code]:[background:none] ` +
    `[&_pre_code]:[font-size:inherit] [&_pre_code]:[white-space:pre] [&_table]:w-full ` +
    `[&_table]:[border-collapse:collapse] [&_table]:[font-size:0.9em] [&_table]:[line-height:1.6] ` +
    `[&_:where(th,_td)]:[min-width:9em] [&_:where(th,_td)]:[padding:12px_16px] ` +
    `[&_:where(th,_td)]:[border-bottom:1px_solid_var(--hair)] [&_:where(th,_td)]:[vertical-align:top] ` +
    `[&_th]:bg-fill-2 [&_th]:text-ink [&_th]:[font-size:inherit] [&_th]:font-semibold ` +
    `[&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:nth-child(even)]:bg-fill [&_img]:block [&_img]:max-w-full ` +
    `[&_img]:[height:auto] [&_img]:[margin-block:16px] [&_img]:[border-radius:12px] [&_hr]:border-0 ` +
    `[&_hr]:[border-top:1px_solid_var(--line-strong)] [&_hr]:[margin-block:32px] ` +
    `[@media_(max-width:_480px)]:[&_blockquote]:[padding:12px_14px] ` +
    `[@media_(max-width:_480px)]:[&_pre]:[padding:14px] ` +
    `[@media_(max-width:_480px)]:[&_:where(th,_td)]:[padding:10px_12px]`,
  "md-table": `max-w-full overflow-x-auto [border:1px_solid_var(--line-strong)] [border-radius:12px]`,
  "md-image-fallback": `text-ink-3 italic`,
} as const;
