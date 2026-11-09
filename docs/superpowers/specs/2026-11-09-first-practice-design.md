# Home and your first practice

The owner approved restoring an introduction to Home and a skippable first-practice flow in chat on 9 November. Home should explain what Lilt is and why it exists before asking someone to practise.

## Experience

- Entering from the room opens the selected course's Home, including for returning users. Explicit Today and chapter links remain direct.
- Home starts with a short, general explanation of Lilt: private, self-directed learning, at your pace, without grades. The voice Home restores the existing creator story from the course guide, retaining its wording and voice-course context. The full course guide stays available.
- Home offers Your first practice (or Read the introduction again after finishing/skipping) and Go to Today. The original story remains visible independently of walkthrough status.
- A short walkthrough explains the practice loop, preparation, one small exercise, and optional recording/next steps. Voice preparation explains comfortable, unforced breathing and rest for strain, using the existing course's guidance. Other courses get general preparation and a link to their first chapter, never voice instructions.
- Back, Continue, Home and Skip introduction remain available. Finishing offers Today, the first chapter and optional recording. No microphone opens on Home or in the introduction.
- Save the current step and explicit skipped/completed choice per course in browser storage. Recording history is not proof that someone finished an introduction. On storage failure, retain the choice for the current visit and describe the persistence limitation. Replaying starts at the first displayed step but retains the completed/skipped choice, including if someone leaves midway. Only explicit Finish or Skip changes that outcome.
- Existing recordings, daily cards and progress remain unchanged. No chapter is locked and no recording is required.

## Structure and verification

A small state module owns per-course introduction state; a shared component renders Home introduction/actions and the walkthrough. Voice and generic course pages use it. Routing and desk labels point newcomers at Home rather than a starting recording. Read the existing Markdown creator section rather than duplicating the story.

Unit checks cover course isolation, corrupt/blocked storage, explicit skip/finish, step recovery and Markdown section extraction. Isolated Chrome covers actual room entry, original story, walkthrough, skip/reload/replay, direct Today links, non-voice content, no microphone activation, narrow/dark layout and focus. Update affected navigation suites, guide, design notes and release notes. Run repository checks with scratch output/data, preserving the owner's running app.


## Owner correction, 9 November

The initial implementation restored too little writing and imposed an extra narrow width.
Home must render the complete existing course Markdown, without extracting a subsection or
hiding it in a disclosure. Keep its wording, images, links and sources; place start/skip controls
above it. The owner clarified that Home and the first-practice walkthrough must use the same
centered width as the other chapters, rather than the whole content pane. Reuse the existing
960px column and Markdown typography without an additional introduction wrapper cap. Test all
original section headings and actual rendered widths.
