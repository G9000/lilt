// Window chrome is eager; recording and practice recipes load with their screens.
export const desktop = {
  "ds-win": `[&.full]:[left:0] [&.full]:[right:0] [&.full]:[top:32px] [&.full]:[bottom:0] [&.full]:[width:auto] ` +
    `[&.full]:[max-height:none] [&.full]:[transform:none] [&.full]:rounded-[0] ` +
    `[&.full]:[animation:ds-open-full_0.3s_var(--ease)] [&.full]:[background-color:transparent] ` +
    `[&.full]:[background-image:none] [&.full]:[box-shadow:none] [&.full]:[backdrop-filter:none] ` +
    `[&.full]:[-webkit-backdrop-filter:none] [@media_(max-width:_860px)]:[&.full]:[top:32px] ` +
    `[@media_(max-width:_860px)]:[&.full]:[bottom:0] [@media_(max-width:_860px)]:[&.full]:[left:0] ` +
    `[@media_(max-width:_860px)]:[&.full]:[right:0] [@media_(max-width:_860px)]:[&.full]:rounded-[0]`,
  "ds-tb": `[.ds-win.full_&]:absolute [.ds-win.full_&]:[top:0] [.ds-win.full_&]:[left:0] [.ds-win.full_&]:[z-index:2] ` +
    `[.ds-win.full_&]:[width:max(var(--ve-side-w,_272px),_80px)] [.ds-win.full_&]:h-[44px] [.ds-win.full_&]:pt-[0] ` +
    `[.ds-win.full_&]:pr-[18px] [.ds-win.full_&]:pb-[0] [.ds-win.full_&]:pl-[18px] ` +
    `[.ds-win.full_&]:[background-color:transparent] [.ds-win.full_&]:[background-image:none] ` +
    `[@media_(max-width:_860px)]:[.ds-win.full_&]:w-[80px] [@media_(max-width:_860px)]:[.ds-win.full_&]:h-[51px] ` +
    `[@media_(max-width:_860px)]:[.ds-win.full_&]:pt-[0] [@media_(max-width:_860px)]:[.ds-win.full_&]:pr-[16px] ` +
    `[@media_(max-width:_860px)]:[.ds-win.full_&]:pb-[0] [@media_(max-width:_860px)]:[.ds-win.full_&]:pl-[16px]`,
  "ds-title": `[.ds-win.full_&]:hidden`,
  "ds-body": `[.ds-win.full_&]:flex [.ds-win.full_&]:pt-[0] [.ds-win.full_&]:pr-[0] [.ds-win.full_&]:pb-[0] ` +
    `[.ds-win.full_&]:pl-[0] [.ds-win.full_&]:overflow-visible`,
  "ds-dock": `[.ds.app-full_&]:hidden`,
  "ds-widgets": `[.ds.app-full_&]:[visibility:hidden]`,
  "ds-w": `[.ds.app-full_&]:[visibility:hidden]`,
} as const;
