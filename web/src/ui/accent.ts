// Explicit shared Tailwind recipes. Marker classes remain for interaction and browser checks.
export const accent = {
  "accent-picker": `border-0 p-0 [margin:0_0_22px] min-w-0 text-ink [&_legend]:mb-[9px] [&_legend]:p-0 [&_legend]:[font-size:13px]
    [&_legend]:font-semibold [&_.accent-custom_label]:grid [&_.accent-custom_label]:gap-[5px]
    [&_.accent-custom_label]:[font-size:12px] [&_.accent-custom_label]:text-ink-2
    [&_.accent-custom_input]:min-h-11 [&_.accent-custom_input]:[box-sizing:border-box]
    [&_.accent-custom_input]:[border:1px_solid_var(--hair)] [&_.accent-custom_input]:[border-radius:9px]
    [&_.accent-custom_input]:bg-panel [&_.accent-custom_input]:text-ink [&_input[type="color"]]:w-16
    [&_input[type="color"]]:[padding:4px] [&_input[type="color"]]:cursor-pointer [&_input[type="text"]]:w-30
    [&_input[type="text"]]:max-w-full [&_input[type="text"]]:[padding:8px_10px]
    [&_input[type="text"]]:[font:inherit] [&_.accent-help]:text-ink-2 [&_.accent-help]:[font-size:12px]
    [&_.accent-help]:[margin:10px_0_6px] [&_.accent-reset]:min-h-11 [&_.accent-reset]:[padding:6px_12px]
    [&_.accent-reset]:[border-radius:9px] [&_.accent-reset]:bg-fill [&_.accent-reset]:text-ink-2
    [&_.accent-reset]:[font-size:13px] [&_:is(button,_input):focus-visible]:[outline:2px_solid_var(--focus)]
    [&_:is(button,_input):focus-visible]:[outline-offset:3px]
    [&_:is([role="alert"],_[role="status"])]:[font-size:12px]
    [&_:is([role="alert"],_[role="status"])]:[margin:8px_0]`,
  "accent-presets": `flex flex-wrap gap-[5px] mb-3 [&_label]:relative [&_label]:w-11 [&_label]:h-11 [&_label]:grid
    [&_label]:place-items-center [&_label]:cursor-pointer [&_input]:absolute [&_input]:[opacity:0]
    [&_input]:w-[1px] [&_input]:h-[1px] [&_span]:w-[30px] [&_span]:h-[30px] [&_span]:rounded-full
    [&_span]:[box-shadow:inset_0_0_0_1px_rgba(0,0,0,.12)] [&_input:checked_+_span]:[outline:2px_solid_var(--ink)]
    [&_input:checked_+_span]:[outline-offset:3px] [&_input:focus-visible_+_span]:[outline:2px_solid_var(--focus)]
    [&_input:focus-visible_+_span]:[outline-offset:5px]`,
  "accent-custom": `flex flex-wrap [align-items:end] gap-3`,
} as const;
