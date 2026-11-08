/** Static page recipes. Marker classes remain for accessibility, interaction and browser checks. */
export const pages = {
  tx: `w-full max-w-[960px] mx-auto [container-type:inline-size]`,
  txLoading: `mt-0 mr-0 mb-0 ml-0 pt-[48px] pr-0 pb-[48px] pl-0 text-center text-[13px] text-ink-3`,
  txHead: `mt-[10px] mr-0 mb-[22px] ml-0 [&_h1]:text-[28px] [&_h1]:leading-[1.15] [&_h1]:tracking-[-0.035em] [&_h1]:mt-0 ` +
    `[&_h1]:mr-0 [&_h1]:mb-[8px] [&_h1]:ml-0 [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 ` +
    `[&_p]:text-ink-2 [&_p]:max-w-[68ch] [&_p]:text-pretty ` +
    `[@media(max-width:_700px)]:[&_p:not(.open)]:[display:-webkit-box] [@media(max-width:_700px)]:[&_p:not(.open)]:[-webkit-box-orient:vertical] ` +
    `[@media(max-width:_700px)]:[&_p:not(.open)]:[-webkit-line-clamp:4] [@media(max-width:_700px)]:[&_p:not(.open)]:overflow-hidden`,
  txBack: `inline-flex items-center gap-[5px] min-h-[32px] mb-[6px] text-[13px] font-medium text-ink-2 no-underline hover:text-ink`,
  txMore: `hidden [@media(max-width:_700px)]:inline mt-[6px] p-0 min-h-0 border-0 bg-transparent text-[13px] font-medium ` +
    `text-ink underline [text-underline-offset:3px] [text-decoration-color:var(--line-strong)]`,
  txFoot: `mt-[32px] mr-0 mb-0 ml-0 text-pretty text-[13px] text-ink-3 [&_a]:text-ink-2 [&_a]:no-underline ` +
    `[&_a:hover]:text-ink [&_a:hover]:underline [&_a:hover]:decoration-[currentColor]`,
  txCredit: `[&_a]:text-ink-2 [&_a]:no-underline [&_a:hover]:text-ink [&_a:hover]:underline ` +
    `[&_a:hover]:decoration-[currentColor] mt-[8px] mr-0 mb-0 ml-0 text-[12px] text-ink-3`,
  txLevels: `[&.tx-levels]:flex w-full [@media(min-width:_701px)]:[&.tx-levels]:flex-wrap ` +
    `[@media(min-width:_701px)]:[mask-image:none]! [@media(min-width:_701px)]:[animation:none]! ` +
    `[mask-image:linear-gradient(to_right,_transparent,_#000_var(--tx-l),_#000_calc(100%_-_var(--tx-r)),_transparent)] ` +
    `[&.tx-levels_button]:text-[13px] [@supports(animation-timeline:_scroll())]:[animation:tx-edges_linear_both] ` +
    `[@supports(animation-timeline:_scroll())]:[animation-timeline:scroll(self_inline)] [&_+_.tx-level]:mt-[22px]`,
  txLevel: `mt-[28px]`,
  txLevelHead: `flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] mb-[6px] [&_h2]:mt-0 [&_h2]:mr-0 [&_h2]:mb-0 ` +
    `[&_h2]:ml-0 [&_h2]:text-[17px] [&_h2]:tracking-[-0.02em] [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 ` +
    `[&_p]:text-[13px] [&_p]:text-ink-3`,
  txList: `list-none mt-0 mr-[-10px] mb-0 ml-[-10px] pt-0 pr-0 pb-0 pl-0 [&_li]:relative [&_li::before]:content-[''] ` +
    `[&_li::before]:absolute [&_li::before]:left-[10px] [&_li::before]:right-[10px] [&_li::before]:top-0 ` +
    `[&_li::before]:[border-top:1px_solid_var(--hair)] [&_li::before]:[transition:opacity_0.15s] ` +
    `[@media(hover:_hover)]:[&_li:hover::before]:opacity-[0] ` +
    `[@media(hover:_hover)]:[&_li:hover_+_li::before]:opacity-[0] [&_li:focus-within::before]:opacity-[0] ` +
    `[&_li:focus-within_+_li::before]:opacity-[0]`,
  txRow: `w-full min-h-[52px] flex items-center justify-between gap-y-[16px] gap-x-[16px] pt-[10px] pr-[10px] pb-[10px] ` +
    `pl-[10px] rounded-tl-[10px] rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] text-left font-normal ` +
    `text-ink [@media(hover:_hover)]:[&:hover]:bg-fill [@media(hover:_hover)]:[&:hover_.tx-go]:bg-fill-2 ` +
    `[@media(hover:_hover)]:[&:hover_.tx-go]:text-ink [&:active:not(:disabled)]:transform-none ` +
    `[&:active:not(:disabled)]:bg-fill-2 [&:focus-visible_.tx-go]:bg-fill-2 [&:focus-visible_.tx-go]:text-ink`,
  txSay: `grid gap-y-[2px] gap-x-[2px] min-w-0`,
  txText: `font-[450] [overflow-wrap:anywhere] [&.passage]:[display:-webkit-box] ` +
    `[&.passage]:[-webkit-box-orient:vertical] [&.passage]:[-webkit-line-clamp:2] [&.passage]:[line-clamp:2] ` +
    `[&.passage]:overflow-hidden`,
  txHint: `text-[13px] leading-[1.4] text-ink-3`,
  txGo: `flex-none pt-[4px] pr-[10px] pb-[4px] pl-[10px] rounded-tl-[999px] rounded-tr-[999px] rounded-br-[999px] ` +
    `rounded-bl-[999px] text-[13px] font-medium text-ink-2 [transition:background-color_0.15s,_color_0.15s]`,
  lbList: `list-none mt-0 mr-0 mb-0 ml-0 pt-0 pr-0 pb-0 pl-0 [&_>_li]:pt-[24px] [&_>_li]:pr-0 [&_>_li]:pb-[24px] ` +
    `[&_>_li]:pl-0 [&_>_li]:[border-top:1px_solid_var(--hair)] [&_>_li:first-child]:pt-[4px] ` +
    `[&_>_li:first-child]:[border-top:0]`,
  lbEx: `grid gap-y-[12px] gap-x-[12px] justify-items-start [&_>_*]:mt-0 [&_>_*]:mr-0 [&_>_*]:mb-0 [&_>_*]:ml-0`,
  lbExHead: `w-full flex items-baseline justify-between gap-y-[12px] gap-x-[12px] [&_h2]:mt-0 [&_h2]:mr-0 [&_h2]:mb-0 ` +
    `[&_h2]:ml-0 [&_h2]:text-[18px] [&_h2]:tracking-[-0.02em]`,
  lbSub: `flex flex-wrap items-center gap-y-[6px] gap-x-[10px] [&.lb-sub]:mt-[-4px]`,
  lbTags: `flex flex-wrap gap-y-[6px] gap-x-[6px] list-none mt-0 mr-0 mb-0 ml-0 pt-0 pr-0 pb-0 pl-0 [&_li]:pt-[2px] ` +
    `[&_li]:pr-[9px] [&_li]:pb-[2px] [&_li]:pl-[9px] [&_li]:rounded-tl-[999px] [&_li]:rounded-tr-[999px] ` +
    `[&_li]:rounded-br-[999px] [&_li]:rounded-bl-[999px] [&_li]:bg-fill [&_li]:text-[11.5px] [&_li]:font-semibold ` +
    `[&_li]:text-ink-2`,
  lbMeta: `text-[13px] text-ink-3`,
  lbPurpose: `max-w-[62ch]`,
  lbCue: `flex gap-y-[10px] gap-x-[10px] items-baseline max-w-[62ch] text-ink-2 [&_span]:flex-none [&_span]:text-[13px] ` +
    `[&_span]:font-medium [&_span]:text-ink-3`,
  lbMore: `w-full [&_>_.body]:text-[14px] [&_>_.body]:text-ink-2 [&_ol]:mt-0 [&_ol]:mr-0 [&_ol]:mb-[12px] [&_ol]:ml-0 ` +
    `[&_ol]:pl-[20px] [&_ol_li_+_li]:mt-[4px] [&_h3]:mt-[4px] [&_h3]:mr-0 [&_h3]:mb-[6px] [&_h3]:ml-0 ` +
    `[&_h3]:text-[14px] [&_h3]:text-ink [&_dl]:grid [&_dl]:grid-cols-[160px_minmax(0,_1fr)] [&_dl]:gap-y-[8px] ` +
    `[&_dl]:gap-x-[16px] [&_dl]:mt-[4px] [&_dl]:mr-0 [&_dl]:mb-0 [&_dl]:ml-0 [&_dl]:pt-[12px] ` +
    `[&_dl]:[border-top:1px_solid_var(--hair)] [&_dt]:font-semibold [&_dt]:text-ink [&_dd]:mt-0 [&_dd]:mr-0 ` +
    `[&_dd]:mb-0 [&_dd]:ml-0 [&_a]:text-ink [@container(max-width:_560px)]:[&_dl]:grid-cols-[1fr] ` +
    `[@container(max-width:_560px)]:[&_dl]:gap-y-[2px] [@container(max-width:_560px)]:[&_dl]:gap-x-[2px] ` +
    `[@container(max-width:_560px)]:[&_dd_+_dt]:mt-[8px]`,
  lbLicence: `mt-[12px] mr-0 mb-0 ml-0 text-[12px] text-ink-3`,
  lbCaps: `mt-[4px] pt-[24px] [border-top:1px_solid_var(--hair)] [&_h2]:mt-0 [&_h2]:mr-0 [&_h2]:mb-[10px] [&_h2]:ml-0 ` +
    `[&_h2]:text-[18px] [&_h2]:tracking-[-0.02em] [&_table]:text-[13px] [&_th]:pt-[10px] [&_th]:pr-[10px] ` +
    `[&_th]:pb-[10px] [&_th]:pl-0 [&_td]:pt-[10px] [&_td]:pr-[10px] [&_td]:pb-[10px] [&_td]:pl-0 [&_td]:text-ink-2 ` +
    `[&_thead_th]:text-[12px] [&_thead_th]:font-medium [&_tbody_th]:w-[17%] [&_tbody_th]:text-[13px] ` +
    `[&_tbody_th]:font-semibold [&_tbody_th]:text-ink [&_.tx-foot]:mt-[14px] ` +
    `[@container(max-width:_560px)]:[&_thead]:absolute [@container(max-width:_560px)]:[&_thead]:w-[1px] ` +
    `[@container(max-width:_560px)]:[&_thead]:h-[1px] [@container(max-width:_560px)]:[&_thead]:overflow-hidden ` +
    `[@container(max-width:_560px)]:[&_thead]:[clip:rect(0_0_0_0)] [@container(max-width:_560px)]:[&_table]:block ` +
    `[@container(max-width:_560px)]:[&_tbody]:block [@container(max-width:_560px)]:[&_tr]:block ` +
    `[@container(max-width:_560px)]:[&_tr]:pt-[12px] [@container(max-width:_560px)]:[&_tr]:pr-0 ` +
    `[@container(max-width:_560px)]:[&_tr]:pb-[12px] [@container(max-width:_560px)]:[&_tr]:pl-0 ` +
    `[@container(max-width:_560px)]:[&_tr]:[border-bottom:1px_solid_var(--hair)] ` +
    `[@container(max-width:_560px)]:[&_th]:block [@container(max-width:_560px)]:[&_th]:pt-0 ` +
    `[@container(max-width:_560px)]:[&_th]:pr-0 [@container(max-width:_560px)]:[&_th]:pb-0 ` +
    `[@container(max-width:_560px)]:[&_th]:pl-0 [@container(max-width:_560px)]:[&_th]:[border-top:0] ` +
    `[@container(max-width:_560px)]:[&_th]:[border-right:0] [@container(max-width:_560px)]:[&_th]:[border-bottom:0] ` +
    `[@container(max-width:_560px)]:[&_th]:[border-left:0] [@container(max-width:_560px)]:[&_td]:block ` +
    `[@container(max-width:_560px)]:[&_td]:pt-0 [@container(max-width:_560px)]:[&_td]:pr-0 ` +
    `[@container(max-width:_560px)]:[&_td]:pb-0 [@container(max-width:_560px)]:[&_td]:pl-0 ` +
    `[@container(max-width:_560px)]:[&_td]:[border-top:0] [@container(max-width:_560px)]:[&_td]:[border-right:0] ` +
    `[@container(max-width:_560px)]:[&_td]:[border-bottom:0] [@container(max-width:_560px)]:[&_td]:[border-left:0] ` +
    `[@container(max-width:_560px)]:[&_tbody_th]:w-auto [@container(max-width:_560px)]:[&_tbody_th]:text-[15px] ` +
    `[@container(max-width:_560px)]:[&_tbody_th]:mb-[6px] [@container(max-width:_560px)]:[&_td_+_td]:mt-[6px] ` +
    `[@container(max-width:_560px)]:[&_td::before]:content-[attr(data-label)] ` +
    `[@container(max-width:_560px)]:[&_td::before]:block [@container(max-width:_560px)]:[&_td::before]:text-[12px] ` +
    `[@container(max-width:_560px)]:[&_td::before]:text-ink-3`,
  stGroup: `[&_h2]:mt-0 [&_h2]:mr-0 [&_h2]:mb-[8px] [&_h2]:ml-[2px] [&_h2]:text-[15px] [&_h2]:tracking-[-0.01em] ` +
    `[&_>_.callout]:mb-0`,
  stBox: `pt-0 pr-[16px] pb-0 pl-[16px] rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[12px] bg-fill ` +
    `[&_>_*_+_*]:[border-top:1px_solid_var(--hair)]`,
  stRow: `min-h-[54px] flex items-center justify-between gap-y-[8px] gap-x-[20px] pt-[10px] pr-0 pb-[10px] pl-0 ` +
    `flex-wrap [&_>_:first-child]:min-w-0 [&_label]:block [&_label]:mt-0 [&_label]:mr-0 [&_label]:mb-0 ` +
    `[&_label]:ml-0 [&_label]:font-medium [@container(max-width:_480px)]:[&:has(.st-wide)]:items-stretch ` +
    `[@container(max-width:_480px)]:[&:has(.st-wide)]:flex-col ` +
    `[@container(max-width:_480px)]:[&:has(.st-btn.btn-secondary)]:items-stretch ` +
    `[@container(max-width:_480px)]:[&:has(.st-btn.btn-secondary)]:flex-col [&.st-stack]:grid ` +
    `[&.st-stack]:gap-y-[10px] [&.st-stack]:gap-x-[10px] [&.st-stack]:justify-stretch`,
  stLabel: `block mt-0 mr-0 mb-0 ml-0 font-medium`,
  stField: `pt-[14px] pr-0 pb-[14px] pl-0 [&_label]:mt-0 [&_label]:mr-0 [&_label]:mb-[8px] [&_label]:ml-0 ` +
    `[&_label]:font-medium [&_.st-help]:mt-[6px] [&_>_.btn-secondary]:mt-[10px]`,
  stHelp: `mt-[2px] mr-0 mb-0 ml-0 text-[13px] leading-[1.4] text-ink-3 min-w-0 [overflow-wrap:anywhere] ` +
    `[&_code]:font-normal [&_code]:text-[12px] [&_code]:leading-[normal] [&_code]:font-mono`,
  stSub: `mt-[18px] mr-0 mb-[8px] ml-[2px] text-[13px] font-semibold text-ink-2`,
  stSnip: `flex items-start gap-y-[8px] gap-x-[8px] mt-[10px] [&_pre]:flex-1 [&_pre]:min-w-0 [&_pre]:mt-0 [&_pre]:mr-0 ` +
    `[&_pre]:mb-0 [&_pre]:ml-0 [&_pre]:pt-[10px] [&_pre]:pr-[12px] [&_pre]:pb-[10px] [&_pre]:pl-[12px] ` +
    `[&_pre]:rounded-tl-[10px] [&_pre]:rounded-tr-[10px] [&_pre]:rounded-br-[10px] [&_pre]:rounded-bl-[10px] ` +
    `[&_pre]:bg-page [&_pre]:font-normal [&_pre]:text-[12.5px] [&_pre]:leading-[1.5] [&_pre]:font-mono ` +
    `[&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere] [&_pre]:text-ink [&_.btn-secondary]:flex-none ` +
    `[&_.btn-secondary]:min-h-[38px] [&_.btn-secondary]:pt-[6px] [&_.btn-secondary]:pr-[14px] ` +
    `[&_.btn-secondary]:pb-[6px] [&_.btn-secondary]:pl-[14px]`,
  stInline: `[&_.btn-secondary]:flex-none [&_.btn-secondary]:min-h-[38px] [&_.btn-secondary]:pt-[6px] ` +
    `[&_.btn-secondary]:pr-[14px] [&_.btn-secondary]:pb-[6px] [&_.btn-secondary]:pl-[14px] flex gap-y-[8px] ` +
    `gap-x-[8px] mt-[10px] [&_input]:flex-1 [&_input]:min-w-0`,
  stWait: `mt-[8px]`,
  stCode: `flex items-baseline gap-y-[14px] gap-x-[14px] mt-[10px] mr-0 mb-0 ml-0 [&_b]:font-semibold [&_b]:text-[26px] ` +
    `[&_b]:leading-[1] [&_b]:font-mono [&_b]:tracking-[0.12em] [&_b]:text-ink [&_span]:text-[13px] ` +
    `[&_span]:text-ink-3 [&_span]:tabular-nums`,
  sx: `h-full grid grid-cols-[232px_minmax(0,_1fr)] text-body [&_.sx-search_input]:min-h-0 ` +
    `[&_.sx-search_input]:h-[40px] [&_.sx-search_input]:pt-0 [&_.sx-search_input]:pr-0 [&_.sx-search_input]:pb-0 ` +
    `[&_.sx-search_input]:pl-0 [&_.sx-search_input]:[border-top:0] [&_.sx-search_input]:[border-right:0] ` +
    `[&_.sx-search_input]:[border-bottom:0] [&_.sx-search_input]:[border-left:0] ` +
    `[&_.sx-search_input]:[background:none] [&_.sx-search_input]:shadow-[none] [&_.sx-search_input]:text-control ` +
    `[&_.callout]:mt-0 [&_.callout]:mr-0 [&_.callout]:mb-0 [&_.callout]:ml-0 [&_#st-ai]:grid [&_#st-ai]:gap-y-0 ` +
    `[&_#st-ai]:gap-x-0 [&_#st-ai_.st-box]:bg-panel [&_#st-ai_.st-box]:shadow-[0_0_0_1px_var(--hair)] ` +
    `[@media(max-width:_700px)]:grid-cols-[minmax(0,_1fr)] [@media(max-width:_700px)]:[&.has-pane_.sx-side]:hidden ` +
    `[@media(max-width:_700px)]:[&:not(.has-pane)_.sx-main]:hidden [&_.st-apps_button]:min-h-0 ` +
    `[&_.st-apps_button]:grid [&_.st-apps_button]:[justify-content:start] [&_.st-apps_button]:[align-content:start] ` +
    `[&_.st-apps_button]:justify-items-start [&_.st-apps_button]:gap-y-[2px] [&_.st-apps_button]:gap-x-[2px] ` +
    `[&_.st-apps_button]:pt-[12px] [&_.st-apps_button]:pr-[14px] [&_.st-apps_button]:pb-[12px] ` +
    `[&_.st-apps_button]:pl-[14px] [&_.st-apps_button]:rounded-tl-[12px] [&_.st-apps_button]:rounded-tr-[12px] ` +
    `[&_.st-apps_button]:rounded-br-[12px] [&_.st-apps_button]:rounded-bl-[12px] [&_.st-apps_button]:text-left ` +
    `[&_.st-apps_button]:bg-panel [&_.st-apps_button]:shadow-[0_0_0_1px_var(--hair)] [&_.st-apps_button]:text-ink ` +
    `[&_.st-apps_button]:[transition:box-shadow_0.15s_ease,_background-color_0.15s_ease] ` +
    `[&_.st-apps_button:hover:not(.on)]:shadow-[0_0_0_1px_var(--line-strong)] [&_.st-apps_button.on]:bg-accent-soft ` +
    `[&_.st-apps_button.on]:shadow-[0_0_0_1.5px_var(--accent)] [&_#st-ai_.st-sub]:mt-[18px] [&.sx-app]:grid ` +
    `[&.sx-app]:gap-y-[14px] [&.sx-app]:gap-x-[14px] [&.sx-app]:h-auto [&.sx-app]:grid-cols-[minmax(0,_1fr)] ` +
    `[&.sx-app]:text-[14px] [@media(max-width:_700px)]:[&.sx-app]:grid-cols-[minmax(0,_1fr)] ` +
    `[@media(max-width:_700px)]:[&.sx-app_.sx-main]:[display:initial] ` +
    `[@media(max-width:_700px)]:[&.sx-app_.sx-side]:[display:initial]`,
  sxSide: `min-h-0 overflow-auto pt-[14px] pr-[10px] pb-[16px] pl-[10px] bg-fill [border-right:1px_solid_var(--hair)] ` +
    `[scrollbar-width:none] [&_ul]:list-none [&_ul]:mt-0 [&_ul]:mr-0 [&_ul]:mb-0 [&_ul]:ml-0 [&_ul]:pt-0 ` +
    `[&_ul]:pr-0 [&_ul]:pb-0 [&_ul]:pl-0 [&_ul]:grid [&_ul]:gap-y-[1px] [&_ul]:gap-x-[1px] [&_li_button]:w-full ` +
    `[&_li_button]:min-h-[var(--control-height)] [&_li_button]:flex [&_li_button]:items-center ` +
    `[&_li_button]:justify-start [&_li_button]:gap-y-[10px] [&_li_button]:gap-x-[10px] [&_li_button]:pt-[8px] ` +
    `[&_li_button]:pr-[10px] [&_li_button]:pb-[8px] [&_li_button]:pl-[10px] ` +
    `[&_li_button]:rounded-tl-[var(--control-radius)] [&_li_button]:rounded-tr-[var(--control-radius)] ` +
    `[&_li_button]:rounded-br-[var(--control-radius)] [&_li_button]:rounded-bl-[var(--control-radius)] ` +
    `[&_li_button]:font-medium [&_li_button]:text-control [&_li_button]:leading-[normal] [&_li_button]:font-sans ` +
    `[&_li_button]:text-ink [&_li_button]:text-left [&_li_button:hover:not(.on)]:bg-fill-2 ` +
    `[&_li_button.on]:bg-accent-soft [&_li_button.on]:text-accent-ink [@media(max-width:_700px)]:[background:none] ` +
    `[@media(max-width:_700px)]:[border-top:0] [@media(max-width:_700px)]:[border-right:0] ` +
    `[@media(max-width:_700px)]:[border-bottom:0] [@media(max-width:_700px)]:[border-left:0] ` +
    `[@media(max-width:_700px)]:[&_li_button]:pt-[8px] [@media(max-width:_700px)]:[&_li_button]:pr-[10px] ` +
    `[@media(max-width:_700px)]:[&_li_button]:pb-[8px] [@media(max-width:_700px)]:[&_li_button]:pl-[10px] ` +
    `[@media(max-width:_700px)]:[&_li_button]:text-[15px]`,
  sxLights: `flex gap-y-[8px] gap-x-[8px] pt-[2px] pr-[6px] pb-[16px] pl-[6px] [&_>_*]:w-[12px] [&_>_*]:h-[12px] ` +
    `[&_>_*]:min-h-0 [&_>_*]:pt-0 [&_>_*]:pr-0 [&_>_*]:pb-0 [&_>_*]:pl-0 [&_>_*]:[border-top:0] ` +
    `[&_>_*]:[border-right:0] [&_>_*]:[border-bottom:0] [&_>_*]:[border-left:0] [&_>_*]:rounded-tl-[50%] ` +
    `[&_>_*]:rounded-tr-[50%] [&_>_*]:rounded-br-[50%] [&_>_*]:rounded-bl-[50%] [&_>_*]:bg-[#ff5f57] ` +
    `[&_.sx-l2]:bg-[#febc2e] [&_.sx-l3]:bg-[#28c840] [&_button]:cursor-pointer ` +
    `[&_button:hover]:shadow-[inset_0_0_0_4px_rgba(0,_0,_0,_0.25)]`,
  sxSearch: `flex items-center gap-y-[8px] gap-x-[8px] min-h-[var(--control-height)] mt-0 mr-[4px] mb-[16px] ml-[4px] pt-0 ` +
    `pr-[12px] pb-0 pl-[12px] rounded-tl-[var(--control-radius)] rounded-tr-[var(--control-radius)] ` +
    `rounded-br-[var(--control-radius)] rounded-bl-[var(--control-radius)] bg-panel ` +
    `shadow-[inset_0_0_0_1px_var(--hair)] text-ink-2 [&_svg]:w-[13px] [&_svg]:h-[13px] [&_svg]:flex-none ` +
    `[&:focus-within]:[outline:2px_solid_var(--focus)] [&:focus-within]:[outline-offset:2px]`,
  sxNone: `pt-[8px] pr-[10px] pb-[8px] pl-[10px] text-[13px] text-ink-3`,
  sxLink: `inline min-h-0 p-0 border-0 bg-transparent font-[inherit] text-[length:inherit] text-ink underline ` +
    `[text-underline-offset:3px] [text-decoration-color:var(--accent)] cursor-pointer hover:[text-decoration-thickness:2px]`,
  sxTile: `flex-none grid place-items-center rounded-tl-[8px] rounded-tr-[8px] rounded-br-[8px] rounded-bl-[8px] ` +
    `text-[color:inherit] bg-fill [&_svg]:w-[64%] [&_svg]:h-[64%]`,
  sxMain: `min-w-0 min-h-0 grid grid-rows-[auto_minmax(0,_1fr)] bg-page`,
  sxHead: `flex items-center gap-y-[12px] gap-x-[12px] min-h-[56px] pt-0 pr-[24px] pb-0 pl-[24px] ` +
    `[border-bottom:1px_solid_var(--hair)] [&_h2]:flex-1 [&_h2]:mt-0 [&_h2]:mr-0 [&_h2]:mb-0 [&_h2]:ml-0 ` +
    `[&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:tracking-[-0.01em] [@media(max-width:_700px)]:pt-0 ` +
    `[@media(max-width:_700px)]:pr-[12px] [@media(max-width:_700px)]:pb-0 [@media(max-width:_700px)]:pl-[12px]`,
  sxBack: `hidden w-[var(--control-height)] h-[var(--control-height)] min-h-0 pt-0 pr-0 pb-0 pl-0 ` +
    `rounded-tl-[var(--control-radius)] rounded-tr-[var(--control-radius)] rounded-br-[var(--control-radius)] ` +
    `rounded-bl-[var(--control-radius)] text-ink-2 [&_svg]:w-[16px] [&_svg]:h-[16px] ` +
    `[@media(max-width:_700px)]:grid [@media(max-width:_700px)]:place-items-center`,
  sxSaved: `text-[12.5px] text-ink-3 [transition:opacity_0.3s] [&.saved]:text-ok [&.error]:text-warn`,
  sxBody: `overflow-auto pt-[var(--space-8)] pr-[var(--page-padding)] pb-[var(--space-12)] pl-[var(--page-padding)] grid ` +
    `[align-content:start] gap-y-[var(--space-6)] gap-x-[var(--space-6)] [scrollbar-width:thin] [&_>_*]:w-full ` +
    `[&_>_*]:max-w-[712px] [&_>_*]:justify-self-center [&_>_*]:[zoom:var(--text-zoom)] ` +
    `[@media(max-width:_700px)]:pt-[20px] [@media(max-width:_700px)]:pr-[16px] [@media(max-width:_700px)]:pb-[32px] ` +
    `[@media(max-width:_700px)]:pl-[16px]`,
  sxHero: `grid gap-y-[var(--space-2)] gap-x-[var(--space-2)] pt-0 pr-0 pb-0 pl-0 [&_h1]:mt-0 [&_h1]:mr-0 [&_h1]:mb-0 ` +
    `[&_h1]:ml-0 [&_h1]:font-semibold [&_h1]:text-title [&_h1]:leading-[1.15] [&_h1]:font-sans ` +
    `[&_h1]:tracking-[-0.035em] [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_p]:text-ink-2 [&_p]:leading-[1.55]`,
  sxGroup: `rounded-tl-[var(--radius)] rounded-tr-[var(--radius)] rounded-br-[var(--radius)] rounded-bl-[var(--radius)] ` +
    `bg-panel [border-top:1px_solid_var(--hair)] [border-right:1px_solid_var(--hair)] ` +
    `[border-bottom:1px_solid_var(--hair)] [border-left:1px_solid_var(--hair)] pt-0 pr-[var(--space-6)] pb-0 ` +
    `pl-[var(--space-6)] [&_>_*_+_*]:[border-top:1px_solid_var(--hair)]`,
  sxRow: `flex items-center justify-between gap-y-[12px] gap-x-[24px] min-h-[64px] pt-[var(--space-4)] pr-0 ` +
    `pb-[var(--space-4)] pl-0 flex-wrap [&.stack]:grid [&.stack]:grid-cols-[minmax(0,_1fr)] ` +
    `[&.stack]:justify-stretch [&.stack_.sx-row-c]:block [&.stack_.segmented]:flex [&.stack_.segmented]:w-full ` +
    `[&.stack_.segmented_button]:[flex:1_1_0] [&.stack_.segmented_button]:min-w-0 ` +
    `[&.stack_.segmented_button]:pt-[4px] [&.stack_.segmented_button]:pr-[6px] [&.stack_.segmented_button]:pb-[4px] ` +
    `[&.stack_.segmented_button]:pl-[6px] [&_select]:w-[240px] [&_select]:max-w-full [&_textarea]:min-h-[84px] ` +
    `[&_input[type=time]]:w-[140px]`,
  sxRowL: `min-w-0 [flex:1_1_220px] [&_label]:block [&_label]:mt-0 [&_label]:mr-0 [&_label]:mb-0 [&_label]:ml-0 ` +
    `[&_label]:font-medium [&_label]:text-ink`,
  sxLabel: `block mt-0 mr-0 mb-0 ml-0 font-medium text-ink`,
  sxHelp: `mt-[4px] mr-0 mb-0 ml-0 text-caption leading-[1.5] text-ink-2`,
  sxRowC: `flex-none flex items-center gap-y-[8px] gap-x-[8px] max-w-full`,
  sxUnit: `inline-flex items-center gap-y-[8px] gap-x-[8px] [&_input]:w-[96px] [&_input]:text-right ` +
    `[&_input]:tabular-nums [&_>_span]:min-w-[30px] [&_>_span]:text-[13px] [&_>_span]:text-ink-3`,
  sxBtn: `text-control`,
  sxNote: `mt-[-8px] mr-[2px] mb-0 ml-[2px] text-caption leading-[1.5] text-ink-2`,
  sxStorage: `grid gap-y-[16px] gap-x-[16px] min-w-0 [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_.sx-row-c]:min-w-0 ` +
    `[&_[role=alert]]:[border-left:2px_solid_var(--accent)] [&_[role=alert]]:pl-[12px]`,
  sxStorageTotal: `flex items-center justify-between flex-wrap gap-y-[14px] gap-x-[14px] [&_strong]:block [&_strong]:text-[28px] ` +
    `[&_strong]:font-semibold [&_strong]:tracking-[-0.04em] [&_span]:text-ink-2`,
  sxStorageSize: `tabular-nums whitespace-nowrap`,
  sxStoragePath: `block max-w-full whitespace-normal [overflow-wrap:anywhere] select-text text-[12px]`,
  sxStorageActions: `flex flex-wrap gap-y-[8px] gap-x-[8px] mt-[12px]`,
  sxBackups: `grid gap-y-[16px] gap-x-[16px] min-w-0 [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_.sx-row-c]:gap-y-[12px] ` +
    `[&_.sx-row-c]:gap-x-[12px] [&_input[type=file]]:max-w-full [&_input[type=file]]:[font-family:inherit] ` +
    `[&_input[type=file]]:text-[inherit] [&_input[type=file]]:font-[inherit] ` +
    `[&_input[type=file]]:[font-style:inherit] [&_input[type=file]]:leading-[inherit] [&_[role=alert]]:text-ink ` +
    `[&_[role=alert]]:[border-left:2px_solid_var(--accent)] [&_[role=alert]]:pl-[12px]`,
  sxBackupPreview: `grid gap-y-[12px] gap-x-[12px] [border-top:1px_solid_var(--hair)] pt-[16px] [overflow-wrap:anywhere] ` +
    `[&_h3]:mt-0 [&_h3]:mr-0 [&_h3]:mb-0 [&_h3]:ml-0 [&_h3]:text-[16px]`,
  sxBackupConfirm: `flex items-start gap-y-[8px] gap-x-[8px] [&_input]:shrink-0 [&_input]:mt-[3px]`,
  sxBackupActions: `flex flex-wrap gap-y-[10px] gap-x-[10px]`,
  stApps: `grid grid-cols-[repeat(auto-fit,_minmax(170px,_1fr))] gap-y-[8px] gap-x-[8px] mb-[14px] [&_b]:text-[14px] ` +
    `[&_b]:font-semibold [&_span]:text-[12px] [&_span]:text-ink-3`,
  stWhy: `mt-0 text-ink-2`,
  sxAppHead: `flex flex-wrap items-baseline justify-between gap-y-[8px] gap-x-[12px] mb-[6px] [&_h1]:mt-0 [&_h1]:mr-0 ` +
    `[&_h1]:mb-0 [&_h1]:ml-0 [&_h1]:font-semibold [&_h1]:text-title [&_h1]:leading-[1.15] [&_h1]:font-sans ` +
    `[&_h1]:tracking-[-0.035em] [&_h1]:text-ink`,
  sxApp: `[&_section]:grid [&_section]:grid-cols-[minmax(0,_1fr)] [&_section]:min-w-0 [&_section]:gap-y-[10px] ` +
    `[&_section]:gap-x-[10px] [&_h2]:mt-[18px] [&_h2]:mr-0 [&_h2]:mb-0 [&_h2]:ml-[2px] [&_h2]:text-[17px] ` +
    `[&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-ink [&_.sx-note]:mt-0 [&_.sx-note]:mr-[2px] ` +
    `[&_.sx-note]:mb-0 [&_.sx-note]:ml-[2px]`,
  brandTile: `w-[34px] h-[34px] rounded-tl-[9px] rounded-tr-[9px] rounded-br-[9px] rounded-bl-[9px] grid place-items-center ` +
    `mb-[8px] shadow-[inset_0_0_0_0.5px_rgba(0,_0,_0,_0.12)] [&_svg]:w-[20px] [&_svg]:h-[20px] ` +
    `[&.chatgpt]:bg-[#0d0d0d] [&.chatgpt]:text-[color:#fff] [&.claude]:bg-[#f5f0e8] [&.claude]:text-[color:#d97757] ` +
    `[&.other]:bg-fill-2 [&.other]:text-ink-2`,
  lcAccount: `grid gap-y-[8px] gap-x-[8px]`,
  lcRow: `flex items-center justify-between gap-y-[12px] gap-x-[20px] flex-wrap mt-0 mr-0 mb-0 ml-0 [&_b]:block ` +
    `[&_b]:font-semibold [&_b]:text-ink [&_p]:mt-[2px] [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_p]:text-[12.5px] ` +
    `[&_p]:leading-[1.4] [&_p]:text-ink-3`,
  lcError: `mt-0 mr-0 mb-0 ml-0 text-[13px] text-warn`,
  stMore: `[background:none] rounded-tl-none rounded-tr-none rounded-br-none rounded-bl-none ` +
    `[border-top:1px_solid_var(--hair)] [&_>_summary]:min-h-0 [&_>_summary]:pt-[12px] [&_>_summary]:pr-0 ` +
    `[&_>_summary]:pb-[12px] [&_>_summary]:pl-0 [&_>_summary]:text-[13px] [&_>_summary]:font-medium ` +
    `[&_>_summary]:text-ink-2 [&_>_summary:hover]:text-ink [&[open]_>_summary]:pb-[4px]`,
  co: `grid grid-cols-[minmax(0,_1fr)] gap-6 w-full max-w-[var(--content-width)] mx-auto pt-2 pb-8 text-ink text-body ` +
    `[&_.co-list_button]:w-full [&_.co-list_button]:flex [&_.co-list_button]:items-start ` +
    `[&_.co-list_button]:gap-4 [&_.co-list_button]:p-4 [&_.co-list_button]:rounded-control ` +
    `[&_.co-list_button]:text-left [&_.co-list_button]:font-normal [&_.co-list_button]:bg-transparent ` +
    `[&_.co-list_button]:text-ink [&_.co-list_button:hover]:bg-fill ` +
    `[&_.co-list_button:focus-visible]:outline-2 [&_.co-list_button:focus-visible]:outline-accent ` +
    `[&_code]:font-normal [&_code]:text-[12px] [&_code]:leading-normal [&_code]:font-mono`,
  coHead: `[&_h1]:mt-0 [&_h1]:mr-0 [&_h1]:mb-0 [&_h1]:ml-0 [&_h1]:font-semibold [&_h1]:text-title [&_h1]:leading-[1.15] ` +
    `[&_h1]:font-sans [&_h1]:tracking-[-0.035em] [&_p]:mt-[8px] [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 ` +
    `[&_p]:text-ink-2 [&_p]:leading-[1.5] [&_p]:text-[15px] [@media(max-width:_640px)]:[&_h1]:text-[28px]`,
  coHero: `[&_h1]:mt-0 [&_h1]:mr-0 [&_h1]:mb-0 [&_h1]:ml-0 [&_h1]:font-semibold [&_h1]:text-title [&_h1]:leading-[1.15] ` +
    `[&_h1]:font-sans [&_h1]:tracking-[-0.035em] flex items-start gap-y-[18px] gap-x-[18px] flex-wrap ` +
    `[&_>_div]:[flex:1_1_280px] [&_>_div]:min-w-0 [&_p]:mt-[6px] [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_p]:text-ink-2 ` +
    `[&_p]:leading-[1.5] [&_.btn-primary]:flex-none [@media(max-width:_640px)]:[&_h1]:text-[28px]`,
  coTile: `flex-none grid place-items-center rounded-tl-[24%] rounded-tr-[24%] rounded-br-[24%] rounded-bl-[24%] ` +
    `text-[color:#fff] shadow-[inset_0_0.5px_0_rgba(255,_255,_255,_0.4),_0_1px_2px_rgba(0,_0,_0,_0.15)] ` +
    `[&_svg]:w-[58%] [&_svg]:h-[58%]`,
  coList: `list-none m-0 p-0 grid divide-y divide-hair border-y border-hair`,
  coCard: `grid flex-1 gap-y-[3px] gap-x-[3px] min-w-0 [&_b]:text-[18px] [&_b]:font-semibold [&_b]:tracking-[-0.01em] ` +
    `[&_small]:text-[12.5px] [&_small]:text-ink-3`,
  coSum: `mt-[4px] text-ink-2 leading-[1.45] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] ` +
    `overflow-hidden`,
  coStatus: `flex flex-wrap gap-y-[6px] gap-x-[6px] mt-[8px]`,
  coPill: `pt-[2px] pr-[9px] pb-[2px] pl-[9px] rounded-tl-[999px] rounded-tr-[999px] rounded-br-[999px] ` +
    `rounded-bl-[999px] text-[11.5px] font-semibold bg-fill text-ink-2 [&.mine]:bg-accent-soft ` +
    `[&.mine]:text-accent-ink [&.new]:bg-[rgba(22,_147,_106,_0.12)] [&.new]:text-ok`,
  coNote: `mt-0 mr-0 mb-0 ml-0 text-[12.5px] text-ink-3 [&_code]:font-normal [&_code]:text-[12px] ` +
    `[&_code]:leading-[normal] [&_code]:font-mono`,
  coBack: `inline-flex items-center gap-y-[4px] gap-x-[4px] w-fit text-[13px] font-medium text-ink-2 no-underline ` +
    `[&:hover]:text-ink [&_svg]:w-[14px] [&_svg]:h-[14px]`,
  coCallout: `flex items-center justify-between gap-y-[12px] gap-x-[20px] flex-wrap pt-[14px] pr-[16px] pb-[14px] pl-[16px] ` +
    `rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[14px] bg-[rgba(22,_147,_106,_0.08)] ` +
    `shadow-[inset_0_0_0_1px_rgba(22,_147,_106,_0.25)] [&_b]:font-semibold [&_p]:mt-[2px] [&_p]:mr-0 [&_p]:mb-0 ` +
    `[&_p]:ml-0 [&_p]:text-[13px] [&_p]:text-ink-2`,
  coSec: `grid gap-y-[8px] gap-x-[8px] [&_h2]:mt-0 [&_h2]:mr-[2px] [&_h2]:mb-0 [&_h2]:ml-[2px] [&_h2]:text-section ` +
    `[&_h2]:font-semibold [&_h2]:tracking-[-0.01em]`,
  coSecHead: `flex items-center justify-between gap-y-[12px] gap-x-[12px] [&_.co-small]:flex-none`,
  coBox: `list-none mt-0 mr-0 mb-0 ml-0 pt-0 pr-[var(--space-6)] pb-0 pl-[var(--space-6)] rounded-tl-[var(--radius)] ` +
    `rounded-tr-[var(--radius)] rounded-br-[var(--radius)] rounded-bl-[var(--radius)] bg-panel ` +
    `[border-top:1px_solid_var(--hair)] [border-right:1px_solid_var(--hair)] [border-bottom:1px_solid_var(--hair)] ` +
    `[border-left:1px_solid_var(--hair)] [&_>_*_+_*]:[border-top:1px_solid_var(--hair)]`,
  coRow: `flex items-center justify-between gap-y-[12px] gap-x-[24px] min-h-[64px] pt-[var(--space-4)] pr-0 ` +
    `pb-[var(--space-4)] pl-0 flex-wrap [&_>_div]:[flex:1_1_240px] [&_>_div]:min-w-0 [&_b]:block [&_b]:font-medium ` +
    `[&_b]:text-ink [&_b]:[overflow-wrap:anywhere] [&_p]:mt-[4px] [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 ` +
    `[&_p]:text-caption [&_p]:leading-[1.5] [&_p]:text-ink-2 [&_>_p]:mt-0 [&_>_p]:mr-0 [&_>_p]:mb-0 [&_>_p]:ml-0 ` +
    `[&_>_p]:text-ink-2 [&_>_p]:text-[13.5px] [&_time]:flex-none [&_time]:text-[12.5px] [&_time]:text-ink-3 ` +
    `[&_p_.co-k]:inline [&_p_.co-k]:font-semibold [&_p_.co-k]:text-ink-2`,
  coConfirm: `[background:none] [&_>_p]:[flex:1_1_260px]`,
  coActions: `flex flex-wrap gap-y-[var(--space-2)] gap-x-[var(--space-2)]`,
  coChapters: `list-none m-0 p-0 border-y border-hair divide-y divide-hair [&_.co-row]:flex-nowrap [&_.co-row]:gap-3`,
  coChapterLink: `flex min-w-0 flex-1 items-center gap-3 self-stretch rounded-small py-1 text-ink no-underline hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-accent [&_svg]:ml-auto [&_svg]:shrink-0`,
  coN: `flex-none w-[24px] h-[24px] rounded-tl-[50%] rounded-tr-[50%] rounded-br-[50%] rounded-bl-[50%] grid ` +
    `place-items-center bg-fill text-[12px] font-semibold text-ink-2 tabular-nums`,
  coSaid: `mt-0 mr-0 mb-0 ml-0 pt-[10px] pr-[14px] pb-[10px] pl-[14px] rounded-tl-[10px] rounded-tr-[10px] ` +
    `rounded-br-[10px] rounded-bl-[10px] bg-fill text-ink-2 text-[13.5px]`,
  coError: `mt-0 mr-0 mb-0 ml-0 text-warn text-[13.5px]`,
  rx: `grid gap-y-[8px] gap-x-[8px] pt-[14px] pr-[16px] pb-[14px] pl-[16px] rounded-tl-[12px] rounded-tr-[12px] ` +
    `rounded-br-[12px] rounded-bl-[12px] bg-panel shadow-[0_0_0_1px_var(--hair)] [&_label]:font-semibold ` +
    `[&_label]:text-[14px] [&_label]:text-ink [&_textarea]:w-full [&_textarea]:min-h-[64px] [&_textarea]:resize-y ` +
    `[&_textarea]:[font-family:inherit] [&_textarea]:text-[14px] [&_textarea]:font-[inherit] ` +
    `[&_textarea]:[font-style:inherit] [&_textarea]:leading-[inherit] [&_.rx-undo]:ml-[6px] [&_.rx-undo]:pt-0 ` +
    `[&_.rx-undo]:pr-0 [&_.rx-undo]:pb-0 [&_.rx-undo]:pl-0 [&_.rx-undo]:min-h-0 [&_.rx-undo]:[background:none] ` +
    `[&_.rx-undo]:[font-family:inherit] [&_.rx-undo]:text-[inherit] [&_.rx-undo]:font-semibold ` +
    `[&_.rx-undo]:[font-style:inherit] [&_.rx-undo]:leading-[inherit] [&_.rx-undo]:text-accent-ink ` +
    `[&_.rx-undo]:underline [&_.rx-undo]:underline-offset-[2px] [&_.rx-undo]:cursor-pointer`,
  rxFoot: `flex items-center justify-between gap-y-[10px] gap-x-[16px] flex-wrap`,
  rxNote: `text-[12.5px] text-ink-3 [flex:1_1_220px]`,
  rxDone: `mt-0 mr-0 mb-0 ml-0 pt-[9px] pr-[12px] pb-[9px] pl-[12px] rounded-tl-[10px] rounded-tr-[10px] ` +
    `rounded-br-[10px] rounded-bl-[10px] bg-[rgba(22,_147,_106,_0.1)] text-ink-2 text-[13.5px]`,
  ve: `[&_.rx_.rx-undo]:ml-[6px] [&_.rx_.rx-undo]:pt-0 [&_.rx_.rx-undo]:pr-0 [&_.rx_.rx-undo]:pb-0 ` +
    `[&_.rx_.rx-undo]:pl-0 [&_.rx_.rx-undo]:min-h-0 [&_.rx_.rx-undo]:[background:none] ` +
    `[&_.rx_.rx-undo]:[font-family:inherit] [&_.rx_.rx-undo]:text-[inherit] [&_.rx_.rx-undo]:font-semibold ` +
    `[&_.rx_.rx-undo]:[font-style:inherit] [&_.rx_.rx-undo]:leading-[inherit] [&_.rx_.rx-undo]:text-accent-ink ` +
    `[&_.rx_.rx-undo]:underline [&_.rx_.rx-undo]:underline-offset-[2px] [&_.rx_.rx-undo]:cursor-pointer ` +
    `[&_.ve-head-actions_>_button]:min-w-[96px] [&_.ve-head-actions_>_button]:justify-center ` +
    `[&_.ve-remix-btn]:inline-flex [&_.ve-remix-btn]:items-center [&_.ve-remix-btn]:gap-y-[7px] ` +
    `[&_.ve-remix-btn]:gap-x-[7px] [&_.ve-remix-btn]:h-[34px] [&_.ve-remix-btn]:pt-0 [&_.ve-remix-btn]:pr-[14px] ` +
    `[&_.ve-remix-btn]:pb-0 [&_.ve-remix-btn]:pl-[14px] [&_.ve-remix-btn]:rounded-tl-[999px] ` +
    `[&_.ve-remix-btn]:rounded-tr-[999px] [&_.ve-remix-btn]:rounded-br-[999px] [&_.ve-remix-btn]:rounded-bl-[999px] ` +
    `[&_.ve-remix-btn]:bg-ink [&_.ve-remix-btn]:text-page [&_.ve-remix-btn]:text-[13.5px] ` +
    `[&_.ve-remix-btn]:font-semibold [&_.ve-remix-btn]:shadow-[0_6px_16px_-8px_rgba(0,_0,_0,_0.45)] ` +
    `[&_.ve-remix-btn]:[transition:transform_0.15s_var(--ease),_opacity_0.15s] ` +
    `[&_.ve-remix-btn:hover]:[transform:translateY(-1px)] [&_.ve-remix-btn_svg]:w-[16px] ` +
    `[&_.ve-remix-btn_svg]:h-[16px] [&_.ve-edit-btn]:relative [&_.ve-edit-btn]:inline-flex ` +
    `[&_.ve-edit-btn]:items-center [&_.ve-edit-btn]:gap-y-[7px] [&_.ve-edit-btn]:gap-x-[7px] ` +
    `[&_.ve-edit-btn]:h-[34px] [&_.ve-edit-btn]:pt-0 [&_.ve-edit-btn]:pr-[14px] [&_.ve-edit-btn]:pb-0 ` +
    `[&_.ve-edit-btn]:pl-[14px] [&_.ve-edit-btn]:rounded-tl-[999px] [&_.ve-edit-btn]:rounded-tr-[999px] ` +
    `[&_.ve-edit-btn]:rounded-br-[999px] [&_.ve-edit-btn]:rounded-bl-[999px] [&_.ve-edit-btn]:bg-fill ` +
    `[&_.ve-edit-btn]:text-ink-3 [&_.ve-edit-btn]:text-[13.5px] [&_.ve-edit-btn]:font-semibold ` +
    `[&_.ve-edit-btn]:cursor-not-allowed [&_.ve-edit-btn_svg]:w-[16px] [&_.ve-edit-btn_svg]:h-[16px] ` +
    `[&_.ve-edit-btn_svg]:opacity-[0.7] [&_.ve-new-chapter]:flex [&_.ve-new-chapter]:items-center ` +
    `[&_.ve-new-chapter]:justify-start [&_.ve-new-chapter]:gap-y-[8px] [&_.ve-new-chapter]:gap-x-[8px] ` +
    `[&_.ve-new-chapter]:w-full [&_.ve-new-chapter]:pt-[5px] [&_.ve-new-chapter]:pr-[8px] ` +
    `[&_.ve-new-chapter]:pb-[5px] [&_.ve-new-chapter]:pl-[10px] [&_.ve-new-chapter]:mt-[4px] ` +
    `[&_.ve-new-chapter]:rounded-tl-[8px] [&_.ve-new-chapter]:rounded-tr-[8px] [&_.ve-new-chapter]:rounded-br-[8px] ` +
    `[&_.ve-new-chapter]:rounded-bl-[8px] [&_.ve-new-chapter]:text-[13px] [&_.ve-new-chapter]:font-medium ` +
    `[&_.ve-new-chapter]:text-ink-3 [&_.ve-new-chapter]:text-left [&_.ve-new-chapter_span]:w-[14px] ` +
    `[&_.ve-new-chapter_span]:text-center [&_.ve-new-chapter_span]:text-[15px] [&_.ve-new-chapter_span]:leading-[1] ` +
    `[&_.ve-new-chapter:hover]:bg-fill-2 [&_.ve-new-chapter:hover]:text-ink ` +
    `[&_.ve-dock]:[transition:opacity_0.35s_ease,_filter_0.35s_ease] ` +
    `[&.remixing_.ve-dock:not(.rec):not(.live)]:opacity-[0.5] ` +
    `[&.remixing_.ve-dock:not(.rec):not(.live)]:[filter:blur(8px)_saturate(0.85)] ` +
    `[&.remixing_.ve-dock:not(.rec):not(.live)]:pointer-events-none [&_.ve-remix-btn:disabled]:opacity-[0.4] ` +
    `[&_.ve-remix-btn:disabled]:transform-none [&_.ve-remix-btn:disabled]:cursor-not-allowed ` +
    `[&_.rp-close]:flex-none [&_.rp-close]:w-[30px] [&_.rp-close]:h-[30px] [&_.rp-close]:grid ` +
    `[&_.rp-close]:place-items-center [&_.rp-close]:rounded-tl-[999px] [&_.rp-close]:rounded-tr-[999px] ` +
    `[&_.rp-close]:rounded-br-[999px] [&_.rp-close]:rounded-bl-[999px] [&_.rp-close]:bg-fill ` +
    `[&_.rp-close]:text-ink-2 [&_.rp-close]:[transition:background-color_0.15s] [&_.rp-close:hover]:bg-fill-2 ` +
    `[&_.rp-close:hover]:text-ink [&_.rp-try_button]:w-full [&_.rp-try_button]:flex [&_.rp-try_button]:items-center ` +
    `[&_.rp-try_button]:justify-between [&_.rp-try_button]:gap-y-[10px] [&_.rp-try_button]:gap-x-[10px] ` +
    `[&_.rp-try_button]:pt-[10px] [&_.rp-try_button]:pr-[12px] [&_.rp-try_button]:pb-[10px] ` +
    `[&_.rp-try_button]:pl-[12px] [&_.rp-try_button]:rounded-tl-[12px] [&_.rp-try_button]:rounded-tr-[12px] ` +
    `[&_.rp-try_button]:rounded-br-[12px] [&_.rp-try_button]:rounded-bl-[12px] [&_.rp-try_button]:bg-panel ` +
    `[&_.rp-try_button]:shadow-[0_0_0_1px_var(--hair)] [&_.rp-try_button]:text-ink [&_.rp-try_button]:text-[13.5px] ` +
    `[&_.rp-try_button]:font-medium [&_.rp-try_button]:text-left ` +
    `[&_.rp-try_button]:[transition:box-shadow_0.15s,_translate_0.15s] ` +
    `[&_.rp-try_button:hover]:shadow-[0_0_0_1px_var(--accent)] [&_.rp-try_button:hover]:[translate:2px_0] ` +
    `[&_.rp-undo]:flex-none [&_.rp-undo]:pt-[2px] [&_.rp-undo]:pr-[9px] [&_.rp-undo]:pb-[2px] [&_.rp-undo]:pl-[9px] ` +
    `[&_.rp-undo]:rounded-tl-[999px] [&_.rp-undo]:rounded-tr-[999px] [&_.rp-undo]:rounded-br-[999px] ` +
    `[&_.rp-undo]:rounded-bl-[999px] [&_.rp-undo]:bg-panel [&_.rp-undo]:shadow-[0_0_0_1px_rgba(22,_147,_106,_0.3)] ` +
    `[&_.rp-undo]:text-ink-2 [&_.rp-undo]:text-[12px] [&_.rp-undo]:font-semibold [&_.rp-undo:hover]:text-ink ` +
    `[&_.rp-undo:hover]:shadow-[0_0_0_1px_var(--ok)] [&_.rp-retry]:mt-[8px] [&_.rp-retry]:pt-[4px] ` +
    `[&_.rp-retry]:pr-[12px] [&_.rp-retry]:pb-[4px] [&_.rp-retry]:pl-[12px] [&_.rp-retry]:rounded-tl-[999px] ` +
    `[&_.rp-retry]:rounded-tr-[999px] [&_.rp-retry]:rounded-br-[999px] [&_.rp-retry]:rounded-bl-[999px] ` +
    `[&_.rp-retry]:bg-ink [&_.rp-retry]:text-page [&_.rp-retry]:text-[12.5px] [&_.rp-retry]:font-semibold ` +
    `[&_.rp-input_textarea]:flex-1 [&_.rp-input_textarea]:min-h-[36px] [&_.rp-input_textarea]:h-[36px] ` +
    `[&_.rp-input_textarea]:max-h-[140px] [&_.rp-input_textarea]:pt-[8px] [&_.rp-input_textarea]:pr-0 ` +
    `[&_.rp-input_textarea]:pb-[8px] [&_.rp-input_textarea]:pl-0 [&_.rp-input_textarea]:[border-top:0] ` +
    `[&_.rp-input_textarea]:[border-right:0] [&_.rp-input_textarea]:[border-bottom:0] ` +
    `[&_.rp-input_textarea]:[border-left:0] [&_.rp-input_textarea]:[background:none] ` +
    `[&_.rp-input_textarea]:shadow-[none] [&_.rp-input_textarea]:resize-none ` +
    `[&_.rp-input_textarea]:[font-family:inherit] [&_.rp-input_textarea]:text-[14px] ` +
    `[&_.rp-input_textarea]:font-[inherit] [&_.rp-input_textarea]:[font-style:inherit] ` +
    `[&_.rp-input_textarea]:leading-[20px] [&_.rp-input_textarea]:text-ink [&_.rp-input_textarea]:[outline:none] ` +
    `[&_.rp-input_textarea:focus]:flex-1 [&_.rp-input_textarea:focus]:min-h-[36px] ` +
    `[&_.rp-input_textarea:focus]:h-[36px] [&_.rp-input_textarea:focus]:max-h-[140px] ` +
    `[&_.rp-input_textarea:focus]:pt-[8px] [&_.rp-input_textarea:focus]:pr-0 [&_.rp-input_textarea:focus]:pb-[8px] ` +
    `[&_.rp-input_textarea:focus]:pl-0 [&_.rp-input_textarea:focus]:[border-top:0] ` +
    `[&_.rp-input_textarea:focus]:[border-right:0] [&_.rp-input_textarea:focus]:[border-bottom:0] ` +
    `[&_.rp-input_textarea:focus]:[border-left:0] [&_.rp-input_textarea:focus]:[background:none] ` +
    `[&_.rp-input_textarea:focus]:shadow-[none] [&_.rp-input_textarea:focus]:resize-none ` +
    `[&_.rp-input_textarea:focus]:[font-family:inherit] [&_.rp-input_textarea:focus]:text-[14px] ` +
    `[&_.rp-input_textarea:focus]:font-[inherit] [&_.rp-input_textarea:focus]:[font-style:inherit] ` +
    `[&_.rp-input_textarea:focus]:leading-[20px] [&_.rp-input_textarea:focus]:text-ink ` +
    `[&_.rp-input_textarea:focus]:[outline:none] [&_.rp-send]:flex-none [&_.rp-send]:w-[34px] [&_.rp-send]:h-[34px] ` +
    `[&_.rp-send]:grid [&_.rp-send]:place-items-center [&_.rp-send]:rounded-tl-[999px] ` +
    `[&_.rp-send]:rounded-tr-[999px] [&_.rp-send]:rounded-br-[999px] [&_.rp-send]:rounded-bl-[999px] ` +
    `[&_.rp-send]:bg-accent [&_.rp-send]:text-accent-on [&_.rp-send]:[transition:opacity_0.15s,_transform_0.15s] ` +
    `[&_.rp-send:not(:disabled):hover]:[transform:translateY(-1px)] [&_.rp-send:disabled]:opacity-[0.3] ` +
    `[&_.rp-btn]:pt-[7px] [&_.rp-btn]:pr-[14px] [&_.rp-btn]:pb-[7px] [&_.rp-btn]:pl-[14px] ` +
    `[&_.rp-btn]:rounded-tl-[999px] [&_.rp-btn]:rounded-tr-[999px] [&_.rp-btn]:rounded-br-[999px] ` +
    `[&_.rp-btn]:rounded-bl-[999px] [&_.rp-btn]:bg-ink [&_.rp-btn]:text-page [&_.rp-btn]:text-[13px] ` +
    `[&_.rp-btn]:font-semibold [@media(prefers-reduced-motion:_reduce)]:[&_.ve-dock]:transition-none`,
  rxErr: `mt-0 mr-0 mb-0 ml-0 text-warn text-[13.5px]`,
  rxOff: `flex items-center justify-between gap-y-[10px] gap-x-[16px] flex-wrap [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 ` +
    `[&_p]:ml-0 [&_p]:text-ink-2`,
  veHeadRemix: `relative`,
  veHeadActions: `flex flex-wrap gap-y-[8px] gap-x-[8px] mt-[16px]`,
  veEditBtn: `[&:hover_.ve-soon-tip]:opacity-[1] [&:hover_.ve-soon-tip]:[translate:0_0] ` +
    `[&:focus-visible_.ve-soon-tip]:opacity-[1] [&:focus-visible_.ve-soon-tip]:[translate:0_0]`,
  rp: `absolute z-[30] top-[14px] right-[14px] bottom-[14px] w-[min(400px,_calc(100%_-_28px))] grid ` +
    `grid-rows-[auto_minmax(0,_1fr)_auto] rounded-tl-[20px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px] ` +
    `overflow-hidden bg-win [backdrop-filter:blur(30px)_saturate(1.6)] ` +
    `shadow-[0_0_0_0.5px_rgba(0,_0,_0,_0.14),_0_30px_70px_-20px_rgba(0,_0,_0,_0.55)] text-ink font-sans text-[14px] ` +
    `[animation:rp-in_0.38s_cubic-bezier(0.16,_1,_0.3,_1)_both] [&_::selection]:bg-accent-soft ` +
    `[@media(max-width:_700px)]:top-auto [@media(max-width:_700px)]:left-[8px] ` +
    `[@media(max-width:_700px)]:right-[8px] [@media(max-width:_700px)]:bottom-[8px] ` +
    `[@media(max-width:_700px)]:w-auto [@media(max-width:_700px)]:h-[min(72dvh,_600px)] ` +
    `[@media(max-width:_700px)]:[animation-name:rp-up] [@media(prefers-reduced-motion:_reduce)]:animate-none`,
  rpHead: `flex items-center gap-y-[11px] gap-x-[11px] pt-[12px] pr-[12px] pb-[12px] pl-[14px] ` +
    `[border-bottom:1px_solid_var(--hair)] [&_>_div]:flex-1 [&_>_div]:min-w-0 [&_>_div]:grid [&_>_div]:gap-y-[1px] ` +
    `[&_>_div]:gap-x-[1px] [&_b]:text-[15px] [&_b]:font-bold [&_b]:tracking-[-0.01em] [&_b]:whitespace-nowrap ` +
    `[&_b]:overflow-hidden [&_b]:text-ellipsis [&_small]:text-[12px] [&_small]:text-ink-3`,
  rpIc: `flex-none w-[34px] h-[34px] rounded-tl-[10px] rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] grid ` +
    `place-items-center text-[color:#fff] [background:linear-gradient(180deg,_#f59a6c,_#e0643c)] ` +
    `shadow-[inset_0_0.5px_0_rgba(255,_255,_255,_0.45),_0_4px_10px_-4px_rgba(var(--accent-rgb),_0.6)] ` +
    `[&_svg]:w-[19px] [&_svg]:h-[19px]`,
  rpClose: `[&_svg]:w-[13px] [&_svg]:h-[13px]`,
  rpMsgs: `overflow-auto pt-[18px] pr-[16px] pb-[12px] pl-[16px] flex flex-col gap-y-[10px] gap-x-[10px] ` +
    `[scrollbar-width:thin] overscroll-contain`,
  rpHello: `grid gap-y-[6px] gap-x-[6px] pt-[4px] pr-[2px] pb-0 pl-[2px]`,
  rpAsk: `mt-0 mr-0 mb-0 ml-0 font-semibold text-[18px] leading-[1.3] font-sans tracking-[-0.02em] text-ink text-balance`,
  rpSub: `mt-0 mr-0 mb-[8px] ml-0 text-[12.5px] leading-[1.5] text-ink-3`,
  rpTry: `list-none mt-[4px] mr-0 mb-0 ml-0 pt-0 pr-0 pb-0 pl-0 grid gap-y-[6px] gap-x-[6px] [&_svg]:w-[14px] ` +
    `[&_svg]:h-[14px] [&_svg]:flex-none [&_svg]:text-ink-3 [&_button:hover_svg]:text-accent-ink`,
  rpMsg: `max-w-[86%] pt-[9px] pr-[13px] pb-[9px] pl-[13px] rounded-tl-[16px] rounded-tr-[16px] rounded-br-[16px] ` +
    `rounded-bl-[16px] leading-[1.45] [animation:rp-msg_0.28s_cubic-bezier(0.16,_1,_0.3,_1)_both] [&_p]:mt-0 ` +
    `[&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_p]:whitespace-pre-wrap [&_p]:[overflow-wrap:anywhere] [&.user]:self-end ` +
    `[&.user]:bg-ink [&.user]:text-page [&.user]:rounded-br-[6px] [&.assistant]:self-start [&.assistant]:bg-panel ` +
    `[&.assistant]:shadow-[0_0_0_1px_var(--hair)] [&.assistant]:rounded-bl-[6px] ` +
    `[&.failed.failed]:bg-[rgba(178,_106,_0,_0.08)] [&.failed.failed]:shadow-[0_0_0_1px_rgba(178,_106,_0,_0.3)] ` +
    `[&.failed.failed]:text-ink [@media(prefers-reduced-motion:_reduce)]:animate-none`,
  rpSaved: `flex items-center gap-y-[6px] gap-x-[6px] mt-[8px] mr-[-5px] mb-[-3px] ml-[-5px] pt-[6px] pr-[8px] pb-[6px] ` +
    `pl-[8px] rounded-tl-[10px] rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] bg-[rgba(22,_147,_106,_0.1)] ` +
    `text-ok text-[12.5px] font-medium leading-[1.35] [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:flex-none ` +
    `[&_span]:flex-1 [&_span]:min-w-0 [&.undone]:bg-fill [&.undone]:text-ink-3`,
  rpTyping: `grid gap-y-[4px] gap-x-[4px] [&_small]:text-[12px] [&_small]:text-ink-3`,
  rpDots: `inline-flex gap-y-[4px] gap-x-[4px] pt-[3px] pr-0 pb-[3px] pl-0 [&_i]:w-[7px] [&_i]:h-[7px] ` +
    `[&_i]:rounded-tl-[50%] [&_i]:rounded-tr-[50%] [&_i]:rounded-br-[50%] [&_i]:rounded-bl-[50%] [&_i]:bg-accent ` +
    `[&_i]:[animation:rp-dot_1.1s_ease-in-out_infinite] [&_i:nth-child(2)]:[animation-delay:0.15s] ` +
    `[&_i:nth-child(3)]:[animation-delay:0.3s] [@media(prefers-reduced-motion:_reduce)]:[&_i]:animate-none`,
  rpForm: `grid gap-y-[6px] gap-x-[6px] pt-[10px] pr-[12px] pb-[10px] pl-[12px] [border-top:1px_solid_var(--hair)]`,
  rpInput: `flex items-end gap-y-[8px] gap-x-[8px] pt-[6px] pr-[6px] pb-[6px] pl-[14px] rounded-tl-[16px] ` +
    `rounded-tr-[16px] rounded-br-[16px] rounded-bl-[16px] bg-panel shadow-[0_0_0_1px_var(--line-strong)] ` +
    `[transition:box-shadow_0.15s] [&:focus-within]:shadow-[0_0_0_1px_var(--accent),_0_0_0_4px_var(--accent-soft)] ` +
    `[&_textarea::placeholder]:text-ink-3`,
  rpSend: `[&_svg]:w-[16px] [&_svg]:h-[16px]`,
  rpHint: `mt-0 mr-[4px] mb-0 ml-[4px] text-[11.5px] text-ink-3 [@media(max-width:_700px)]:hidden`,
  rpOff: `flex items-center justify-between gap-y-[10px] gap-x-[10px] pt-[14px] pr-[16px] pb-[14px] pl-[16px] ` +
    `[border-top:1px_solid_var(--hair)] [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_p]:text-ink-2 ` +
    `[&_p]:text-[13.5px]`,
  veItem: `[&.fresh]:relative [&.fresh]:isolate [&.fresh::before]:content-[''] [&.fresh::before]:absolute ` +
    `[&.fresh::before]:z-[-1] [&.fresh::before]:top-[6px] [&.fresh::before]:right-[2px] ` +
    `[&.fresh::before]:bottom-[6px] [&.fresh::before]:left-[-10px] [&.fresh::before]:rounded-tl-[16px] ` +
    `[&.fresh::before]:rounded-tr-[16px] [&.fresh::before]:rounded-br-[16px] [&.fresh::before]:rounded-bl-[16px] ` +
    `[&.fresh::before]:bg-accent-soft [&.fresh::before]:shadow-[inset_0_0_0_1px_rgba(var(--accent-rgb),_0.25)] ` +
    `[&.fresh::before]:[animation:ve-fresh_2.6s_cubic-bezier(0.16,_1,_0.3,_1)_both] ` +
    `[&.fresh::before]:pointer-events-none [@media(prefers-reduced-motion:_reduce)]:[&.fresh::before]:animate-none ` +
    `[@media(prefers-reduced-motion:_reduce)]:[&.fresh::before]:opacity-[0]`,
  dv: String.raw`grid gap-y-[28px] gap-x-[28px] pt-[8px] text-[15px] [&_>_*]:mt-0 [&_>_*]:mr-0 [&_>_*]:mb-0 [&_>_*]:ml-0
    [&_>_*]:min-w-0 [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_h1]:text-[28px] [&_h1]:leading-[1.15]
    [&_h1]:tracking-[-0.035em] [&_h1]:mt-0 [&_h1]:mr-0 [&_h1]:mb-0 [&_h1]:ml-0 [&_h1]:text-balance
    [&_h2]:text-[17px] [&_h2]:leading-[1.3] [&_h2]:tracking-[-0.015em] [&_h2]:mt-0 [&_h2]:mr-0 [&_h2]:mb-0
    [&_h2]:ml-0 [&_h3]:text-[15px] [&_h3]:leading-[1.35] [&_h3]:tracking-[-0.01em] [&_h3]:mt-0 [&_h3]:mr-0
    [&_h3]:mb-0 [&_h3]:ml-0 [&_ul:not([class])]:mt-0 [&_ul:not([class])]:mr-0 [&_ul:not([class])]:mb-0
    [&_ul:not([class])]:ml-0 [&_ul:not([class])]:pl-[1.2em] [&_ul:not([class])_>_li_+_li]:mt-[4px] [&_a]:text-ink
    [&_a]:decoration-line-strong [&_a:hover]:decoration-[currentColor] [&_label]:text-[14px] [&_kbd]:text-[11px]
    [&_kbd]:pt-0 [&_kbd]:pr-[5px] [&_kbd]:pb-0 [&_kbd]:pl-[5px] [&_kbd]:opacity-[0.8] [&_.dv-lede]:text-ink-2
    [&_.dv-lede]:max-w-[64ch] [&_.dv-lede]:leading-[1.55] [&_.dv-cap]:text-[13px] [&_.dv-cap]:leading-[1.5]
    [&_.dv-cap]:text-ink-3 [&_.dv-cap]:max-w-[70ch] [&_.dv-empty]:text-ink-2 [&_.dv-empty]:max-w-[60ch]
    [&_.dv-link]:inline-flex [&_.dv-link]:items-center [&_.dv-link]:gap-y-[6px] [&_.dv-link]:gap-x-[6px]
    [&_.dv-link]:text-[14px] [&_.dv-link]:font-medium [&_.dv-link]:text-ink-2 [&_.dv-link]:no-underline
    [&_.dv-link:hover]:text-ink [&_.dv-link:hover]:underline [&_.dv-link:hover]:decoration-line-strong
    [&_.dv-back]:inline-flex [&_.dv-back]:items-center [&_.dv-back]:gap-y-[4px] [&_.dv-back]:gap-x-[4px]
    [&_.dv-back]:w-fit [&_.dv-back]:ml-[-4px] [&_.dv-back]:pt-[4px] [&_.dv-back]:pr-[8px] [&_.dv-back]:pb-[4px]
    [&_.dv-back]:pl-[4px] [&_.dv-back]:rounded-tl-[8px] [&_.dv-back]:rounded-tr-[8px]
    [&_.dv-back]:rounded-br-[8px] [&_.dv-back]:rounded-bl-[8px] [&_.dv-back]:text-[14px] [&_.dv-back]:font-medium
    [&_.dv-back]:text-ink-2 [&_.dv-back]:no-underline
    [&_.dv-back]:[transition:background-color_0.15s_ease-out,_color_0.15s_ease-out] [&_.dv-back:hover]:bg-fill
    [&_.dv-back:hover]:text-ink [&_.dv-mini]:min-h-[32px] [&_.dv-mini]:pt-[4px] [&_.dv-mini]:pr-[10px]
    [&_.dv-mini]:pb-[4px] [&_.dv-mini]:pl-[10px] [&_.dv-mini]:gap-y-[6px] [&_.dv-mini]:gap-x-[6px]
    [&_.dv-mini]:rounded-tl-[8px] [&_.dv-mini]:rounded-tr-[8px] [&_.dv-mini]:rounded-br-[8px]
    [&_.dv-mini]:rounded-bl-[8px] [&_.dv-mini]:text-[13px] [&_.dv-mini]:font-medium [&_.dv-mini]:text-ink-2
    [&_.dv-mini:hover:not(:disabled)]:bg-fill [&_.dv-mini:hover:not(:disabled)]:text-ink
    [&_.dv-mini.on]:text-accent-ink [&_.dv-mini.on_svg]:fill-current
    [&_.dv-mini.danger:hover:not(:disabled)]:text-rec
    [&_.dv-mini.danger:hover:not(:disabled)]:bg-[rgba(255,_66,_85,_0.08)] [&_.badge_svg]:flex-none
    [&_.badge.now]:bg-accent-soft [&_.badge.now]:text-accent-ink [&_.btn-secondary_svg]:flex-none
    [&_select.dv-select]:w-auto [&_select.dv-select]:min-h-[36px] [&_select.dv-select]:pt-[6px]
    [&_select.dv-select]:pr-[10px] [&_select.dv-select]:pb-[6px] [&_select.dv-select]:pl-[10px]
    [&_select.dv-select]:text-[14px] [&_select.dv-select]:rounded-tl-[10px] [&_select.dv-select]:rounded-tr-[10px]
    [&_select.dv-select]:rounded-br-[10px] [&_select.dv-select]:rounded-bl-[10px]
    [&_details.dv-quiet]:[background:none] [&_details.dv-quiet]:rounded-tl-none
    [&_details.dv-quiet]:rounded-tr-none [&_details.dv-quiet]:rounded-br-none [&_details.dv-quiet]:rounded-bl-none
    [&_details.dv-quiet]:[border-top:1px_solid_var(--hair)] [&_details.dv-quiet_>_summary]:min-h-0
    [&_details.dv-quiet_>_summary]:pt-[14px] [&_details.dv-quiet_>_summary]:pr-0
    [&_details.dv-quiet_>_summary]:pb-[2px] [&_details.dv-quiet_>_summary]:pl-0
    [&_details.dv-quiet_>_summary]:text-[14px] [&_details.dv-quiet_>_summary]:font-medium
    [&_details.dv-quiet_>_summary]:text-ink-2 [&_details.dv-quiet_>_summary]:w-fit
    [&_details.dv-quiet_>_summary:hover]:text-ink [&_details.dv-quiet_>_.body]:pt-[10px]
    [&_details.dv-quiet_>_.body]:pr-0 [&_details.dv-quiet_>_.body]:pb-0 [&_details.dv-quiet_>_.body]:pl-[17px]
    [&_details.dv-quiet_>_.body]:grid [&_details.dv-quiet_>_.body]:gap-y-[10px]
    [&_details.dv-quiet_>_.body]:gap-x-[10px] [&_details.dv-quiet_>_.body]:text-[14px]
    [&_details.dv-quiet_>_.body]:text-ink-2 [&_details.dv-quiet_>_.body]:leading-[1.55]
    [&_details.dv-quiet_>_.body_>_*]:max-w-[68ch] [&_.pg-skills]:list-none [&_.pg-skills]:mt-0 [&_.pg-skills]:mr-0
    [&_.pg-skills]:mb-0 [&_.pg-skills]:ml-0 [&_.pg-skills]:pt-0 [&_.pg-skills]:pr-0 [&_.pg-skills]:pb-0
    [&_.pg-skills]:pl-0 [&_.pg-skills]:[border-top:0] [&_.pg-skills]:[border-bottom:1px_solid_var(--hair)]
    [&_.pg-skill]:grid [&_.pg-skill]:grid-cols-[184px_minmax(0,_1fr)] [&_.pg-skill]:gap-y-[6px]
    [&_.pg-skill]:gap-x-[24px] [&_.pg-skill]:pt-[14px] [&_.pg-skill]:pr-0 [&_.pg-skill]:pb-[12px]
    [&_.pg-skill]:pl-0 [&_.pg-skill]:[border-top:1px_solid_var(--hair)] [&_.pg-skill]:[border-right:0]
    [&_.pg-skill]:[border-bottom:0] [&_.pg-skill]:[border-left:0] [&_.pg-skill-name]:grid
    [&_.pg-skill-name]:gap-y-[3px] [&_.pg-skill-name]:gap-x-[3px] [&_.pg-skill-name]:[align-content:start]
    [&_.pg-skill-name_h3]:mt-0 [&_.pg-skill-name_h3]:mr-0 [&_.pg-skill-name_h3]:mb-0 [&_.pg-skill-name_h3]:ml-0
    [&_.pg-skill-name_h3]:text-[15px] [&_.skill-state]:inline-flex [&_.skill-state]:items-center
    [&_.skill-state]:gap-y-[6px] [&_.skill-state]:gap-x-[6px] [&_.skill-state]:text-[12.5px]
    [&_.skill-state]:font-semibold [&_.skill-state]:text-ink-3 [&_.skill-state_svg]:w-[14px]
    [&_.skill-state_svg]:h-[14px] [&_.skill-state_svg]:flex-none [&_.skill-state.more\_evidence]:text-warn
    [&_.skill-state.practice\_focus]:text-accent-ink [&_.skill-state.stable]:text-ink-2
    [&_.skill-state.progress]:text-ok [&_.skill-state.recording\_issue]:text-warn [&_.pg-skill-text]:min-w-0
    [&_.pg-skill-text_p]:mt-0 [&_.pg-skill-text_p]:mr-0 [&_.pg-skill-text_p]:mb-0 [&_.pg-skill-text_p]:ml-0
    [&_.pg-skill-text_p]:max-w-[64ch] [&_.pg-next]:font-medium [&_.pg-next]:text-ink [&_.pg-next]:leading-[1.45]
    [&_.pg-next_span]:text-ink-3 [&_.pg-next_span]:font-normal [&_.pg-why]:mt-[3px]! [&_.pg-why]:text-ink-2
    [&_.pg-why]:text-[14px] [&_.pg-why]:leading-[1.5] [&_.pg-note]:mt-[6px]! [&_.pg-note]:text-ink-2
    [&_.pg-note]:text-[14px] [&_.pg-note]:not-italic [&_details.pg-more]:mt-[4px] [&_details.pg-more]:mr-0
    [&_details.pg-more]:mb-0 [&_details.pg-more]:ml-0 [&_details.pg-more]:[background:none]
    [&_details.pg-more]:[border-top:0] [&_details.pg-more]:[border-right:0] [&_details.pg-more]:[border-bottom:0]
    [&_details.pg-more]:[border-left:0] [&_details.pg-more]:rounded-tl-none [&_details.pg-more]:rounded-tr-none
    [&_details.pg-more]:rounded-br-none [&_details.pg-more]:rounded-bl-none
    [&_details.pg-more_>_summary]:min-h-[30px] [&_details.pg-more_>_summary]:pt-[2px]
    [&_details.pg-more_>_summary]:pr-0 [&_details.pg-more_>_summary]:pb-[2px] [&_details.pg-more_>_summary]:pl-0
    [&_details.pg-more_>_summary]:gap-y-[6px] [&_details.pg-more_>_summary]:gap-x-[6px]
    [&_details.pg-more_>_summary]:w-fit [&_details.pg-more_>_summary]:text-[13px]
    [&_details.pg-more_>_summary]:font-medium [&_details.pg-more_>_summary]:text-ink-3
    [&_details.pg-more_>_summary::before]:w-[6px] [&_details.pg-more_>_summary::before]:h-[6px]
    [&_details.pg-more_>_summary:hover]:text-ink-2 [&_details.pg-more[open]_>_summary]:text-ink-2
    [&_.pg-more_dl]:grid [&_.pg-more_dl]:grid-cols-[max-content_minmax(0,_1fr)] [&_.pg-more_dl]:gap-y-[5px]
    [&_.pg-more_dl]:gap-x-[16px] [&_.pg-more_dl]:mt-[4px] [&_.pg-more_dl]:mr-0 [&_.pg-more_dl]:mb-[6px]
    [&_.pg-more_dl]:ml-[15px] [&_.pg-more_dl]:text-[13px] [&_.pg-more_dl]:leading-[1.5]
    [&_.pg-more_dt]:font-semibold [&_.pg-more_dt]:text-ink-2 [&_.pg-more_dd]:mt-0 [&_.pg-more_dd]:mr-0
    [&_.pg-more_dd]:mb-0 [&_.pg-more_dd]:ml-0 [&_.pg-more_dd]:text-ink-2 [&_.pg-more_dd]:max-w-[60ch]
    [&_.pg-task]:grid [&_.pg-task]:gap-y-[6px] [&_.pg-task]:gap-x-[6px] [&_.pg-task_label]:mt-0
    [&_.pg-task_label]:mr-0 [&_.pg-task_label]:mb-0 [&_.pg-task_label]:ml-0 [&_.pg-task_select]:text-[14px]
    [&_.pg-takes]:list-none [&_.pg-takes]:mt-0 [&_.pg-takes]:mr-0 [&_.pg-takes]:mb-0 [&_.pg-takes]:ml-0
    [&_.pg-takes]:pt-0 [&_.pg-takes]:pr-0 [&_.pg-takes]:pb-0 [&_.pg-takes]:pl-0 [&_.pg-takes]:grid
    [&_.pg-takes]:gap-y-0 [&_.pg-takes]:gap-x-0 [&_.pg-takes]:[border-bottom:1px_solid_var(--hair)]
    [&_.pg-takes_li]:grid [&_.pg-takes_li]:grid-cols-[34px_minmax(0,_1fr)] [&_.pg-takes_li]:[align-items:start]
    [&_.pg-takes_li]:pt-[10px] [&_.pg-takes_li]:pr-[10px] [&_.pg-takes_li]:pb-[10px] [&_.pg-takes_li]:pl-[2px]
    [&_.pg-takes_li]:[border-top:1px_solid_var(--hair)] [&_.pg-takes_li]:rounded-tl-none
    [&_.pg-takes_li]:rounded-tr-none [&_.pg-takes_li]:rounded-br-none [&_.pg-takes_li]:rounded-bl-none
    [&_.pg-takes_li]:[transition:background-color_0.15s_ease-out] [&_.pg-takes_li.picked]:bg-accent-soft
    [&_.pg-takes_li.picked]:rounded-tl-[12px] [&_.pg-takes_li.picked]:rounded-tr-[12px]
    [&_.pg-takes_li.picked]:rounded-br-[12px] [&_.pg-takes_li.picked]:rounded-bl-[12px]
    [&_.pg-takes_li.picked]:[border-top-color:transparent]
    [&_.pg-takes_li.picked_+_li]:[border-top-color:transparent] [&_.pg-pick]:grid [&_.pg-pick]:place-items-center
    [&_.pg-pick]:h-[26px] [&_.pg-pick]:mt-0 [&_.pg-pick]:mr-0 [&_.pg-pick]:mb-0 [&_.pg-pick]:ml-0
    [&_.pg-pick]:cursor-pointer [&_.pg-pick_input]:w-[17px] [&_.pg-pick_input]:h-[17px] [&_.pg-pick_input]:mt-0
    [&_.pg-pick_input]:mr-0 [&_.pg-pick_input]:mb-0 [&_.pg-pick_input]:ml-0
    [&_.pg-pick_input]:[accent-color:var(--accent)] [&_.pg-pick_input]:cursor-pointer [&_.pg-take]:min-w-0
    [&_.pg-take]:pt-0 [&_.pg-take]:pr-0 [&_.pg-take]:pb-0 [&_.pg-take]:pl-0 [&_.pg-take-meta]:flex
    [&_.pg-take-meta]:flex-wrap [&_.pg-take-meta]:items-center [&_.pg-take-meta]:gap-y-[4px]
    [&_.pg-take-meta]:gap-x-[8px] [&_.pg-take-meta]:mt-[6px] [&_.pg-take-meta]:mr-0 [&_.pg-take-meta]:mb-0
    [&_.pg-take-meta]:ml-[46px] [&_.pg-take-meta]:text-[13px] [&_.pg-take-meta]:text-ink-3 [&_.pg-hz]:ml-auto
    [&_.pg-hz]:text-[13px] [&_.pg-hz]:text-ink-3 [&_.pg-hz]:tabular-nums [&_.pg-hz_b]:text-ink-2
    [&_.pg-hz_b]:font-semibold [&_.pg-compare]:static [&_.pg-compare]:flex [&_.pg-compare]:items-center
    [&_.pg-compare]:justify-between [&_.pg-compare]:gap-y-[12px] [&_.pg-compare]:gap-x-[12px]
    [&_.pg-compare]:mt-[2px] [&_.pg-compare]:mr-0 [&_.pg-compare]:mb-0 [&_.pg-compare]:ml-0
    [&_.pg-compare]:pt-[8px] [&_.pg-compare]:pr-[8px] [&_.pg-compare]:pb-[8px] [&_.pg-compare]:pl-[16px]
    [&_.pg-compare]:[border-top:0] [&_.pg-compare]:[border-right:0] [&_.pg-compare]:[border-bottom:0]
    [&_.pg-compare]:[border-left:0] [&_.pg-compare]:rounded-tl-[14px] [&_.pg-compare]:rounded-tr-[14px]
    [&_.pg-compare]:rounded-br-[14px] [&_.pg-compare]:rounded-bl-[14px] [&_.pg-compare]:bg-fill
    [&_.pg-compare]:shadow-[none] [&_.pg-compare.live]:sticky [&_.pg-compare.live]:bottom-[8px]
    [&_.pg-compare.live]:z-[2] [&_.pg-compare.live]:bg-panel
    [&_.pg-compare.live]:shadow-[0_0_0_0.5px_var(--line-strong),_0_12px_28px_-14px_rgba(0,_0,_0,_0.35)]
    [&_.pg-compare_span]:text-[14px] [&_.pg-compare_span]:text-ink-2 [&_.pg-compare_button]:flex-none
    [&_.pg-compare_button]:whitespace-nowrap [&_.pg-compare_button]:min-h-[38px]
    [&_.player.compact]:[background:none] [&_.player.compact]:pt-0 [&_.player.compact]:pr-0
    [&_.player.compact]:pb-0 [&_.player.compact]:pl-0 [&_.player.compact]:rounded-tl-none
    [&_.player.compact]:rounded-tr-none [&_.player.compact]:rounded-br-none [&_.player.compact]:rounded-bl-none
    [&_.player.compact_.player-head]:mb-[4px] [&_.player.compact_.player-head]:pl-[46px]
    [&_.player.compact_.player-head]:gap-y-[8px] [&_.player.compact_.player-head]:gap-x-[8px]
    [&_.player.compact_.label]:font-medium [&_.player.compact_.label]:text-[14px]
    [&_.player.compact_.label]:leading-[normal] [&_.player.compact_.label]:font-sans
    [&_.player.compact_.label]:text-ink [&_.player.compact_.label]:min-w-0 [&_.player.compact_.play-btn]:w-[34px]
    [&_.player.compact_.play-btn]:h-[34px] [&_.player.compact_.play-btn]:min-h-[34px]
    [&_.player.compact_.play-btn_svg]:w-[12px] [&_.player.compact_.play-btn_svg]:h-[12px]
    [&_.player_.time]:text-[12px] [&_.player_.time]:flex-none [&_.player-head]:flex-nowrap
    [&_.player-head]:items-start [&_.player-head_.spacer]:hidden [&_.player-head_.ab-tag]:flex-none
    [&_.player-head_.label]:flex-1 [&_.player-head_.label]:min-w-0 [&_.player-head_.label]:leading-[1.35]
    [&_.player-head_.label]:pt-[1px] [&_.player-head_.label]:[display:-webkit-box]
    [&_.player-head_.label]:[-webkit-line-clamp:2] [&_.player-head_.label]:[-webkit-box-orient:vertical]
    [&_.player-head_.label]:overflow-hidden [&_.player-head_.time]:pt-[2px] [&.rc]:gap-y-[26px]
    [&.rc]:gap-x-[26px] [&_.rc-head_.dv-link]:[grid-column:2] [&_.rc-head_.dv-link]:[grid-row:1]
    [&_.rc-head_.dv-link]:self-center [&_.rc-day_h2]:text-[13px] [&_.rc-day_h2]:font-semibold
    [&_.rc-day_h2]:tracking-[0] [&_.rc-day_h2]:text-ink-3 [&_.rc-day_h2]:pl-[2px] [&_.rc-row]:w-full
    [&_.rc-row]:grid [&_.rc-row]:grid-cols-[minmax(0,_1fr)_auto_16px] [&_.rc-row]:items-center
    [&_.rc-row]:gap-y-[4px] [&_.rc-row]:gap-x-[14px] [&_.rc-row]:min-h-0 [&_.rc-row]:pt-[11px]
    [&_.rc-row]:pr-[12px] [&_.rc-row]:pb-[11px] [&_.rc-row]:pl-[10px] [&_.rc-row]:rounded-tl-[12px]
    [&_.rc-row]:rounded-tr-[12px] [&_.rc-row]:rounded-br-[12px] [&_.rc-row]:rounded-bl-[12px]
    [&_.rc-row]:text-left [&_.rc-row]:font-normal [&_.rc-row]:text-ink [&_.rc-row:hover]:bg-fill
    [&_.rc-row:active:not(:disabled)]:transform-none [&_.rc-list_>_li.open_.rc-row:hover]:[background:none]
    [&_.rc-prompt]:ml-[46px] [&_.rc-prompt]:text-[13px] [&_.rc-prompt]:text-ink-3 [&_.rc-prompt]:overflow-hidden
    [&_.rc-prompt]:text-ellipsis [&_.rc-prompt]:whitespace-nowrap [&_.rc-actions_.dv-mini]:[padding-inline:8px]
    [&_.rc-note]:ml-[46px] [&_.rc-note]:text-[13px] [&_.rc-note]:text-ink-2 [&.cmp_.rc-note]:ml-0
    [&_.rc-noteform_input]:min-h-[36px] [&_.rc-noteform_input]:pt-[6px] [&_.rc-noteform_input]:pr-[10px]
    [&_.rc-noteform_input]:pb-[6px] [&_.rc-noteform_input]:pl-[10px] [&_.rc-noteform_input]:text-[14px]
    [&_.rc-noteform_.btn-secondary]:min-h-[36px] [&_.rc-noteform_.btn-secondary]:pt-[6px]
    [&_.rc-noteform_.btn-secondary]:pr-[12px] [&_.rc-noteform_.btn-secondary]:pb-[6px]
    [&_.rc-noteform_.btn-secondary]:pl-[12px] [&_.rc-more]:justify-self-start [&_.ab]:grid [&_.ab]:grid-cols-[1fr]
    [&_.ab]:gap-y-[16px] [&_.ab]:gap-x-[16px] [&_.cmp-limits]:mt-0 [&_.cmp-limits]:mr-0 [&_.cmp-limits]:mb-0
    [&_.cmp-limits]:ml-0 [&_.cmp-limits]:pl-[1.2em] [&_.cmp-limits]:text-[14px] [&_.cmp-limits]:text-ink-2
    [&_.cmp-result]:gap-y-[10px] [&_.cmp-result]:gap-x-[10px] [&_.cmp-result_>_h2]:mb-[2px]
    [&_.cmp-result_.dv-quiet]:mt-[6px] [&_.cmp-table]:text-[14px] [&_.cmp-table_td]:pt-[9px]
    [&_.cmp-table_td]:pr-[12px] [&_.cmp-table_td]:pb-[9px] [&_.cmp-table_td]:pl-0 [&_.cmp-table_th]:pt-[9px]
    [&_.cmp-table_th]:pr-[12px] [&_.cmp-table_th]:pb-[9px] [&_.cmp-table_th]:pl-0
    [&_.cmp-table_td:not(:first-child)]:whitespace-nowrap [&_.cmp-table_td:not(:first-child)]:tabular-nums
    [&_.cmp-table_th:not(:first-child)]:whitespace-nowrap [&_.cmp-table_th:not(:first-child)]:tabular-nums
    [&_.cmp-table_td:first-child]:min-w-[180px] [&_.cmp-table_.dv-cap]:block [&_.cmp-traces]:grid
    [&_.cmp-traces]:grid-cols-[repeat(auto-fit,_minmax(220px,_1fr))] [&_.cmp-traces]:gap-y-[16px]
    [&_.cmp-traces]:gap-x-[16px] [&_.cmp-traces]:mt-[6px] [&_.cmp-traces_h3]:text-[13px]
    [&_.cmp-traces_h3]:text-ink-2 [&_.cmp-traces_h3]:mb-[4px] [&_.pitch_svg]:rounded-tl-[10px]
    [&_.pitch_svg]:rounded-tr-[10px] [&_.pitch_svg]:rounded-br-[10px] [&_.pitch_svg]:rounded-bl-[10px]
    [&_.pitch_svg]:bg-fill [&_.pitch_figcaption]:mt-[6px] [&_.pitch_figcaption]:text-[12px]
    [&_.pitch_figcaption]:text-ink-3 [&.fb]:gap-y-0 [&.fb]:gap-x-0 [&.fb_>_*_+_*]:mt-[24px]
    [&.fb_>_.dv-back_+_*]:mt-[10px] [&_.fb-head]:gap-y-[10px] [&_.fb-head]:gap-x-[10px]
    [&_.fb-head_h1]:text-[26px] [&_.fb-head_h1]:tracking-[-0.03em] [&_.fb-head_h1]:leading-[1.2]
    [&_.fb-head_h1]:max-w-[30ch] [&_.fb-tags]:flex [&_.fb-tags]:flex-wrap [&_.fb-tags]:items-center
    [&_.fb-tags]:gap-y-[6px] [&_.fb-tags]:gap-x-[10px] [&_.fb-tags]:text-[13px] [&_.fb-tags]:text-ink-3
    [&_.fb-next]:text-ink-3 [&_.fb-step]:grid [&_.fb-step]:gap-y-[12px] [&_.fb-step]:gap-x-[12px]
    [&_.fb-step]:[align-content:start] [&_.fb-step]:[background:none] [&_.fb-step]:rounded-tl-none
    [&_.fb-step]:rounded-tr-none [&_.fb-step]:rounded-br-none [&_.fb-step]:rounded-bl-none [&_.fb-step]:pt-[20px]
    [&_.fb-step]:pr-0 [&_.fb-step]:pb-0 [&_.fb-step]:pl-0 [&_.fb-step]:[border-top:1px_solid_var(--hair)]
    [&_.card.fb-step]:grid [&_.card.fb-step]:gap-y-[12px] [&_.card.fb-step]:gap-x-[12px]
    [&_.card.fb-step]:[align-content:start] [&_.card.fb-step]:[background:none] [&_.card.fb-step]:rounded-tl-none
    [&_.card.fb-step]:rounded-tr-none [&_.card.fb-step]:rounded-br-none [&_.card.fb-step]:rounded-bl-none
    [&_.card.fb-step]:pt-[20px] [&_.card.fb-step]:pr-0 [&_.card.fb-step]:pb-0 [&_.card.fb-step]:pl-0
    [&_.card.fb-step]:[border-top:1px_solid_var(--hair)] [&_.fb-step_>_h2]:mb-[2px] [&_.fb-text]:text-ink-2
    [&_.fb-text]:max-w-[64ch] [&_.fb-ev]:grid [&_.fb-ev]:gap-y-[8px] [&_.fb-ev]:gap-x-[8px]
    [&_.fb-ev-desc]:text-[14px] [&_.fb-ev-desc]:text-ink-2 [&_.fb-ev-desc]:leading-[1.55]
    [&_.fb-ev-desc_.badge]:mr-[4px] [&_.fb-ev-desc_.badge]:[vertical-align:1px] [&_.fb-step_.cue]:mt-0
    [&_.fb-step_.cue]:mr-0 [&_.fb-step_.cue]:mb-0 [&_.fb-step_.cue]:ml-0 [&_.fb-step_.cue]:text-[18px]
    [&_.fb-step_.cue]:leading-[1.5] [&_.fb-step_.cue]:font-medium [&_.fb-step_.cue]:tracking-[-0.012em]
    [&_.fb-step_.cue]:text-ink [&_.fb-step_.cue]:max-w-[46ch] [&_.fb-why_>_.body_strong]:text-ink
    [&_.fb-why_>_.body_strong]:font-semibold [&_details.fb-why]:[border-top:0]
    [&_details.fb-why_>_summary]:pt-[2px] [&_.fb-compare]:grid [&_.fb-compare]:gap-y-[12px]
    [&_.fb-compare]:gap-x-[12px] [&_.fb-compare_>_h2]:mt-[6px] [&_.fb-status]:flex [&_.fb-status]:flex-wrap
    [&_.fb-status]:items-center [&_.fb-status]:gap-y-[6px] [&_.fb-status]:gap-x-[10px] [&_.fb-q]:grid
    [&_.fb-q]:gap-y-0 [&_.fb-q]:gap-x-0 [&_.fb-q]:pt-[14px] [&_.fb-q]:pr-0 [&_.fb-q]:pb-0 [&_.fb-q]:pl-0
    [&_.fb-q]:[border-top:1px_solid_var(--hair)] [&_.fb-q_legend]:float-left [&_.fb-q_legend]:w-full
    [&_.fb-q_legend]:mt-0 [&_.fb-q_legend]:mr-0 [&_.fb-q_legend]:mb-[10px] [&_.fb-q_legend]:ml-0
    [&_.fb-q_legend]:text-[15px] [&_.fb-q_legend]:font-semibold [&_.fb-q_.choices]:clear-both [&_.fb-field]:grid
    [&_.fb-field]:gap-y-[8px] [&_.fb-field]:gap-x-[8px] [&_.fb-field_label]:mt-0 [&_.fb-field_label]:mr-0
    [&_.fb-field_label]:mb-0 [&_.fb-field_label]:ml-0 [&_.fb-field_textarea]:min-h-[76px] [&_.fb-actions]:flex
    [&_.fb-actions]:flex-wrap [&_.fb-actions]:gap-y-[6px] [&_.fb-actions]:gap-x-[6px] [&_.fb-others]:list-none
    [&_.fb-others]:mt-0 [&_.fb-others]:mr-0 [&_.fb-others]:mb-0 [&_.fb-others]:ml-0 [&_.fb-others]:pt-0
    [&_.fb-others]:pr-0 [&_.fb-others]:pb-0 [&_.fb-others]:pl-0 [&_.fb-others]:grid [&_.fb-others_>_li]:grid
    [&_.fb-others_>_li]:gap-y-[6px] [&_.fb-others_>_li]:gap-x-[6px] [&_.fb-others_>_li]:pt-[12px]
    [&_.fb-others_>_li]:pr-0 [&_.fb-others_>_li]:pb-[12px] [&_.fb-others_>_li]:pl-0
    [&_.fb-others_>_li]:[border-top:1px_solid_var(--hair)] [&_.fb-others_>_li:first-child]:[border-top:0]
    [&_.fb-others_>_li:first-child]:pt-0 [&_.fb-others_p]:text-ink [&_.fb-by]:pt-[4px] [&_.callout_p_+_p]:mt-[4px]
    [&_.callout_.btn-primary]:mt-[10px] [@media(min-width:_640px)]:[&_.ab]:grid-cols-[1fr_1fr]
    [@media(max-width:_640px)]:gap-y-[24px] [@media(max-width:_640px)]:gap-x-[24px]
    [@media(max-width:_640px)]:pt-[4px] [@media(max-width:_640px)]:[&_h1]:text-[24px]
    [@media(max-width:_640px)]:[&_.fb-head_h1]:text-[24px]
    [@media(max-width:_640px)]:[&_.pg-skill]:grid-cols-[minmax(0,_1fr)]
    [@media(max-width:_640px)]:[&_.pg-skill]:gap-y-[6px] [@media(max-width:_640px)]:[&_.pg-skill]:gap-x-[6px]
    [@media(max-width:_640px)]:[&_.pg-skill-name]:flex [@media(max-width:_640px)]:[&_.pg-skill-name]:flex-wrap
    [@media(max-width:_640px)]:[&_.pg-skill-name]:items-baseline
    [@media(max-width:_640px)]:[&_.pg-skill-name]:justify-between
    [@media(max-width:_640px)]:[&_.pg-skill-name]:gap-y-[2px]
    [@media(max-width:_640px)]:[&_.pg-skill-name]:gap-x-[12px] [@media(max-width:_640px)]:[&_.pg-take-meta]:ml-0
    [@media(max-width:_640px)]:[&_.rc-prompt]:ml-0 [@media(max-width:_640px)]:[&_.rc-note]:ml-0
    [@media(max-width:_640px)]:[&_.player.compact_.player-head]:pl-0
    [@media(max-width:_640px)]:[&_.pg-compare]:pl-[14px]
    [@media(max-width:_640px)]:[&_.pg-compare_span]:text-[13px]
    [@media(max-width:_640px)]:[&_.rc-row]:[padding-inline:8px]
    [@media(max-width:_640px)]:[&_.rc-head_.dv-link]:[grid-column:1]
    [@media(max-width:_640px)]:[&_.rc-head_.dv-link]:[grid-row:auto]
    [@media(max-width:_640px)]:[&_.rc-head_.dv-link]:justify-self-start
    [@media(prefers-reduced-motion:_reduce)]:[&_.pg-takes_li]:transition-none`,
  dvHead: `grid gap-y-[8px] gap-x-[8px]`,
  dvLoading: `text-ink-3 pt-[8px]`,
  dvSec: `grid gap-y-[12px] gap-x-[12px] [align-content:start]`,
  dvSecHead: `flex items-center justify-between gap-y-[8px] gap-x-[16px] flex-wrap`,
  dvTiles: `grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-y-[8px] gap-x-[8px] [&_>_div]:bg-fill ` +
    `[&_>_div]:rounded-tl-[14px] [&_>_div]:rounded-tr-[14px] [&_>_div]:rounded-br-[14px] ` +
    `[&_>_div]:rounded-bl-[14px] [&_>_div]:pt-[12px] [&_>_div]:pr-[14px] [&_>_div]:pb-[13px] [&_>_div]:pl-[14px] ` +
    `[&_>_div]:min-w-0 [&_>_div]:flex [&_>_div]:flex-col [&_>_div]:justify-between [&_>_div]:gap-y-[4px] ` +
    `[&_>_div]:gap-x-[4px] [&_dt]:text-[12px] [&_dt]:leading-[1.35] [&_dt]:text-ink-3 [&_dd]:mt-0 [&_dd]:mr-0 ` +
    `[&_dd]:mb-0 [&_dd]:ml-0 [&_dd]:text-[24px] [&_dd]:font-semibold [&_dd]:tracking-[-0.03em] ` +
    `[&_dd]:leading-[1.15] [&_dd]:tabular-nums [&_dd_small]:text-[15px] [&_dd_small]:font-medium ` +
    `[&_dd_small]:tracking-[-0.01em] [&_dd_small]:text-ink-2 [@media(max-width:_640px)]:gap-y-[6px] ` +
    `[@media(max-width:_640px)]:gap-x-[6px] [@media(max-width:_640px)]:[&_>_div]:pt-[10px] ` +
    `[@media(max-width:_640px)]:[&_>_div]:pr-[11px] [@media(max-width:_640px)]:[&_>_div]:pb-[11px] ` +
    `[@media(max-width:_640px)]:[&_>_div]:pl-[11px] [@media(max-width:_640px)]:[&_>_div]:rounded-tl-[12px] ` +
    `[@media(max-width:_640px)]:[&_>_div]:rounded-tr-[12px] [@media(max-width:_640px)]:[&_>_div]:rounded-br-[12px] ` +
    `[@media(max-width:_640px)]:[&_>_div]:rounded-bl-[12px] [@media(max-width:_640px)]:[&_dd]:text-[21px] ` +
    `[@media(max-width:_640px)]:[&_dd_small]:text-[13px]`,
  cmpSide: `grid gap-y-[8px] gap-x-[8px] [align-content:start] min-w-0`,
  cmpReason: `text-ink-2 max-w-[66ch]`,
  cmpM: `block text-ink font-medium [&::first-letter]:uppercase`,
  ph: `relative grid gap-y-[16px] gap-x-[16px] pt-[6px] min-h-full`,
  phHead: `flex items-end justify-between gap-y-[16px] gap-x-[16px] flex-wrap [&_h1]:mt-0 [&_h1]:mr-0 [&_h1]:mb-0 ` +
    `[&_h1]:ml-0 [&_h1]:text-[24px] [&_h1]:font-[650] [&_h1]:tracking-[-0.02em] [&_p]:mt-[2px] [&_p]:mr-0 ` +
    `[&_p]:mb-0 [&_p]:ml-0 [&_p]:max-w-[52ch] [&_p]:text-ink-3 [&_p]:text-[13.5px]`,
  phActions: `flex gap-y-[8px] gap-x-[8px]`,
  phShuffle: `min-h-[36px] inline-flex items-center gap-y-[7px] gap-x-[7px] pt-0 pr-[14px] pb-0 pl-[14px] rounded-tl-[99px] ` +
    `rounded-tr-[99px] rounded-br-[99px] rounded-bl-[99px] text-[13px] font-semibold bg-fill text-ink-2 ` +
    `[&.on]:bg-accent-soft [&.on]:text-accent-ink [&_svg]:w-[15px] [&_svg]:h-[15px]`,
  phAdd: `min-h-[36px] inline-flex items-center gap-y-[7px] gap-x-[7px] pt-0 pr-[14px] pb-0 pl-[14px] rounded-tl-[99px] ` +
    `rounded-tr-[99px] rounded-br-[99px] rounded-bl-[99px] text-[13px] font-semibold bg-ink text-page ` +
    `[&_svg]:w-[15px] [&_svg]:h-[15px]`,
  phGrid: `list-none mt-0 mr-0 mb-0 ml-0 pt-0 pr-0 pb-0 pl-0 grid grid-cols-[repeat(auto-fill,_minmax(150px,_1fr))] ` +
    `gap-y-[14px] gap-x-[14px] [@media(max-width:_640px)]:grid-cols-[repeat(2,_1fr)] ` +
    `[@media(max-width:_640px)]:gap-y-[10px] [@media(max-width:_640px)]:gap-x-[10px]`,
  phTile: `relative grid gap-y-[6px] gap-x-[6px] min-w-0 ` +
    `[&.pinned_.ph-img]:shadow-[0_0_0_2px_var(--page),_0_0_0_4px_var(--accent)] ` +
    `[&.pinned_.ph-meta_small]:text-accent-ink [&.pinned_.ph-meta_small]:font-semibold ` +
    `[&:hover_.ph-tools]:opacity-[1] [&:focus-within_.ph-tools]:opacity-[1]`,
  phImg: `block w-full min-h-0 pt-0 pr-0 pb-0 pl-0 [border-top:0] [border-right:0] [border-bottom:0] [border-left:0] ` +
    `rounded-tl-[16px] rounded-tr-[16px] rounded-br-[16px] rounded-bl-[16px] overflow-hidden bg-fill cursor-zoom-in ` +
    `[&_span]:block [&_span]:w-full [&_span]:aspect-[1] [&_span]:bg-no-repeat ` +
    `[&_span]:[background-position:70%_30%] [&_span]:[background-size:420%_auto] ` +
    `[&_span]:[transition:transform_0.35s_var(--ease)] [&:hover_span]:[transform:scale(1.04)] ` +
    `[@media(prefers-reduced-motion:_reduce)]:[&_span]:transition-none`,
  phMeta: `grid min-w-0 pt-0 pr-[2px] pb-0 pl-[2px] [&_b]:text-[13px] [&_b]:font-semibold [&_b]:line-clamp-2 ` +
    `[&_b]:[line-height:1.3] [&_b]:[overflow-wrap:anywhere] [&_small]:text-[11.5px] [&_small]:text-ink-3`,
  phTools: `absolute top-[8px] right-[8px] flex gap-y-[6px] gap-x-[6px] opacity-[0] [transition:opacity_0.15s_ease] ` +
    `[@media(hover:_none)]:opacity-[1] [&_button]:w-[30px] [&_button]:h-[30px] [&_button]:min-h-0 [&_button]:pt-0 ` +
    `[&_button]:pr-0 [&_button]:pb-0 [&_button]:pl-0 [&_button]:grid [&_button]:place-items-center ` +
    `[&_button]:rounded-tl-[50%] [&_button]:rounded-tr-[50%] [&_button]:rounded-br-[50%] ` +
    `[&_button]:rounded-bl-[50%] [&_button]:bg-[rgba(20,_20,_26,_0.6)] [&_button]:text-[color:#fff] ` +
    `[&_button]:[backdrop-filter:blur(8px)] [&_button:hover:not(:disabled)]:bg-[rgba(20,_20,_26,_0.85)] ` +
    `[&_button:disabled]:opacity-[0.45] [&_svg]:w-[15px] [&_svg]:h-[15px]`,
  phConfirm: `absolute top-0 right-0 bottom-auto left-0 aspect-[1] grid place-content-center gap-y-[10px] gap-x-[10px] ` +
    `pt-[12px] pr-[12px] pb-[12px] pl-[12px] rounded-tl-[16px] rounded-tr-[16px] rounded-br-[16px] ` +
    `rounded-bl-[16px] text-center bg-[rgba(20,_20,_26,_0.82)] text-[color:#fff] text-[12.5px] leading-[1.35] ` +
    `[backdrop-filter:blur(6px)] [&_div]:flex [&_div]:gap-y-[6px] [&_div]:gap-x-[6px] [&_div]:justify-center ` +
    `[&_button]:min-h-[30px] [&_button]:pt-0 [&_button]:pr-[12px] [&_button]:pb-0 [&_button]:pl-[12px] ` +
    `[&_button]:rounded-tl-[99px] [&_button]:rounded-tr-[99px] [&_button]:rounded-br-[99px] ` +
    `[&_button]:rounded-bl-[99px] [&_button]:bg-[rgba(255,_255,_255,_0.14)] [&_button]:text-[color:#fff] ` +
    `[&_button]:text-[12.5px] [&_button]:font-semibold [&_.ph-danger]:bg-rec`,
  phDrop: `[&_button]:box-border [&_button]:w-full [&_button]:min-w-0 [&_button]:aspect-[1] [&_button]:min-h-0 ` +
    `[&_button]:grid [&_button]:grid-cols-[minmax(0,_1fr)] [&_button]:content-center ` +
    `[&_button]:justify-items-center [&_button]:gap-y-[4px] [&_button]:gap-x-[4px] [&_button]:pt-[12px] ` +
    `[&_button]:pr-[12px] [&_button]:pb-[12px] [&_button]:pl-[12px] ` +
    `[&_button]:[border-top:1.5px_dashed_var(--line-strong)] ` +
    `[&_button]:[border-right:1.5px_dashed_var(--line-strong)] ` +
    `[&_button]:[border-bottom:1.5px_dashed_var(--line-strong)] ` +
    `[&_button]:[border-left:1.5px_dashed_var(--line-strong)] [&_button]:rounded-tl-[16px] ` +
    `[&_button]:rounded-tr-[16px] [&_button]:rounded-br-[16px] [&_button]:rounded-bl-[16px] ` +
    `[&_button]:[background:none] [&_button]:text-ink-3 [&_button]:text-center ` +
    `[&_button:hover:not(:disabled)]:[border-color:var(--accent)] [&_button:hover:not(:disabled)]:text-accent-ink ` +
    `[&_button:hover:not(:disabled)]:bg-accent-soft [&_svg]:w-[28px] [&_svg]:h-[28px] [&_b]:text-[13px] ` +
    `[&_b]:text-ink-2 [&_small]:text-[11.5px]`,
  phQuiet: `mt-0 mr-0 mb-0 ml-0 text-ink-3 text-[13px]`,
  phSmall: `text-[12px]`,
  phLink: `min-h-0 pt-0 pr-0 pb-0 pl-0 [background:none] text-accent-ink [font-family:inherit] text-[inherit] ` +
    `font-semibold [font-style:inherit] leading-[inherit] underline underline-offset-[2px]`,
  phNote: `sticky bottom-0 justify-self-center z-[5] mt-0 mr-0 mb-0 ml-0 pt-[9px] pr-[16px] pb-[9px] pl-[16px] ` +
    `rounded-tl-[99px] rounded-tr-[99px] rounded-br-[99px] rounded-bl-[99px] bg-ink text-page text-[13px] ` +
    `font-medium shadow-[0_12px_28px_-12px_rgba(0,_0,_0,_0.5)] [&.bad]:bg-rec [&.bad]:text-[color:#fff]`,
  phDropzone: `absolute top-0 right-0 bottom-0 left-0 z-[6] grid place-items-center [border-top:2px_dashed_var(--accent)] ` +
    `[border-right:2px_dashed_var(--accent)] [border-bottom:2px_dashed_var(--accent)] ` +
    `[border-left:2px_dashed_var(--accent)] rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px] ` +
    `bg-[color-mix(in_srgb,_var(--accent)_12%,_transparent)] pointer-events-none [&_span]:pt-[10px] ` +
    `[&_span]:pr-[18px] [&_span]:pb-[10px] [&_span]:pl-[18px] [&_span]:rounded-tl-[99px] [&_span]:rounded-tr-[99px] ` +
    `[&_span]:rounded-br-[99px] [&_span]:rounded-bl-[99px] [&_span]:bg-accent [&_span]:text-accent-on ` +
    `[&_span]:font-semibold`,
  phViewer: `fixed top-0 right-0 bottom-0 left-0 z-[100] grid place-items-center pt-[56px] pr-[72px] pb-[96px] pl-[72px] ` +
    `bg-[rgba(8,_8,_12,_0.88)] [backdrop-filter:blur(10px)] [animation:ph-in_0.2s_ease-out] [&_img]:max-w-full ` +
    `[&_img]:max-h-full [&_img]:rounded-tl-[14px] [&_img]:rounded-tr-[14px] [&_img]:rounded-br-[14px] ` +
    `[&_img]:rounded-bl-[14px] [&_img]:shadow-[0_30px_80px_-30px_rgba(0,_0,_0,_0.9)] ` +
    `[@media(max-width:_640px)]:pt-[48px] [@media(max-width:_640px)]:pr-[12px] ` +
    `[@media(max-width:_640px)]:pb-[120px] [@media(max-width:_640px)]:pl-[12px] ` +
    `[@media(prefers-reduced-motion:_reduce)]:animate-none`,
  phNav: `absolute top-[50%] [translate:0_-50%] w-[46px] h-[46px] min-h-0 pt-0 pr-0 pb-0 pl-0 rounded-tl-[50%] ` +
    `rounded-tr-[50%] rounded-br-[50%] rounded-bl-[50%] bg-[rgba(255,_255,_255,_0.12)] text-[color:#fff] ` +
    `text-[28px] leading-[1] [&:hover]:bg-[rgba(255,_255,_255,_0.22)] [&.prev]:left-[16px] [&.next]:right-[16px] ` +
    `[@media(max-width:_640px)]:top-auto [@media(max-width:_640px)]:bottom-[150px]`,
  phViewerBar: `absolute left-[50%] bottom-[24px] [translate:-50%_0] flex items-center gap-y-[10px] gap-x-[10px] ` +
    `max-w-[calc(100%_-_32px)] pt-[8px] pr-[8px] pb-[8px] pl-[18px] rounded-tl-[99px] rounded-tr-[99px] ` +
    `rounded-br-[99px] rounded-bl-[99px] bg-[rgba(30,_30,_38,_0.9)] text-[color:#fff] text-[13px] ` +
    `shadow-[0_0_0_1px_rgba(255,_255,_255,_0.1)] [&_b]:font-semibold [&_b]:whitespace-nowrap [&_b]:overflow-hidden ` +
    `[&_b]:text-ellipsis [&_span]:text-[color:rgba(255,_255,_255,_0.55)] [&_span]:whitespace-nowrap ` +
    `[&_button]:min-h-[32px] [&_button]:pt-0 [&_button]:pr-[13px] [&_button]:pb-0 [&_button]:pl-[13px] ` +
    `[&_button]:rounded-tl-[99px] [&_button]:rounded-tr-[99px] [&_button]:rounded-br-[99px] ` +
    `[&_button]:rounded-bl-[99px] [&_button]:bg-[rgba(255,_255,_255,_0.12)] [&_button]:text-[color:#fff] ` +
    `[&_button]:text-[12.5px] [&_button]:font-semibold [&_button]:whitespace-nowrap ` +
    `[&_button:hover:not(:disabled)]:bg-[rgba(255,_255,_255,_0.22)] [&_button:disabled]:bg-accent ` +
    `[&_button:disabled]:text-accent-on [&_button:disabled]:opacity-[1] [@media(max-width:_640px)]:flex-wrap ` +
    `[@media(max-width:_640px)]:justify-center [@media(max-width:_640px)]:rounded-tl-[18px] ` +
    `[@media(max-width:_640px)]:rounded-tr-[18px] [@media(max-width:_640px)]:rounded-br-[18px] ` +
    `[@media(max-width:_640px)]:rounded-bl-[18px] [@media(max-width:_640px)]:pt-[10px] ` +
    `[@media(max-width:_640px)]:pr-[10px] [@media(max-width:_640px)]:pb-[10px] [@media(max-width:_640px)]:pl-[10px]`,
} as const;
