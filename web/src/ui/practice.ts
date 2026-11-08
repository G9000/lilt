// Practice, recording, and daily-card utility recipes. State markers stay explicit in JSX.
export const practice = {
  "prc": `text-ink text-[15px] [&_.tr-chart]:mt-[14px] [&_.tr-chart]:mr-[0] [&_.tr-chart]:mb-[0] [&_.tr-chart]:ml-[0] ` +
    `[&_.tr-chart_figcaption]:items-center`,
  "prc-player": `[.prc_&]:flex [.prc_&]:items-center [.prc_&]:[row-gap:12px] [.prc_&]:[column-gap:12px] [.prc_&]:mt-[18px] ` +
    `[.prc_&_.play-btn_svg]:w-[12px] [.prc_&_.play-btn_svg]:h-[12px] [.fc-take_.prc_&]:mt-[0]`,
  "prc-wave": `[.prc_&]:[flex:1] [.prc_&]:min-w-0 [.prc_&]:flex [.prc_&]:items-center [.prc_&]:[row-gap:2px] ` +
    `[.prc_&]:[column-gap:2px] [.prc_&]:h-[34px] [.prc_&_i]:[flex:1] [.prc_&_i]:h-full [.prc_&_i]:rounded-[2px] ` +
    `[.prc_&_i]:[background-color:var(--wave)] [.prc_&_i]:[background-image:none] ` +
    `[.prc_&_i]:[transform-origin:center] [.prc_&_i]:[transition:background-color_0.15s] [.prc_&_i.on]:bg-ink ` +
    `[.prc_&_i.on]:[background-image:none]`,
  "prc-result": `[.prc_&]:mt-[14px] [.ve-details_>_&]:mt-[0]`,
  "prc-wait": `[.prc_&]:mt-[0] [.prc_&]:mr-[0] [.prc_&]:mb-[0] [.prc_&]:ml-[0] [.prc_&]:flex [.prc_&]:items-center ` +
    `[.prc_&]:[row-gap:10px] [.prc_&]:[column-gap:10px] [.prc_&]:min-h-[60px] [.prc_&]:pt-[10px] [.prc_&]:pr-[14px] ` +
    `[.prc_&]:pb-[10px] [.prc_&]:pl-[14px] [.prc_&]:rounded-[14px] [.prc_&]:bg-fill ` +
    `[.prc_&]:[background-image:none] [.prc_&]:text-ink-2 [.prc_&]:text-[13.5px]`,
  "prc-spin": `[.prc_&]:w-[14px] [.prc_&]:h-[14px] [.prc_&]:[flex:none] [.prc_&]:[border-top-width:2px] ` +
    `[.prc_&]:[border-top-style:solid] [.prc_&]:[border-top-color:var(--accent)] [.prc_&]:[border-right-width:2px] ` +
    `[.prc_&]:[border-right-style:solid] [.prc_&]:[border-right-color:transparent] ` +
    `[.prc_&]:[border-bottom-width:2px] [.prc_&]:[border-bottom-style:solid] ` +
    `[.prc_&]:[border-bottom-color:var(--accent)] [.prc_&]:[border-left-width:2px] ` +
    `[.prc_&]:[border-left-style:solid] [.prc_&]:[border-left-color:var(--accent)] [.prc_&]:[border-radius:50%] ` +
    `[.prc_&]:[animation:prc-spin_0.8s_linear_infinite]`,
  "prc-chart": `[.prc_&]:mt-[12px] [.prc_&]:mr-[0] [.prc_&]:mb-[0] [.prc_&]:ml-[0] [.prc_&_svg]:block [.prc_&_svg]:w-full ` +
    `[.prc_&_svg]:h-[72px] [.prc_&_figcaption]:flex [.prc_&_figcaption]:flex-wrap [.prc_&_figcaption]:[row-gap:4px] ` +
    `[.prc_&_figcaption]:[column-gap:14px] [.prc_&_figcaption]:mt-[6px] [.prc_&_figcaption]:text-[12px] ` +
    `[.prc_&_figcaption]:text-ink-3`,
  "prc-k": `[.prc_&]:inline-block [.prc_&]:w-[12px] [.prc_&]:h-[2px] [.prc_&]:mr-[6px] [.prc_&]:[vertical-align:middle] ` +
    `[.prc_&]:rounded-[2px] [.prc_&.now]:bg-accent [.prc_&.now]:[background-image:none] [.prc_&.prev]:bg-ink-3 ` +
    `[.prc_&.prev]:[background-image:none] [.prc_&.mid]:[background-color:transparent] ` +
    `[.prc_&.mid]:[background-image:none] [.prc_&.mid]:[opacity:0.6] [.prc_&.mid]:h-[0] ` +
    `[.prc_&.mid]:[border-top-width:1.5px] [.prc_&.mid]:[border-top-style:dashed] ` +
    `[.prc_&.mid]:[border-top-color:var(--ink-2)] [.prc_&.band]:h-[8px] [.prc_&.band]:bg-accent-soft ` +
    `[.prc_&.band]:[background-image:none]`,
  "prc-prev": `[.prc_&]:mt-[10px] [.prc_&]:mr-[0] [.prc_&]:mb-[0] [.prc_&]:ml-[0] [.prc_&]:text-[13.5px] [.prc_&]:text-ink-2 ` +
    `[.prc_&_b]:text-ink [.prc_&_b]:font-semibold [.prc_&_b]:tabular-nums`,
  "prc-flags": `[.prc_&]:mt-[10px] [.prc_&]:mr-[0] [.prc_&]:mb-[0] [.prc_&]:ml-[0] [.prc_&]:pt-[10px] [.prc_&]:pr-[14px] ` +
    `[.prc_&]:pb-[10px] [.prc_&]:pl-[30px] [.prc_&]:rounded-[12px] [.prc_&]:bg-warn-soft ` +
    `[.prc_&]:[background-image:none] [.prc_&]:text-warn [.prc_&]:text-[13.5px]`,
  "vpage": `[&_>_*_+_*]:mt-[18px] [&_>_.sr-only_+_*]:mt-[0] [&_kbd]:font-mono [&_.notes]:list-none [&_.notes]:pt-[0] ` +
    `[&_.notes]:pr-[0] [&_.notes]:pb-[0] [&_.notes]:pl-[0] [&_.notes]:mt-[22px] [&_.notes]:mr-[0] [&_.notes]:mb-[0] ` +
    `[&_.notes]:ml-[0] [&_.notes]:grid [&_.notes]:[row-gap:6px] [&_.notes]:[column-gap:6px] [&_.notes]:not-italic ` +
    `[&_.notes]:font-normal [&_.notes]:text-[14px] [&_.notes]:[line-height:1.5] [&_.notes]:font-sans ` +
    `[&_.notes]:text-ink-2 [&_.notes]:[max-width:66ch] [&_.notes_li]:grid ` +
    `[&_.notes_li]:[grid-template-columns:18px_minmax(0,_1fr)] [&_.notes_li]:[row-gap:6px] ` +
    `[&_.notes_li]:[column-gap:6px] [&_.notes_li]:items-baseline [&_.notes_b]:text-[12.5px] ` +
    `[&_.notes_b]:font-semibold [&_.notes_b]:text-accent-ink [&_.notes_b]:tabular-nums ` +
    `[&_.notes_b:empty::before]:[content:""] [&_.notes_b:empty::before]:inline-block ` +
    `[&_.notes_b:empty::before]:w-[4px] [&_.notes_b:empty::before]:h-[4px] ` +
    `[&_.notes_b:empty::before]:[border-radius:50%] [&_.notes_b:empty::before]:bg-ink-3 ` +
    `[&_.notes_b:empty::before]:[background-image:none] [&_.notes_b:empty::before]:[vertical-align:0.2em] ` +
    `[&_.notes_small]:text-ink-3 [&_.notes_small]:text-[12.5px]`,
  "vloading": `text-ink-3 text-[13px] text-center mt-[72px] mr-[0] mb-[72px] ml-[0]`,
  "vh": `text-[28px] font-semibold [letter-spacing:-0.035em] [line-height:1.12] mt-[0] mr-[0] mb-[0] ml-[0] ` +
    `[text-wrap:balance] [@media_(max-width:_760px)]:text-[24px]`,
  "vh-sm": `[.vh&]:text-[17px] [.vh&]:[letter-spacing:-0.015em] [.vh&]:text-ink-2`,
  "vphrase": `text-[32px] font-semibold [letter-spacing:-0.035em] [line-height:1.16] mt-[0] mr-[0] mb-[0] ml-[0] text-ink ` +
    `[text-wrap:balance] [.vrec_&]:mt-[0] [.vrec_&]:mr-[0] [.vrec_&]:mb-[0] [.vrec_&]:ml-[0] ` +
    `[.vstep_>_.vh_+_&]:mt-[18px] [.vstep_>_.vh-sm_+_&]:mt-[6px] [@media_(max-width:_760px)]:text-[26px]`,
  "vtip": `text-ink-2 text-[15px] [line-height:1.55] mt-[0] mr-[0] mb-[0] ml-[0] [max-width:64ch] ` +
    `[.vstep_>_.vh_+_&]:mt-[8px] [.vstep_>_.vphrase_+_&]:mt-[8px] [.vmic_>_.vh_+_&]:mt-[8px]`,
  "vcap": `text-ink-3 text-[13px] [line-height:1.45] mt-[0] mr-[0] mb-[0] ml-[0] [.vtoday-head_&]:mt-[12px]`,
  "vlede": `text-ink-2 text-[16px] [line-height:1.5] mt-[0] mr-[0] mb-[0] ml-[0] [max-width:56ch] ` +
    `[.vtoday-head_&]:mt-[10px]`,
  "vpill": `inline-flex items-center text-[11.5px] font-semibold [line-height:1.4] pt-[3px] pr-[9px] pb-[3px] pl-[9px] ` +
    `rounded-full bg-fill [background-image:none] text-ink-2 whitespace-nowrap [&.ok]:bg-ok-soft ` +
    `[&.ok]:[background-image:none] [&.ok]:text-ok [&.next]:bg-accent-soft [&.next]:[background-image:none] ` +
    `[&.next]:text-accent-ink [.vlive_.readout_&]:[margin-left:auto] [.vlive_.readout_&]:[align-self:center] ` +
    `[.vplan_.setlist_li_>_span&]:overflow-visible [.vplan_.setlist_li_>_span&]:whitespace-nowrap ` +
    `[.vplan_.setlist_li_>_span&]:[text-overflow:clip]`,
  "vpills": `flex flex-wrap [row-gap:6px] [column-gap:6px] mt-[0] mr-[0] mb-[0] ml-[0]`,
  "vactions": `flex flex-wrap items-center [row-gap:10px] [column-gap:10px] [.vstep_>_&]:mt-[24px] [.vnext_&]:mt-[14px]`,
  "vext": `[width:0.72em] [height:0.72em] ml-[3px] [vertical-align:0]`,
  "vrec": `[&_kbd]:font-mono [&_>_*_+_*]:mt-[14px] [&_.rec-btn]:[flex:none] [&_.rec-btn]:w-[60px] [&_.rec-btn]:h-[60px] ` +
    `[&_.rec-btn]:min-h-[60px] [&_.rec-btn]:[background-color:#fff] [&_.rec-btn]:[background-image:none] ` +
    `[&_.rec-btn]:[box-shadow:0_0_0_1px_var(--hair),_0_6px_16px_-6px_rgba(0,_0,_0,_0.3)] [&_.rec-btn_.dot]:w-[24px] ` +
    `[&_.rec-btn_.dot]:h-[24px] [&_.rec-btn_.dot]:[border-radius:50%] [&_.rec-btn.stop_.dot]:w-[20px] ` +
    `[&_.rec-btn.stop_.dot]:h-[20px] [&_.rec-btn.stop_.dot]:rounded-[6px] ` +
    `[&_.rec-btn:hover:not(:disabled)]:[box-shadow:0_0_0_1px_var(--line-strong),_0_8px_18px_-6px_rgba(0,_0,_0,_0.34)] ` +
    `[&_.rec-btn:focus-visible]:[outline-offset:3px] [&_.rec-btn:focus-visible]:[border-radius:50%] ` +
    `[.vstep_>_&]:mt-[22px] [@media_(max-width:_760px)]:[&_>_*_+_*]:mt-[12px]`,
  "vrec-title": `text-[17px] font-semibold [letter-spacing:-0.015em] mt-[0] mr-[0] mb-[0] ml-[0]`,
  "readtext": `[.vrec_&]:not-italic [.vrec_&]:font-semibold [.vrec_&]:text-[36px] [.vrec_&]:[line-height:1.18] ` +
    `[.vrec_&]:font-sans [.vrec_&]:[letter-spacing:-0.035em] [.vrec_&]:text-ink [.vrec_&]:mt-[0] [.vrec_&]:mr-[0] ` +
    `[.vrec_&]:mb-[0] [.vrec_&]:ml-[0] [.vrec_&]:[text-wrap:balance] [.vpage_&]:not-italic [.vpage_&]:font-semibold ` +
    `[.vpage_&]:text-[36px] [.vpage_&]:[line-height:1.18] [.vpage_&]:font-sans [.vpage_&]:[letter-spacing:-0.035em] ` +
    `[.vpage_&]:text-ink [.vpage_&]:mt-[0] [.vpage_&]:mr-[0] [.vpage_&]:mb-[0] [.vpage_&]:ml-[0] ` +
    `[.vpage_&]:[text-wrap:balance] [.vrec_&.hum]:text-[40px] [.vrec_&.hum]:[letter-spacing:-0.02em] ` +
    `[.vpage_&.hum]:text-[40px] [.vpage_&.hum]:[letter-spacing:-0.02em] [.vrec_&.passage]:text-[22px] ` +
    `[.vrec_&.passage]:font-medium [.vrec_&.passage]:[line-height:1.55] [.vrec_&.passage]:[letter-spacing:-0.015em] ` +
    `[.vrec_&.passage]:[text-wrap:pretty] [.vrec_&.passage]:[max-width:62ch] [.vpage_&.passage]:text-[22px] ` +
    `[.vpage_&.passage]:font-medium [.vpage_&.passage]:[line-height:1.55] ` +
    `[.vpage_&.passage]:[letter-spacing:-0.015em] [.vpage_&.passage]:[text-wrap:pretty] ` +
    `[.vpage_&.passage]:[max-width:62ch] [.vrec_&.has-pitch]:[line-height:1.75] ` +
    `[.vrec_&.passage.has-pitch]:[line-height:2.1] [.vrec_&_.w]:relative [.vrec_&_.w]:cursor-default ` +
    `[.vrec_&_.w]:pt-[0] [.vrec_&_.w]:[padding-right:0.1em] [.vrec_&_.w]:pb-[0] [.vrec_&_.w]:[padding-left:0.1em] ` +
    `[.vrec_&_.w]:mt-[0] [.vrec_&_.w]:[margin-right:-0.1em] [.vrec_&_.w]:mb-[0] [.vrec_&_.w]:[margin-left:-0.1em] ` +
    `[.vrec_&_.w]:[border-radius:0.2em] [.vrec_&_.w]:[color:inherit] ` +
    `[.vrec_&_.w]:[transition:background-color_0.15s_ease-out,_color_0.15s_ease-out] ` +
    `[.vrec_&.is-following_.w]:cursor-pointer [.vrec_&.is-following_.w.done]:text-ink-3 [.vrec_&_.w.now]:bg-accent ` +
    `[.vrec_&_.w.now]:[background-image:none] [.vrec_&_.w.now]:text-accent-on ` +
    `[.vrec_&_.w.annotated::after]:[content:attr(data-n)] [.vrec_&_.w.annotated::after]:relative ` +
    `[.vrec_&_.w.annotated::after]:[top:-0.95em] [.vrec_&_.w.annotated::after]:[margin-left:0.08em] ` +
    `[.vrec_&_.w.annotated::after]:[font-size:0.4em] [.vrec_&_.w.annotated::after]:font-semibold ` +
    `[.vrec_&_.w.annotated::after]:tracking-[0] [.vrec_&_.w.annotated::after]:text-accent-ink ` +
    `[.vrec_&_.w.now.annotated::after]:text-accent-on [.vrec_&_.w_.wpitch]:absolute [.vrec_&_.w_.wpitch]:[left:0] ` +
    `[.vrec_&_.w_.wpitch]:[right:0] [.vrec_&_.w_.wpitch]:[bottom:-0.36em] [.vrec_&_.w_.wpitch]:[height:0.36em] ` +
    `[.vrec_&_.w_.wpitch]:pointer-events-none [.vrec_&_.w_.wpitch]:overflow-visible ` +
    `[@media_(max-width:_760px)]:[.vrec_&]:text-[27px] [@media_(max-width:_760px)]:[.vpage_&]:text-[27px] ` +
    `[@media_(max-width:_760px)]:[.vrec_&.hum]:text-[32px] [@media_(max-width:_760px)]:[.vpage_&.hum]:text-[32px] ` +
    `[@media_(max-width:_760px)]:[.vrec_&.passage]:text-[18px] ` +
    `[@media_(max-width:_760px)]:[.vpage_&.passage]:text-[18px] [.ve-item:not(.on):not(.done)_&]:text-ink-3 ` +
    `[.ve-item:not(.on):not(.done)_&]:[transition:color_0.2s_ease] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve-item:not(.on):not(.done):hover_&]:text-ink ` +
    `[.ve-item.done_&]:text-[19px] [.ve-item.done_&]:text-ink-3 [.ve_&]:not-italic [.ve_&]:font-normal ` +
    `[.ve_&]:text-[27px] [.ve_&]:[line-height:1.38] [.ve_&]:[font-family:var(--read)] ` +
    `[.ve_&]:[letter-spacing:-0.01em] [.ve_&]:[font-optical-sizing:auto] [.ve_&]:mt-[0] [.ve_&]:mr-[0] ` +
    `[.ve_&]:mb-[0] [.ve_&]:ml-[0] [.ve_&]:text-ink [.ve_&]:[text-wrap:pretty] [.ve_&.hum]:text-[30px] ` +
    `[.ve_&.passage]:text-[21px] [.ve_&.passage]:[line-height:1.6] [.ve-item.passage_&]:text-[21px] ` +
    `[.ve-item.passage_&]:[line-height:1.6] [.ve_&.has-pitch]:[line-height:1.75] ` +
    `[.ve_&.passage.has-pitch]:[line-height:2.1] [.ve_&_.w]:relative [.ve_&_.w]:pt-[0] ` +
    `[.ve_&_.w]:[padding-right:0.1em] [.ve_&_.w]:pb-[0] [.ve_&_.w]:[padding-left:0.1em] [.ve_&_.w]:mt-[0] ` +
    `[.ve_&_.w]:[margin-right:-0.1em] [.ve_&_.w]:mb-[0] [.ve_&_.w]:[margin-left:-0.1em] ` +
    `[.ve_&_.w]:[border-radius:0.2em] [.ve_&_.w]:[transition:background-color_0.15s_ease-out,_color_0.15s_ease-out] ` +
    `[.ve_&.is-following_.w]:cursor-pointer [.ve_&.is-following_.w.done]:text-ink-3 [.ve_&_.w.now]:bg-accent ` +
    `[.ve_&_.w.now]:[background-image:none] [.ve_&_.w.now]:text-accent-on ` +
    `[.ve_&_.w.annotated::after]:[content:attr(data-n)] [.ve_&_.w.annotated::after]:relative ` +
    `[.ve_&_.w.annotated::after]:[top:-0.95em] [.ve_&_.w.annotated::after]:[margin-left:0.08em] ` +
    `[.ve_&_.w.annotated::after]:not-italic [.ve_&_.w.annotated::after]:font-semibold ` +
    `[.ve_&_.w.annotated::after]:[font-size:0.42em] [.ve_&_.w.annotated::after]:[line-height:normal] ` +
    `[.ve_&_.w.annotated::after]:font-sans [.ve_&_.w.annotated::after]:text-accent-ink ` +
    `[.sd-current:has(.sd-tips:not([open]))_&_.w.annotated::after]:[content:none] ` +
    `[.ve_&_.w.now.annotated::after]:text-accent-on [.ve_&_.w_.wpitch]:absolute [.ve_&_.w_.wpitch]:[left:0] ` +
    `[.ve_&_.w_.wpitch]:[right:0] [.ve_&_.w_.wpitch]:[bottom:-0.36em] [.ve_&_.w_.wpitch]:[height:0.36em] ` +
    `[.ve_&_.w_.wpitch]:pointer-events-none [.ve_&_.w_.wpitch]:overflow-visible ` +
    `[@media_(max-width:_860px)]:[.ve_&]:text-[22px] [@media_(max-width:_860px)]:[.ve_&.passage]:text-[18px] ` +
    `[@media_(max-width:_860px)]:[.ve-item.passage_&]:text-[18px] ` +
    `[.ve_.sd-current_&]:[font-size:clamp(28px,_2.6vw,_38px)] [.ve_.sd-current_&]:[line-height:1.4] ` +
    `[.ve_.sd-current_&.passage]:text-[23px] [.ve_.sd-current_&.passage]:[line-height:1.65] ` +
    `[.ve_.sd-completed_&]:text-[18px] [@media_(max-width:_700px)]:[.ve_.sd-current_&]:text-[29px] ` +
    `[@media_(max-width:_700px)]:[.ve_.sd-current_&.passage]:text-[21px]`,
  "follow-status": `[.vrec_&]:not-italic [.vrec_&]:font-medium [.vrec_&]:text-[13px] [.vrec_&]:[line-height:1.4] ` +
    `[.vrec_&]:font-sans [.vrec_&]:tracking-[0] [.vrec_&]:[text-transform:none] [.vrec_&]:text-ink-3 ` +
    `[.vrec_&]:min-h-[18px] [.vrec_&]:mt-[8px] [.ve_&]:not-italic [.ve_&]:font-medium [.ve_&]:text-[12px] ` +
    `[.ve_&]:[line-height:1.4] [.ve_&]:font-sans [.ve_&]:text-ink-3 [.ve_&]:min-h-0 [.ve_&]:mt-[4px] [.ve_&]:mr-[0] ` +
    `[.ve_&]:mb-[0] [.ve_&]:ml-[0] [.ve_&:empty]:hidden`,
  "vlive": `rounded-[16px] bg-fill [background-image:none] pt-[14px] pr-[16px] pb-[12px] pl-[16px] ` +
    `[--line:rgba(0,_0,_0,_0.1)] [:root[data-theme="dark"]_&]:[--line:rgba(255,_255,_255,_0.12)] ` +
    `[&_.readout_.hz]:text-[20px] [&_.readout_.hz]:font-semibold [&_.readout_.hz]:[letter-spacing:-0.02em] ` +
    `[&_.readout_.hz]:text-ink [&_.readout_.hz]:tabular-nums [&_.vline]:block [&_.vline]:w-full [&_.vline]:h-[64px] ` +
    `[&_.vline]:mt-[6px] [&_.readout]:[row-gap:4px] [&_.readout]:[column-gap:10px] [&_.readout]:items-baseline ` +
    `[&_.readout_.note]:not-italic [&_.readout_.note]:font-medium [&_.readout_.note]:text-[14px] ` +
    `[&_.readout_.note]:[line-height:1.2] [&_.readout_.note]:font-sans [&_.readout_.note]:tracking-[0] ` +
    `[&_.readout_.note]:text-ink-3 [&_.steady]:mt-[12px] [&_.steady]:[row-gap:12px] [&_.steady]:[column-gap:12px] ` +
    `[&_.steady_.steady-k]:[flex:none] [&_.steady_.steady-k]:w-[84px] [&_.steady_.steady-k]:text-[13px] ` +
    `[&_.steady_.steady-k]:text-ink-2 [&_.steady_.steady-v]:[flex:none] [&_.steady_.steady-v]:w-[104px] ` +
    `[&_.steady_.steady-v]:text-[13px] [&_.steady_.steady-v]:text-ink-3 [&_.steady_.steady-v]:text-right ` +
    `[&_.steady_.steady-bar]:bg-fill-2 [&_.steady_.steady-bar]:[background-image:none] ` +
    `[&_.pianoroll]:[background-color:transparent] [&_.pianoroll]:[background-image:none] [&_.pianoroll]:mt-[10px] ` +
    `[&_.pianoroll]:rounded-[10px] [@media_(max-width:_760px)]:pt-[12px] [@media_(max-width:_760px)]:pr-[14px] ` +
    `[@media_(max-width:_760px)]:pb-[10px] [@media_(max-width:_760px)]:pl-[14px] ` +
    `[@media_(max-width:_760px)]:[&_.vline]:h-[48px] [@media_(max-width:_760px)]:[&_.steady_.steady-v]:[width:auto]`,
  "vlive-top": `flex items-baseline flex-wrap [row-gap:4px] [column-gap:8px] [&_b]:text-[20px] [&_b]:font-semibold ` +
    `[&_b]:[letter-spacing:-0.02em] [&_b]:text-ink [&_b]:tabular-nums [&_span]:text-ink-3 [&_span]:text-[13px]`,
  "vrecrow": `flex flex-wrap items-center [row-gap:12px] [column-gap:14px] [.vrec_&]:mt-[18px] ` +
    `[@media_(max-width:_760px)]:[.vrec_&]:mt-[14px]`,
  "vrec-t": `min-w-0 [flex:1_1_140px] [&_>_b]:block [&_>_b]:font-semibold [&_>_b]:text-[15px] [&_>_b]:[line-height:1.3] ` +
    `[&_>_span]:block [&_>_span]:text-ink-3 [&_>_span]:text-[12.5px] [&_>_span]:[line-height:1.4] ` +
    `[&_>_span]:mt-[2px]`,
  "vrec-st": `[.vrec-t_&]:flex [.vrec-t_&]:items-center [.vrec-t_&]:[row-gap:8px] [.vrec-t_&]:[column-gap:8px]`,
  "vclock": `tabular-nums text-ink-2 text-[13px]`,
  "vkeys": `flex flex-wrap [row-gap:8px] [column-gap:8px] [margin-left:auto] [&_>_button]:min-h-[38px] ` +
    `[&_>_button]:pt-[7px] [&_>_button]:pr-[14px] [&_>_button]:pb-[7px] [&_>_button]:pl-[14px] ` +
    `[&_>_button]:font-medium [&_>_button]:text-[14px] [&_>_button[aria-pressed="true"]]:bg-accent-soft ` +
    `[&_>_button[aria-pressed="true"]]:[background-image:none] [&_>_button[aria-pressed="true"]]:text-accent-ink ` +
    `[@media_(max-width:_760px)]:ml-[0] [@media_(max-width:_760px)]:w-full ` +
    `[@media_(max-width:_760px)]:[&_>_button]:[flex:1_1_0]`,
  "vkbd": `[@media_(hover:_none)_and_(pointer:_coarse)]:[visibility:hidden]`,
  "vprogress": `grid [grid-template-columns:minmax(0,_1fr)_auto] items-center [row-gap:8px] [column-gap:12px] ` +
    `[&_.textlink]:text-[14px] [.vpage_&_.steps]:[grid-column:1_/_-1] [.vpage_&_.steps]:mt-[0] ` +
    `[.vpage_&_.steps]:mr-[0] [.vpage_&_.steps]:mb-[0] [.vpage_&_.steps]:ml-[0] [.vpage_>_&_+_*]:mt-[24px]`,
  "vstep": `[&_>_*_+_*]:mt-[16px]`,
  "vinstr": `[.vpage_ol.body&]:mt-[0] [.vpage_ol.body&]:mr-[0] [.vpage_ol.body&]:mb-[0] [.vpage_ol.body&]:ml-[0] ` +
    `[.vpage_ol.body&]:pt-[0] [.vpage_ol.body&]:pr-[16px] [.vpage_ol.body&]:pb-[14px] [.vpage_ol.body&]:pl-[36px] ` +
    `[.vpage_ol.body&]:text-ink-2 [&_li_+_li]:mt-[6px]`,
  "vexamples": `flex flex-wrap [row-gap:6px] [column-gap:18px] mt-[0] mr-[0] mb-[0] ml-[0] text-[14px] [&_a]:text-ink-2 ` +
    `[&_a]:no-underline [&_a:hover]:text-ink`,
  "vtake": `grid [row-gap:8px] [column-gap:8px]`,
  "vbadges": `flex flex-wrap [row-gap:6px] [column-gap:6px]`,
  "vcheck": `[.vpage_&]:flex [.vpage_&]:items-center [.vpage_&]:[row-gap:10px] [.vpage_&]:[column-gap:10px] ` +
    `[.vpage_&]:mt-[14px] [.vpage_&]:mr-[0] [.vpage_&]:mb-[0] [.vpage_&]:ml-[0] [.vpage_&]:font-medium ` +
    `[.vpage_&_input]:w-[20px] [.vpage_&_input]:h-[20px] [.vpage_&_input]:mt-[0] [.vpage_&_input]:mr-[0] ` +
    `[.vpage_&_input]:mb-[0] [.vpage_&_input]:ml-[0] [.vpage_&_input]:[accent-color:var(--accent)]`,
  "vdone-row": `flex flex-wrap items-center [row-gap:8px] [column-gap:8px]`,
  "vdone-role": `min-w-[150px] font-medium`,
  "vnext": `[&_h2]:text-[17px] [&_h2]:[letter-spacing:-0.015em] [&_h2]:mt-[0] [&_h2]:mr-[0] [&_h2]:mb-[6px] [&_h2]:ml-[0] ` +
    `[&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[10px] [&_p]:ml-[0]`,
  "vmic": `[&_>_*_+_*]:mt-[16px] [&_.levelbar]:grid [&_.levelbar]:[grid-template-columns:repeat(20,_1fr)] ` +
    `[&_.levelbar]:[row-gap:4px] [&_.levelbar]:[column-gap:4px] [&_.levelbar]:mt-[14px] [&_.levelbar]:mr-[0] ` +
    `[&_.levelbar]:mb-[10px] [&_.levelbar]:ml-[0] [&_.levelbar_i]:h-[10px] [&_.levelbar_i]:rounded-[3px] ` +
    `[&_.levelbar_i]:bg-fill-2 [&_.levelbar_i]:[background-image:none] ` +
    `[&_.levelbar_i]:[transition:background-color_0.06s_linear] [&_.levelbar_i.on]:bg-ok ` +
    `[&_.levelbar_i.on]:[background-image:none] [&_.levelbar_i.warm]:[background-color:#e9a23b] ` +
    `[&_.levelbar_i.warm]:[background-image:none] [&_.levelbar_i.hot]:bg-rec ` +
    `[&_.levelbar_i.hot]:[background-image:none]`,
  "vmic-state": `mt-[0] mr-[0] mb-[0] ml-[0] font-semibold text-ink-3 [&.ok]:text-ok [&.hot]:text-warn`,
  "vmic-select": `max-w-[360px]`,
  "vmic-noise": `mt-[14px] pt-[12px] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] text-[14px] ` +
    `[line-height:1.5] text-ink-2 [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_b]:font-semibold ` +
    `[&_b]:text-ink [&_.textlink]:mt-[6px] [&_.textlink]:text-[14px]`,
  "vtoday": `[&_h1]:text-[28px] [&_h1]:[letter-spacing:-0.035em] [&_h1]:[line-height:1.12] [&_h1]:mt-[0] [&_h1]:mr-[0] ` +
    `[&_h1]:mb-[0] [&_h1]:ml-[0] [@media_(max-width:_760px)]:[&_h1]:text-[24px]`,
  "vreminder": `flex items-center [row-gap:8px] [column-gap:8px] mt-[8px] mr-[0] mb-[0] ml-[0] text-[13px] font-medium ` +
    `text-accent-ink [&_i]:w-[6px] [&_i]:h-[6px] [&_i]:[border-radius:50%] [&_i]:bg-accent ` +
    `[&_i]:[background-image:none] [&_i]:[flex:none]`,
  "vplan": `[.vpage_>_&]:mt-[24px] [&_.setlist]:list-none [&_.setlist]:mt-[0] [&_.setlist]:mr-[0] [&_.setlist]:mb-[0] ` +
    `[&_.setlist]:ml-[0] [&_.setlist]:pt-[0] [&_.setlist]:pr-[0] [&_.setlist]:pb-[0] [&_.setlist]:pl-[0] ` +
    `[&_.setlist]:block [&_.setlist]:text-[15px] [&_.setlist_li]:grid ` +
    `[&_.setlist_li]:[grid-template-columns:26px_minmax(0,_1fr)_auto] [&_.setlist_li]:[row-gap:12px] ` +
    `[&_.setlist_li]:[column-gap:12px] [&_.setlist_li]:items-center [&_.setlist_li]:pt-[10px] ` +
    `[&_.setlist_li]:pr-[0] [&_.setlist_li]:pb-[10px] [&_.setlist_li]:pl-[0] [&_.setlist_li]:text-ink ` +
    `[&_.setlist_li]:font-normal [&_.setlist_li]:[border-bottom-width:1px] ` +
    `[&_.setlist_li]:[border-bottom-style:solid] [&_.setlist_li]:[border-bottom-color:var(--hair)] ` +
    `[&_.setlist_li.now]:text-ink [&_.setlist_li.now]:font-normal [&_.setlist_li.done]:text-ink ` +
    `[&_.setlist_li.done]:font-normal [&_.setlist_li:last-child]:[border-bottom-width:0] ` +
    `[&_.setlist_li:last-child]:[border-bottom-style:none] ` +
    `[&_.setlist_li:last-child]:[border-bottom-color:currentColor] [&_.setlist_li_>_span.tx]:overflow-visible ` +
    `[&_.setlist_li_>_span.tx]:whitespace-normal [&_.setlist_li_>_span.tx]:[text-overflow:clip] ` +
    `[&_.setlist_li_.mk]:w-[26px] [&_.setlist_li_.mk]:h-[26px] [&_.setlist_li_.mk]:[border-radius:50%] ` +
    `[&_.setlist_li_.mk]:grid [&_.setlist_li_.mk]:place-items-center [&_.setlist_li_.mk]:bg-fill ` +
    `[&_.setlist_li_.mk]:[background-image:none] [&_.setlist_li_.mk]:text-ink-3 [&_.setlist_li_.mk]:text-[12px] ` +
    `[&_.setlist_li_.mk]:font-semibold [&_.setlist_li_.mk]:tabular-nums [&_.setlist_li_.mk_svg]:w-[13px] ` +
    `[&_.setlist_li_.mk_svg]:h-[13px] [&_.setlist_li.done_.mk]:bg-ok-soft ` +
    `[&_.setlist_li.done_.mk]:[background-image:none] [&_.setlist_li.done_.mk]:text-ok ` +
    `[&_.setlist_li.done_.tx]:text-ink-3 [&_.setlist_li.now_.mk]:bg-accent ` +
    `[&_.setlist_li.now_.mk]:[background-image:none] [&_.setlist_li.now_.mk]:text-accent-on ` +
    `[&_.setlist_li.now_.tx]:font-semibold`,
  "vplan-head": `mt-[0] mr-[0] mb-[4px] ml-[0] text-[13px] font-medium text-ink-3`,
  "vplan-note": `[&_h2]:text-[17px] [&_h2]:[letter-spacing:-0.015em] [&_h2]:mt-[0] [&_h2]:mr-[0] [&_h2]:mb-[6px] [&_h2]:ml-[0] ` +
    `[&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[4px] [&_p]:ml-[0] [&_p]:text-ink-2`,
  "vgo": `[.vplan_&]:w-full [.vplan_&]:min-h-[50px] [.vplan_&]:mt-[18px] [.vplan_&]:rounded-[14px] ` +
    `[.vplan_&]:text-[15px] [.vplan_&]:[box-shadow:0_10px_22px_-12px_rgba(0,_0,_0,_0.5)]`,
  "vlinks": `flex flex-wrap [row-gap:8px] [column-gap:22px] [.vpage_>_&]:mt-[14px] [&_.textlink]:text-[14px]`,
  "vmemo": `[border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] pt-[18px] ` +
    `[.vpage_>_&]:mt-[26px] [&_h2]:text-[17px] [&_h2]:[letter-spacing:-0.015em] [&_h2]:mt-[0] [&_h2]:mr-[0] ` +
    `[&_h2]:mb-[6px] [&_h2]:ml-[0] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[6px] [&_p]:ml-[0] [&_p]:[max-width:64ch] ` +
    `[&_.textlink]:text-[14px]`,
  "ve-course-jumps": `flex flex-wrap [row-gap:0] [column-gap:var(--space-6)] [margin-top:var(--space-4)] mr-[0] ` +
    `[margin-bottom:var(--space-8)] ml-[0] [.ve_&_a]:inline-flex [.ve_&_a]:items-center [.ve_&_a]:[row-gap:8px] ` +
    `[.ve_&_a]:[column-gap:8px] [.ve_&_a]:[min-height:var(--control-height)] [.ve_&_a]:pt-[8px] [.ve_&_a]:pr-[0] ` +
    `[.ve_&_a]:pb-[8px] [.ve_&_a]:pl-[0] [.ve_&_a]:[border-top-width:0] [.ve_&_a]:[border-top-style:none] ` +
    `[.ve_&_a]:[border-top-color:currentColor] [.ve_&_a]:[border-right-width:0] [.ve_&_a]:[border-right-style:none] ` +
    `[.ve_&_a]:[border-right-color:currentColor] [.ve_&_a]:[border-bottom-width:0] ` +
    `[.ve_&_a]:[border-bottom-style:none] [.ve_&_a]:[border-bottom-color:currentColor] ` +
    `[.ve_&_a]:[border-left-width:0] [.ve_&_a]:[border-left-style:none] [.ve_&_a]:[border-left-color:currentColor] ` +
    `[.ve_&_a]:rounded-[4px] [.ve_&_a]:[background-color:transparent] [.ve_&_a]:[background-image:none] ` +
    `[.ve_&_a]:text-ink-2 [.ve_&_a]:[font-style:inherit] [.ve_&_a]:[font-weight:inherit] ` +
    `[.ve_&_a]:[font-size:var(--type-control)] [.ve_&_a]:[line-height:inherit] [.ve_&_a]:[font-family:inherit] ` +
    `[.ve_&_a]:[font-variant:inherit] [.ve_&_a]:[font-stretch:inherit] [.ve_&_a]:no-underline ` +
    `[.ve_&_button]:inline-flex [.ve_&_button]:items-center [.ve_&_button]:[row-gap:8px] ` +
    `[.ve_&_button]:[column-gap:8px] [.ve_&_button]:[min-height:var(--control-height)] [.ve_&_button]:pt-[8px] ` +
    `[.ve_&_button]:pr-[0] [.ve_&_button]:pb-[8px] [.ve_&_button]:pl-[0] [.ve_&_button]:[border-top-width:0] ` +
    `[.ve_&_button]:[border-top-style:none] [.ve_&_button]:[border-top-color:currentColor] ` +
    `[.ve_&_button]:[border-right-width:0] [.ve_&_button]:[border-right-style:none] ` +
    `[.ve_&_button]:[border-right-color:currentColor] [.ve_&_button]:[border-bottom-width:0] ` +
    `[.ve_&_button]:[border-bottom-style:none] [.ve_&_button]:[border-bottom-color:currentColor] ` +
    `[.ve_&_button]:[border-left-width:0] [.ve_&_button]:[border-left-style:none] ` +
    `[.ve_&_button]:[border-left-color:currentColor] [.ve_&_button]:rounded-[4px] ` +
    `[.ve_&_button]:[background-color:transparent] [.ve_&_button]:[background-image:none] [.ve_&_button]:text-ink-2 ` +
    `[.ve_&_button]:[font-style:inherit] [.ve_&_button]:[font-weight:inherit] ` +
    `[.ve_&_button]:[font-size:var(--type-control)] [.ve_&_button]:[line-height:inherit] ` +
    `[.ve_&_button]:[font-family:inherit] [.ve_&_button]:[font-variant:inherit] ` +
    `[.ve_&_button]:[font-stretch:inherit] [.ve_&_button]:no-underline [.ve_&_a:hover]:text-ink ` +
    `[.ve_&_a:hover]:underline [.ve_&_a:hover]:[text-underline-offset:4px] [.ve_&_button:hover]:text-ink ` +
    `[.ve_&_button:hover]:underline [.ve_&_button:hover]:[text-underline-offset:4px] ` +
    `[&_a:focus-visible]:[outline:2px_solid_var(--accent)] [&_a:focus-visible]:[outline-offset:3px] ` +
    `[&_button:focus-visible]:[outline:2px_solid_var(--accent)] [&_button:focus-visible]:[outline-offset:3px]`,
  "voice-chapters": `[&:where(#voice-chapters)]:[scroll-margin-top:24px]`,
  "ve-course-guide": `[margin-top:var(--space-6)] mr-[0] [margin-bottom:var(--space-8)] ml-[0] [background-color:transparent] ` +
    `[background-image:none] [border-top-width:0] [border-top-style:none] [border-top-color:currentColor] ` +
    `[border-right-width:0] [border-right-style:none] [border-right-color:currentColor] [border-bottom-width:0] ` +
    `[border-bottom-style:none] [border-bottom-color:currentColor] [border-left-width:0] [border-left-style:none] ` +
    `[border-left-color:currentColor] [border-block-width:1px] [border-block-style:solid] ` +
    `[border-block-color:var(--hair)] rounded-[0] [&_>_summary]:flex-wrap [&_>_summary]:min-h-[56px] ` +
    `[&_>_summary]:[padding-top:var(--space-4)] [&_>_summary]:pr-[0] [&_>_summary]:[padding-bottom:var(--space-4)] ` +
    `[&_>_summary]:pl-[0] [&_>_summary]:[font-size:var(--type-body)] [&_>_summary]:font-semibold ` +
    `[&_>_summary_span]:[margin-inline-start:auto] [&_>_summary_span]:text-ink-2 [&_>_summary_span]:text-[13px] ` +
    `[&_>_summary_span]:font-normal [&_>_.md]:pt-[8px] [&_>_.md]:pr-[0] [&_>_.md]:pb-[24px] [&_>_.md]:pl-[0]`,
  "ve": `[--read:"Newsreader_Variable",_Georgia,_serif] [--ve-paper:#fff] [--ve-card:rgba(255,_255,_255,_0.72)] ` +
    `[--ve-mk:rgba(0,_0,_0,_0.3)] [--ve-glass:rgba(250,_250,_250,_0.6)] ` +
    `[--ve-glass-hi:rgba(250,_250,_250,_0.82)] [--ve-blur:blur(40px)_saturate(1.8)] ` +
    `[--ve-glass-side:#f3f3f3] [flex:1] min-w-0 min-h-0 grid ` +
    `[grid-template-columns:var(--ve-side-w,_272px)_minmax(0,_1fr)] [grid-template-rows:minmax(0,_1fr)] relative ` +
    `text-ink not-italic [font-weight:normal] text-[15px] [line-height:1.55] font-sans ` +
    `[:root[data-theme="dark"]_&]:[--ve-paper:#1d1d1d] ` +
    `[:root[data-theme="dark"]_&]:[--ve-card:rgba(255,_255,_255,_0.07)] ` +
    `[:root[data-theme="dark"]_&]:[--ve-mk:rgba(255,_255,_255,_0.3)] ` +
    `[:root[data-theme="dark"]_&]:[--ve-glass:rgba(24,_24,_24,_0.6)] ` +
    `[:root[data-theme="dark"]_&]:[--ve-glass-hi:rgba(24,_24,_24,_0.8)] ` +
    `[:root[data-theme="dark"]_&]:[--ve-glass-side:#141414] [&::before]:[content:""] ` +
    `[&::before]:absolute [&::before]:[top:0] [&::before]:[right:0] [&::before]:[bottom:0] [&::before]:[left:0] ` +
    `[&::before]:[z-index:-1] [&::before]:pointer-events-none [&::before]:[backdrop-filter:var(--ve-blur)] ` +
    `[&::before]:[-webkit-backdrop-filter:var(--ve-blur)] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[font-style:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[font-weight:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[font-size:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[line-height:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[font-family:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[font-variant:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[font-stretch:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[color:inherit] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-top-width:0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-top-style:none] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-top-color:currentColor] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-right-width:0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-right-style:none] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-right-color:currentColor] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-bottom-width:0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-bottom-style:none] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-bottom-color:currentColor] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-left-width:0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-left-style:none] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[border-left-color:currentColor] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[background-color:transparent] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[background-image:none] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:cursor-pointer ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:pt-[0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:pr-[0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:pb-[0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:pl-[0] ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:min-h-0 ` +
    `[&_button:where(:not(.btn-primary,_.btn-secondary,_.btn-ghost,_.btn-danger))]:[box-shadow:none] ` +
    `[&_button:disabled]:cursor-default [&_button:disabled]:[opacity:0.45] [&_kbd]:not-italic [&_kbd]:font-medium ` +
    `[&_kbd]:text-[12px] [&_kbd]:[line-height:normal] [&_kbd]:font-mono [&_kbd]:[border-top-width:1px] ` +
    `[&_kbd]:[border-top-style:solid] [&_kbd]:[border-top-color:var(--hair)] [&_kbd]:[border-right-width:1px] ` +
    `[&_kbd]:[border-right-style:solid] [&_kbd]:[border-right-color:var(--hair)] [&_kbd]:[border-bottom-width:2px] ` +
    `[&_kbd]:[border-bottom-style:solid] [&_kbd]:[border-bottom-color:var(--hair)] [&_kbd]:[border-left-width:1px] ` +
    `[&_kbd]:[border-left-style:solid] [&_kbd]:[border-left-color:var(--hair)] [&_kbd]:rounded-[5px] [&_kbd]:pt-[0] ` +
    `[&_kbd]:pr-[5px] [&_kbd]:pb-[0] [&_kbd]:pl-[5px] [&_kbd]:text-ink-2 [&_kbd]:[background-color:transparent] ` +
    `[&_kbd]:[background-image:none] [&_.notes]:list-none [&_.notes:where(:not(.sd-current_*))]:pt-[14px] ` +
    `[&_.notes]:pr-[0] [&_.notes]:pb-[0] [&_.notes]:pl-[0] [&_.notes:where(:not(.sd-current_*))]:mt-[14px] ` +
    `[&_.notes]:mr-[0] [&_.notes]:mb-[0] [&_.notes]:ml-[0] ` +
    `[&_.notes:where(:not(.sd-current_*))]:[border-top-width:1px] ` +
    `[&_.notes:where(:not(.sd-current_*))]:[border-top-style:solid] ` +
    `[&_.notes:where(:not(.sd-current_*))]:[border-top-color:var(--hair)] [&_.notes]:grid [&_.notes]:[row-gap:4px] ` +
    `[&_.notes]:[column-gap:4px] [&_.notes]:not-italic [&_.notes]:font-normal [&_.notes]:text-[13px] ` +
    `[&_.notes]:[line-height:1.5] [&_.notes]:font-sans [&_.notes]:text-ink-2 [&_.notes_li]:grid ` +
    `[&_.notes_li]:[grid-template-columns:18px_minmax(0,_1fr)] [&_.notes_li]:[row-gap:6px] ` +
    `[&_.notes_li]:[column-gap:6px] [&_.notes_li]:items-baseline [&_.notes_b]:text-[12px] ` +
    `[&_.notes_b]:font-semibold [&_.notes_b]:text-accent-ink [&_.notes_small]:text-ink-3 ` +
    `[&_.notes_small]:text-[12px] [&_.toast]:[bottom:132px] ` +
    `[.ve-motion_&]:[transition:grid-template-columns_0.34s_var(--ease)] [.ve-dragging_&]:[transition:none]! ` +
    `[@media_(max-width:_860px)]:[grid-template-columns:minmax(0,_1fr)] ` +
    `[@media_(max-width:_860px)]:[&_.toast]:[bottom:84px] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve-motion_&]:[transition:none]`,
  "ve-side": `[background-color:var(--ve-glass-side)] [background-image:none] [border-right-width:1px] ` +
    `[border-right-style:solid] [border-right-color:var(--hair)] overflow-hidden pt-[44px] flex flex-col ` +
    `text-[13px] min-w-0 overflow-x-hidden [&_h6]:mt-[18px] [&_h6]:mr-[10px] [&_h6]:mb-[4px] [&_h6]:ml-[10px] ` +
    `[&_h6]:flex [&_h6]:justify-between [&_h6]:items-baseline [&_h6]:[row-gap:8px] [&_h6]:[column-gap:8px] ` +
    `[&_h6]:not-italic [&_h6]:font-semibold [&_h6]:text-[12px] [&_h6]:[line-height:normal] [&_h6]:font-sans ` +
    `[&_h6]:text-ink-3 [&_h6_span]:text-[12px] [&_h6_span]:font-medium [&_h6_span]:tabular-nums ` +
    `[.ve-motion_&]:[transition:opacity_0.22s_ease,_visibility_0s_linear_0s] [.ve-side-hidden_&]:[opacity:0] ` +
    `[.ve-side-hidden_&]:[visibility:hidden] [.ve-side-hidden_&]:pointer-events-none ` +
    `[.ve-motion.ve-side-hidden_&]:[transition:opacity_0.18s_ease,_visibility_0s_linear_0.34s] ` +
    `[@media_(max-width:_860px)]:hidden! [@media_(prefers-reduced-motion:_reduce)]:[.ve-motion_&]:[transition:none]`,
  "ve-page": `bg-page [background-image:none] [grid-row:2] overflow-auto [scroll-behavior:smooth] [scrollbar-width:thin] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[scroll-behavior:auto]`,
  "ve-dock": `[background-color:var(--ve-glass)] [background-image:none] [grid-row:3] [border-top-width:1px] ` +
    `[border-top-style:solid] [border-top-color:var(--hair)] pt-[14px] pr-[20px] pb-[10px] pl-[20px] grid ` +
    `[grid-template-columns:auto_minmax(0,_1fr)_auto_auto] ` +
    `[grid-template-areas:"now_scope_stats_rec"_"sub_sub_sub_sub"] [column-gap:18px] [row-gap:8px] items-center ` +
    `[&_>_.btn-secondary]:[grid-column:1_/_-1] [&_>_.btn-secondary]:[justify-self:start] [.ve_&]:relative ` +
    `[.ve_&]:mt-[18px] [.ve_&]:mr-[0] [.ve_&]:mb-[2px] [.ve_&]:ml-[0] [.ve_&]:pt-[0] [.ve_&]:pr-[0] [.ve_&]:pb-[0] ` +
    `[.ve_&]:pl-[0] [.ve_&]:[border-top-width:0] [.ve_&]:[border-top-style:none] ` +
    `[.ve_&]:[border-top-color:currentColor] [.ve_&]:[border-right-width:0] [.ve_&]:[border-right-style:none] ` +
    `[.ve_&]:[border-right-color:currentColor] [.ve_&]:[border-bottom-width:0] [.ve_&]:[border-bottom-style:none] ` +
    `[.ve_&]:[border-bottom-color:currentColor] [.ve_&]:[border-left-width:0] [.ve_&]:[border-left-style:none] ` +
    `[.ve_&]:[border-left-color:currentColor] [.ve_&]:rounded-[0] [.ve_&]:[background-color:transparent] ` +
    `[.ve_&]:[background-image:none] [.ve_&]:[box-shadow:none] [.ve_&]:[backdrop-filter:none] ` +
    `[.ve_&]:[-webkit-backdrop-filter:none] [.ve_&]:grid [.ve_&]:[grid-template-columns:auto_minmax(0,_1fr)] ` +
    `[.ve_&]:[grid-template-areas:"rec_now"_"scope_scope"_"sub_sub"] [.ve_&]:[column-gap:14px] ` +
    `[.ve_&]:[row-gap:12px] [.ve_&]:items-center [.ve_&.idle]:[grid-template-areas:"rec_sub"] ` +
    `[.ve_&.idle]:[row-gap:0] [.ve_&.idle.quiet]:hidden [.ve-studio-rec_&]:mt-[0] [.ve-studio-rec_&]:mr-[0] ` +
    `[.ve-studio-rec_&]:mb-[0] [.ve-studio-rec_&]:ml-[0] [.ve-studio-rec_&.idle]:[justify-content:start] ` +
    `[.ve-studio-rec_&.idle]:[grid-template-areas:"rec_sub"_"scope_scope"] [.ve-studio-rec_&.idle]:[row-gap:16px] ` +
    `[.ve-studio-rec_&.folded]:[grid-template-areas:"rec_sub"] [.ve-studio-rec_&.folded]:[row-gap:0] ` +
    `[.ve_&.bright:not(.idle)]:[grid-template-areas:"rec_now"_"scope_scope"_"bright_bright"_"sub_sub"] ` +
    `[.ve_.sd-controls_&]:mt-[0] [.ve_.sd-controls_&]:mr-[0] [.ve_.sd-controls_&]:mb-[0] ` +
    `[.ve_.sd-controls_&]:ml-[0] [.ve_.sd-controls_&.quiet]:hidden ` +
    `[@media_(max-width:_700px)]:[.ve_.sd-controls_&.idle]:[grid-template-columns:1fr] ` +
    `[@media_(max-width:_700px)]:[.ve_.sd-controls_&.idle]:[grid-template-areas:"rec"_"sub"] ` +
    `[@media_(max-width:_700px)]:[.ve_.sd-controls_&.idle]:[row-gap:12px] [.fc-ve_&]:mt-[0]! [.fc-ve_&]:mr-[0] ` +
    `[.fc-ve_&]:mb-[0]! [.fc-ve_&]:ml-[0] [.fc-ve_&.idle]:justify-center ` +
    `[.fc-ve_&.idle]:[grid-template-columns:auto_auto]`,
  "ve-side-scroll": `[flex:1] min-h-0 overflow-auto pt-[6px] pr-[8px] pb-[12px] pl-[8px] flex flex-col [scrollbar-width:thin] ` +
    `[&_>_*]:[flex-shrink:0] [&_>_*]:[min-width:calc(var(--ve-side-open,_272px)_-_16px)] ` +
    `[&_>_h6]:[min-width:calc(var(--ve-side-open,_272px)_-_36px)]`,
  "ve-part": `[.ve-side_h6&]:mt-[1px] [.ve-side_h6&]:mr-[0] [.ve-side_h6&]:mb-[0] [.ve-side_h6&]:ml-[0] ` +
    `[.ve-side_.ve-tree_+_h6&]:mt-[14px] [.ve_&_button]:w-full [.ve_&_button]:h-[26px] [.ve_&_button]:min-h-0 ` +
    `[.ve_&_button]:flex [.ve_&_button]:items-center [.ve_&_button]:justify-start [.ve_&_button]:[row-gap:6px] ` +
    `[.ve_&_button]:[column-gap:6px] [.ve_&_button]:pt-[0] [.ve_&_button]:pr-[8px] [.ve_&_button]:pb-[0] ` +
    `[.ve_&_button]:pl-[10px] [.ve_&_button]:rounded-[7px] [.ve_&_button]:text-ink-3 [.ve_&_button]:not-italic ` +
    `[.ve_&_button]:font-semibold [.ve_&_button]:text-[12px] [.ve_&_button]:[line-height:normal] ` +
    `[.ve_&_button]:font-sans ` +
    `[.ve_&_button]:text-left [.ve_&_button]:[transition:background-color_0.12s_ease,_color_0.12s_ease] ` +
    `[&_.t]:[flex:1] [&_.t]:min-w-0 [&_.t]:whitespace-nowrap [&_.t]:overflow-hidden [&_.t]:text-ellipsis ` +
    `[&_.c]:text-[12px] [&_.c]:font-medium [&_.c]:tracking-[0] [&_.c]:[text-transform:none] [&_.c]:text-ink-3 ` +
    `[&_.c]:tabular-nums [@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover]:bg-fill ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover]:[background-image:none] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover]:text-ink`,
  "ve-chev": `[.ve-part_&]:text-ink-3 w-[12px] h-[12px] [transition:transform_0.18s_var(--ease)] ` +
    `[&.open]:[transform:rotate(90deg)] [@media_(prefers-reduced-motion:_reduce)]:[transition:none]`,
  "ve-home": `[.ve_&]:w-full [.ve_&]:h-[38px] [.ve_&]:flex [.ve_&]:items-center [.ve_&]:justify-start ` +
    `[.ve_&]:[column-gap:10px] [.ve_&]:mt-[0] [.ve_&]:mr-[0] [.ve_&]:mb-[2px] [.ve_&]:ml-[0] [.ve_&]:pt-[0] ` +
    `[.ve_&]:pr-[10px] [.ve_&]:pb-[0] [.ve_&]:pl-[8px] [.ve_&]:rounded-[10px] [.ve_&]:text-ink-2 [.ve_&]:font-medium ` +
    `[.ve_&]:text-[14px] [.ve_&]:text-left [.ve_&]:[transition:background-color_0.12s_ease,_color_0.12s_ease] ` +
    `[.ve_&[aria-current="page"]]:bg-fill-2 [.ve_&[aria-current="page"]]:text-ink ` +
    `[.ve_&[aria-current="page"]]:[background-image:none] [&_.t]:[flex:1] [&_.t]:min-w-0 [&_.t]:truncate ` +
    `[&_.c]:text-[12px] [&_.c]:font-medium [&_.c]:text-ink-3 [&_.c]:tabular-nums ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not([aria-current])]:bg-fill ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not([aria-current])]:text-ink ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not([aria-current])]:[background-image:none]`,
  "ve-here": `[.ve_&]:h-[30px] [.ve_&]:pl-[40px] [.ve_&]:text-[13px] [.ve_&]:mb-[1px] [.ve_&.on]:text-ink ` +
    `[.ve_&.on]:font-semibold`,
  "ve-chpart": `mt-[10px] mb-[2px] pl-[40px] text-[12px] font-semibold text-ink-3`,
  "ve-home-ic": `[flex:none] w-[22px] grid place-items-center [&_svg]:w-[17px] [&_svg]:h-[17px]`,
  "ve-tree": `list-none mt-[0] mr-[0] mb-[0] ml-[0] pt-[0] pr-[0] pb-[0] pl-[0] [.ve-home_+_&]:mt-[8px]`,
  "ve-files": `list-none mt-[0] mr-[0] mb-[6px] ml-[30px] pt-[0] pr-[0] pb-[0] pl-[6px] [.ve-side-scroll_>_&]:[min-width:0] [border-left-width:1px] ` +
    `[border-left-style:solid] [border-left-color:var(--hair)]`,
  "ve-doc": `[&.solo]:[grid-template-columns:minmax(0,_1fr)] min-w-0 min-h-0 grid [grid-template-rows:auto_minmax(0,_1fr)] ` +
    `relative`,
  "ve-resize": `[.ve-doc.solo_&.split]:hidden absolute [top:0] [bottom:0] [z-index:6] w-[8px] [cursor:col-resize] touch-none ` +
    `[outline:none] [&::after]:[content:""] [&::after]:absolute [&::after]:[top:0] [&::after]:[bottom:0] ` +
    `[&::after]:[left:3.5px] [&::after]:w-[1px] [&::after]:bg-accent [&::after]:[background-image:none] ` +
    `[&::after]:[opacity:0] [&::after]:[transition:opacity_0.15s_ease] [&:hover::after]:[opacity:0.7] ` +
    `[&:focus-visible::after]:[opacity:0.7] [.ve-dragging_&::after]:[opacity:0.7] ` +
    `[&.side]:[left:calc(var(--ve-side-w,_272px)_-_4px)] [&.split]:hidden! [@media_(max-width:_860px)]:hidden!`,
  "ve-embed": `[.ve-col&]:max-w-[var(--content-width)]`,
  "rl-head": `grid [grid-template-columns:1fr_auto] [align-items:end] [row-gap:6px] [column-gap:16px] mt-[0] mr-[0] ` +
    `mb-[32px] ml-[0] [&_h1]:mt-[0] [&_h1]:mr-[0] [&_h1]:mb-[0] [&_h1]:ml-[0] [&_h1]:not-italic [&_h1]:font-bold ` +
    `[&_h1]:text-[44px] [&_h1]:[line-height:1.05] [&_h1]:font-sans [&_h1]:[letter-spacing:-0.045em] [&_h1]:text-ink ` +
    `[&_p]:[grid-column:1_/_-1] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:text-[17px] ` +
    `[&_p]:[line-height:1.5] [&_p]:text-ink-2 [@media_(max-width:_860px)]:[&_h1]:text-[34px]`,
  "rl-export": `inline-flex items-center [row-gap:6px] [column-gap:6px] pt-[7px] pr-[12px] pb-[7px] pl-[12px] mb-[4px] ` +
    `rounded-[99px] bg-fill [background-image:none] text-[13px] font-medium text-ink-2 no-underline ` +
    `[transition:background-color_0.15s_ease,_color_0.15s_ease] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:hover]:bg-fill-2 ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:hover]:[background-image:none] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:hover]:text-ink`,
  "rl-day": `mt-[0] mr-[0] mb-[28px] ml-[0] [&_h2]:mt-[0] [&_h2]:mr-[0] [&_h2]:mb-[6px] [&_h2]:ml-[0] [&_h2]:pt-[0] ` +
    `[&_h2]:pr-[12px] [&_h2]:pb-[0] [&_h2]:pl-[12px] [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-ink-3 ` +
    `[&_ul]:list-none [&_ul]:mt-[0] [&_ul]:mr-[0] [&_ul]:mb-[0] [&_ul]:ml-[0] [&_ul]:pt-[0] [&_ul]:pr-[0] ` +
    `[&_ul]:pb-[0] [&_ul]:pl-[0] [&_ul]:grid [&_ul]:[row-gap:2px] [&_ul]:[column-gap:2px]`,
  "rl-row": `grid [grid-template-columns:36px_minmax(140px,_240px)_minmax(0,_1fr)_auto_auto] items-center [row-gap:4px] ` +
    `[column-gap:16px] pt-[10px] pr-[12px] pb-[10px] pl-[12px] rounded-[14px] ` +
    `[transition:background-color_0.15s_ease] [&.playing]:[background-color:var(--ve-card)] ` +
    `[&.playing]:[background-image:none] [&.playing]:[box-shadow:0_0_0_1px_var(--hair)] [&.sub]:ml-[28px] ` +
    `[&.sub]:pt-[6px] [&.sub]:pb-[6px] [@media_(hover:_hover)_and_(pointer:_fine)]:[&:hover:not(.playing)]:bg-fill ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:hover:not(.playing)]:[background-image:none] ` +
    `[@media_(max-width:_860px)]:[grid-template-columns:36px_minmax(0,_1fr)_auto]`,
  "rl-play": `[.ve_&]:w-[36px] [.ve_&]:h-[36px] [.ve_&]:[border-radius:50%] [.ve_&]:grid [.ve_&]:place-items-center ` +
    `[.ve_&]:bg-ink [.ve_&]:[background-image:none] [.ve_&]:[color:var(--ve-paper)] ` +
    `[.ve_&]:[transition:transform_0.16s_var(--ease),_background-color_0.15s_ease] ` +
    `[.ve_&:active]:[transform:scale(0.94)] [&_svg]:w-[12px] [&_svg]:h-[12px] [&_svg]:[fill:currentColor] ` +
    `[.rl-row.playing_&]:bg-accent [.rl-row.playing_&]:[background-image:none] [.rl-row.playing_&]:text-accent-on`,
  "rl-what": `min-w-0 grid [&_b]:flex [&_b]:items-center [&_b]:[row-gap:6px] [&_b]:[column-gap:6px] [&_b]:text-[15px] ` +
    `[&_b]:font-semibold [&_b]:text-ink [&_b]:whitespace-nowrap [&_b]:overflow-hidden [&_b]:text-ellipsis ` +
    `[.rl-row.sub_&_b]:text-[13.5px] [.rl-row.sub_&_b]:font-medium [.rl-row.sub_&_b]:text-ink-2 ` +
    `[&_span]:text-[13px] [&_span]:text-ink-3 [&_span]:whitespace-nowrap [&_span]:overflow-hidden ` +
    `[&_span]:text-ellipsis`,
  "rl-more-takes": `[.ve_&]:[flex:none] [.ve_&]:inline-flex [.ve_&]:[row-gap:3px] [.ve_&]:[column-gap:3px] [.ve_&]:ml-[4px] ` +
    `[.ve_&]:pt-[1px] [.ve_&]:pr-[8px] [.ve_&]:pb-[1px] [.ve_&]:pl-[8px] [.ve_&]:rounded-[99px] [.ve_&]:bg-fill-2 ` +
    `[.ve_&]:[background-image:none] [.ve_&]:text-ink-2 [.ve_&]:text-[12px] [.ve_&]:font-semibold ` +
    `[.ve_&:hover]:text-ink [&_span]:text-ink-3`,
  "rl-fav": `inline-flex text-accent-ink [&_svg]:w-[12px] [&_svg]:h-[12px] [&_svg]:[fill:currentColor]`,
  "rl-wave": `h-[30px] flex items-center [row-gap:2px] [column-gap:2px] cursor-pointer [&_i]:[flex:1] [&_i]:h-full ` +
    `[&_i]:rounded-[2px] [&_i]:[background-color:color-mix(in_srgb,_var(--ink)_20%,_transparent)] ` +
    `[&_i]:[background-image:none] [&_i]:[transform-origin:center] [&_i.on]:bg-accent ` +
    `[&_i.on]:[background-image:none] ` +
    `[.rl-row.playing_&_i:not(.on)]:[background-color:color-mix(in_srgb,_var(--accent)_22%,_transparent)] ` +
    `[.rl-row.playing_&_i:not(.on)]:[background-image:none] [@media_(max-width:_860px)]:[grid-column:2_/_-1] ` +
    `[@media_(max-width:_860px)]:[grid-row:2] [@media_(max-width:_860px)]:h-[24px]`,
  "rl-time": `text-[13px] text-ink-3 tabular-nums whitespace-nowrap [@media_(max-width:_860px)]:hidden`,
  "rl-actions": `flex [row-gap:2px] [column-gap:2px] [.ve_&_button]:w-[30px] [.ve_&_button]:h-[30px] [.ve_&_button]:grid ` +
    `[.ve_&_button]:place-items-center [.ve_&_button]:rounded-[8px] [.ve_&_button]:text-ink-3 ` +
    `[.ve_&_button]:[opacity:0.55] ` +
    `[.ve_&_button]:[transition:opacity_0.15s_ease,_background-color_0.15s_ease,_color_0.15s_ease] [&_svg]:w-[15px] ` +
    `[&_svg]:h-[15px] [.ve_&_button[aria-pressed="true"]]:text-accent-ink ` +
    `[.ve_&_button[aria-pressed="true"]]:[opacity:1] [.ve_&_button[aria-pressed="true"]_svg]:[fill:currentColor] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.rl-row:hover_&_button]:[opacity:1] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:focus-visible]:[opacity:1] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover]:bg-fill-2 ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover]:[background-image:none] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover]:text-ink ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button.danger:hover]:text-rec ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:[opacity:1]`,
  "rl-note": `[grid-column:2_/_-1] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:text-[13px] [&_p]:text-ink-2 ` +
    `[&_p]:italic [&_form]:flex [&_form]:[row-gap:8px] [&_form]:[column-gap:8px] [&_input]:[flex:1] ` +
    `[&_input]:min-w-0 [&_input]:h-[34px] [&_input]:pt-[0] [&_input]:pr-[12px] [&_input]:pb-[0] [&_input]:pl-[12px] ` +
    `[&_input]:rounded-[10px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] ` +
    `[&_input]:[border-top-color:var(--hair)] [&_input]:[border-right-width:1px] ` +
    `[&_input]:[border-right-style:solid] [&_input]:[border-right-color:var(--hair)] ` +
    `[&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] ` +
    `[&_input]:[border-bottom-color:var(--hair)] [&_input]:[border-left-width:1px] ` +
    `[&_input]:[border-left-style:solid] [&_input]:[border-left-color:var(--hair)] ` +
    `[&_input]:[background-color:var(--ve-card)] [&_input]:[background-image:none] [&_input]:not-italic ` +
    `[&_input]:[font-weight:normal] [&_input]:text-[14px] [&_input]:[line-height:normal] [&_input]:font-sans ` +
    `[&_input]:text-ink [.ve_&_form_button]:pt-[0] [.ve_&_form_button]:pr-[14px] [.ve_&_form_button]:pb-[0] ` +
    `[.ve_&_form_button]:pl-[14px] [.ve_&_form_button]:h-[34px] [.ve_&_form_button]:rounded-[10px] ` +
    `[.ve_&_form_button]:bg-ink [.ve_&_form_button]:[background-image:none] ` +
    `[.ve_&_form_button]:[color:var(--ve-paper)] [.ve_&_form_button]:text-[13px] [.ve_&_form_button]:font-semibold`,
  "rl-more": `[.ve_&]:block [.ve_&]:mt-[0] [.ve_&]:[margin-right:auto] [.ve_&]:mb-[28px] [.ve_&]:[margin-left:auto] ` +
    `[.ve_&]:pt-[8px] [.ve_&]:pr-[16px] [.ve_&]:pb-[8px] [.ve_&]:pl-[16px] [.ve_&]:rounded-[99px] [.ve_&]:bg-fill ` +
    `[.ve_&]:[background-image:none] [.ve_&]:text-[13px] [.ve_&]:font-medium [.ve_&]:text-ink-2 ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover]:bg-fill-2 ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover]:[background-image:none] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover]:text-ink`,
  "rl-empty": `text-[14px] [line-height:1.55] text-ink-3`,
  "rl-foot": `text-[13px] [line-height:1.55] text-ink-3 mt-[8px] mr-[0] mb-[0] ml-[0] pt-[18px] [border-top-width:1px] ` +
    `[border-top-style:solid] [border-top-color:var(--hair)] [&_a]:text-ink-2 [.rl-foot_+_&]:mt-[0] ` +
    `[.rl-foot_+_&]:pt-[6px] [.rl-foot_+_&]:[border-top-width:0] [.rl-foot_+_&]:[border-top-style:none] ` +
    `[.rl-foot_+_&]:[border-top-color:currentColor]`,
  "rl-link": `[.ve_&]:[display:inline] [.ve_&]:pt-[0] [.ve_&]:pr-[0] [.ve_&]:pb-[0] [.ve_&]:pl-[0] [.ve_&]:min-h-0 ` +
    `[.ve_&]:[font-style:inherit] [.ve_&]:font-semibold [.ve_&]:[font-size:inherit] [.ve_&]:[line-height:inherit] ` +
    `[.ve_&]:[font-family:inherit] [.ve_&]:[font-variant:inherit] [.ve_&]:[font-stretch:inherit] ` +
    `[.ve_&]:text-accent-ink [.ve_&]:underline [.ve_&]:[text-underline-offset:3px] ` +
    `[.ve_&]:[text-decoration-color:color-mix(in_srgb,_var(--accent)_40%,_transparent)]`,
  "ve-soon": `[&_h1]:mt-[0] [&_h1]:mr-[0] [&_h1]:mb-[12px] [&_h1]:ml-[0] [&_h1]:not-italic [&_h1]:font-bold ` +
    `[&_h1]:text-[44px] [&_h1]:[line-height:1.05] [&_h1]:font-sans [&_h1]:[letter-spacing:-0.045em] [&_h1]:text-ink ` +
    `[max-width:60ch] text-ink-2 text-[15px] [line-height:1.6] [&_.lede]:mt-[0] [&_.lede]:mr-[0] ` +
    `[&_.lede]:mb-[20px] [&_.lede]:ml-[0] [&_.lede]:text-[21px] [&_.lede]:font-semibold [&_.lede]:text-accent-ink ` +
    `[&_.lede]:[letter-spacing:-0.02em] [&_ul]:pl-[20px] [&_ul]:grid [&_ul]:[row-gap:8px] [&_ul]:[column-gap:8px] ` +
    `[&_a]:text-accent-ink [&_strong]:text-ink [&_strong]:font-semibold`,
  "ve-row": `flex items-center rounded-[7px] [transition:background-color_0.12s_ease] ` +
    `[&:has(.ve-open[aria-current="page"])]:bg-fill-2 ` +
    `[&:has(.ve-open[aria-current="page"])]:[background-image:none] [&_.c.next]:text-accent-ink ` +
    `[&_.c.next]:font-semibold ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:hover:not(:has(.ve-open[aria-current="page"]))]:bg-fill ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:hover:not(:has(.ve-open[aria-current="page"]))]:[background-image:none]`,
  "ve-fold": `[.ve_&]:[flex:none] [.ve_&]:w-[22px] [.ve_&]:h-[28px] [.ve_&]:grid [.ve_&]:place-items-center ` +
    `[.ve_&]:text-ink-3 [.ve_&]:rounded-[6px] [@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover]:text-ink`,
  "ve-open": `[.ve_&]:[flex:1] [.ve_&]:min-w-0 [.ve_&]:h-[28px] [.ve_&]:flex [.ve_&]:items-center [.ve_&]:[row-gap:8px] ` +
    `[.ve_&]:[column-gap:8px] [.ve_&]:pt-[0] [.ve_&]:pr-[8px] [.ve_&]:pb-[0] [.ve_&]:pl-[2px] [.ve_&]:text-left ` +
    `[.ve_&]:text-ink [.ve_&]:font-medium [&_.t]:[flex:1] [&_.t]:min-w-0 [&_.t]:whitespace-nowrap ` +
    `[&_.t]:overflow-hidden [&_.t]:text-ellipsis [&_.c]:text-[12px] [&_.c]:font-medium [&_.c]:text-ink-3 ` +
    `[&_.c]:tabular-nums`,
  "ve-file": `[&_.t]:[flex:1] [&_.t]:min-w-0 [&_.t]:whitespace-nowrap [&_.t]:overflow-hidden [&_.t]:text-ellipsis ` +
    `[.ve_&]:w-full [.ve_&]:h-[26px] [.ve_&]:flex [.ve_&]:items-center [.ve_&]:[row-gap:6px] ` +
    `[.ve_&]:[column-gap:6px] [.ve_&]:pt-[0] [.ve_&]:pr-[8px] [.ve_&]:pb-[0] [.ve_&]:pl-[8px] [.ve_&]:rounded-[6px] ` +
    `[.ve_&]:text-left [.ve_&]:text-ink-2 [.ve_&]:text-[13px] ` +
    `[.ve_&]:[transition:background-color_0.12s_ease,_color_0.12s_ease] [.ve_&[aria-current="page"]]:bg-fill-2 ` +
    `[.ve_&[aria-current="page"]]:[background-image:none] [.ve_&[aria-current="page"]]:text-ink ` +
    `[.ve_&[aria-current="page"]]:font-medium [.ve_&.done]:text-ink-3 [.ve_&:disabled]:[opacity:1] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled):not([aria-current])]:bg-fill ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled):not([aria-current])]:[background-image:none] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled):not([aria-current])]:text-ink`,
  "ve-medal-s": `w-[15px] h-[15px] [flex:none]`,
  "ve-tick": `w-[13px] h-[13px] [flex:none] text-ok`,
  "ve-note-row": `pt-[4px] pr-[8px] pb-[4px] pl-[8px] text-[12px] text-ink-3`,
  "ve-chips": `hidden [@media_(max-width:_860px)]:flex [@media_(max-width:_860px)]:[row-gap:6px] ` +
    `[@media_(max-width:_860px)]:[column-gap:6px] [@media_(max-width:_860px)]:overflow-x-auto ` +
    `[@media_(max-width:_860px)]:pt-[10px] [@media_(max-width:_860px)]:pr-[14px] ` +
    `[@media_(max-width:_860px)]:pb-[10px] [@media_(max-width:_860px)]:pl-[14px] ` +
    `[@media_(max-width:_860px)]:[border-bottom-width:1px] [@media_(max-width:_860px)]:[border-bottom-style:solid] ` +
    `[@media_(max-width:_860px)]:[border-bottom-color:var(--hair)] ` +
    `[@media_(max-width:_860px)]:[scrollbar-width:none] ` +
    `[@media_(max-width:_860px)]:[background-color:var(--ve-glass)] ` +
    `[@media_(max-width:_860px)]:[background-image:none] ` +
    `[@media_(max-width:_860px)]:[backdrop-filter:var(--ve-blur)] ` +
    `[@media_(max-width:_860px)]:[-webkit-backdrop-filter:var(--ve-blur)] ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:[flex:none] [@media_(max-width:_860px)]:[.ve_&_button]:min-h-[44px] ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:pt-[8px] [@media_(max-width:_860px)]:[.ve_&_button]:pr-[14px] ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:pb-[8px] [@media_(max-width:_860px)]:[.ve_&_button]:pl-[14px] ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:rounded-[99px] [@media_(max-width:_860px)]:[.ve_&_button]:bg-fill ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:[background-image:none] ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:text-[13px] [@media_(max-width:_860px)]:[.ve_&_button]:font-medium ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:text-ink-2 ` +
    `[@media_(max-width:_860px)]:[.ve_&_button]:whitespace-nowrap ` +
    `[@media_(max-width:_860px)]:[.ve_&_button[aria-current="page"]]:bg-ink ` +
    `[@media_(max-width:_860px)]:[.ve_&_button[aria-current="page"]]:[background-image:none] ` +
    `[@media_(max-width:_860px)]:[.ve_&_button[aria-current="page"]]:[color:var(--ve-paper)]`,
  // Retain this small guard: removing it changes the reading column's centering in the cascade.
  "ve-chapter": `[--content-width:960px] [&_>_.ve-head]:border-b [&_>_.ve-head]:border-hair [&_>_.ve-head]:pb-5 ` +
    `[&_.ve-items]:grid [&_.ve-items]:gap-0 [&_.ve-items_>_.ve-item]:m-0 ` +
    `[&_.ve-items_>_.ve-item]:rounded-none [&_.ve-items_>_.ve-item]:border-b [&_.ve-items_>_.ve-item]:border-hair ` +
    `[&_.ve-items_>_.ve-item:last-child]:border-b-0 ` +
    `[&_.ve-items_>_.ve-item]:py-5 [&_.ve-items_>_.ve-item]:pr-5 [&_.ve-items_>_.ve-item]:pl-14 ` +
    `[&_.ve-items_>_.ve-item:not(.on):not(.done):hover]:bg-transparent ` +
    `[&_.ve-item:not(.on):not(.done)_.readtext]:text-ink-2 [&_.ve-item:not(.on)_.ve-hint]:text-ink-2 ` +
    `[&_.ve-item_.ve-hint]:[max-width:68ch] [&_.ve-item_.ve-hint]:block [&_.ve-item_.ve-hint]:text-[14px] ` +
    `[&_.ve-item_.ve-mk.num]:top-8 [&_.ve-item:has(>_.ve-checkin)_.ve-mk.num]:top-7 ` +
    `[@media_(max-width:_860px)]:[&_.ve-items_>_.ve-item]:px-4 ` +
    `[@media_(max-width:_860px)]:[&_.ve-items_>_.ve-item]:py-4`,
  "ve-col": `[&:where(.ve-col)]:w-full [&:where(.ve-col)]:min-w-0 [&:where(.ve-col)]:[max-width:var(--content-width)] ` +
    `[&:where(.ve-col)]:mt-[0] [&:where(.ve-col)]:[margin-right:auto] [&:where(.ve-col)]:mb-[0] ` +
    `[&:where(.ve-col)]:[margin-left:auto] [&:where(.ve-col)]:[padding-top:var(--space-8)] ` +
    `[&:where(.ve-col)]:[padding-right:var(--page-padding)] [&:where(.ve-col)]:pb-[32px] ` +
    `[&:where(.ve-col)]:[padding-left:var(--page-padding)] [&:where(.ve-col)]:[overflow-wrap:anywhere] ` +
    `[@media_(max-width:_860px)]:[&:where(.ve-col)]:pt-[24px] ` +
    `[@media_(max-width:_860px)]:[&:where(.ve-col)]:pr-[18px] ` +
    `[@media_(max-width:_860px)]:[&:where(.ve-col)]:pb-[24px] ` +
    `[@media_(max-width:_860px)]:[&:where(.ve-col)]:pl-[18px]`,
  "ve-mk": `absolute [left:-40px] w-[24px] text-right not-italic font-medium text-[13px] [line-height:1] font-sans ` +
    `tabular-nums [color:var(--ve-mk)] [user-select:none] [&_svg]:w-[16px] [&_svg]:h-[16px] [&_svg]:inline-block ` +
    `[.ve-item_&.num]:[top:31px] [.ve-item_&.num]:[left:16px] [.ve-item:has(.ve-kind)_&.num]:[top:58px] ` +
    `[.ve-item:has(>_.ve-checkin)_&.num]:[top:24px] [.ve-item.on_&.num]:text-accent-ink ` +
    `[.ve-item.done_&.num]:[top:15px] [.ve-item.done_&.num]:text-ok [@media_(max-width:_860px)]:hidden ` +
    `[.sd-completed_.ve-item.done_&.num]:[left:0] [.sd-completed_.ve-item.done_&.num]:w-[16px] ` +
    `[.sd-completed_.ve-item.done_&.num]:text-ink-2`,
  "ve-head": `mt-[0] mr-[0] [&:where(:not(.sd-heading))]:mb-[28px] ml-[0] [&_h1]:not-italic [&_h1]:font-semibold ` +
    `[&_h1]:[font-size:var(--type-title)] [&_h1]:[line-height:1.15] [&_h1]:font-sans ` +
    `[&_h1]:[letter-spacing:-0.035em] [&_h1]:mt-[0] [&_h1]:mr-[0] [&_h1]:[margin-bottom:var(--space-2)] ` +
    `[&_h1]:ml-[0] [&_h1]:[outline:none] [&_h1]:[text-wrap:pretty]`,
  "ve-award": `flex items-center [row-gap:14px] [column-gap:14px] mt-[20px] mr-[0] mb-[0] ml-[0] pt-[14px] pr-[18px] ` +
    `pb-[14px] pl-[14px] rounded-[16px] bg-accent-soft [background-image:none] text-ink-2 text-[14px] ` +
    `[line-height:1.45] [&_b]:block [&_b]:text-accent-ink [&_b]:text-[15px] [&_b]:font-semibold ` +
    `[&_b]:[letter-spacing:-0.01em] [&.fresh]:[animation:ve-award-in_0.7s_cubic-bezier(0.34,_1.56,_0.64,_1)_both] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[&.fresh]:[animation:none]`,
  "ve-award-medal": `[flex:none] w-[44px] h-[44px] [filter:drop-shadow(0_6px_10px_rgba(var(--accent-rgb),_0.35))] ` +
    `[.ve-award.fresh_&]:[animation:ve-medal-in_0.9s_cubic-bezier(0.34,_1.56,_0.64,_1)_0.1s_both] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve-award.fresh_&]:[animation:none]`,
  "ve-subtitle": `text-[17px] font-medium [line-height:1.4] [letter-spacing:-0.012em] text-ink-2 mt-[0] mr-[0] mb-[0] ml-[0] ` +
    `[.sd-heading_&]:[grid-column:1] [.sd-heading_&]:text-[14px] [.sd-heading_&]:font-normal`,
  "ve-meta": `text-[13px] text-ink-3 mt-[4px] mr-[0] mb-[0] ml-[0] tabular-nums [.sd-heading_&]:[grid-column:2] ` +
    `[.sd-heading_&]:[grid-row:1_/_3] [.sd-heading_&]:[align-self:center] [.sd-heading_&]:mt-[0] ` +
    `[.sd-heading_&]:mr-[0] [.sd-heading_&]:mb-[0] [.sd-heading_&]:ml-[0] ` +
    `[@media_(max-width:_700px)]:[.sd-heading_&]:[grid-column:1] ` +
    `[@media_(max-width:_700px)]:[.sd-heading_&]:[grid-row:auto]`,
  "ve-how": `mt-[0] mr-[0] mb-[40px] ml-[0] pt-[16px] pr-[20px] pb-[17px] pl-[20px] rounded-[14px] bg-fill ` +
    `[background-image:none] text-ink-2 text-[15px] [line-height:1.55] [&.warn]:bg-warn-soft ` +
    `[&.warn]:[background-image:none] [&_b]:text-ink [&_b]:font-semibold [&_b]:text-[13px] [&_b]:block ` +
    `[&_b]:mb-[3px] [.ve_&]:mt-[0] [.ve_&]:mr-[0] [.ve_&]:mb-[40px] [.ve_&]:ml-[0] [.ve_&]:pt-[0] [.ve_&]:pr-[0] ` +
    `[.ve_&]:pb-[0] [.ve_&]:pl-[0] [.ve_&]:rounded-[0] [.ve_&]:[background-color:transparent] ` +
    `[.ve_&]:[background-image:none] [.ve_&]:text-ink-2 [.ve_&]:text-[16.5px] [.ve_&]:[line-height:1.5] ` +
    `[.ve_&]:[max-width:34em] [.ve_&_b]:[display:inline] [.ve_&_b]:mt-[0] [.ve_&_b]:mr-[6px] [.ve_&_b]:mb-[0] ` +
    `[.ve_&_b]:ml-[0] [.ve_&_b]:text-ink [.ve_&_b]:[font-size:inherit] [.ve_&_b]:font-semibold ` +
    `[.ve_&.warn]:pt-[14px] [.ve_&.warn]:pr-[18px] [.ve_&.warn]:pb-[14px] [.ve_&.warn]:pl-[18px] ` +
    `[.ve_&.warn]:rounded-[14px] [.ve_&.warn]:bg-warn-soft [.ve_&.warn]:[background-image:none] ` +
    `[.ve_&.warn]:[max-width:none] [.ve_&.warn_b]:block [.ve_&.warn_b]:mt-[0] [.ve_&.warn_b]:mr-[0] ` +
    `[.ve_&.warn_b]:mb-[3px] [.ve_&.warn_b]:ml-[0]`,
  "ci": `mt-[0] mr-[0] mb-[32px] ml-[0]`,
  "ci-lede": `[--md-body-size:19px] w-full [max-width:min(62ch,_680px)] text-ink`,
  "ci-tips": `list-none mt-[16px] mr-[0] mb-[0] ml-[0] pt-[0] pr-[0] pb-[0] pl-[0] [&_>_li]:grid [&_>_li_>_div]:[max-width:68ch] ` +
    `[&_>_li]:[grid-template-columns:28px_minmax(0,_1fr)] [&_>_li]:[row-gap:12px] [&_>_li]:[column-gap:12px] ` +
    `[&_>_li]:[align-items:start] [&_>_li]:pt-[16px] [&_>_li]:pr-[0] [&_>_li]:pb-[16px] [&_>_li]:pl-[0] ` +
    `[&_>_li]:[border-top-width:1px] [&_>_li]:[border-top-style:solid] [&_>_li]:[border-top-color:var(--hair)] ` +
    `[&_>_li:last-child]:[border-bottom-width:1px] [&_>_li:last-child]:[border-bottom-style:solid] ` +
    `[&_>_li:last-child]:[border-bottom-color:var(--hair)] [&_>_li_>_div_>_b]:block [&_>_li_>_div_>_b]:mt-[3px] ` +
    `[&_>_li_>_div_>_b]:mr-[0] [&_>_li_>_div_>_b]:mb-[6px] [&_>_li_>_div_>_b]:ml-[0] [&_>_li_>_div_>_b]:text-[15px] ` +
    `[&_>_li_>_div_>_b]:[line-height:1.4] [&_>_li_>_div_>_b]:font-semibold [&_>_li_>_div_>_b]:text-ink ` +
    `[&_.md]:[--md-body-size:15px] [&_li.care_b]:[color:color-mix(in_srgb,_var(--accent)_75%,_var(--ink))] ` +
    `[@media_(max-width:_860px)]:[&_>_li]:[grid-template-columns:24px_minmax(0,_1fr)] ` +
    `[@media_(max-width:_860px)]:[&_>_li]:[row-gap:10px] [@media_(max-width:_860px)]:[&_>_li]:[column-gap:10px] ` +
    `[@media_(max-width:_860px)]:[&_>_li]:pt-[14px] [@media_(max-width:_860px)]:[&_>_li]:pr-[0] ` +
    `[@media_(max-width:_860px)]:[&_>_li]:pb-[14px] [@media_(max-width:_860px)]:[&_>_li]:pl-[0] ` +
    `[@media_(max-width:_860px)]:[&_>_li_>_div_>_b]:mt-[2px]`,
  "ci-ic": `w-[28px] h-[28px] grid place-items-center rounded-[8px] bg-fill [background-image:none] text-ink-2 ` +
    `[&_svg]:w-[15px] [&_svg]:h-[15px] ` +
    `[.ci-tips_li.care_&]:[background-color:color-mix(in_srgb,_var(--accent)_16%,_transparent)] ` +
    `[.ci-tips_li.care_&]:[background-image:none] [.ci-tips_li.care_&]:text-accent-ink ` +
    `[@media_(max-width:_860px)]:w-[24px] [@media_(max-width:_860px)]:h-[24px] ` +
    `[@media_(max-width:_860px)]:rounded-[7px]`,
  "ci-n": `not-italic font-semibold text-[13px] [line-height:1] font-sans tabular-nums`,
  "ci-skip": `hidden! [@media_(max-width:_860px)]:inline-flex! [@media_(max-width:_860px)]:mt-[12px]`,
  "ci-foot": `flex flex-wrap items-center [row-gap:8px] [column-gap:20px] mt-[28px]`,
  "ci-link": `[.ve_&]:inline-flex [.ve_&]:items-center [.ve_&]:[row-gap:5px] [.ve_&]:[column-gap:5px] [.ve_&]:min-h-[24px] ` +
    `[.ve_&]:pt-[0] [.ve_&]:pr-[0] [.ve_&]:pb-[0] [.ve_&]:pl-[0] [.ve_&]:[background-color:transparent] ` +
    `[.ve_&]:[background-image:none] [.ve_&]:[border-top-width:0] [.ve_&]:[border-top-style:none] ` +
    `[.ve_&]:[border-top-color:currentColor] [.ve_&]:[border-right-width:0] [.ve_&]:[border-right-style:none] ` +
    `[.ve_&]:[border-right-color:currentColor] [.ve_&]:[border-bottom-width:0] [.ve_&]:[border-bottom-style:none] ` +
    `[.ve_&]:[border-bottom-color:currentColor] [.ve_&]:[border-left-width:0] [.ve_&]:[border-left-style:none] ` +
    `[.ve_&]:[border-left-color:currentColor] [.ve_&]:text-ink [.ve_&]:not-italic [.ve_&]:font-semibold ` +
    `[.ve_&]:text-[13px] [.ve_&]:[line-height:normal] [.ve_&]:font-sans [.ve_&]:cursor-pointer ` +
    `[.ve_&.quiet]:text-ink-3 [.ve_&.quiet]:font-medium [&_span]:text-ink-3 [&_span]:font-medium ` +
    `[.ve_&:hover]:underline [.ve_&:hover]:[text-underline-offset:3px]`,
  "ci-vrow": `[.ve_&]:w-full [.ve_&]:flex [.ve_&]:items-center [.ve_&]:justify-start [.ve_&]:[row-gap:14px] ` +
    `[.ve_&]:[column-gap:14px] [.ve_&]:mt-[16px] [.ve_&]:pt-[8px] [.ve_&]:pr-[8px] [.ve_&]:pb-[8px] ` +
    `[.ve_&]:pl-[8px] [.ve_&]:[border-top-width:0] [.ve_&]:[border-top-style:none] ` +
    `[.ve_&]:[border-top-color:currentColor] [.ve_&]:[border-right-width:0] [.ve_&]:[border-right-style:none] ` +
    `[.ve_&]:[border-right-color:currentColor] [.ve_&]:[border-bottom-width:0] [.ve_&]:[border-bottom-style:none] ` +
    `[.ve_&]:[border-bottom-color:currentColor] [.ve_&]:[border-left-width:0] [.ve_&]:[border-left-style:none] ` +
    `[.ve_&]:[border-left-color:currentColor] [.ve_&]:rounded-[14px] [.ve_&]:bg-fill ` +
    `[.ve_&]:[background-image:none] [.ve_&]:text-ink [.ve_&]:text-left [.ve_&]:cursor-pointer ` +
    `[.ve_&]:[transition:background-color_0.15s_ease] [.ve_&:hover]:bg-fill-2 [.ve_&:hover]:[background-image:none] ` +
    `[.fc-body_&]:mt-[0] [.fc-body_&]:mr-[0] [.fc-body_&]:mb-[0] [.fc-body_&]:ml-[0] [.fc-body_&]:w-full ` +
    `[.fc-body_&]:justify-start [.fc-body_&]:text-left`,
  "ci-thumb": `relative [flex:none] w-[128px] [aspect-ratio:16_/_9] rounded-[9px] overflow-hidden [background-color:#111] ` +
    `[background-image:none] [&.plain]:[background-color:transparent] ` +
    `[&.plain]:[background-image:linear-gradient(135deg,_#2b2233,_#4a2a2a)] [&_img]:absolute [&_img]:[top:0] ` +
    `[&_img]:[right:0] [&_img]:[bottom:0] [&_img]:[left:0] [&_img]:w-full [&_img]:h-full [&_img]:[object-fit:cover]`,
  "ci-play": `absolute [left:50%] [top:50%] w-[34px] h-[24px] mt-[-12px] mr-[0] mb-[0] ml-[-17px] grid place-items-center ` +
    `rounded-[7px] [background-color:#e5443b] [background-image:none] [color:#fff] ` +
    `[box-shadow:0_3px_10px_rgba(0,_0,_0,_0.35)] [&_svg]:w-[12px] [&_svg]:h-[12px]`,
  "ci-vtext": `grid [row-gap:1px] [column-gap:1px] min-w-0 [&_b]:text-[14px] [&_b]:font-semibold [&_b]:[line-height:1.3] ` +
    `[&_b]:[display:-webkit-box] [&_b]:[-webkit-line-clamp:2] [&_b]:[-webkit-box-orient:vertical] ` +
    `[&_b]:overflow-hidden [&_small]:text-[12px] [&_small]:text-ink-3`,
  "ci-video": `mt-[24px] [.fc-body_&]:mt-[0] [.fc-body_&]:mr-[0] [.fc-body_&]:mb-[0] [.fc-body_&]:ml-[0] [.fc-body_&]:w-full ` +
    `[.fc-body_&]:justify-start [.fc-body_&]:text-left`,
  "ci-frame": `relative [aspect-ratio:16_/_9] rounded-[14px] overflow-hidden [background-color:#000] [background-image:none] ` +
    `[&_iframe]:absolute [&_iframe]:[top:0] [&_iframe]:[right:0] [&_iframe]:[bottom:0] [&_iframe]:[left:0] ` +
    `[&_iframe]:w-full [&_iframe]:h-full [&_iframe]:[border-top-width:0] [&_iframe]:[border-top-style:none] ` +
    `[&_iframe]:[border-top-color:currentColor] [&_iframe]:[border-right-width:0] ` +
    `[&_iframe]:[border-right-style:none] [&_iframe]:[border-right-color:currentColor] ` +
    `[&_iframe]:[border-bottom-width:0] [&_iframe]:[border-bottom-style:none] ` +
    `[&_iframe]:[border-bottom-color:currentColor] [&_iframe]:[border-left-width:0] ` +
    `[&_iframe]:[border-left-style:none] [&_iframe]:[border-left-color:currentColor]`,
  "ci-vmeta": `mt-[8px] mr-[0] mb-[0] ml-[0] text-[12px] text-ink-3 [&_a]:[color:inherit]`,
  "ci-src": `mt-[8px] mr-[0] mb-[0] ml-[0] [max-width:60ch] text-[12px] [line-height:1.5] text-ink-3 [&_a]:[color:inherit]`,
  "ve-checkin": `inline-flex items-center [row-gap:6px] [column-gap:6px] mt-[0] mr-[0] mb-[8px] ml-[0] pt-[3px] pr-[10px] ` +
    `pb-[3px] pl-[10px] rounded-[99px] ` +
    `[background-color:var(--accent-soft,_color-mix(in_srgb,_var(--accent)_14%,_transparent))] ` +
    `[background-image:none] [color:color-mix(in_srgb,_var(--accent)_80%,_var(--ink))] text-[12px] font-semibold ` +
    `[&::before]:[content:""] [&::before]:w-[6px] [&::before]:h-[6px] [&::before]:[border-radius:50%] ` +
    `[&::before]:bg-accent [&::before]:[background-image:none]`,
  "ve-items": `list-none mt-[0] mr-[0] mb-[0] ml-[0] pt-[0] pr-[0] pb-[0] pl-[0] [scroll-margin-top:16px] ` +
    `[.sd-deck_>_&]:relative [.sd-deck_>_&]:mt-[0] [.sd-deck_>_&]:mr-[0] [.sd-deck_>_&]:mb-[34px] ` +
    `[.sd-deck_>_&]:ml-[0] [.sd-deck_>_&]:isolate [.sd-deck_>_&:has(.sd-current)::before]:[content:none] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:absolute [.sd-deck_>_&:has(.sd-current)::before]:[top:24px] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[right:24px] [.sd-deck_>_&:has(.sd-current)::before]:[bottom:-15px] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[left:24px] [.sd-deck_>_&:has(.sd-current)::before]:[z-index:-1] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-top-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-top-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-top-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-right-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-right-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-right-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-bottom-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-bottom-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-bottom-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-left-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-left-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[border-left-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:rounded-[20px] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[background-color:var(--sd-edge)] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:[background-image:none] ` +
    `[.sd-deck_>_&:has(.sd-current)::before]:pointer-events-none ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[content:none] [.sd-deck_>_&:has(.sd-current)::after]:absolute ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[top:16px] [.sd-deck_>_&:has(.sd-current)::after]:[right:12px] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[bottom:-8px] [.sd-deck_>_&:has(.sd-current)::after]:[left:12px] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[z-index:-1] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-top-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-top-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-top-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-right-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-right-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-right-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-bottom-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-bottom-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-bottom-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-left-width:1px] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-left-style:solid] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[border-left-color:var(--hair)] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:rounded-[20px] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[background-color:var(--sd-edge)] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:[background-image:none] ` +
    `[.sd-deck_>_&:has(.sd-current)::after]:pointer-events-none [.sd-completed_&]:mt-[0] [.sd-completed_&]:mr-[0] ` +
    `[.sd-completed_&]:mb-[16px] [.sd-completed_&]:ml-[0]`,
  "ve-ptitle": `mt-[0] mr-[0] mb-[6px] ml-[0] flex items-baseline [row-gap:10px] [column-gap:10px] text-[15px] font-semibold ` +
    `text-ink [&_span]:text-[12px] [&_span]:font-medium [&_span]:text-ink-3 [&_span]:tabular-nums`,
  "ve-item": `relative mt-[0] mr-[-24px] mb-[4px] ml-[-24px] pt-[18px] pr-[24px] pb-[20px] pl-[56px] rounded-[16px] ` +
    `cursor-pointer [transition:background-color_0.2s_ease,_box-shadow_0.2s_ease] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:not(.on):not(.done):hover]:bg-fill ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&:not(.on):not(.done):hover]:[background-image:none] ` +
    `[&.on]:cursor-default [&.done]:cursor-default [&.done]:pt-[10px] [&.done]:pb-[12px] ` +
    `[@media_(max-width:_860px)]:mt-[0] [@media_(max-width:_860px)]:mr-[-16px] [@media_(max-width:_860px)]:mb-[4px] ` +
    `[@media_(max-width:_860px)]:ml-[-16px] [@media_(max-width:_860px)]:pt-[14px] ` +
    `[@media_(max-width:_860px)]:pr-[16px] [@media_(max-width:_860px)]:pb-[14px] ` +
    `[@media_(max-width:_860px)]:pl-[16px] [.ve_.sd-completed_&.done]:mt-[0] [.ve_.sd-completed_&.done]:mr-[0] ` +
    `[.ve_.sd-completed_&.done]:mb-[0] [.ve_.sd-completed_&.done]:ml-[0] [.ve_.sd-completed_&.done]:pt-[12px] ` +
    `[.ve_.sd-completed_&.done]:pr-[0] [.ve_.sd-completed_&.done]:pb-[12px] [.ve_.sd-completed_&.done]:pl-[28px] ` +
    `[.ve_.sd-completed_&.done]:rounded-[0]`,
  "ve-hint": `[.ve-item:not(.on)_&]:text-ink-3 [.ve-item.done_&]:mt-[4px] mt-[10px] mr-[0] mb-[0] ml-[0] text-[14px] ` +
    `[line-height:1.5] text-ink-2 flex [row-gap:8px] [column-gap:8px] items-baseline [max-width:60ch] ` +
    `[.ve_.sd-current_&]:block [.ve_.sd-current_&]:mt-[16px] [.ve_.sd-current_&]:text-[14px]`,
  "ve-kind": `mt-[0] mr-[0] mb-[8px] ml-[0] text-[12px] font-medium text-ink-3 flex items-center [row-gap:8px] ` +
    `[column-gap:8px] [.sd-current_&]:flex-wrap [.sd-current_&]:text-ink-2 [.sd-current_&]:mb-[14px] ` +
    `[.sd-queue-pick_&]:mt-[5px] [.sd-queue-pick_&]:mr-[0] [.sd-queue-pick_&]:mb-[0] [.sd-queue-pick_&]:ml-[0] ` +
    `[.sd-queue-pick_&]:flex-wrap`,
  "ve-tag": `inline-block text-[12px] font-semibold pt-[1px] pr-[8px] pb-[1px] pl-[8px] rounded-[99px] bg-ok-soft ` +
    `[background-image:none] text-ok [&.again]:bg-warn-soft [&.again]:[background-image:none] [&.again]:text-warn ` +
    `[&.hard]:bg-warn-soft [&.hard]:[background-image:none] [&.hard]:text-warn [&.next]:bg-accent-soft ` +
    `[&.next]:[background-image:none] [&.next]:text-accent-ink [&.start]:bg-ink [&.start]:[background-image:none] ` +
    `[&.start]:[color:var(--ve-paper)] [.ve-chapters_&]:text-[11.5px] [.ve-chapters_&]:tracking-[0] ` +
    `[.sd-completed_&]:text-ink-2 [.sd-completed_&]:bg-fill [.sd-completed_&]:[background-image:none]`,
  "ve-end": `mt-[24px] mb-0 w-full pt-[16px] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] text-[13px] ` +
    `[line-height:1.55] text-ink-2`,
  "ve-small": `text-[13px] text-ink-3 mt-[8px] mr-[0] mb-[0] ml-[0] [&_a]:text-ink-2`,
  "ve-err": `text-rec text-[13px] mt-[8px] mr-[0] mb-[0] ml-[0] [.ve-dock_>_&]:[grid-column:1_/_-1] ` +
    `[.ve-dock_>_&]:[justify-self:start]`,
  "ve-example": `mt-[12px] max-w-[420px]`,
  "ve-take": `mt-[16px] pt-[14px] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] grid ` +
    `[row-gap:10px] [column-gap:10px] cursor-default [scroll-margin-top:24px] [&_.ab]:grid [&_.ab]:[row-gap:8px] ` +
    `[&_.ab]:[column-gap:8px]`,
  "ve-take-head": `flex items-center [row-gap:10px] [column-gap:10px] text-[13px]`,
  "ve-ab-pick": `flex flex-wrap items-center [row-gap:6px] [column-gap:6px] text-[13px] text-ink-3 [&_>_span]:mr-[2px] ` +
    `[.ve_&_button]:h-[28px] [.ve_&_button]:pt-[0] [.ve_&_button]:pr-[11px] [.ve_&_button]:pb-[0] ` +
    `[.ve_&_button]:pl-[11px] [.ve_&_button]:[border-top-width:0] [.ve_&_button]:[border-top-style:none] ` +
    `[.ve_&_button]:[border-top-color:currentColor] [.ve_&_button]:[border-right-width:0] ` +
    `[.ve_&_button]:[border-right-style:none] [.ve_&_button]:[border-right-color:currentColor] ` +
    `[.ve_&_button]:[border-bottom-width:0] [.ve_&_button]:[border-bottom-style:none] ` +
    `[.ve_&_button]:[border-bottom-color:currentColor] [.ve_&_button]:[border-left-width:0] ` +
    `[.ve_&_button]:[border-left-style:none] [.ve_&_button]:[border-left-color:currentColor] ` +
    `[.ve_&_button]:rounded-[99px] [.ve_&_button]:bg-fill [.ve_&_button]:[background-image:none] ` +
    `[.ve_&_button]:text-ink-2 [.ve_&_button]:not-italic [.ve_&_button]:font-medium [.ve_&_button]:text-[13px] ` +
    `[.ve_&_button]:[line-height:normal] [.ve_&_button]:font-sans [&_select]:h-[28px] [&_select]:pt-[0] ` +
    `[&_select]:pr-[8px] [&_select]:pb-[0] [&_select]:pl-[11px] [&_select]:[border-top-width:0] ` +
    `[&_select]:[border-top-style:none] [&_select]:[border-top-color:currentColor] ` +
    `[&_select]:[border-right-width:0] [&_select]:[border-right-style:none] ` +
    `[&_select]:[border-right-color:currentColor] [&_select]:[border-bottom-width:0] ` +
    `[&_select]:[border-bottom-style:none] [&_select]:[border-bottom-color:currentColor] ` +
    `[&_select]:[border-left-width:0] [&_select]:[border-left-style:none] ` +
    `[&_select]:[border-left-color:currentColor] [&_select]:rounded-[99px] [&_select]:bg-fill ` +
    `[&_select]:[background-image:none] [&_select]:text-ink-2 [&_select]:not-italic [&_select]:font-medium ` +
    `[&_select]:text-[13px] [&_select]:[line-height:normal] [&_select]:font-sans [&_select]:max-w-[180px] ` +
    `[.ve_&_button[aria-pressed="true"]]:bg-accent-soft [.ve_&_button[aria-pressed="true"]]:[background-image:none] ` +
    `[.ve_&_button[aria-pressed="true"]]:text-accent-ink ` +
    `[@media_(hover:_hover)]:[.ve_&_button:hover:not([aria-pressed="true"])]:bg-fill-2 ` +
    `[@media_(hover:_hover)]:[.ve_&_button:hover:not([aria-pressed="true"])]:[background-image:none] ` +
    `[@media_(hover:_hover)]:[.ve_&_button:hover:not([aria-pressed="true"])]:text-ink ` +
    `[@media_(hover:_hover)]:[&_select:hover]:bg-fill-2 ` +
    `[@media_(hover:_hover)]:[&_select:hover]:[background-image:none] ` +
    `[@media_(hover:_hover)]:[&_select:hover]:text-ink`,
  "ve-ab-all": `[margin-left:auto] text-ink-2 font-medium no-underline [&::after]:[content:"_→"] [&:hover]:text-ink`,
  "ve-take-actions": `flex flex-wrap [row-gap:6px] [column-gap:6px]`,
  "ve-result": `mt-[16px] grid [row-gap:12px] [column-gap:12px] cursor-default [scroll-margin-top:24px] ` +
    `[.sd-controls_&]:mt-[0] [.sd-controls_&]:mr-[0] [.sd-controls_&]:mb-[0] [.sd-controls_&]:ml-[0]`,
  "ve-details": `[background-color:transparent] [background-image:none] [&_>_summary]:min-h-0 [&_>_summary]:pt-[4px] ` +
    `[&_>_summary]:pr-[0] [&_>_summary]:pb-[4px] [&_>_summary]:pl-[0] [&_>_summary]:[width:fit-content] ` +
    `[&_>_summary]:text-[13px] [&_>_summary]:font-semibold [&_>_summary]:text-ink-3 [&_>_summary:hover]:text-ink-2 ` +
    `[&[open]_>_summary]:mb-[10px]`,
  "ve-sum": `[.ve-details_>_summary_&]:ml-[4px] [.ve-details_>_summary_&]:font-medium [.ve-details_>_summary_&]:text-ink-2 ` +
    `[.ve-details_>_summary_&]:tabular-nums [.ve-details_>_summary_&::before]:[content:"·"] ` +
    `[.ve-details_>_summary_&::before]:mr-[8px] [.ve-details_>_summary_&::before]:text-ink-3`,
  "ve-ghost": `[.ve_&]:inline-flex [.ve_&]:items-center [.ve_&]:[row-gap:6px] [.ve_&]:[column-gap:6px] [.ve_&]:pt-[6px] ` +
    `[.ve_&]:pr-[11px] [.ve_&]:pb-[6px] [.ve_&]:pl-[11px] [.ve_&]:rounded-[9px] [.ve_&]:text-[13px] ` +
    `[.ve_&]:font-medium [.ve_&]:text-ink-2 [.ve_&]:bg-fill [.ve_&]:[background-image:none] ` +
    `[.ve_&]:whitespace-nowrap [.ve_&:hover:not(:disabled)]:bg-fill-2 ` +
    `[.ve_&:hover:not(:disabled)]:[background-image:none] [.ve_&:hover:not(:disabled)]:text-ink ` +
    `[.ve_&[aria-pressed="true"]]:text-accent-ink [.ve_&[aria-pressed="true"]]:bg-accent-soft ` +
    `[.ve_&[aria-pressed="true"]]:[background-image:none] [.ve_&_svg]:w-[14px] [.ve_&_svg]:h-[14px] ` +
    `[.ve_&.ouch:hover:not(:disabled)]:text-rec`,
  "ve-endbox": `grid [row-gap:12px] [column-gap:12px] mb-[28px]`,
  "ve-q": `font-semibold text-ink mt-[0] mr-[0] mb-[0] ml-[0] [.ve-ba-q_&]:mt-[0] [.ve-ba-q_&]:mr-[0] ` +
    `[.ve-ba-q_&]:mb-[8px] [.ve-ba-q_&]:ml-[0]`,
  "ve-feel": `grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] [row-gap:8px] [column-gap:8px] [.ve_&_button]:pt-[12px] ` +
    `[.ve_&_button]:pr-[12px] [.ve_&_button]:pb-[12px] [.ve_&_button]:pl-[12px] [.ve_&_button]:rounded-[12px] ` +
    `[.ve_&_button]:bg-fill [.ve_&_button]:[background-image:none] [.ve_&_button]:font-semibold ` +
    `[.ve_&_button:hover]:bg-fill-2 [.ve_&_button:hover]:[background-image:none] [.ve_&_button.hurt:hover]:text-rec ` +
    `[@media_(max-width:_860px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]`,
  // A note button also carries ve-ghost; its compact padding must win that composition.
  "ve-note": `mt-[0] mr-[0] mb-[0] ml-[0] pt-[12px] pr-[14px] pb-[12px] pl-[14px] rounded-[12px] bg-ok-soft ` +
    `[background-image:none] text-ok font-semibold [.ve_&.ve-note]:pt-[0] [.ve_&]:pr-[13px] [.ve_&.ve-note]:pb-[0] ` +
    `[.ve_&]:pl-[11px] [.ve_&]:h-[36px] [.ve_&]:tabular-nums [.ve_&_svg]:w-[15px] [.ve_&_svg]:h-[15px] ` +
    `[.ve_&[aria-pressed="true"]_svg]:[animation:ve-note_0.9s_ease-in-out_infinite] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve_&[aria-pressed="true"]_svg]:[animation:none]`,
  "ve-now": `[grid-area:now] flex items-center justify-between [row-gap:12px] [column-gap:12px] min-w-[84px] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve-dock_&]:[animation:none]! [.ve_.ve-dock_&]:justify-start ` +
    `[.ve_.ve-dock_&]:min-w-0 [.ve_.ve-dock.idle_&]:hidden`,
  "ve-now-read": `[&_b]:block [&_b]:[min-width:3.4ch] [&_b]:not-italic [&_b]:[font-weight:300] [&_b]:text-[30px] ` +
    `[&_b]:[line-height:1] [&_b]:font-sans [&_b]:[letter-spacing:-0.04em] [&_b]:tabular-nums ` +
    `[&_b]:whitespace-nowrap [&_b]:text-ink [&_b]:[transition:color_0.4s_ease,_opacity_0.4s_ease] ` +
    `[&.held_b]:[opacity:0.45] [&_>_span]:[transition:color_0.4s_ease] [&_>_span]:block [&_>_span]:mt-[5px] ` +
    `[&_>_span]:text-[12px] [&_>_span]:text-ink-3 [&_>_span]:whitespace-nowrap [&_b_small]:not-italic ` +
    `[&_b_small]:font-medium [&_b_small]:text-[12px] [&_b_small]:[line-height:normal] [&_b_small]:font-sans ` +
    `[&_b_small]:tracking-[0] [&_b_small]:text-ink-3 [&_b_small]:ml-[4px] [.ve-dock.eyes-off_&]:[visibility:hidden] ` +
    `[.ve_.ve-dock_&_b]:text-[26px] [.ve_.ve-dock_&_>_span]:mt-[3px]`,
  "ve-state": `hidden items-center [row-gap:7px] [column-gap:7px] h-[28px] pt-[0] pr-[11px] pb-[0] pl-[10px] rounded-[99px] ` +
    `[background-color:var(--ve-card)] [background-image:none] [box-shadow:0_0_0_1px_var(--hair)] not-italic ` +
    `font-medium text-[12px] [line-height:normal] font-sans text-ink-2 whitespace-nowrap [&_i]:w-[7px] ` +
    `[&_i]:h-[7px] [&_i]:[border-radius:50%] [&_i]:bg-ink-3 [&_i]:[background-image:none] [&_i]:[opacity:0.5] ` +
    `[&.rec]:text-rec [&.error]:text-rec [&.rec_i]:bg-rec [&.rec_i]:[background-image:none] [&.rec_i]:[opacity:1] ` +
    `[&.rec_i]:[animation:ve-pulse_1.4s_ease-in-out_infinite] [&.live_i]:bg-accent ` +
    `[&.live_i]:[background-image:none] [&.live_i]:[opacity:1] [&.saved_i]:bg-ok ` +
    `[&.saved_i]:[background-image:none] [&.saved_i]:[opacity:1] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[&.rec_i]:[animation:none] [.ve_.ve-dock_&]:hidden`,
  "ve-scope": `[grid-area:scope] relative h-[64px] rounded-[14px] [background-color:var(--ve-card)] [background-image:none] ` +
    `[box-shadow:0_0_0_1px_var(--hair)] overflow-hidden [&_canvas]:absolute [&_canvas]:[top:0] [&_canvas]:[right:0] ` +
    `[&_canvas]:[bottom:0] [&_canvas]:[left:0] [&_canvas]:w-full [&_canvas]:h-full ` +
    `[.ve-dock.eyes-off_&_canvas]:[visibility:hidden] [@media_(max-width:_860px)]:h-[56px] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve-dock_&]:[animation:none]! ` +
    `[&_.pianoroll]:[background-color:transparent] [&_.pianoroll]:[background-image:none] ` +
    `[&_.pianoroll]:rounded-[0] [.ve_.ve-dock_&]:h-[96px] ` +
    `[.ve_.ve-dock_&]:[animation:ve-rise_0.25s_var(--ease)_both] [.ve_.ve-dock.idle_&]:hidden ` +
    `[.ve-studio-rec_.ve-dock_&]:h-[220px] [.ve-studio-rec_.ve-dock.idle_&]:block ` +
    `[.ve-studio-rec_.ve-dock.folded_&]:hidden`,
  "ve-scope-idle": `absolute [left:50%] [top:50%] [transform:translate(-50%,_-50%)] [max-width:calc(100%_-_100px)] text-ink-3 ` +
    `text-[13px] whitespace-nowrap overflow-hidden text-ellipsis`,
  "ve-inrange": `[.ve-scope_&]:absolute [.ve-scope_&]:[top:8px] [.ve-scope_&]:[left:48px] ` +
    `[@media_(max-width:_1100px)]:[.ve-scope_&]:[left:8px] [.ve-dock.eyes-off_.ve-scope_&]:[visibility:hidden] ` +
    `text-[12px] font-semibold pt-[3px] pr-[9px] pb-[3px] pl-[9px] rounded-[99px] bg-accent-soft ` +
    `[background-image:none] text-accent-ink whitespace-nowrap [&.ok]:bg-ok-soft [&.ok]:[background-image:none] ` +
    `[&.ok]:text-ok`,
  "ve-stats": `[.ve-dock.eyes-off_&]:[visibility:hidden] [grid-area:stats] grid ` +
    `[grid-template-columns:repeat(3,_minmax(72px,_auto))] ` +
    `[@media_(max-width:_860px)]:[grid-template-columns:repeat(3,_minmax(0,_1fr))] ` +
    `[@media_(max-width:_860px)]:[.ve-dock.quiet_&]:hidden ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve-dock_&]:[animation:none]! [.ve_.ve-dock_&]:hidden ` +
    `[.ve-studio-rec_.ve-dock.folded_&]:hidden [.ve-studio-rec_.ve-dock_&]:grid ` +
    `[.ve-studio-rec_.ve-dock_&]:[grid-template-columns:repeat(3,_minmax(0,_1fr))] ` +
    `[.ve-studio-rec_.ve-dock_&]:[grid-area:auto_/_1_/_auto_/_-1]`,
  "ve-eyes": `absolute [left:50%] [top:50%] [transform:translate(-50%,_-50%)] [max-width:calc(100%_-_32px)] text-ink-2 ` +
    `text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis`,
  "ve-stat": `pt-[2px] pr-[14px] pb-[2px] pl-[14px] [border-left-width:1px] [border-left-style:solid] ` +
    `[border-left-color:var(--hair)] [&_>_span]:block [&_>_span]:text-[12px] [&_>_span]:font-medium ` +
    `[&_>_span]:text-ink-3 [&_>_span]:whitespace-nowrap [&_>_span]:mb-[3px] [&_b]:block [&_b]:not-italic ` +
    `[&_b]:font-medium [&_b]:text-[17px] [&_b]:[line-height:1.2] [&_b]:font-sans [&_b]:[letter-spacing:-0.025em] ` +
    `[&_b]:tabular-nums [&_b]:whitespace-nowrap [&_b]:text-ink [&_b_small]:text-[12px] [&_b_small]:font-medium ` +
    `[&_b_small]:text-ink-3 [&_b_small]:tracking-[0] [&_b_small]:ml-[3px] [&_i]:block [&_i]:min-h-[17px] ` +
    `[&_i]:not-italic [&_i]:font-normal [&_i]:text-[12px] [&_i]:[line-height:1.5] [&_i]:font-sans [&_i]:text-ink-3 ` +
    `[&_i]:whitespace-nowrap [@media_(max-width:_860px)]:pt-[0] [@media_(max-width:_860px)]:pr-[0] ` +
    `[@media_(max-width:_860px)]:pb-[0] [@media_(max-width:_860px)]:pl-[10px] ` +
    `[@media_(max-width:_860px)]:[&:first-child]:[border-left-width:0] ` +
    `[@media_(max-width:_860px)]:[&:first-child]:[border-left-style:none] ` +
    `[@media_(max-width:_860px)]:[&:first-child]:[border-left-color:currentColor] ` +
    `[@media_(max-width:_860px)]:[&:first-child]:pl-[0] [@media_(max-width:_860px)]:[&_>_span]:whitespace-normal`,
  "ve-none": `text-ink-3 [opacity:0.5] [font-weight:300]`,
  "ve-rec": `[.ve_&]:[grid-area:rec] [.ve_&]:h-[44px] [.ve_&]:pt-[0] [.ve_&]:pr-[16px] [.ve_&]:pb-[0] [.ve_&]:pl-[14px] ` +
    `[.ve_&]:rounded-[99px] [.ve_&]:inline-flex [.ve_&]:items-center [.ve_&]:justify-center [.ve_&]:[row-gap:10px] ` +
    `[.ve_&]:[column-gap:10px] [.ve_&]:bg-ink [.ve_&]:[background-image:none] [.ve_&]:[color:var(--ve-paper)] ` +
    `[.ve_&]:text-[14px] [.ve_&]:font-semibold [.ve_&]:whitespace-nowrap ` +
    `[.ve_&]:[box-shadow:0_1px_2px_rgba(0,_0,_0,_0.12),_0_10px_24px_-12px_rgba(0,_0,_0,_0.5)] ` +
    `[.ve_&]:[transition:transform_0.16s_var(--ease),_background-color_0.2s_ease,_box-shadow_0.2s_ease] ` +
    `[&_i]:[flex:none] [&_i]:w-[12px] [&_i]:h-[12px] [&_i]:[border-radius:50%] [&_i]:bg-rec ` +
    `[&_i]:[background-image:none] [&_i]:[box-shadow:0_0_0_3px_rgba(255,_66,_85,_0.28)] ` +
    `[&_i]:[transition:border-radius_0.25s_var(--ease),_background-color_0.2s_ease] [.ve_&_kbd]:[color:inherit] ` +
    `[.ve_&_kbd]:[opacity:0.6] [.ve_&_kbd]:[border-color:color-mix(in_srgb,_currentColor_35%,_transparent)] ` +
    `[.ve_&_kbd]:ml-[2px] [.ve_&.on]:bg-rec [.ve_&.on]:[background-image:none] [.ve_&.on]:[color:#fff] ` +
    `[.ve_&.on]:[box-shadow:0_1px_2px_rgba(0,_0,_0,_0.12),_0_10px_26px_-10px_rgba(255,_66,_85,_0.7)] ` +
    `[&.on_i]:rounded-[3px] [&.on_i]:[background-color:#fff] [&.on_i]:[background-image:none] ` +
    `[&.on_i]:[box-shadow:none] [&.on_i]:w-[11px] [&.on_i]:h-[11px] [.ve_&:disabled]:[opacity:1] ` +
    `[.ve_&:disabled]:[background-color:var(--ve-card)] [.ve_&:disabled]:[background-image:none] ` +
    `[.ve_&:disabled]:text-ink-3 [.ve_&:disabled]:[box-shadow:0_0_0_1px_var(--hair)] [&:disabled_i]:bg-ink-3 ` +
    `[&:disabled_i]:[background-image:none] [&:disabled_i]:[box-shadow:none] [&:disabled_i]:[opacity:0.5] ` +
    `[.ve_&:active:not(:disabled)]:[transform:scale(0.98)] [.ve_&:focus-visible]:[outline:2px_solid_var(--accent)] ` +
    `[.ve_&:focus-visible]:[outline-offset:3px] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled):not(.on)]:[background-color:color-mix(in_srgb,_var(--ink)_86%,_var(--ve-paper))] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled):not(.on)]:[background-image:none] ` +
    `[@media_(max-width:_860px)]:[.ve_&_kbd]:hidden ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[&_i]:[transition:none] [.ve_.ve-dock_&]:h-[44px] ` +
    `[.ve_.ve-dock_&]:pt-[0] [.ve_.ve-dock_&]:pr-[20px] [.ve_.ve-dock_&]:pb-[0] [.ve_.ve-dock_&]:pl-[16px] ` +
    `[.ve_.ve-dock_&]:[row-gap:9px] [.ve_.ve-dock_&]:[column-gap:9px] [.ve_.ve-dock_&]:[justify-self:start] ` +
    `[.ve_.ve-dock_&]:bg-ink [.ve_.ve-dock_&]:[background-image:none] [.ve_.ve-dock_&]:[color:var(--ve-paper)] ` +
    `[.ve_.ve-dock_&]:font-semibold [.ve_.ve-dock_&]:[box-shadow:none] [.ve_.ve-dock_&_i]:w-[9px] ` +
    `[.ve_.ve-dock_&_i]:h-[9px] [.ve_.ve-dock_&_i]:bg-rec [.ve_.ve-dock_&_i]:[background-image:none] ` +
    `[.ve_.ve-dock_&_i]:[box-shadow:none] [.ve_.ve-dock_&_kbd]:hidden ` +
    `[.ve_.ve-dock_&:hover:not(:disabled)]:[background-color:color-mix(in_srgb,_var(--ink)_85%,_var(--ve-paper))] ` +
    `[.ve_.ve-dock_&:hover:not(:disabled)]:[background-image:none] [.ve_.ve-dock_&.on]:bg-rec ` +
    `[.ve_.ve-dock_&.on]:[background-image:none] [.ve_.ve-dock_&.on]:[color:#fff] ` +
    `[.ve_.ve-dock_&.on]:[box-shadow:0_6px_18px_-8px_rgba(255,_66,_85,_0.8)] ` +
    `[.ve_.ve-dock_&.on_i]:[background-color:#fff] [.ve_.ve-dock_&.on_i]:[background-image:none] ` +
    `[.ve_.ve-dock_&.on:hover:not(:disabled)]:[background-color:color-mix(in_srgb,_var(--rec)_88%,_#000)] ` +
    `[.ve_.ve-dock_&.on:hover:not(:disabled)]:[background-image:none] [.ve_.ve-dock_&:disabled]:bg-fill-2 ` +
    `[.ve_.ve-dock_&:disabled]:[background-image:none] [.ve_.ve-dock_&:disabled]:text-ink-3 ` +
    `[.ve_.ve-dock_&:disabled]:[box-shadow:none] [.ve_.ve-dock_&:disabled_i]:bg-ink-3 ` +
    `[.ve_.ve-dock_&:disabled_i]:[background-image:none] [.ve-studio-rec_.ve-dock_&]:h-[52px] ` +
    `[.ve-studio-rec_.ve-dock_&]:pt-[0] [.ve-studio-rec_.ve-dock_&]:pr-[24px] [.ve-studio-rec_.ve-dock_&]:pb-[0] ` +
    `[.ve-studio-rec_.ve-dock_&]:pl-[20px] [.ve-studio-rec_.ve-dock_&]:text-[16px]`,
  "ve-clock": `[.ve-rec_&]:not-italic [.ve-rec_&]:font-medium [.ve-rec_&]:[font-size:0.95em] [.ve-rec_&]:[line-height:normal] ` +
    `[.ve-rec_&]:font-sans [.ve-rec_&]:tabular-nums [.ve-rec_&]:[opacity:0.85]`,
  "ve-art": `hidden [.ve_.ve-dock_&]:hidden`,
  "ve-cat": `absolute [top:0] [right:0] [bottom:0] [left:0] overflow-hidden [container-type:size] [&_img]:absolute ` +
    `[&_img]:[left:4.78%] [&_img]:[top:73.22%] [&_img]:[width:19.74%] [&_img]:[height:17.53%] ` +
    `[&_.body]:[transform-origin:50.7%_81.9%] [&_.body]:[animation:ve-breathe_3.8s_ease-in-out_infinite] ` +
    `[&::after]:[content:""] [&::after]:absolute [&::after]:[top:0] [&::after]:[right:0] [&::after]:[bottom:0] ` +
    `[&::after]:[left:0] [&::after]:pointer-events-none [&::after]:[background-color:transparent] ` +
    `[&::after]:[background-image:radial-gradient(ellipse_78%_44%_at_50%_36%,_rgba(18,_12,_28,_0.68),_rgba(18,_12,_28,_0)_100%),_linear-gradient(to_bottom,_rgba(18,_12,_28,_0.35),_rgba(18,_12,_28,_0)_60%)] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[&_img]:[animation:none]! ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve-dock_&]:[animation:none]! [.ve_.ve-dock_&]:hidden`,
  "ve-cat-stage": `[--s:max(calc(100cqw_/_440),_calc(100cqh_/_700))] absolute [left:0] [bottom:0] [width:calc(1672_*_var(--s))] ` +
    `[height:calc(941_*_var(--s))] [background-size:100%_100%] [background-repeat:no-repeat]`,
  "ve-zzz": `absolute [left:18.9%] [top:74.6%] flex [row-gap:2px] [column-gap:2px] [color:#fff] not-italic font-bold ` +
    `text-[17px] [line-height:normal] font-sans ` +
    `[text-shadow:0_1px_2px_rgba(60,_20,_50,_0.55),_0_2px_12px_rgba(60,_20,_50,_0.45)] [&_i]:not-italic ` +
    `[&_i]:[opacity:0] [&_i]:[animation:ve-z_3.6s_ease-out_infinite] [&_i:nth-child(2)]:[font-size:1.25em] ` +
    `[&_i:nth-child(2)]:[animation-delay:1.2s] [&_i:nth-child(3)]:[font-size:1.55em] ` +
    `[&_i:nth-child(3)]:[animation-delay:2.4s] [@media_(prefers-reduced-motion:_reduce)]:[&_i]:[animation:none]!`,
  "ve-art-copy": `[grid-area:copy] mt-[0] mr-[0] mb-[0] ml-[0] grid [row-gap:10px] [column-gap:10px] [justify-items:center] ` +
    `text-center [color:#fff] [&_b]:not-italic [&_b]:font-bold [&_b]:text-[44px] [&_b]:[line-height:1] ` +
    `[&_b]:font-sans [&_b]:[letter-spacing:-0.05em] [&_b]:[text-shadow:0_2px_20px_rgba(18,_12,_28,_0.4)] ` +
    `[&_span]:[max-width:34ch] [&_span]:text-[15px] [&_span]:[line-height:1.45] ` +
    `[&_span]:[color:rgba(255,_255,_255,_0.88)] [&_span]:[text-shadow:0_1px_10px_rgba(18,_12,_28,_0.6)]`,
  "ve-dock-sub": `[grid-area:sub] flex items-center flex-wrap [row-gap:6px] [column-gap:16px] text-[12px] text-ink-3 ` +
    `min-h-[30px] [@media_(max-width:_860px)]:[.ve-dock.quiet_&]:hidden [.ve_.ve-dock_&]:min-h-0 ` +
    `[.ve_.ve-dock_&]:[row-gap:4px] [.ve_.ve-dock_&]:[column-gap:12px] [.ve_.ve-dock_&]:justify-start ` +
    `[.ve_.ve-dock_&_>_*]:ml-[0] [.ve_.ve-dock.idle_&]:flex-nowrap ` +
    `[@media_(max-width:_700px)]:[.ve_.sd-controls_.ve-dock.idle_&]:flex-wrap ` +
    `[@media_(max-width:_560px)]:[.fc-ve_.ve-dock.idle_&]:flex-wrap`,
  "ve-dock-msg": `inline-flex items-center [row-gap:5px] [column-gap:5px] [&:empty]:hidden [@media_(max-width:_860px)]:hidden ` +
    `[&.quiet-mic]:text-warn [&.quiet-mic]:font-medium [.ve_.ve-dock.idle_&]:hidden`,
  "ve-sp": `[flex:1] [.ve_.ve-dock_&]:hidden`,
  "ve-mic-help": `[grid-column:1_/_-1] flex items-center [row-gap:12px] [column-gap:16px] flex-wrap pt-[12px] pr-[14px] ` +
    `pb-[12px] pl-[14px] rounded-[12px] bg-warn-soft [background-image:none] [&_p]:[flex:1_1_260px] [&_p]:mt-[0] ` +
    `[&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:text-[14px] [&_p]:[line-height:1.5] [&_p]:text-ink-2 ` +
    `[&_b]:text-ink [&_b]:font-semibold [.ve_&_button]:h-[34px] [.ve_&_button]:pt-[0] [.ve_&_button]:pr-[14px] ` +
    `[.ve_&_button]:pb-[0] [.ve_&_button]:pl-[14px] [.ve_&_button]:rounded-[99px] [.ve_&_button]:bg-ink ` +
    `[.ve_&_button]:[background-image:none] [.ve_&_button]:[color:var(--ve-paper)] [.ve_&_button]:text-[13px] ` +
    `[.ve_&_button]:font-semibold`,
  "ve-cover": `[height:clamp(128px,_19vh,_190px)] [background-size:cover] [background-position:center_40%] ` +
    `[@media_(max-width:_860px)]:h-[110px]`,
  "ve-home-col": `[--content-width:960px] [.ve-col&]:[padding-top:var(--space-8)]`,
  "ve-md": `w-full [&:not(.md)]:text-ink-2 [&:not(.md)]:text-[16px] [&:not(.md)]:[line-height:1.7] ` +
    `[&:not(.md)_>_h2]:[margin-top:var(--space-8)] [&:not(.md)_>_h2]:mr-[0] ` +
    `[&:not(.md)_>_h2]:[margin-bottom:var(--space-4)] [&:not(.md)_>_h2]:ml-[0] ` +
    `[&:not(.md)_>_h2]:[font-size:var(--type-section)] [&:not(.md)_>_h2]:text-ink [.ve-md_+_&]:mt-[8px] ` +
    `[.ve-start-card_+_&]:mt-[40px] [.ve-practice_+_&]:mt-[40px]`,
  "ve-chapters": `list-none pt-[0]! pr-[0]! pb-[0]! pl-[0]! mt-[0] mr-[0] mb-[40px] ml-[0] grid [row-gap:2px] [column-gap:2px] ` +
    `[&_li]:mt-[0] [&_li]:mr-[0] [&_li]:mb-[0] [&_li]:ml-[0] [&_li]:pt-[0] [&_li]:pr-[0] [&_li]:pb-[0] ` +
    `[&_li]:pl-[0] [&_a]:flex [&_a]:items-center [&_a]:[row-gap:14px] [&_a]:[column-gap:14px] [&_a]:pt-[10px] ` +
    `[&_a]:pr-[12px] [&_a]:pb-[10px] [&_a]:pl-[12px] [&_a]:mt-[0] [&_a]:mr-[-12px] [&_a]:mb-[0] [&_a]:ml-[-12px] ` +
    `[&_a]:rounded-[12px] [&_a]:[color:inherit] [&_a]:no-underline [&_a]:[transition:background-color_0.12s_ease] ` +
    `[&_.n]:[flex:none] [&_.n]:w-[26px] [&_.n]:h-[26px] [&_.n]:[border-radius:50%] [&_.n]:grid ` +
    `[&_.n]:place-items-center [&_.n]:bg-fill-2 [&_.n]:[background-image:none] [&_.n]:not-italic ` +
    `[&_.n]:font-semibold [&_.n]:text-[12px] [&_.n]:[line-height:normal] [&_.n]:font-sans [&_.n]:text-ink-2 ` +
    `[&_.t]:[flex:1] [&_.t]:min-w-0 [&_.t]:grid [&_.t_b]:text-[15px] [&_.t_b]:font-semibold [&_.t_b]:text-ink ` +
    `[&_.t_b]:flex [&_.t_b]:flex-wrap [&_.t_b]:items-center [&_.t_b]:[row-gap:4px] [&_.t_b]:[column-gap:8px] ` +
    `[&_.t_small]:text-[13px] [&_.t_small]:text-ink-3 [&_.c]:text-[12px] [&_.c]:text-ink-3 [&_.c]:tabular-nums ` +
    `[.ve-part-group_&]:mb-[0] [.ve-part-group:last-of-type_&]:mb-[40px] [&_a.next_.n]:bg-accent ` +
    `[&_a.next_.n]:[background-image:none] [&_a.next_.n]:text-accent-on ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&_a:hover]:bg-fill ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[&_a:hover]:[background-image:none]`,
  "ve-edition": `[.ve-md_&]:mt-[-12px] [.ve-md_&]:mr-[0] [.ve-md_&]:mb-[40px] [.ve-md_&]:ml-[0] [.ve-md_&]:text-[13px] ` +
    `[.ve-md_&]:[line-height:1.5] [.ve-md_&]:text-ink-3`,
  "ve-part-h": `[.ve-md_&]:mt-[24px] [.ve-md_&]:mr-[0] [.ve-md_&]:mb-[6px] [.ve-md_&]:ml-[0] [.ve-md_&]:text-[13px] ` +
    `[.ve-md_&]:font-semibold [.ve-md_&]:text-ink-3 [.ve-md_&]:tracking-[0] ` +
    `[.ve-part-group:first-of-type_&]:mt-[12px]`,
  "ve-start-card": `[max-width:none] [margin-top:var(--space-6)] mr-[0] [margin-bottom:var(--space-2)] ml-[0] ` +
    `[padding-top:var(--space-6)] [padding-right:var(--space-6)] [padding-bottom:var(--space-6)] ` +
    `[padding-left:var(--space-6)] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] ` +
    `[border-right-width:1px] [border-right-style:solid] [border-right-color:var(--hair)] [border-bottom-width:1px] ` +
    `[border-bottom-style:solid] [border-bottom-color:var(--hair)] [border-left-width:1px] ` +
    `[border-left-style:solid] [border-left-color:var(--hair)] rounded-panel bg-panel [background-image:none] grid ` +
    `[grid-template-columns:auto_minmax(0,_1fr)] [align-items:start] [row-gap:4px] [column-gap:14px] ` +
    `[&_.ic]:[grid-row:1_/_3] [&_.ic]:w-[32px] [&_.ic]:h-[32px] [&_.ic]:[border-radius:50%] [&_.ic]:grid ` +
    `[&_.ic]:place-items-center [&_.ic]:bg-accent-soft [&_.ic]:[background-image:none] [&_.ic]:text-accent-ink ` +
    `[&_.ic_svg]:w-[16px] [&_.ic_svg]:h-[16px] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] ` +
    `[&_p]:text-[15px] [&_p]:[line-height:1.6] [&_p]:text-ink-2 [&_b]:text-ink [&_b]:font-semibold ` +
    `[&_.btn-primary]:[justify-self:start] [&_.btn-primary]:[margin-top:var(--space-3)]`,
  "ve-practice": `[max-width:none] [margin-top:var(--space-6)] mr-[0] [margin-bottom:var(--space-2)] ml-[0] ` +
    `[padding-top:var(--space-6)] [padding-right:var(--space-6)] [padding-bottom:var(--space-6)] ` +
    `[padding-left:var(--space-6)] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] ` +
    `[border-right-width:1px] [border-right-style:solid] [border-right-color:var(--hair)] [border-bottom-width:1px] ` +
    `[border-bottom-style:solid] [border-bottom-color:var(--hair)] [border-left-width:1px] ` +
    `[border-left-style:solid] [border-left-color:var(--hair)] rounded-panel bg-panel [background-image:none] grid ` +
    `[row-gap:18px] [column-gap:18px]`,
  "ve-next": `flex items-center justify-between flex-wrap [row-gap:10px] [column-gap:16px] pb-[16px] ` +
    `[border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--hair)] [&:only-child]:pb-[0] ` +
    `[&:only-child]:[border-bottom-width:0] [&:only-child]:[border-bottom-style:none] ` +
    `[&:only-child]:[border-bottom-color:currentColor] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] ` +
    `[&_p]:text-[17px] [&_p]:[line-height:1.45] [&_p]:text-ink-2 [&_b]:text-ink [&_b]:font-semibold`,
  "ve-days": `flex items-center justify-between [row-gap:16px] [column-gap:16px] flex-wrap [&_p]:mt-[0] [&_p]:mr-[0] ` +
    `[&_p]:mb-[0] [&_p]:ml-[0] [&_p]:grid [&_b]:text-[17px] [&_b]:font-semibold [&_b]:[letter-spacing:-0.02em] ` +
    `[&_b]:text-ink [&_span]:text-[13px] [&_span]:text-ink-3 [&_ol]:list-none [&_ol]:mt-[0] [&_ol]:mr-[0] ` +
    `[&_ol]:mb-[0] [&_ol]:ml-[0] [&_ol]:pt-[0] [&_ol]:pr-[0] [&_ol]:pb-[0] [&_ol]:pl-[0] [&_ol]:flex ` +
    `[&_ol]:[row-gap:5px] [&_ol]:[column-gap:5px] [&_li]:w-[12px] [&_li]:h-[12px] [&_li]:rounded-[4px] ` +
    `[&_li]:[background-color:color-mix(in_srgb,_var(--ink)_12%,_transparent)] [&_li]:[background-image:none] ` +
    `[&_li.on]:bg-accent [&_li.on]:[background-image:none] ` +
    `[&_li.today]:[box-shadow:0_0_0_1.5px_var(--panel),0_0_0_2.5px_var(--ink-3)]`,
  // The two takes sit flat on the panel, each chart in a quiet well, not cards inside a card.
  "ve-then": `grid [row-gap:14px] [column-gap:14px] pt-[18px] [border-top-width:1px] [border-top-style:solid] ` +
    `[border-top-color:var(--hair)] [&_.ab]:grid [&_.ab]:[row-gap:24px] [&_.ab]:[column-gap:32px] ` +
    `[&_.player]:bg-transparent [&_.player]:[padding:0] [&_.pianoroll]:bg-fill`,
  "ve-then-h": `mt-[0] mr-[0] mb-[0] ml-[0] grid [row-gap:2px] min-w-0 ` +
    `[&_b]:text-[15px] [&_b]:font-semibold [&_b]:text-ink [&_span]:text-[13px] [&_span]:[line-height:1.5] ` +
    `[&_span]:text-ink-3`,
  "ve-then-note": `mt-[0] mr-[0] mb-[0] ml-[0] text-[13px] [line-height:1.5] text-ink-3`,
  "ve-then-wait": `mt-[0] mr-[0] mb-[0] ml-[0] pt-[14px] [border-top-width:1px] [border-top-style:solid] ` +
    `[border-top-color:var(--hair)] text-[14px] text-ink-2`,
  "ve-start-done": `mt-[14px] pt-[16px] pr-[18px] pb-[16px] pl-[18px] rounded-[14px] bg-ok-soft [background-image:none] grid ` +
    `[row-gap:12px] [column-gap:12px] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:text-[15px] ` +
    `[&_p]:[line-height:1.5] [&_p]:text-ink [&_div]:flex [&_div]:items-center [&_div]:flex-wrap ` +
    `[&_div]:[row-gap:10px] [&_div]:[column-gap:16px]`,
  "prc-insight": `grid [row-gap:4px] [column-gap:4px] [max-width:68ch] [&_.n]:mt-[0] [&_.n]:mr-[0] [&_.n]:mb-[0] ` +
    `[&_.n]:ml-[0] [&_.n]:text-[15px] [&_.n]:font-semibold [&_.n]:text-ink [&_.n]:[letter-spacing:-0.01em] ` +
    `[&_.c]:mt-[0] [&_.c]:mr-[0] [&_.c]:mb-[0] [&_.c]:ml-[0] [&_.c]:text-[14px] [&_.c]:[line-height:1.5] ` +
    `[&_.c]:text-ink-2 [&_.c_b]:text-accent-ink [&_.c_b]:font-semibold [&_.c_b]:mr-[4px] [.prc-result_&]:mb-[14px] ` +
    `[.prc_&]:mb-[20px]`,
  "pscale": `mt-[0] mr-[0] mb-[16px] ml-[0] [&_figcaption]:mt-[12px] [&_figcaption]:text-[14px] ` +
    `[&_figcaption]:[line-height:1.5] [&_figcaption]:text-ink [&_figcaption_span]:block ` +
    `[&_figcaption_span]:mt-[2px] [&_figcaption_span]:text-[12px] [&_figcaption_span]:text-ink-3`,
  "pscale-track": `relative h-[14px] rounded-[99px] bg-fill [background-image:none] [&_>_span]:absolute [&_>_span]:[top:0] ` +
    `[&_>_span]:[bottom:0] [&_>_span]:rounded-[99px] ` +
    `[&_.men]:[background-color:color-mix(in_srgb,_var(--ink)_14%,_transparent)] [&_.men]:[background-image:none] ` +
    `[&_.either]:[background-color:transparent] ` +
    `[&_.either]:[background-image:repeating-linear-gradient(135deg,_color-mix(in_srgb,_var(--ink)_10%,_transparent)_0_3px,_transparent_3px_6px)] ` +
    `[&_.women]:[background-color:color-mix(in_srgb,_var(--accent)_30%,_transparent)] ` +
    `[&_.women]:[background-image:none] [&_.avg]:absolute [&_.avg]:[top:2px] [&_.avg]:[bottom:2px] [&_.avg]:w-[2px] ` +
    `[&_.avg]:ml-[-1px] [&_.avg]:rounded-[1px] ` +
    `[&_.avg]:[background-color:color-mix(in_srgb,_var(--ink)_35%,_transparent)] [&_.avg]:[background-image:none] ` +
    `[&_.you]:absolute [&_.you]:[top:50%] [&_.you]:w-[16px] [&_.you]:h-[16px] [&_.you]:mt-[-8px] [&_.you]:mr-[0] ` +
    `[&_.you]:mb-[0] [&_.you]:ml-[-8px] [&_.you]:[border-radius:50%] [&_.you]:bg-accent ` +
    `[&_.you]:[background-image:none] ` +
    `[&_.you]:[box-shadow:0_0_0_3px_var(--ve-card),_0_2px_6px_rgba(var(--accent-rgb),_0.45)]`,
  "pscale-labels": `relative h-[34px] mt-[8px] [&_span]:absolute [&_span]:[transform:translateX(-50%)] [&_span]:grid ` +
    `[&_span]:[justify-items:center] [&_span]:text-[12px] [&_span]:font-medium [&_span]:text-ink-2 ` +
    `[&_span]:whitespace-nowrap [&_small]:text-[12px] [&_small]:font-normal [&_small]:text-ink-3 ` +
    `[&_small]:tabular-nums`,
  "rz": `mt-[4px] mr-[0] mb-[4px] ml-[0] [max-width:68ch]`,
  "rz-head": `flex items-baseline [row-gap:8px] [column-gap:8px] mb-[12px] [&_b]:text-[14px] [&_b]:[font-weight:650] ` +
    `[&_b]:text-ink [&_small]:text-[12.5px] [&_small]:text-ink-3`,
  "rz-track": `relative h-[10px] rounded-[99px] [background-color:transparent] ` +
    `[background-image:linear-gradient(90deg,_color-mix(in_srgb,_var(--ink)_16%,_transparent),_var(--fill)_50%,_color-mix(in_srgb,_var(--accent)_24%,_transparent))]`,
  "rz-first": `absolute [left:50%] [top:-4px] [bottom:-4px] w-[2px] ml-[-1px] rounded-[1px] ` +
    `[background-color:color-mix(in_srgb,_var(--ink)_45%,_transparent)] [background-image:none]`,
  "rz-last": `absolute [top:50%] w-[10px] h-[10px] mt-[-5px] mr-[0] mb-[0] ml-[-5px] [border-radius:50%] ` +
    `[box-shadow:inset_0_0_0_2px_color-mix(in_srgb,_var(--ink)_40%,_transparent)] ` +
    `[background-color:var(--ve-card,_var(--panel))] [background-image:none]`,
  "rz-you": `absolute [top:50%] w-[16px] h-[16px] mt-[-8px] mr-[0] mb-[0] ml-[-8px] [border-radius:50%] bg-accent ` +
    `[background-image:none] ` +
    `[box-shadow:0_0_0_3px_var(--ve-card,_var(--panel)),_0_2px_6px_rgba(var(--accent-rgb),_0.45)] ` +
    `[transition:left_400ms_cubic-bezier(0.2,_0.8,_0.2,_1)] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[transition:none]`,
  "rz-labels": `flex justify-between mt-[8px] text-[12px] font-medium text-ink-3`,
  "rz-say": `mt-[10px] mr-[0] mb-[0] ml-[0] text-[14px] [line-height:1.5] text-ink`,
  "rz-foot": `mt-[6px] mr-[0] mb-[0] ml-[0] text-[12.5px] [line-height:1.45] text-ink-3`,
  "tr-pitch": `grid [row-gap:4px] [column-gap:4px] [&_.pscale]:mt-[0] [&_.pscale]:mr-[0] [&_.pscale]:mb-[0] ` +
    `[&_.pscale]:ml-[0]`,
  "tr-head": `mt-[0] mr-[0] mb-[10px] ml-[0] flex items-baseline [row-gap:8px] [column-gap:8px] text-[14px] text-ink-2 ` +
    `[&_b]:text-[21px] [&_b]:font-bold [&_b]:[letter-spacing:-0.02em] [&_b]:text-ink [&_b]:tabular-nums ` +
    `[&_span]:text-[13px] [&_span]:text-ink-3`,
  "tr-share": `mt-[2px] mr-[0] mb-[0] ml-[0] text-[14px] [line-height:1.5] text-ink-2 [text-wrap:pretty]`,
  "tr-facts": `mt-[8px] mr-[0] mb-[0] ml-[0] flex flex-wrap [row-gap:4px] [column-gap:18px] text-[13px] text-ink-3 ` +
    `[&_b]:ml-[4px] [&_b]:font-semibold [&_b]:text-ink-2 [&_b]:tabular-nums`,
  "tr-chart": `[&_.pianoroll]:block [&_.pianoroll]:w-full [&_.pianoroll]:rounded-[12px] ` +
    `[&_.pianoroll]:[background-color:var(--ve-card,_var(--panel))] [&_.pianoroll]:[background-image:none] ` +
    `[&_.pianoroll]:[box-shadow:0_0_0_1px_var(--hair)]`,
  "tr-hint": `[margin-left:auto] text-ink-3 [@media_(max-width:_640px)]:ml-[0] [@media_(max-width:_640px)]:[flex-basis:100%]`,
  "prc-cap": `[.prc_&]:mt-[14px] [.prc_&]:mr-[0] [.prc_&]:mb-[0] [.prc_&]:ml-[0] [.prc_&]:text-[12px] ` +
    `[.prc_&]:[line-height:1.5] [.prc_&]:text-ink-3`,
  "ve-free": `mt-[0] mr-[0] mb-[36px] ml-[0] [&_h2]:mt-[0] [&_h2]:mr-[0] [&_h2]:mb-[12px] [&_h2]:ml-[0] [&_h2]:not-italic ` +
    `[&_h2]:font-bold [&_h2]:text-[21px] [&_h2]:[line-height:1.2] [&_h2]:font-sans [&_h2]:[letter-spacing:-0.03em]`,
  "ve-rate-box": `grid [row-gap:10px] [column-gap:10px] pt-[4px] [.sd-controls_&]:pt-[0] [.sd-controls_&]:pr-[0] ` +
    `[.sd-controls_&]:pb-[0] [.sd-controls_&]:pl-[0] [.sd-controls_&]:[background-color:transparent] ` +
    `[.sd-controls_&]:[background-image:none] [.sd-controls_&]:[border-top-width:0] ` +
    `[.sd-controls_&]:[border-top-style:none] [.sd-controls_&]:[border-top-color:currentColor] ` +
    `[.sd-controls_&]:[border-right-width:0] [.sd-controls_&]:[border-right-style:none] ` +
    `[.sd-controls_&]:[border-right-color:currentColor] [.sd-controls_&]:[border-bottom-width:0] ` +
    `[.sd-controls_&]:[border-bottom-style:none] [.sd-controls_&]:[border-bottom-color:currentColor] ` +
    `[.sd-controls_&]:[border-left-width:0] [.sd-controls_&]:[border-left-style:none] ` +
    `[.sd-controls_&]:[border-left-color:currentColor]`,
  "ve-rate": `grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] [row-gap:8px] [column-gap:8px] [.ve_&_button]:grid ` +
    `[.ve_&_button]:[justify-content:stretch] [.ve_&_button]:[justify-items:start] ` +
    `[.ve_&_button]:[align-content:start] [.ve_&_button]:[row-gap:2px] [.ve_&_button]:[column-gap:2px] ` +
    `[.ve_&_button]:pt-[10px] [.ve_&_button]:pr-[12px] [.ve_&_button]:pb-[10px] [.ve_&_button]:pl-[12px] ` +
    `[.ve_&_button]:rounded-[12px] [.ve_&_button]:bg-fill [.ve_&_button]:[background-image:none] ` +
    `[.ve_&_button]:text-left [.ve_&_button]:text-ink ` +
    `[.ve_&_button]:[transition:background-color_0.15s_ease,_transform_0.16s_var(--ease)] [.ve_&_.l]:w-full ` +
    `[.ve_&_.l]:flex [.ve_&_.l]:items-center [.ve_&_.l]:justify-between [.ve_&_.l]:[row-gap:6px] ` +
    `[.ve_&_.l]:[column-gap:6px] [.ve_&_.l]:text-[14px] [.ve_&_.l]:font-semibold [.ve_&_small]:whitespace-nowrap ` +
    `[.ve_&_small]:text-[12px] [.ve_&_small]:text-ink-3 ` +
    `[.ve_&_button:active:not(:disabled)]:[transform:scale(0.97)] [.ve_&_kbd]:text-[12px] [.ve_&_kbd]:pt-[0] ` +
    `[.ve_&_kbd]:pr-[4px] [.ve_&_kbd]:pb-[0] [.ve_&_kbd]:pl-[4px] [.ve_&_.face]:text-[22px] ` +
    `[.ve_&_.face]:[line-height:1.1] [.ve_&_.face]:mb-[4px] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover:not(:disabled)]:bg-fill-2 ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&_button:hover:not(:disabled)]:[background-image:none] ` +
    `[@media_(max-width:_860px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.sd-controls_&]:grid ` +
    `[.sd-controls_&]:[grid-template-columns:repeat(4,_minmax(0,1fr))] [.sd-controls_&]:[row-gap:8px] ` +
    `[.sd-controls_&]:[column-gap:8px] ` +
    `[.sd-controls_&:not(:has(button:nth-child(4)))]:[grid-template-columns:repeat(3,_minmax(0,1fr))] ` +
    `[.ve_.sd-controls_&_button]:min-h-[66px] [.ve_.sd-controls_&_button]:grid ` +
    `[.ve_.sd-controls_&_button]:[align-content:center] [.ve_.sd-controls_&_button]:[justify-items:start] ` +
    `[.ve_.sd-controls_&_button]:[row-gap:5px] [.ve_.sd-controls_&_button]:[column-gap:5px] ` +
    `[.ve_.sd-controls_&_button]:pt-[10px] [.ve_.sd-controls_&_button]:pr-[12px] ` +
    `[.ve_.sd-controls_&_button]:pb-[10px] [.ve_.sd-controls_&_button]:pl-[12px] ` +
    `[.ve_.sd-controls_&_button]:rounded-[10px] [.ve_.sd-controls_&_button]:bg-fill ` +
    `[.ve_.sd-controls_&_button]:[background-image:none] [.ve_.sd-controls_&_button]:text-ink ` +
    `[.ve_.sd-controls_&_button]:text-left [.ve_.sd-controls_&_button]:[border-top-width:1px] ` +
    `[.ve_.sd-controls_&_button]:[border-top-style:solid] ` +
    `[.ve_.sd-controls_&_button]:[border-top-color:var(--hair)] ` +
    `[.ve_.sd-controls_&_button]:[border-right-width:1px] [.ve_.sd-controls_&_button]:[border-right-style:solid] ` +
    `[.ve_.sd-controls_&_button]:[border-right-color:var(--hair)] ` +
    `[.ve_.sd-controls_&_button]:[border-bottom-width:1px] [.ve_.sd-controls_&_button]:[border-bottom-style:solid] ` +
    `[.ve_.sd-controls_&_button]:[border-bottom-color:var(--hair)] ` +
    `[.ve_.sd-controls_&_button]:[border-left-width:1px] [.ve_.sd-controls_&_button]:[border-left-style:solid] ` +
    `[.ve_.sd-controls_&_button]:[border-left-color:var(--hair)] ` +
    `[.ve_.sd-controls_&_button:hover:not(:disabled)]:bg-fill-2 ` +
    `[.ve_.sd-controls_&_button:hover:not(:disabled)]:[background-image:none] [.sd-controls_&_.l]:flex ` +
    `[.sd-controls_&_.l]:w-full [.sd-controls_&_.l]:justify-between [.sd-controls_&_.l]:[row-gap:8px] ` +
    `[.sd-controls_&_.l]:[column-gap:8px] [.sd-controls_&_.l]:text-[14px] [.sd-controls_&_small]:text-ink-2 ` +
    `[.sd-controls_&_small]:text-[12px] [.sd-controls_&_kbd]:text-[10px] [.sd-controls_&_kbd]:[opacity:.65] ` +
    `[@media_(max-width:_700px)]:[.sd-controls_&]:[grid-template-columns:repeat(2,_minmax(0,1fr))] ` +
    `[@media_(max-width:_700px)]:[.sd-controls_&_kbd]:hidden`,
  "ve-rate-more": `flex flex-wrap [row-gap:8px] [column-gap:8px] [.ve-ba_&]:mt-[18px]`,
  "ve-pill": `[.ve_&]:inline-flex [.ve_&]:items-center [.ve_&]:[row-gap:7px] [.ve_&]:[column-gap:7px] [.ve_&]:h-[34px] ` +
    `[.ve_&]:pt-[0] [.ve_&]:pr-[14px] [.ve_&]:pb-[0] [.ve_&]:pl-[12px] [.ve_&]:rounded-[99px] [.ve_&]:bg-fill ` +
    `[.ve_&]:[background-image:none] [.ve_&]:text-[13px] [.ve_&]:font-semibold [.ve_&]:text-ink-2 ` +
    `[.ve_&]:[transition:background-color_0.15s_ease,_color_0.15s_ease,_transform_0.16s_var(--ease)] ` +
    `[.ve_&_svg]:w-[15px] [.ve_&_svg]:h-[15px] [.ve_&_svg]:[flex:none] [.ve_&.ouch]:text-rec ` +
    `[.ve_&.ouch]:[background-color:color-mix(in_srgb,_var(--rec)_9%,_transparent)] ` +
    `[.ve_&.ouch]:[background-image:none] [.ve_&:active:not(:disabled)]:[transform:scale(0.97)] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled)]:bg-fill-2 ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled)]:[background-image:none] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled)]:text-ink ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&.ouch:hover:not(:disabled)]:[background-color:color-mix(in_srgb,_var(--rec)_15%,_transparent)] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&.ouch:hover:not(:disabled)]:[background-image:none] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&.ouch:hover:not(:disabled)]:text-rec ` +
    `[.ve_.sd-controls_&]:min-h-[36px]`,
  "ve-link": `[.ve_&]:text-[13px] [.ve_&]:font-medium [.ve_&]:text-ink-3 [.ve_&]:[transition:color_0.15s_ease] ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&:hover:not(:disabled)]:text-ink ` +
    `[@media_(hover:_hover)_and_(pointer:_fine)]:[.ve_&.ouch:hover:not(:disabled)]:text-rec ` +
    `[.ve_.sd-controls_&]:min-h-[36px] ` +
    `[@media_(max-width:_700px)]:[.ve_.sd-controls_.ve-dock-sub_&]:whitespace-normal ` +
    `[@media_(max-width:_700px)]:[.ve_.sd-controls_.ve-dock-sub_&]:[overflow-wrap:normal]`,
  "ve-side-toggle": `[.ve-dragging_.ve_&]:[transition:none]! [.ve_&]:absolute [.ve_&]:[z-index:7] [.ve_&]:[top:9px] ` +
    `[.ve_&]:[left:max(calc(var(--ve-side-w,_272px)_-_38px),_84px)] [.ve_&]:w-[28px] [.ve_&]:h-[26px] [.ve_&]:grid ` +
    `[.ve_&]:place-items-center [.ve_&]:rounded-[7px] [.ve_&]:text-ink-3 ` +
    `[.ve_&]:[transition:background-color_0.12s_ease,_color_0.12s_ease] ` +
    `[.ve-motion_.ve_&]:[transition:left_0.34s_var(--ease),_background-color_0.12s_ease,_color_0.12s_ease] ` +
    `[&_svg]:w-[16px] [&_svg]:h-[16px] [.ve_&:hover]:bg-fill [.ve_&:hover]:[background-image:none] ` +
    `[.ve_&:hover]:text-ink [.ve-side-hidden_.ve_&]:[background-color:var(--ve-glass-hi)] ` +
    `[.ve-side-hidden_.ve_&]:[background-image:none] [.ve-side-hidden_.ve_&]:[box-shadow:0_0_0_1px_var(--hair)] ` +
    `[@media_(max-width:_860px)]:[.ve_&]:hidden! ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve-motion_.ve_&]:[transition:none]`,
  "ve-dragging": `[cursor:col-resize]! [user-select:none] [&_*]:[cursor:col-resize]! [&_*]:[user-select:none]`,
  "ve-result-pane": `[@media_(prefers-reduced-motion:_reduce)]:[animation:none]! [.ve_.ve-dock_&]:hidden`,
  "ve-updates": `max-w-[760px] [&_h2]:mt-[32px] [&_h2]:mr-[0] [&_h2]:mb-[10px] [&_h2]:ml-[0] [&_h2]:not-italic ` +
    `[&_h2]:font-semibold [&_h2]:text-[17px] [&_h2]:[line-height:1.3] [&_h2]:font-sans ` +
    `[&_h2]:[letter-spacing:-0.01em] [&_h2]:text-ink`,
  "ve-up-list": `list-none pt-[0]! pr-[0]! pb-[0]! pl-[0]! mt-[0] mr-[0] mb-[0] ml-[0] grid [&_>_li]:pt-[14px] [&_>_li]:pr-[0] ` +
    `[&_>_li]:pb-[14px] [&_>_li]:pl-[0] [&_>_li]:[border-top-width:1px] [&_>_li]:[border-top-style:solid] ` +
    `[&_>_li]:[border-top-color:var(--hair)] [&_details]:[background-color:transparent] ` +
    `[&_details]:[background-image:none] [&_details]:rounded-[0]`,
  "ve-up-head": `flex items-baseline flex-wrap [row-gap:4px] [column-gap:10px] text-ink text-[15px] [&_small]:[flex-basis:100%] ` +
    `[&_small]:text-[13px] [&_small]:text-ink-3 [&_b]:font-semibold [.ve-up-list_details_>_summary&]:min-h-0 ` +
    `[.ve-up-list_details_>_summary&]:pt-[0] [.ve-up-list_details_>_summary&]:pr-[0] ` +
    `[.ve-up-list_details_>_summary&]:pb-[0] [.ve-up-list_details_>_summary&]:pl-[0] ` +
    `[.ve-up-list_details_>_summary&]:items-center [.ve-up-list_summary&_small]:pl-[19px]`,
  "ve-up-text": `[details_>_&]:mt-[12px] [details_>_&]:mr-[0] [details_>_&]:mb-[0] [details_>_&]:ml-[18px] [&_p]:mt-[0] ` +
    `[&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0] [&_p]:not-italic [&_p]:font-normal [&_p]:text-[19px] ` +
    `[&_p]:[line-height:1.4] [&_p]:[font-family:var(--read)] [&_p]:text-ink [&_small]:block [&_small]:mt-[6px] ` +
    `[&_small]:text-[13px] [&_small]:text-ink-3`,
  "ve-up-md": `[details_>_&]:mt-[12px] [details_>_&]:mr-[0] [details_>_&]:mb-[0] [details_>_&]:ml-[18px] ` +
    `[--md-body-size:14px] [&_>_:first-child]:mt-[0] [&_h2]:text-[22px]`,
  "ve-up-kind": `pt-[2px] pr-[8px] pb-[2px] pl-[8px] rounded-full bg-fill [background-image:none] text-[11.5px] font-semibold ` +
    `text-ink-2`,
  "ve-up-pick": `grid [grid-template-columns:1fr_1fr] [row-gap:10px] [column-gap:10px] mt-[12px] [.ve_&_button]:grid ` +
    `[.ve_&_button]:[grid-template-columns:minmax(0,_1fr)] [.ve_&_button]:[justify-content:stretch] ` +
    `[.ve_&_button]:[align-content:start] [.ve_&_button]:w-full [.ve_&_button]:[row-gap:8px] ` +
    `[.ve_&_button]:[column-gap:8px] [.ve_&_button]:text-left [.ve_&_button]:pt-[14px] [.ve_&_button]:pr-[16px] ` +
    `[.ve_&_button]:pb-[14px] [.ve_&_button]:pl-[16px] [.ve_&_button]:rounded-[12px] [.ve_&_button]:bg-fill ` +
    `[.ve_&_button]:[background-image:none] [.ve_&_button]:[box-shadow:inset_0_0_0_1px_transparent] ` +
    `[.ve_&_button]:[transition:box-shadow_0.15s_ease,_background-color_0.15s_ease] [.ve_&_button:hover]:bg-fill-2 ` +
    `[.ve_&_button:hover]:[background-image:none] [.ve_&_button.on]:bg-accent-soft ` +
    `[.ve_&_button.on]:[background-image:none] [.ve_&_button.on]:[box-shadow:inset_0_0_0_1px_var(--accent)] ` +
    `[@media_(max-width:_640px)]:[grid-template-columns:1fr]`,
  "ve-up-label": `text-[12px] font-semibold text-ink-2 [.ve-up-pick_.on_&]:text-accent-ink`,
  "ve-up-gone": `mt-[0] mr-[0] mb-[0] ml-[0] text-[14px] text-ink-3 italic`,
  "ve-up-note": `text-[13px] text-ink-3`,
  "ve-up-error": `text-warn text-[14px]`,
  "ve-up-actions": `flex items-center [row-gap:16px] [column-gap:16px] flex-wrap mt-[28px] mr-[0] mb-[8px] ml-[0]`,
  "ve-up-go": `[.ve_&]:inline-flex [.ve_&]:items-center [.ve_&]:h-[44px] [.ve_&]:pt-[0] [.ve_&]:pr-[20px] [.ve_&]:pb-[0] ` +
    `[.ve_&]:pl-[20px] [.ve_&]:rounded-full [.ve_&]:bg-ink [.ve_&]:[background-image:none] ` +
    `[.ve_&]:[color:var(--ve-paper)] [.ve_&]:font-semibold [.ve_&]:text-[15px] [.ve_&]:no-underline ` +
    `[.ve_&:disabled]:[opacity:0.4]`,
  "ve-up-quiet": `[.ve_&]:text-ink-2 [.ve_&]:text-[15px] [.ve_&:hover]:text-ink`,
  "ve-mix-tag": `[margin-left:auto] pt-[0] pr-[7px] pb-[0] pl-[7px] rounded-full text-[11px] font-semibold leading-[18px] ` +
    `bg-accent-soft [background-image:none] text-accent-ink [&.new]:[background-color:rgba(22,_147,_106,_0.14)] ` +
    `[&.new]:[background-image:none] [&.new]:text-ok`,
  "ve-mixtape": `[max-width:none] pt-[0] pr-[0] pb-[0] pl-[0] [&_.co-head_h1]:not-italic [&_.co-head_h1]:font-bold ` +
    `[&_.co-head_h1]:text-[44px] [&_.co-head_h1]:[line-height:1.02] [&_.co-head_h1]:font-sans ` +
    `[&_.co-head_h1]:[letter-spacing:-0.05em]`,
  "ve-icon": `[.ve_&]:w-[40px] [.ve_&]:h-[40px] [.ve_&]:[flex:none] [.ve_&]:grid [.ve_&]:place-items-center ` +
    `[.ve_&]:[border-radius:50%] [.ve_&]:text-ink-2 [.ve_&]:[background-color:transparent] ` +
    `[.ve_&]:[background-image:none] [.ve_&]:[transition:background-color_0.15s_ease,_color_0.15s_ease] ` +
    `[.ve_&:hover:not(:disabled)]:bg-fill-2 [.ve_&:hover:not(:disabled)]:[background-image:none] ` +
    `[.ve_&:hover:not(:disabled)]:text-ink [.ve_&:disabled]:[opacity:0.35] [.ve_&_svg]:w-[17px] ` +
    `[.ve_&_svg]:h-[17px]`,
  "ve-studio-rec": `mt-[8px] mr-[0] mb-[32px] ml-[0]`,
  "ve-bright": `[grid-area:bright] pt-[14px] pr-[16px] pb-[12px] pl-[16px] rounded-[14px] [background-color:var(--ve-card)] ` +
    `[background-image:none] [box-shadow:0_0_0_1px_var(--hair)] [animation:ve-rise_0.25s_var(--ease)_both] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[animation:none]`,
  "ve-bright-track": `relative h-[10px] rounded-[99px] [background-color:transparent] ` +
    `[background-image:linear-gradient(90deg,_color-mix(in_srgb,_var(--ink)_16%,_transparent),_var(--fill)_50%,_color-mix(in_srgb,_var(--accent)_24%,_transparent))]`,
  "ve-bright-start": `absolute [left:50%] [top:-4px] [bottom:-4px] w-[2px] ml-[-1px] rounded-[1px] ` +
    `[background-color:color-mix(in_srgb,_var(--ink)_45%,_transparent)] [background-image:none]`,
  "ve-bright-pos": `absolute [top:0] [right:0] [bottom:0] [left:0] [transition:transform_0.22s_var(--ease),_opacity_0.3s_ease] ` +
    `[&_b]:absolute [&_b]:[left:50%] [&_b]:[top:50%] [&_b]:w-[16px] [&_b]:h-[16px] [&_b]:mt-[-8px] [&_b]:mr-[0] ` +
    `[&_b]:mb-[0] [&_b]:ml-[-8px] [&_b]:[border-radius:50%] [&_b]:bg-accent [&_b]:[background-image:none] ` +
    `[&_b]:[box-shadow:0_0_0_3px_var(--ve-card),_0_2px_6px_rgba(var(--accent-rgb),_0.45)] [&.wait]:[opacity:0] ` +
    `[&.held]:[opacity:0.45] [@media_(prefers-reduced-motion:_reduce)]:[transition:none]`,
  "ve-bright-words": `mt-[10px] mr-[0] mb-[0] ml-[0] text-[14px] font-medium [line-height:1.5] text-ink`,
  "ve-bright-note": `mt-[2px] mr-[0] mb-[0] ml-[0] text-[12.5px] [line-height:1.45] text-ink-3`,
  "ci-lede-plain": `mt-[0] mr-[0] mb-[32px] ml-[0] [max-width:34em] text-[18px] [line-height:1.5] text-ink-2 [&_a]:text-ink`,
  "ve-ba-l": `mt-[14px] mr-[0] mb-[6px] ml-[0] text-[13px] font-semibold text-ink-2 [&:first-child]:mt-[0]`,
  "ve-ba-q": `mt-[16px]`,
  "ve-ba-scale": `grid [grid-template-columns:repeat(5,_minmax(0,_1fr))] items-center [row-gap:6px] [column-gap:6px] ` +
    `max-w-[360px] [&_small]:text-[12px] [&_small]:text-ink-3 [&_small:first-child]:[grid-column:1_/_4] ` +
    `[&_small:first-child]:[grid-row:2] [&_small:first-child]:text-left [&_small:last-child]:[grid-column:4_/_6] ` +
    `[&_small:last-child]:[grid-row:2] [&_small:last-child]:text-right [.ve_&_button]:min-w-0 ` +
    `[.ve_&_button]:min-h-[44px] [.ve_&_button]:pt-[0] [.ve_&_button]:pr-[0] [.ve_&_button]:pb-[0] ` +
    `[.ve_&_button]:pl-[0] [.ve_&_button]:rounded-[10px] [.ve_&_button]:bg-fill ` +
    `[.ve_&_button]:[background-image:none] [.ve_&_button]:text-ink [.ve_&_button]:font-semibold ` +
    `[.ve_&_button]:tabular-nums [.ve_&_button[aria-pressed="true"]]:bg-ink ` +
    `[.ve_&_button[aria-pressed="true"]]:[background-image:none] ` +
    `[.ve_&_button[aria-pressed="true"]]:[color:var(--ve-paper)]`,
  "th-back": `inline-block mb-[14px] text-[13px] font-medium text-ink-3 no-underline [&::before]:[content:"←_"] ` +
    `[&:hover]:text-ink`,
  "th-text": `[.rl-head_&]:text-[19px] [.rl-head_&]:text-ink`,
  "th-sub": `[.rl-head_&]:text-[13px] [.rl-head_&]:text-ink-3 [&_a]:text-ink-2`,
  "th-trend": `relative mt-[0] mr-[0] mb-[28px] ml-[0] pt-[14px] pr-[14px] pb-[10px] pl-[14px] rounded-[16px] ` +
    `[background-color:var(--ve-card,_var(--panel))] [background-image:none] [box-shadow:0_0_0_1px_var(--hair)] ` +
    `[&_svg]:block [&_svg]:overflow-visible [&_figcaption]:mt-[6px] [&_figcaption]:text-[12px] ` +
    `[&_figcaption]:text-ink-3`,
  "th-band": `fill-accent-soft`,
  "th-grid": `stroke-hair [stroke-width:1]`,
  "th-ax": `fill-ink-3 not-italic font-medium text-[11px] [line-height:normal] font-sans tabular-nums`,
  "th-line": `[fill:none] stroke-accent [stroke-width:2] [stroke-linejoin:round] [opacity:0.45]`,
  "th-dot": `fill-accent [stroke:var(--ve-card,_var(--panel))] [stroke-width:2] [transition:r_0.15s_var(--ease)] ` +
    `[&.on]:stroke-ink`,
  "th-tip": `absolute [z-index:2] w-[150px] pt-[7px] pr-[10px] pb-[7px] pl-[10px] rounded-[10px] bg-ink ` +
    `[background-image:none] [color:var(--ve-paper,_#fff)] text-[12px] pointer-events-none grid [row-gap:1px] ` +
    `[column-gap:1px] [box-shadow:0_8px_20px_-10px_rgba(0,_0,_0,_0.6)] [&_b]:text-[13px] [&_b]:tabular-nums ` +
    `[&_b_span]:font-medium [&_b_span]:[opacity:0.7] [&_>_span]:font-medium [&_>_span]:[opacity:0.7]`,
  "th-pair": `mt-[0] mr-[0] mb-[32px] ml-[0] grid [row-gap:10px] [column-gap:10px] [&_h2]:mt-[0] [&_h2]:mr-[0] ` +
    `[&_h2]:mb-[4px] [&_h2]:ml-[0] [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-ink [&_.ab]:grid ` +
    `[&_.ab]:[grid-template-columns:repeat(auto-fit,_minmax(280px,_1fr))] [&_.ab]:[row-gap:10px] ` +
    `[&_.ab]:[column-gap:10px]`,
  "th-h2": `mt-[0] mr-[0] mb-[4px] ml-[0] text-[15px] font-semibold text-ink`,
  "th-hint": `mt-[0] mr-[0] mb-[0] ml-[0] text-[13px] text-ink-3`,
  "th-link": `[.ve_&]:pt-[0] [.ve_&]:pr-[0] [.ve_&]:pb-[0] [.ve_&]:pl-[0] [.ve_&]:[border-top-width:0] ` +
    `[.ve_&]:[border-top-style:none] [.ve_&]:[border-top-color:currentColor] [.ve_&]:[border-right-width:0] ` +
    `[.ve_&]:[border-right-style:none] [.ve_&]:[border-right-color:currentColor] [.ve_&]:[border-bottom-width:0] ` +
    `[.ve_&]:[border-bottom-style:none] [.ve_&]:[border-bottom-color:currentColor] [.ve_&]:[border-left-width:0] ` +
    `[.ve_&]:[border-left-style:none] [.ve_&]:[border-left-color:currentColor] ` +
    `[.ve_&]:[background-color:transparent] [.ve_&]:[background-image:none] [.ve_&]:text-ink-2 ` +
    `[.ve_&]:[font-style:inherit] [.ve_&]:font-medium [.ve_&]:[font-size:inherit] [.ve_&]:[line-height:inherit] ` +
    `[.ve_&]:[font-family:inherit] [.ve_&]:[font-variant:inherit] [.ve_&]:[font-stretch:inherit] [.ve_&]:underline ` +
    `[.ve_&]:cursor-pointer`,
  "th-list": `list-none mt-[10px] mr-[0] mb-[0] ml-[0] pt-[0] pr-[0] pb-[0] pl-[0] grid [&_li]:grid ` +
    `[&_li]:[grid-template-columns:28px_150px_90px_minmax(0,_1fr)] [&_li]:items-center [&_li]:[row-gap:14px] ` +
    `[&_li]:[column-gap:14px] [&_li]:pt-[10px] [&_li]:pr-[0] [&_li]:pb-[10px] [&_li]:pl-[0] ` +
    `[&_li]:[border-top-width:1px] [&_li]:[border-top-style:solid] [&_li]:[border-top-color:var(--hair)] ` +
    `[@media_(max-width:_640px)]:[&_li]:[grid-template-columns:28px_1fr_auto]`,
  "th-pick": `[.ve_&]:w-[26px] [.ve_&]:h-[26px] [.ve_&]:[border-radius:50%] [.ve_&]:[border-top-width:1.5px] ` +
    `[.ve_&]:[border-top-style:solid] [.ve_&]:[border-top-color:var(--ink-3)] [.ve_&]:[border-right-width:1.5px] ` +
    `[.ve_&]:[border-right-style:solid] [.ve_&]:[border-right-color:var(--ink-3)] ` +
    `[.ve_&]:[border-bottom-width:1.5px] [.ve_&]:[border-bottom-style:solid] ` +
    `[.ve_&]:[border-bottom-color:var(--ink-3)] [.ve_&]:[border-left-width:1.5px] [.ve_&]:[border-left-style:solid] ` +
    `[.ve_&]:[border-left-color:var(--ink-3)] [.ve_&]:[background-color:transparent] ` +
    `[.ve_&]:[background-image:none] [.ve_&]:[color:var(--ve-paper,_#fff)] [.ve_&]:not-italic [.ve_&]:font-bold ` +
    `[.ve_&]:text-[12px] [.ve_&]:[line-height:normal] [.ve_&]:font-sans [.ve_&]:cursor-pointer ` +
    `[.ve_&[aria-pressed="true"]]:border-ink [.ve_&[aria-pressed="true"]]:bg-ink ` +
    `[.ve_&[aria-pressed="true"]]:[background-image:none]`,
  "th-when": `grid [row-gap:1px] [column-gap:1px] text-[13px] text-ink-3 [&_b]:text-[14px] [&_b]:font-semibold ` +
    `[&_b]:text-ink [&_b]:tabular-nums`,
  "th-hz": `grid [row-gap:1px] [column-gap:1px] text-[13px] text-ink-3 [&_b]:text-[14px] [&_b]:font-semibold ` +
    `[&_b]:text-ink [&_b]:tabular-nums`,
  "th-play": `min-w-0 [@media_(max-width:_640px)]:[grid-column:1_/_-1]`,
  "sd-page": `[.ve_&]:[--sd-paper:#ffffff] [.ve_&]:[--sd-edge:#ebebeb] [.ve_&]:[--sd-line:#6b6b6b] ` +
    `[.ve_&]:[--sd-sage:#a9b29a] [.ve_&]:[--sd-clay:#c58968] [.ve_&]:bg-page [.ve_&]:[background-image:none] ` +
    `[:root[data-theme="dark"]_.ve_&]:[--sd-paper:#222222] [:root[data-theme="dark"]_.ve_&]:[--sd-edge:#2f2f2f] ` +
    `[:root[data-theme="dark"]_.ve_&]:[--sd-line:#c4c4c4] [:root[data-theme="dark"]_.ve_&]:[--sd-sage:#849680] ` +
    `[:root[data-theme="dark"]_.ve_&]:[--sd-clay:#ce9578]`,
  "sd-deck": `[.ve_&]:max-w-[760px] [.ve_&]:[padding-top:var(--space-8)] [.ve_&]:[padding-right:var(--page-padding)] ` +
    `[.ve_&]:pb-[64px] [.ve_&]:[padding-left:var(--page-padding)] [@media_(max-width:_700px)]:[.ve_&]:pt-[24px] ` +
    `[@media_(max-width:_700px)]:[.ve_&]:pr-[18px] [@media_(max-width:_700px)]:[.ve_&]:pb-[50px] ` +
    `[@media_(max-width:_700px)]:[.ve_&]:pl-[18px]`,
  "sd-heading": `grid [grid-template-columns:1fr_auto] [row-gap:4px] [column-gap:24px] items-baseline mb-[18px] ` +
    `[.ve_&_h1]:[grid-column:1] [.ve_&_h1]:not-italic [.ve_&_h1]:font-semibold ` +
    `[.ve_&_h1]:[font-size:var(--type-title)] [.ve_&_h1]:[line-height:1.15] [.ve_&_h1]:font-sans ` +
    `[.ve_&_h1]:[letter-spacing:-0.035em] [.ve_&_h1]:mt-[0] [.ve_&_h1]:mr-[0] [.ve_&_h1]:mb-[0] [.ve_&_h1]:ml-[0] ` +
    `[@media_(max-width:_700px)]:[row-gap:6px] [@media_(max-width:_700px)]:[column-gap:6px] ` +
    `[@media_(max-width:_700px)]:[grid-template-columns:1fr]`,
  "sd-help": `[.ve_&]:[background-color:transparent] [.ve_&]:[background-image:none] [.ve_&]:rounded-[0] [.ve_&]:mt-[0] ` +
    `[.ve_&]:mr-[0] [.ve_&]:mb-[26px] [.ve_&]:ml-[0] [.ve_&_>_summary]:min-h-[32px] [.ve_&_>_summary]:pt-[4px] ` +
    `[.ve_&_>_summary]:pr-[0] [.ve_&_>_summary]:pb-[4px] [.ve_&_>_summary]:pl-[0] [.ve_&_>_summary]:text-ink-2 ` +
    `[.ve_&_>_summary]:text-[13px] [.ve_&_>_summary]:font-medium [.ve_&_>_summary]:[width:fit-content] ` +
    `[&_>_p]:mt-[8px] [&_>_p]:mr-[0] [&_>_p]:mb-[0] [&_>_p]:ml-[0] [&_>_p]:[max-width:58ch] [&_>_p]:text-ink-2 ` +
    `[&_>_p]:text-[14px] [&_>_p]:[line-height:1.6]`,
  "sd-tips": `[.ve_&]:[background-color:transparent] [.ve_&]:[background-image:none] [.ve_&]:rounded-[0] ` +
    `[.ve_&:where(:not(.sd-current_*))]:mt-[0] [.ve_&]:mr-[0] [.ve_&]:mb-[0] [.ve_&]:ml-[0] ` +
    `[.ve_&_>_summary]:min-h-[32px] [.ve_&_>_summary]:pt-[4px] [.ve_&_>_summary]:pr-[0] [.ve_&_>_summary]:pb-[4px] ` +
    `[.ve_&_>_summary]:pl-[0] [.ve_&_>_summary]:text-ink-2 [.ve_&_>_summary]:text-[13px] ` +
    `[.ve_&_>_summary]:font-medium [.ve_&_>_summary]:[width:fit-content] [.sd-current_&]:mt-[10px]`,
  "sd-upcoming": `[.ve_&]:[background-color:transparent] [.ve_&]:[background-image:none] [.ve_&]:rounded-[0] [.ve_&]:mt-[0] ` +
    `[.ve_&]:mr-[0] [.ve_&]:mb-[0] [.ve_&]:ml-[0] [.ve_&]:[border-top-width:1px] [.ve_&]:[border-top-style:solid] ` +
    `[.ve_&]:[border-top-color:var(--hair)] [.ve_&_>_summary]:pt-[16px] [.ve_&_>_summary]:pr-[0] ` +
    `[.ve_&_>_summary]:pb-[16px] [.ve_&_>_summary]:pl-[0] [.ve_&_>_summary]:min-h-[44px] ` +
    `[.ve_&_>_summary]:text-[14px] [.ve_&_>_summary]:font-medium [.ve_&_>_summary]:text-ink ` +
    `[&_>_summary_>_span]:[margin-left:auto] [&_>_summary_>_span]:text-[12px] [&_>_summary_>_span]:text-ink-2 ` +
    `[&_>_summary_>_span]:font-normal [&_ol]:list-none [&_ol]:mt-[0] [&_ol]:mr-[0] [&_ol]:mb-[16px] [&_ol]:ml-[0] ` +
    `[&_ol]:pt-[0] [&_ol]:pr-[0] [&_ol]:pb-[0] [&_ol]:pl-[0]`,
  "sd-completed": `[.ve_&]:[background-color:transparent] [.ve_&]:[background-image:none] [.ve_&]:rounded-[0] [.ve_&]:mt-[0] ` +
    `[.ve_&]:mr-[0] [.ve_&]:mb-[0] [.ve_&]:ml-[0] [.ve_&]:[border-top-width:1px] [.ve_&]:[border-top-style:solid] ` +
    `[.ve_&]:[border-top-color:var(--hair)] [.ve_&_>_summary]:pt-[16px] [.ve_&_>_summary]:pr-[0] ` +
    `[.ve_&_>_summary]:pb-[16px] [.ve_&_>_summary]:pl-[0] [.ve_&_>_summary]:min-h-[44px] ` +
    `[.ve_&_>_summary]:text-[14px] [.ve_&_>_summary]:font-medium [.ve_&_>_summary]:text-ink ` +
    `[&_>_summary_>_span]:[margin-left:auto] [&_>_summary_>_span]:text-[12px] [&_>_summary_>_span]:text-ink-2 ` +
    `[&_>_summary_>_span]:font-normal`,
  "sd-current": `[.ve_&]:mt-[0] [.ve_&]:mr-[0] [.ve_&]:mb-[0] [.ve_&]:ml-[0] [.ve_&]:pt-[28px] [.ve_&]:pr-[36px] ` +
    `[.ve_&]:pb-[30px] [.ve_&]:pl-[36px] [.ve_&]:rounded-[20px] [.ve_&]:[background-color:var(--sd-paper)] ` +
    `[.ve_&]:[background-image:radial-gradient(color-mix(in_srgb,_var(--sd-line)_7%,_transparent)_.5px,_transparent_.7px)] ` +
    `[.ve_&]:[background-size:5px_5px] ` +
    `[.ve_&]:[box-shadow:0_0_0_1px_var(--hair),_0_12px_30px_-22px_rgba(48,40,26,.35)] [.ve_&]:[outline:none] ` +
    `[.ve_&]:[animation:sd-settle_.24s_ease-out] [.ve_&]:relative [&_.notes]:mt-[0] [&_.notes]:pt-[8px] ` +
    `[&_.notes]:[border-top-width:0] [&_.notes]:[border-top-style:none] [&_.notes]:[border-top-color:currentColor] ` +
    `[&_.notes]:[border-right-width:0] [&_.notes]:[border-right-style:none] ` +
    `[&_.notes]:[border-right-color:currentColor] [&_.notes]:[border-bottom-width:0] ` +
    `[&_.notes]:[border-bottom-style:none] [&_.notes]:[border-bottom-color:currentColor] ` +
    `[&_.notes]:[border-left-width:0] [&_.notes]:[border-left-style:none] ` +
    `[&_.notes]:[border-left-color:currentColor] [@media_(max-width:_700px)]:[.ve_&]:pt-[18px] ` +
    `[@media_(max-width:_700px)]:[.ve_&]:pr-[20px] [@media_(max-width:_700px)]:[.ve_&]:pb-[22px] ` +
    `[@media_(max-width:_700px)]:[.ve_&]:pl-[20px] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve_&]:[animation:none]`,
  "sd-card-top": `flex items-center justify-between [row-gap:16px] [column-gap:16px] mb-[8px] min-h-[24px] ` +
    `[&_>_span]:text-[13px] [&_>_span]:text-ink-2 [&_>_span]:tabular-nums`,
  "sd-controls": `mt-[26px] pt-[20px] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] ` +
    `min-h-[90px]`,
  "sd-queue-pick": `[.ve_&]:grid [.ve_&]:[grid-template-columns:22px_minmax(0,1fr)] [.ve_&]:[row-gap:14px] ` +
    `[.ve_&]:[column-gap:14px] [.ve_&]:w-full [.ve_&]:pt-[13px] [.ve_&]:pr-[8px] [.ve_&]:pb-[13px] [.ve_&]:pl-[8px] ` +
    `[.ve_&]:min-h-[48px] [.ve_&]:text-left [.ve_&]:rounded-[8px] [.ve_&:hover:not(:disabled)]:bg-fill ` +
    `[.ve_&:hover:not(:disabled)]:[background-image:none] [&_b]:[display:-webkit-box] [&_b]:[-webkit-line-clamp:2] ` +
    `[&_b]:[-webkit-box-orient:vertical] [&_b]:overflow-hidden [&_b]:font-medium [&_b]:text-[15px] ` +
    `[&_b]:[line-height:1.45]`,
  "sd-queue-number": `text-ink-3 text-[12px] pt-[3px]`,
  "dk-cat": `absolute [right:128px] [top:-41px] w-[92px] h-[46px] pointer-events-none [z-index:1] ` +
    `[filter:drop-shadow(0_2px_4px_rgba(0,_0,_0,_0.16))] [&_img]:absolute [&_img]:[top:0] [&_img]:[right:0] ` +
    `[&_img]:[bottom:0] [&_img]:[left:0] [&_img]:w-full [&_img]:h-full [&_img]:[transform-origin:50%_88%] ` +
    `[&_img]:[animation:dk-breathe_3.6s_ease-in-out_infinite] [&_img]:[transition:translate_0.4s_var(--ease)] ` +
    `[&.watch_img]:[translate:0_-2px] [&.watch_img]:[animation-duration:2.2s] [&.awake_img]:[translate:0_-2px] ` +
    `[&.awake_img]:[animation-duration:2.2s] [@media_(max-width:_700px)]:[right:96px] ` +
    `[@media_(max-width:_700px)]:[top:-35px] [@media_(max-width:_700px)]:w-[76px] ` +
    `[@media_(max-width:_700px)]:h-[38px] [@media_(prefers-reduced-motion:_reduce)]:[&_img]:[animation:none] ` +
    `[.ve_.sd-slip_&]:[right:30px] [.ve_.sd-slip_&]:[top:-40px]`,
  "dk-cat-say": `absolute [bottom:calc(100%_+_4px)] [left:50%] [translate:-50%_0] pt-[4px] pr-[9px] pb-[4px] pl-[9px] ` +
    `rounded-full whitespace-nowrap text-[12px] font-medium text-ink-2 [background-color:var(--sd-paper)] ` +
    `[background-image:none] [box-shadow:0_0_0_1px_var(--hair),_0_4px_10px_-6px_rgba(0,_0,_0,_0.3)] ` +
    `[animation:dk-say_0.3s_var(--ease)_both] [@media_(prefers-reduced-motion:_reduce)]:[animation:none]`,
  "dk-cat-heart": `absolute [left:30%] [top:4px] w-[18px] h-[15px] [opacity:0] [animation:dk-heart_1.8s_ease-out] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[animation:none] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[opacity:0]`,
  "sd-pile": `relative inline-block w-[26px] h-[18px] mr-[10px] [vertical-align:-4px] [&_i]:absolute [&_i]:[top:0] ` +
    `[&_i]:[right:0] [&_i]:[bottom:0] [&_i]:[left:0] [&_i]:rounded-[3px] [&_i]:[background-color:var(--sd-paper)] ` +
    `[&_i]:[background-image:none] ` +
    `[&_i]:[box-shadow:0_0_0_1px_color-mix(in_srgb,_var(--sd-line)_30%,_transparent),_0_1px_2px_rgba(48,_40,_26,_0.15)] ` +
    `[&_i:nth-child(1)]:[rotate:-6deg] [&_i:nth-child(2)]:[rotate:4deg] [&_i:nth-child(2)]:[translate:1px_-1px] ` +
    `[&_i:nth-child(3)]:[rotate:-2deg] [&_i:nth-child(3)]:[translate:-1px_-2px] [&_i:nth-child(4)]:[rotate:7deg] ` +
    `[&_i:nth-child(4)]:[translate:1px_-3px] [&_i:nth-child(5)]:[rotate:-4deg] ` +
    `[&_i:nth-child(5)]:[translate:0_-4px] [&_i:last-child]:[animation:sd-toss_0.42s_var(--ease)_both] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[&_i:last-child]:[animation:none]`,
  "sd-slip": `[.ve_&]:relative [.ve_&]:mt-[34px] [.ve_&]:mr-[0] [.ve_&]:mb-[26px] [.ve_&]:ml-[0] [.ve_&]:pt-[26px] ` +
    `[.ve_&]:pr-[30px] [.ve_&]:pb-[24px] [.ve_&]:pl-[30px] [.ve_&]:max-w-[520px] [.ve_&]:[rotate:-0.6deg] ` +
    `[.ve_&]:rounded-[4px] [.ve_&]:[background-color:var(--sd-paper)] ` +
    `[.ve_&]:[background-image:radial-gradient(color-mix(in_srgb,_var(--sd-line)_7%,_transparent)_.5px,_transparent_.7px)] ` +
    `[.ve_&]:[background-size:5px_5px] ` +
    `[.ve_&]:[box-shadow:0_0_0_1px_var(--hair),_0_14px_28px_-20px_rgba(48,_40,_26,_0.45)] ` +
    `[.ve_&]:[animation:sd-settle_0.3s_ease-out] [&_ul]:mt-[0] [&_ul]:mr-[0] [&_ul]:mb-[0] [&_ul]:ml-[0] ` +
    `[&_ul]:pt-[0] [&_ul]:pr-[0] [&_ul]:pb-[0] [&_ul]:pl-[0] [&_ul]:list-none [&_ul]:grid [&_ul]:[row-gap:6px] ` +
    `[&_ul]:[column-gap:6px] [&_li]:grid [&_li]:[grid-template-columns:minmax(84px,_auto)_1fr] ` +
    `[&_li]:[row-gap:12px] [&_li]:[column-gap:12px] [&_li]:text-[14px] [&_li]:[line-height:1.45] [&_li]:text-ink-2 ` +
    `[&_li_b]:font-medium [&_li_b]:text-ink [@media_(max-width:_520px)]:[.ve_&]:pt-[22px] ` +
    `[@media_(max-width:_520px)]:[.ve_&]:pr-[20px] [@media_(max-width:_520px)]:[.ve_&]:pb-[20px] ` +
    `[@media_(max-width:_520px)]:[.ve_&]:pl-[20px] [@media_(max-width:_520px)]:[&_li]:[grid-template-columns:1fr] ` +
    `[@media_(max-width:_520px)]:[&_li]:[row-gap:2px] [@media_(max-width:_520px)]:[&_li]:[column-gap:2px] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[.ve_&]:[animation:none]`,
  "sd-slip-date": `mt-[0] mr-[0] mb-[6px] ml-[0] text-[13px] text-ink-2`,
  "sd-slip-lede": `[.ve_&]:mt-[0] [.ve_&]:mr-[0] [.ve_&]:mb-[10px] [.ve_&]:ml-[0] [.ve_&]:italic [.ve_&]:font-normal ` +
    `[.ve_&]:text-[21px] [.ve_&]:[line-height:1.35] [.ve_&]:[font-family:var(--read)] [.ve_&]:text-ink`,
  "fc": `[--fc-read:"Newsreader_Variable",_Georgia,_serif] [--fc-glass:rgba(250,_250,_252,_0.6)] ` +
    `[--fc-bar:rgba(252,_252,_253,_0.72)] relative [flex:1] min-w-0 min-h-0 grid ` +
    `[grid-template-rows:auto_minmax(0,_1fr)_auto] text-ink not-italic [font-weight:normal] text-[15px] ` +
    `[line-height:1.55] font-sans [background-color:var(--fc-glass)] [background-image:none] ` +
    `[:root[data-theme="dark"]_&]:[--fc-glass:rgba(24,_24,_30,_0.58)] ` +
    `[:root[data-theme="dark"]_&]:[--fc-bar:rgba(24,_24,_24,_0.8)] [&::before]:[content:""] [&::before]:absolute ` +
    `[&::before]:[top:0] [&::before]:[right:0] [&::before]:[bottom:0] [&::before]:[left:0] [&::before]:[z-index:-1] ` +
    `[&::before]:pointer-events-none [&::before]:[backdrop-filter:blur(40px)_saturate(1.8)] ` +
    `[&::before]:[-webkit-backdrop-filter:blur(40px)_saturate(1.8)]`,
  "fc-msg": `[grid-row:2] [align-self:center] [justify-self:center]`,
  "fc-quiet": `mt-[0] mr-[0] mb-[0] ml-[0] text-ink-3 text-[13.5px]`,
  "fc-err": `mt-[0] mr-[0] mb-[0] ml-[0] text-rec text-[13.5px]`,
  "fc-top": `relative [z-index:8] flex items-center [row-gap:14px] [column-gap:14px] pt-[14px] pr-[20px] pb-[0] pl-[20px] ` +
    `[@media_(max-width:_860px)]:flex-wrap [@media_(max-width:_860px)]:[row-gap:10px] ` +
    `[@media_(max-width:_860px)]:[column-gap:10px] [@media_(max-width:_860px)]:pt-[10px] ` +
    `[@media_(max-width:_860px)]:pr-[14px] [@media_(max-width:_860px)]:pb-[10px] ` +
    `[@media_(max-width:_860px)]:pl-[14px]`,
  "fc-close": `[flex:none] w-[34px] h-[34px] min-h-0 pt-[0] pr-[0] pb-[0] pl-[0] grid place-items-center [border-radius:50%] ` +
    `bg-fill [background-image:none] text-ink-2 [&_svg]:w-[14px] [&_svg]:h-[14px] [&:hover]:bg-fill-2 ` +
    `[&:hover]:[background-image:none] [&:hover]:text-ink`,
  "fc-menu": `relative min-w-0`,
  "fc-menu-btn": `min-h-0 flex items-center [row-gap:10px] [column-gap:10px] pt-[5px] pr-[12px] pb-[5px] pl-[12px] ` +
    `rounded-[12px] [background-color:transparent] [background-image:none] [color:inherit] text-left ` +
    `[&:hover:not(:disabled)]:bg-fill [&:hover:not(:disabled)]:[background-image:none] [.fc-menu.open_&]:bg-fill ` +
    `[.fc-menu.open_&]:[background-image:none] [&_>_span]:grid [&_>_span]:min-w-0 [&_b]:text-[16px] ` +
    `[&_b]:[font-weight:650] [&_b]:[letter-spacing:-0.015em] [&_b]:whitespace-nowrap [&_small]:text-[12px] ` +
    `[&_small]:text-ink-3 [&_small]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:text-ellipsis ` +
    `[&_svg]:[flex:none] [&_svg]:w-[12px] [&_svg]:h-[12px] [&_svg]:text-ink-3 ` +
    `[&_svg]:[transition:rotate_0.2s_var(--ease)] [.fc-menu.open_&_svg]:[rotate:180deg]`,
  "fc-menu-list": `absolute [top:calc(100%_+_8px)] [left:0] [z-index:20] w-[300px] [max-height:min(64vh,_560px)] overflow-auto ` +
    `pt-[6px] pr-[6px] pb-[6px] pl-[6px] rounded-[16px] bg-panel [background-image:none] ` +
    `[box-shadow:0_0_0_1px_var(--hair),_0_24px_48px_-20px_rgba(0,_0,_0,_0.45)] [scrollbar-width:thin] ` +
    `[animation:fc-pop_0.18s_var(--ease)] [@media_(prefers-reduced-motion:_reduce)]:[animation:none]`,
  "fc-menu-part": `[&_p]:mt-[8px] [&_p]:mr-[10px] [&_p]:mb-[4px] [&_p]:ml-[10px] [&_p]:text-[12px] [&_p]:font-semibold ` +
    `[&_p]:text-ink-3 [&_button]:w-full [&_button]:min-h-[36px] ` +
    `[&_button]:flex [&_button]:items-center [&_button]:justify-between [&_button]:[row-gap:12px] ` +
    `[&_button]:[column-gap:12px] [&_button]:pt-[6px] [&_button]:pr-[10px] [&_button]:pb-[6px] [&_button]:pl-[10px] ` +
    `[&_button]:rounded-[9px] [&_button]:[background-color:transparent] [&_button]:[background-image:none] ` +
    `[&_button]:text-ink [&_button]:text-[14px] [&_button]:font-medium [&_button]:text-left ` +
    `[&_button:hover]:bg-fill [&_button:hover]:[background-image:none] [&_button[aria-current]]:bg-accent-soft ` +
    `[&_button[aria-current]]:[background-image:none] [&_button[aria-current]]:text-accent-ink [&_i]:not-italic ` +
    `[&_i]:text-[12px] [&_i]:text-ink-3 [&_i]:tabular-nums [&_i.done]:text-ok [&_i.done]:font-semibold`,
  "fc-progress": `[flex:1] min-w-0 flex items-center justify-center [row-gap:12px] [column-gap:12px] ` +
    `[@media_(max-width:_860px)]:[order:3] [@media_(max-width:_860px)]:[flex-basis:100%]`,
  "fc-segs": `flex [row-gap:3px] [column-gap:3px] [width:min(100%,_360px)] [&_i]:[flex:1] [&_i]:h-[5px] [&_i]:rounded-[99px] ` +
    `[&_i]:bg-fill-2 [&_i]:[background-image:none] [&_i]:[transition:background-color_0.3s_ease] [&_i.on]:bg-accent ` +
    `[&_i.on]:[background-image:none] ` +
    `[&_i.now]:[background-color:color-mix(in_srgb,_var(--accent)_40%,_var(--fill-2))] ` +
    `[&_i.now]:[background-image:none]`,
  "fc-count": `[flex:none] text-[13px] text-ink-3 tabular-nums whitespace-nowrap [&_b]:text-ink [&_b]:[font-weight:650]`,
  "fc-full": `[flex:none] inline-flex items-center [row-gap:7px] [column-gap:7px] pt-[8px] pr-[12px] pb-[8px] pl-[12px] ` +
    `rounded-[99px] bg-fill [background-image:none] text-ink-2 text-[13px] font-medium [text-decoration:none] ` +
    `[&_svg]:w-[15px] [&_svg]:h-[15px] [&:hover]:bg-fill-2 [&:hover]:[background-image:none] [&:hover]:text-ink ` +
    `[@media_(max-width:_860px)]:[&_span]:hidden [@media_(max-width:_860px)]:[margin-left:auto] ` +
    `[@media_(max-width:_860px)]:pt-[8px] [@media_(max-width:_860px)]:pr-[8px] [@media_(max-width:_860px)]:pb-[8px] ` +
    `[@media_(max-width:_860px)]:pl-[8px]`,
  "fc-stage": `relative min-h-0 grid place-items-center pt-[40px] pr-[24px] pb-[64px] pl-[24px] overflow-hidden ` +
    `[@media_(max-height:_820px)]:pt-[28px] [@media_(max-width:_860px)]:pt-[30px] ` +
    `[@media_(max-width:_860px)]:pr-[14px] [@media_(max-width:_860px)]:pb-[14px] ` +
    `[@media_(max-width:_860px)]:pl-[14px]`,
  "fc-table": `w-full h-full [max-height:600px] min-h-0 grid [grid-template-rows:minmax(0,_1fr)] ` +
    `[grid-template-columns:auto_minmax(0,_560px)_auto] justify-center items-center [row-gap:36px] ` +
    `[column-gap:36px] [@media_(max-width:_860px)]:[grid-template-columns:1fr_1fr] ` +
    `[@media_(max-width:_860px)]:[grid-template-rows:minmax(0,_1fr)_auto] ` +
    `[@media_(max-width:_860px)]:[row-gap:14px] [@media_(max-width:_860px)]:[column-gap:24px]`,
  "fc-pile": `relative h-full min-h-0 grid [grid-template:minmax(0,_1fr)_/_minmax(0,_1fr)] ` +
    `[@media_(max-width:_860px)]:[grid-column:1_/_-1] [@media_(max-width:_860px)]:[grid-row:1]`,
  "fc-card": `[--ink:#f2f2f5] [--ink-2:#c9c9d3] [--ink-3:#9a9aa6] [--hair:rgba(255,_255,_255,_0.1)] ` +
    `[--fill:rgba(255,_255,_255,_0.07)] [--fill-2:rgba(255,_255,_255,_0.12)] [--page:#181818] [--panel:#212121] ` +
    `[--wave:rgba(255,_255,_255,_0.22)] [--wave-played:#fff] [--ve-card:rgba(255,_255,_255,_0.07)] ` +
    `[--ve-paper:#1d1d1d] [--accent:var(--chosen-dark-accent,_#e0643c)] [--focus:var(--accent)] ` +
    `[--accent-rgb:var(--chosen-dark-rgb,_224,_100,_60)] [--accent-on:var(--chosen-dark-on,_#fff)] ` +
    `[--accent-ink:var(--accent-dark-ink)] [--ok:#4cc38a] [--ok-soft:rgba(76,_195,_138,_0.16)] ` +
    `[--accent-soft:rgba(var(--accent-rgb),_0.2)] [grid-area:1_/_1] relative flex flex-col min-h-0 rounded-[28px] ` +
    `overflow-hidden [background-color:#1c1c21] [background-image:none] text-ink ` +
    `[box-shadow:inset_0_1px_0_rgba(255,_255,_255,_0.08),_0_0_0_1px_rgba(255,_255,_255,_0.06),_0_30px_60px_-28px_rgba(0,_0,_0,_0.7)] ` +
    `[touch-action:pan-y] [transform-origin:50%_85%] [&.top]:[cursor:grab] [&.top:active]:[cursor:grabbing] ` +
    `[&.under]:pointer-events-none [&.under]:[transform-origin:50%_0%] [&.under]:[background-color:#2a2a31] ` +
    `[&.under]:[background-image:none] ` +
    `[&.under]:[box-shadow:inset_0_1px_0_rgba(255,_255,_255,_0.12),_0_-6px_18px_-12px_rgba(0,_0,_0,_0.6)] ` +
    `[&.leaving]:pointer-events-none [.fc-card.under_+_&.under]:[background-color:#34343c] ` +
    `[.fc-card.under_+_&.under]:[background-image:none] [&.end]:[width:min(100%,_520px)] [&.end]:[max-height:100%]`,
  "fc-head": `relative [flex:none] h-[176px] [@media_(max-height:_820px)]:h-[140px]`,
  "fc-art": `absolute [top:0] [right:0] [bottom:-70px] [left:0] ` +
    `[-webkit-mask-image:linear-gradient(to_bottom,_#000_40%,_transparent)] ` +
    `[mask-image:linear-gradient(to_bottom,_#000_40%,_transparent)]`,
  "fc-illo": `absolute [left:50%] [bottom:0] [width:min(92%,_440px)] [height:calc(100%_-_16px)] [translate:-50%_0] ` +
    `[filter:drop-shadow(0_8px_14px_rgba(0,_0,_0,_0.18))]`,
  "fc-body": `relative [flex:1] min-h-0 overflow-auto pt-[4px] pr-[30px] pb-[22px] pl-[30px] flex flex-col [row-gap:12px] ` +
    `[column-gap:12px] [scrollbar-width:thin] [scrollbar-color:rgba(255,_255,_255,_0.2)_transparent] ` +
    `[&.lede]:justify-center [&.lede]:pb-[34px] [&.step]:justify-center [&.step]:pb-[34px] [&.video]:justify-center ` +
    `[&.video]:pb-[34px] [&.text_>_.fc-say]:[margin-top:auto] [&.text_>_.fc-md:first-child]:[margin-top:auto] ` +
    `[@media_(max-width:_860px)]:pt-[4px] [@media_(max-width:_860px)]:pr-[20px] ` +
    `[@media_(max-width:_860px)]:pb-[18px] [@media_(max-width:_860px)]:pl-[20px]`,
  "fc-chip": `absolute [left:18px] [top:16px] inline-flex items-center [row-gap:5px] [column-gap:5px] pt-[4px] pr-[11px] ` +
    `pb-[4px] pl-[11px] rounded-[99px] text-[12px] font-semibold [color:#fff] ` +
    `[background-color:rgba(15,_15,_22,_0.5)] [background-image:none] [backdrop-filter:blur(10px)] ` +
    `[-webkit-backdrop-filter:blur(10px)] [.fc-card.top_&]:[background-color:rgba(28,_28,_33,_0.55)] ` +
    `[.fc-card.top_&]:[background-image:none] [.fc-card.top_&.care]:[background-color:rgba(15,_15,_22,_0.55)] ` +
    `[.fc-card.top_&.care]:[background-image:none] [.fc-card.top_&.care]:[color:#ffb59a] [&_svg]:w-[13px] ` +
    `[&_svg]:h-[13px]`,
  "fc-title": `mt-[0] mr-[0] mb-[0] ml-[0] text-[26px] [font-weight:650] [letter-spacing:-0.025em] [line-height:1.15] ` +
    `[text-wrap:balance]`,
  "fc-md": `[&.fc-md]:mt-[0] [&.fc-md]:mr-[0] [&.fc-md]:mb-[0] [&.fc-md]:ml-[0] [&.fc-md]:not-italic [&.fc-md]:font-normal ` +
    `[&.fc-md]:text-[18px] [&.fc-md]:[line-height:1.6] [&.fc-md]:[font-family:var(--fc-read)] [&.fc-md]:text-ink-2 ` +
    `[&.fc-md]:[text-wrap:pretty] [&.fc-md_p]:mt-[0] [&.fc-md_p]:mr-[0] [&.fc-md_p]:[margin-bottom:0.6em] ` +
    `[&.fc-md_p]:ml-[0] [&.fc-md_p:last-child]:mb-[0] [&.fc-md_a]:text-accent-ink [&.fc-md.small]:text-[15.5px] ` +
    `[&.fc-md.small]:[line-height:1.5]`,
  "fc-say": `mt-[8px] mr-[0] mb-[0] ml-[0] not-italic font-semibold text-[38px] [line-height:1.15] font-sans ` +
    `[letter-spacing:-0.035em] [text-wrap:balance] [overflow-wrap:anywhere] [&.long]:not-italic ` +
    `[&.long]:font-medium [&.long]:text-[20px] [&.long]:[line-height:1.6] [&.long]:[font-family:var(--fc-read)] ` +
    `[&.long]:tracking-[0] [&.long]:[text-wrap:pretty] [&.long]:[user-select:text] ` +
    `[&.long]:[-webkit-user-select:text] [@media_(max-height:_820px)]:text-[32px] ` +
    `[@media_(max-width:_860px)]:text-[30px]`,
  "fc-hint": `mt-[0] mr-[0] mb-[0] ml-[0] text-ink-3 not-italic font-normal text-[16px] [line-height:1.55] ` +
    `[font-family:var(--fc-read)]`,
  "fc-stamp": `absolute [top:58px] [z-index:3] pt-[5px] pr-[12px] pb-[5px] pl-[12px] [border-top-width:3px] ` +
    `[border-top-style:solid] [border-top-color:currentColor] [border-right-width:3px] [border-right-style:solid] ` +
    `[border-right-color:currentColor] [border-bottom-width:3px] [border-bottom-style:solid] ` +
    `[border-bottom-color:currentColor] [border-left-width:3px] [border-left-style:solid] ` +
    `[border-left-color:currentColor] rounded-[12px] [background-color:rgba(15,_15,_22,_0.45)] ` +
    `[background-image:none] not-italic [font-weight:800] text-[18px] [line-height:1.1] font-sans ` +
    `[letter-spacing:0.08em] uppercase pointer-events-none [backdrop-filter:blur(6px)] ` +
    `[-webkit-backdrop-filter:blur(6px)] [&.got]:[left:22px] [&.got]:[color:#5be0a0] [&.got]:[rotate:-10deg] ` +
    `[&.again]:[right:22px] [&.again]:[color:var(--accent-dark-ink)] [&.again]:[rotate:10deg]`,
  "fc-take": `grid [row-gap:4px] [column-gap:4px] pt-[12px] pr-[14px] pb-[12px] pl-[14px] rounded-[16px] bg-fill ` +
    `[background-image:none]`,
  "fc-tips": `[border-top-width:1px] [border-top-style:solid] [border-top-color:var(--hair)] pt-[8px] [margin-top:auto] ` +
    `[&_ol]:list-none [&_ol]:[counter-reset:tip] [&_ol]:mt-[6px] [&_ol]:mr-[0] [&_ol]:mb-[0] [&_ol]:ml-[0] ` +
    `[&_ol]:pt-[0] [&_ol]:pr-[0] [&_ol]:pb-[0] [&_ol]:pl-[0] [&_ol]:grid [&_ol]:[row-gap:12px] ` +
    `[&_ol]:[column-gap:12px] [&_li]:[counter-increment:tip] [&_li]:relative [&_li]:pl-[32px] ` +
    `[&_li::before]:[content:counter(tip)] [&_li::before]:absolute [&_li::before]:[left:0] [&_li::before]:[top:1px] ` +
    `[&_li::before]:w-[22px] [&_li::before]:h-[22px] [&_li::before]:grid [&_li::before]:place-items-center ` +
    `[&_li::before]:rounded-[7px] [&_li::before]:bg-fill-2 [&_li::before]:[background-image:none] ` +
    `[&_li::before]:text-ink-2 [&_li::before]:not-italic [&_li::before]:font-semibold [&_li::before]:text-[12px] ` +
    `[&_li::before]:[line-height:normal] [&_li::before]:font-sans [&_li.care::before]:[content:"♥"] ` +
    `[&_li.care::before]:[color:var(--accent-dark-ink)] [&_li_b]:block [&_li_b]:mb-[2px] [&_li_b]:text-[14.5px]`,
  "fc-foot": `flex items-center justify-between flex-wrap [row-gap:4px] [column-gap:16px]`,
  "fc-tips-btn": `min-h-0 inline-flex items-center [row-gap:7px] [column-gap:7px] pt-[6px] pr-[2px] pb-[6px] pl-[2px] ` +
    `[background-color:transparent] [background-image:none] [color:#ffc38a] text-[13.5px] font-semibold ` +
    `[&_svg]:w-[16px] [&_svg]:h-[16px] [&:hover]:[color:#ffd7b0] ` +
    `[@media_(max-width:_560px)]:[&_.fc-tips-for]:hidden`,
  "fc-hurt": `min-h-0 inline-flex items-center [column-gap:6px] pt-[6px] pr-[2px] pb-[6px] pl-[2px] ` +
    `[margin-left:auto] [background-color:transparent] [background-image:none] text-ink-3 text-[12.5px] font-medium ` +
    `[transition:color_0.15s_ease] [&_svg]:w-[14px] [&_svg]:h-[14px] [&:hover]:[color:var(--accent-dark-ink)]`,
  "fc-side": `min-h-0 pt-[0] pr-[0] pb-[0] pl-[0] grid [justify-items:center] [row-gap:8px] [column-gap:8px] ` +
    `[background-color:transparent] [background-image:none] text-ink-2 text-[13px] font-semibold ` +
    `[&[aria-disabled="true"]]:[opacity:0.4] [&[aria-disabled="true"]]:[cursor:not-allowed] ` +
    `[&:disabled]:[opacity:0.4] [&:disabled]:[cursor:not-allowed] [@media_(max-width:_860px)]:[grid-row:2] ` +
    `[@media_(max-width:_860px)]:[&.again]:[justify-self:end] ` +
    `[@media_(max-width:_860px)]:[&.got]:[justify-self:start]`,
  "fc-side-ic": `w-[64px] h-[64px] grid place-items-center [border-radius:50%] bg-panel [background-image:none] ` +
    `[box-shadow:0_0_0_1px_var(--hair),_0_14px_30px_-14px_rgba(0,_0,_0,_0.45)] ` +
    `[transition:transform_0.18s_var(--ease),_background-color_0.2s_ease,_color_0.2s_ease] [&_svg]:w-[26px] ` +
    `[&_svg]:h-[26px] [.fc-side.got_&]:text-ok [.fc-side.again_&]:text-accent-ink ` +
    `[.fc-side:hover:not(:disabled):not([aria-disabled="true"])_&]:[transform:translateY(-2px)_scale(1.04)] ` +
    `[.fc-side.got:hover:not(:disabled):not([aria-disabled="true"])_&]:bg-ok ` +
    `[.fc-side.got:hover:not(:disabled):not([aria-disabled="true"])_&]:[background-image:none] ` +
    `[.fc-side.got:hover:not(:disabled):not([aria-disabled="true"])_&]:[color:#fff] ` +
    `[.fc-side.again:hover:not(:disabled):not([aria-disabled="true"])_&]:bg-accent ` +
    `[.fc-side.again:hover:not(:disabled):not([aria-disabled="true"])_&]:[background-image:none] ` +
    `[.fc-side.again:hover:not(:disabled):not([aria-disabled="true"])_&]:text-accent-on ` +
    `[.fc-side:active:not(:disabled)_&]:[transform:scale(0.95)] [@media_(max-width:_860px)]:w-[54px] ` +
    `[@media_(max-width:_860px)]:h-[54px] [@media_(prefers-reduced-motion:_reduce)]:[transition:none]`,
  "fc-undo": `absolute [left:50%] [bottom:calc(100%_+_12px)] [z-index:10] [translate:-50%_0] inline-flex items-center ` +
    `[row-gap:12px] [column-gap:12px] pt-[7px] pr-[7px] pb-[7px] pl-[16px] rounded-[99px] bg-ink ` +
    `[background-image:none] text-page text-[13px] font-medium [box-shadow:0_12px_28px_-12px_rgba(0,_0,_0,_0.5)] ` +
    `[animation:fc-pop_0.2s_var(--ease)] [&_button]:min-h-[28px] [&_button]:pt-[0] [&_button]:pr-[12px] ` +
    `[&_button]:pb-[0] [&_button]:pl-[12px] [&_button]:rounded-[99px] ` +
    `[&_button]:[background-color:color-mix(in_srgb,_var(--page)_18%,_transparent)] ` +
    `[&_button]:[background-image:none] [&_button]:[color:inherit] [&_button]:text-[12.5px] ` +
    `[&_button]:font-semibold [@media_(prefers-reduced-motion:_reduce)]:[animation:none]`,
  "fc-row": `flex flex-wrap [row-gap:8px] [column-gap:8px] mt-[6px]`,
  "fc-primary": `min-h-[42px] pt-[0] pr-[18px] pb-[0] pl-[18px] rounded-[99px] [background-color:#fff] [background-image:none] ` +
    `[color:#171717] font-semibold`,
  "fc-ghost": `min-h-[42px] pt-[0] pr-[16px] pb-[0] pl-[16px] rounded-[99px] [background-color:rgba(255,_255,_255,_0.1)] ` +
    `[background-image:none] [color:#fff] font-medium`,
  "fc-dock": `relative [z-index:4]`,
  // `!`: it also carries .ve, whose page grid would otherwise squeeze the recorder into the sidebar column.
  // The card recorder: idle, a snug capsule of two matching pills; recording, it opens wide for the live line.
  // `!`: it also carries .ve, whose page grid and button sizes would otherwise win.
  "fc-ve": `block! max-w-[640px] mt-[0] [margin-right:auto] mb-[6px] [margin-left:auto] pt-[12px] pr-[20px] pb-[12px] ` +
    `pl-[20px] rounded-[22px] [background-color:var(--fc-bar)] [background-image:none] ` +
    `[box-shadow:0_0_0_1px_var(--hair),_0_18px_40px_-24px_rgba(0,_0,_0,_0.5)] [&::before]:hidden ` +
    `[@media_(max-width:_860px)]:pt-[12px] [@media_(max-width:_860px)]:pr-[14px] ` +
    `[@media_(max-width:_860px)]:pb-[12px] [@media_(max-width:_860px)]:pl-[14px] ` +
    `[&:has(.ve-dock.idle)]:w-fit [&:has(.ve-dock.idle)]:rounded-[99px] [&:has(.ve-dock.idle)]:p-[6px]! ` +
    `[&_.ve-dock.idle]:[column-gap:6px]! [&_.ve-dock.idle_.ve-dock-sub]:[column-gap:6px]! ` +
    `[&_.ve-rec]:h-[40px]! [&_.ve-rec]:pl-[16px]! [&_.ve-rec]:pr-[18px]! ` +
    `[&_.ve-note]:h-[40px]! [&_.ve-note]:rounded-[99px]! [&_.ve-note]:pl-[14px]! [&_.ve-note]:pr-[16px]! ` +
    `[&_.ve-note]:text-[13.5px]! [&_.ve-note:not([aria-pressed="true"])]:[background-color:var(--fill)]!`,
  "fc-say-first": `flex items-center justify-center [column-gap:6px] mt-[0] mr-[0] mb-[14px] ml-[0] text-[12.5px] ` +
    `font-medium text-ink-3 [transition:color_0.2s_ease] [&_svg]:w-[13px] [&_svg]:h-[13px] [&_svg]:[flex:none] ` +
    `[&.ok]:text-ok`,
  "fc-keys": `mt-[0] mr-[0] mb-[0] ml-[0] pt-[16px] pr-[24px] pb-[16px] pl-[24px] flex items-center justify-center ` +
    `[row-gap:10px] [column-gap:10px] text-ink-3 text-[13px] [&_kbd]:[opacity:0.8] ` +
    `[@media_(max-width:_860px)]:hidden`,
  // Practice Home and Chapters (direction A, November 2026): a greeting, sections with a quiet link,
  // and chapters as tiles grouped by part.
  "ve-greet": `[&_p]:mt-[0] [&_p]:mb-[0] [&_p]:text-[15px] [&_p]:font-medium [&_p]:text-ink-3 ` +
    `[&_h1]:[font-size:clamp(30px,_3.4vw,_40px)]!`,
  "ve-home-chapters": `mt-[40px]`,
  // Learn and Practise on a chapter: a segmented control, as in DESIGN.md.
  "ve-tabs": `inline-flex p-[3px] mb-[28px] rounded-[12px] bg-fill [column-gap:2px] ` +
    `[.ve_&_button]:h-[36px] [.ve_&_button]:px-[16px] [.ve_&_button]:rounded-[9px] [.ve_&_button]:text-[14px] ` +
    `[.ve_&_button]:font-medium [.ve_&_button]:text-ink-2 [.ve_&_button]:inline-flex [.ve_&_button]:items-center ` +
    `[.ve_&_button]:[column-gap:8px] [.ve_&_button]:[transition:background-color_0.15s_ease,_color_0.15s_ease] ` +
    `[.ve_&_button[aria-selected="true"]]:bg-panel [.ve_&_button[aria-selected="true"]]:text-ink ` +
    `[.ve_&_button[aria-selected="true"]]:[box-shadow:0_0_0_1px_var(--hair),_0_1px_2px_rgba(0,_0,_0,_0.08)] ` +
    `[.ve_&_button:hover:not([aria-selected="true"])]:text-ink [&_button_span]:text-[12px] [&_button_span]:text-ink-3 ` +
    `[&_button_span]:font-normal [&_button_span]:tabular-nums`,
  "ve-sec-h": `flex items-baseline justify-between [column-gap:16px] mb-[4px] [&_h2]:m-0 [&_h2]:text-[20px] ` +
    `[&_h2]:font-semibold [&_h2]:text-ink [&_h2]:[letter-spacing:-0.02em] [&_a]:text-[14px] [&_a]:font-medium ` +
    `[&_a]:text-ink-2 [&_a]:no-underline [&_a:hover]:text-ink`,
  "ve-cparts": `grid [row-gap:8px] [scroll-margin-top:24px]`,
  "ve-cpart-h": `mt-[20px] mb-[10px] text-[13px] font-semibold text-ink-3`,
  "ve-cgrid": `list-none m-0 p-0 grid [grid-template-columns:repeat(auto-fill,_minmax(190px,_1fr))] gap-[10px] [@media_(max-width:_600px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]`,
  "ve-ctile": `flex flex-col [row-gap:4px] h-full min-h-[104px] pt-[14px] pr-[16px] pb-[14px] pl-[16px] rounded-[14px] ` +
    `bg-panel [box-shadow:0_0_0_1px_var(--hair)] no-underline text-ink ` +
    `[transition:background-color_0.15s_ease,_box-shadow_0.15s_ease,_transform_0.15s_var(--ease)] ` +
    `[&:hover]:[box-shadow:0_0_0_1px_var(--line-strong),_0_8px_24px_-16px_rgba(0,_0,_0,_0.35)] ` +
    `[&:active]:[transform:scale(0.98)] ` +
    `[&_.n]:text-[12px] [&_.n]:font-medium [&_.n]:text-ink-3 [&_.n]:tabular-nums ` +
    `[&_b]:text-[15px] [&_b]:font-semibold [&_b]:[letter-spacing:-0.01em] [&_b]:[line-height:1.3] ` +
    `[&_small]:text-[13px] [&_small]:text-ink-3 [&_small]:[line-height:1.4] ` +
    `[&_.m]:mt-auto [&_.m]:pt-[8px] [&_.m]:flex [&_.m]:items-center [&_.m]:[column-gap:6px] [&_.m]:text-[12px] ` +
    `[&_.m]:font-medium [&_.m]:text-ink-3 [&.next_.m]:text-accent-ink [&.next]:[box-shadow:0_0_0_1.5px_var(--accent)] ` +
    `[@media_(prefers-reduced-motion:_reduce)]:[&:active]:[transform:none]`,
  "ve-cover-card": `h-[clamp(140px,_22vw,_220px)] rounded-[16px] [background-size:cover] [background-position:center_40%] ` +
    `mb-[24px] [box-shadow:0_0_0_1px_var(--hair)]`,
} as const;
