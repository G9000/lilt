// Explicit shared Tailwind recipes. Marker classes remain for interaction and browser checks.
export const shared = {
  "small": `[font-size:0.87rem]`,
  "muted": `text-ink-3`,
  "ink2": `text-ink-2`,
  "label": `[font-size:0.87rem] font-medium text-ink-3`,
  "dot": `text-accent`,
  "skip": `absolute [left:-9999px] [top:8px] [&:focus]:[left:12px] [&:focus]:[z-index:90] [&:focus]:bg-panel ` +
    `[&:focus]:[padding:8px_12px] [&:focus]:[border-radius:8px]`,
  "sr-only": `absolute w-[1px] h-[1px] overflow-hidden [clip:rect(0_0_0_0)] whitespace-nowrap`,
  "stack": `[&_>_*_+_*]:mt-4`,
  "spacer": `flex-1`,
  "card": `bg-fill rounded-panel [padding:18px_20px] text-ink [&_.card]:[background:transparent] [&_.card]:p-0 ` +
    `[&.soft]:[background:transparent] [&.soft]:p-0 [&.tight]:[padding:14px_16px]`,
  "callout": `rounded-control [padding:11px_14px] flex gap-[10px] items-start [font-size:0.93rem] [&.info]:bg-info-soft ` +
    `[&.info]:text-info [&.warn]:bg-warn-soft [&.warn]:text-warn [&.ok]:bg-ok-soft [&.ok]:text-ok ` +
    `[&.pink]:bg-accent-soft [&.pink]:text-accent-ink [&_p:last-child]:m-0 [&_.ico]:flex-none [&_.ico]:font-bold`,
  "cue": `[font-size:1.05rem] [line-height:1.55] text-ink-2 [margin:8px_0]`,
  "why": `border-0 [background:none] [&_>_summary]:p-0 [&_>_summary]:min-h-[30px] [&_>_summary]:[font-size:0.93rem] ` +
    `[&_>_summary]:text-ink-2 [&_>_.body]:[padding:6px_0_0] [&_>_.body]:text-ink-2 [&_>_.body]:[font-size:0.93rem] ` +
    `[&_>_.body]:[max-width:60ch]`,
  "btn": `[:where(&.btn)]:[font-family:inherit] [:where(&.btn)]:[font-size:inherit] [:where(&.btn)]:[font-style:inherit] ` +
    `[:where(&.btn)]:[font-variant:inherit] [:where(&.btn)]:[line-height:inherit] [:where(&.btn)]:font-semibold ` +
    `[:where(&.btn)]:cursor-pointer [:where(&.btn)]:rounded-control [:where(&.btn)]:[border:1px_solid_transparent] ` +
    `[:where(&.btn)]:[padding:9px_16px] [:where(&.btn)]:min-h-[42px] [:where(&.btn)]:inline-flex ` +
    `[:where(&.btn)]:items-center [:where(&.btn)]:justify-center [:where(&.btn)]:gap-2 [:where(&.btn)]:no-underline ` +
    `[:where(&.btn)]:[color:inherit] [:where(&.btn)]:[background:none] ` +
    `[:where(&.btn)]:[transition:transform_0.12s_var(--ease),_background-color_0.15s,_border-color_0.15s,_opacity_0.15s] ` +
    `[:where(&.btn):active]:[transform:scale(0.97)]`,
  "btn-primary": `[&:where(:not(.btn-big))]:[min-height:var(--control-height)] [&:where(:not(.btn-big))]:[padding:10px_16px] ` +
    `rounded-control [font-size:var(--type-control)] [line-height:1.4] bg-ink text-page ` +
    `[&:hover:not(:disabled)]:[opacity:0.88]`,
  "btn-secondary": `[&:where(:not(.btn-big))]:[min-height:var(--control-height)] [&:where(:not(.btn-big))]:[padding:10px_16px] ` +
    `rounded-control [font-size:var(--type-control)] [line-height:1.4] bg-fill text-ink ` +
    `[&:hover:not(:disabled)]:bg-fill-2`,
  "btn-ghost": `[&:where(:not(.btn-big))]:[min-height:var(--control-height)] [&:where(:not(.btn-big))]:[padding:7px_10px] ` +
    `rounded-control [font-size:var(--type-control)] [line-height:1.4] text-ink-2 [&:hover]:bg-fill ` +
    `[&:hover]:text-ink`,
  "btn-big": `[padding:12px_22px] min-h-12`,
  "textlink": `[background:none] border-0 [padding:2px_0] [min-height:0] [font:500_0.95rem_var(--font)] text-ink-2 ` +
    `[border-radius:0] no-underline [&:hover]:text-ink`,
  "rec-btn": `w-16 h-16 min-h-16 p-0 rounded-full [background:#fff] ` +
    `[box-shadow:0_0_0_1px_var(--line-strong),_0_6px_16px_-6px_rgba(0,_0,_0,_0.35)] [font-size:0] [&_.dot]:w-6 ` +
    `[&_.dot]:h-6 [&_.dot]:bg-rec [&_.dot]:rounded-full ` +
    `[&_.dot]:[transition:border-radius_0.25s_var(--ease),_width_0.25s_var(--ease),_height_0.25s_var(--ease)] ` +
    `[&_.sq]:w-5 [&_.sq]:h-5 [&_.sq]:bg-rec [&_.sq]:[border-radius:6px] ` +
    `[&:active:not(:disabled)]:[transform:scale(0.94)]`,
  "choices": `flex flex-wrap gap-[6px]`,
  "choice": `relative inline-flex [&_input]:absolute [&_input]:[opacity:0] [&_input]:[inset:0] [&_input]:cursor-pointer ` +
    `[&_span]:bg-fill [&_span]:[padding:8px_14px] [&_span]:rounded-full [&_span]:min-h-10 [&_span]:inline-flex ` +
    `[&_span]:items-center [&_span]:gap-[6px] [&_span]:font-medium ` +
    `[&_span]:[transition:background-color_0.15s,_color_0.15s] [&_input:hover_+_span]:bg-fill-2 ` +
    `[&_input:checked_+_span]:bg-ink [&_input:checked_+_span]:text-page ` +
    `[&_input:focus-visible_+_span]:[outline:2px_solid_var(--focus)] ` +
    `[&_input:focus-visible_+_span]:[outline-offset:2px]`,
  "segmented": `inline-flex gap-[2px] flex-nowrap max-w-full overflow-x-auto [scrollbar-width:none] [padding:3px] ` +
    `[border-radius:12px] bg-fill [&::-webkit-scrollbar]:hidden [&_button]:whitespace-nowrap [&_button]:flex-none ` +
    `[&_button]:[min-height:calc(var(--control-height)_-_6px)] [&_button]:[padding:6px_12px] ` +
    `[&_button]:[border-radius:9px] [&_button]:[font:500_var(--type-control)_var(--font)] [&_button]:text-ink-2 ` +
    `[&_button:hover]:text-ink [&_button[aria-pressed="true"]]:bg-panel [&_button[aria-pressed="true"]]:text-ink ` +
    `[&_button[aria-pressed="true"]]:[box-shadow:0_1px_2px_rgba(0,_0,_0,_0.1)] ` +
    `[:root[data-theme="dark"]_&_button[aria-pressed="true"]]:[background:rgba(255,_255,_255,_0.16)] ` +
    `[:root[data-theme="dark"]_&_button[aria-pressed="true"]]:[box-shadow:0_1px_2px_rgba(0,_0,_0,_0.4)]`,
  "badge": `inline-flex items-center gap-[5px] [font:600_0.75rem_var(--font)] [padding:2px_9px] rounded-full bg-fill ` +
    `text-ink-2 whitespace-nowrap [&.rec]:bg-rec [&.rec]:[color:#fff] [&.rec::before]:[content:""] ` +
    `[&.rec::before]:w-[7px] [&.rec::before]:h-[7px] [&.rec::before]:rounded-full [&.rec::before]:[background:#fff] ` +
    `[&.rec::before]:[animation:pulse_1.2s_infinite] [&.saving]:text-warn [&.saving]:bg-warn-soft [&.saved]:text-ok ` +
    `[&.saved]:bg-ok-soft [&.pending]:text-info [&.pending]:bg-info-soft [&.failed]:text-warn ` +
    `[&.failed]:bg-warn-soft`,
  "steps": `flex gap-1 [margin:4px_0_18px] [&_span]:flex-1 [&_span]:h-1 [&_span]:[border-radius:99px] [&_span]:bg-fill-2 ` +
    `[&_span.done]:bg-ink [&_span.now]:bg-accent`,
  "player": `bg-fill rounded-control [padding:12px_14px] text-ink [&_.label]:[font:600_0.9rem_var(--font)] ` +
    `[&_.label]:text-ink`,
  "player-head": `flex items-center gap-[10px] mb-2 flex-wrap`,
  "play-btn": `w-[38px] h-[38px] min-h-[38px] p-0 rounded-full bg-ink text-page flex-none [&_svg]:w-[14px] [&_svg]:h-[14px]`,
  "wave": `relative h-[54px] cursor-pointer touch-none [&_canvas]:w-full [&_canvas]:h-full [&_canvas]:block ` +
    `[&_.seg]:absolute [&_.seg]:[top:0] [&_.seg]:[bottom:0] [&_.seg]:[background:var(--segment)] ` +
    `[&_.seg]:[border-left:1.5px_solid_var(--accent)] [&_.seg]:[border-right:1.5px_solid_var(--accent)] ` +
    `[&_.seg]:pointer-events-none [&_.cursor]:absolute [&_.cursor]:[top:-2px] [&_.cursor]:[bottom:-2px] ` +
    `[&_.cursor]:w-[1.5px] [&_.cursor]:bg-accent [&_.cursor]:pointer-events-none`,
  "time": `[font-size:0.8rem] tabular-nums text-ink-3`,
  "ab": `grid [grid-template-columns:1fr] gap-[10px] [@media_(min-width:_720px)]:[grid-template-columns:1fr_1fr]`,
  "ab-tag": `inline-grid place-items-center w-[22px] h-[22px] rounded-full bg-ink text-page [font:700_0.7rem_var(--font)]`,
  "pianoroll": `w-full block [border-radius:12px] bg-panel`,
  "pitch": `[&_svg]:w-full [&_svg]:h-30 [&_svg]:block`,
  "readout": `flex items-baseline gap-3 flex-wrap [&_.note]:[font:600_clamp(1.6rem,_4vw,_2.1rem)_var(--font)] ` +
    `[&_.note]:[letter-spacing:-0.03em] [&_.note]:[line-height:1] [&_.note]:tabular-nums [&_.hz]:[font-size:0.9rem] ` +
    `[&_.hz]:text-ink-3 [&_.hz]:tabular-nums`,
  "steady": `flex items-center gap-[10px]`,
  "steady-bar": `flex-1 h-[6px] rounded-full bg-fill-2 overflow-hidden [&_>_div]:h-full [&_>_div]:bg-accent ` +
    `[&_>_div]:[transition:width_0.2s]`,
  "body": `[details_>_&]:[padding:0_14px_14px]`,
  "table-wrap": `overflow-x-auto`,
  "list": `list-none p-0 m-0 [&_>_li]:[padding:12px_0] [&_>_li]:[border-bottom:1px_solid_var(--hair)] ` +
    `[&_>_li:last-child]:border-b-0`,
  "toast": `fixed [left:50%] [bottom:104px] [transform:translateX(-50%)] bg-ink text-page [padding:9px_16px] rounded-full ` +
    `[z-index:90] [font:600_0.9rem_var(--font)]`,
  "celebrate": `fixed [inset:0] pointer-events-none [z-index:95] overflow-hidden [&_i]:absolute [&_i]:[top:-14px] [&_i]:w-2 ` +
    `[&_i]:h-2 [&_i]:[border-radius:2px] [&_i]:[animation:fall_2.2s_cubic-bezier(0.2,_0.6,_0.4,_1)_forwards] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:hidden`,
  "ve-page": `[&_>_*]:[zoom:var(--text-zoom)]`,
  "ds-win": `[&:not(.full)_.ds-body_>_*]:[zoom:var(--text-zoom)]`,
} as const;
