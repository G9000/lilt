import { shared } from "../../src/ui/shared";
import { cx } from "../../src/ui/cx";
import { pages } from "../../src/ui/pages";
import { practice } from "../../src/ui/practice";
import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { Markdown } from "../../src/components/Markdown";

const sample = `# A space for your next idea

A course can be about anything. Clear instructions leave room to **explore**, *practise*, and make it your own.[^note]

## Make a little progress

Begin with one small exercise. Keep your notes close, and return whenever you are ready.

3. Choose a subject
   - Start with something familiar.
   - Then try **a different approach**.
     1. Notice what changed.
     2. Write a short reflection.
4. Save your work

### Before you begin

- [x] Find a comfortable place
- [ ] Set aside a few minutes

> A useful reminder
>
> Take your time. There is no single pace for learning.
>
> - You can always come back.

## Compare your options

| Approach | What you will need | When it helps |
| :--- | :--- | ---: |
| A short session | A notebook and a quiet moment | Five minutes |
| A longer experiment | Your materials, a reference, and room for a few attempts | Twenty minutes |

### Keep a working example

Use \`course_notes.md\` for your notes. Keep \`**literal markers**\` inside code intact.

\`\`\`text
first line
  indentation stays intact
${"a-long-example-without-spaces-".repeat(9)}
\`\`\`

#### A smaller section

An ordinary paragraph with [a reference](https://example.com/guide_(beginner)), ~~an old idea~~, and a line break.${"  "}
This belongs on the next line.

##### Extra detail

Read a longer reference: https://example.com/${"long-reference-".repeat(16)}

###### A final note

![A wide reference image](images/layout-fixture.webp)

---

[Unsafe link](javascript:alert(1)) ![Blocked image](data:image/png;base64,invalid)

<script>window.markdownUnsafe = true</script>

[^note]: A reference that belongs to this document.
`;

createRoot(document.getElementById("root")!).render(
  <main className={cx(pages.ve, ["ve", practice["ve"]].filter(Boolean).join(' '))} style={{ height: "100dvh", gridTemplateColumns: "minmax(0, 1fr)" }}>
    <div className={["ve-doc", practice["ve-doc"]].filter(Boolean).join(' ')}><div className={[["ve-page", practice["ve-page"]].filter(Boolean).join(' '), shared["ve-page"]].filter(Boolean).join(' ')}>
      <article className={["ve-col", practice["ve-col"]].filter(Boolean).join(' ')}>
        <header className={cx(pages.veHeadRemix, ["ve-head ve-head-remix", practice["ve-head"]].filter(Boolean).join(' '))}>
          <h1>A chapter with a longer, descriptive title</h1>
          <p className={["ve-subtitle", practice["ve-subtitle"]].filter(Boolean).join(' ')}>A clear workspace for any subject</p>
          <div className={cx(pages.veHeadActions, "ve-head-actions")}><button className={cx(pages.veEditBtn, "ve-edit-btn")}>Edit</button><button className="ve-remix-btn" disabled>Remix · Coming soon</button></div>
        </header>
        <nav className={["ve-course-jumps", practice["ve-course-jumps"]].filter(Boolean).join(' ')} aria-label="Course shortcuts"><a href="#example">Continue</a><button>Browse chapters ↓</button></nav>
        <Markdown src={sample} className={["ve-md", practice["ve-md"]].filter(Boolean).join(' ')} />
        <section className={["ci", practice["ci"]].filter(Boolean).join(' ')} aria-label="Nested content in a tip"><ol className={["ci-tips", practice["ci-tips"]].filter(Boolean).join(' ')}><li><span className={["ci-ic", practice["ci-ic"]].filter(Boolean).join(' ')}>1</span><div><b>Try this</b><Markdown src={"- First nested item\n  - A second level\n\nA paragraph after the list.\n\nAnother paragraph, with room to breathe."} /></div></li></ol></section>
        <div className={["ve-ba-scale", practice["ve-ba-scale"]].filter(Boolean).join(' ')}><small>Less useful</small>{[1, 2, 3, 4, 5].map(n => <button key={n}>{n}</button>)}<small>More useful</small></div>
        <ol className={["ve-items", practice["ve-items"]].filter(Boolean).join(' ')} aria-label="Exercise spacing examples">
          <li className={cx(pages.veItem, ["ve-item", practice["ve-item"]].filter(Boolean).join(' '))}><span className={["ve-mk num", practice["ve-mk"]].filter(Boolean).join(' ')} aria-hidden="true">1.</span><span className={["ve-checkin", practice["ve-checkin"]].filter(Boolean).join(' ')}>Check-in · record it each visit</span><p className={["readtext", practice["readtext"]].filter(Boolean).join(' ')}>Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.</p><p className={["ve-hint", practice["ve-hint"]].filter(Boolean).join(' ')}>Keep a comfortable pace and compare the beginning with the end.</p></li>
          <li className={cx(pages.veItem, ["ve-item on", practice["ve-item"]].filter(Boolean).join(' '))}><span className={["ve-mk num", practice["ve-mk"]].filter(Boolean).join(' ')} aria-hidden="true">12.</span><p className={["readtext", practice["readtext"]].filter(Boolean).join(' ')}>One, two, three, four, five.</p><p className={["ve-hint", practice["ve-hint"]].filter(Boolean).join(' ')}>Leave room between each word.</p></li>
          <li className={cx(pages.veItem, ["ve-item done", practice["ve-item"]].filter(Boolean).join(' '))}><span className={["ve-mk num", practice["ve-mk"]].filter(Boolean).join(' ')} aria-hidden="true">✓</span><p className={["readtext", practice["readtext"]].filter(Boolean).join(' ')}>A completed exercise.</p><p className={["ve-hint", practice["ve-hint"]].filter(Boolean).join(' ')}>Saved for next time.</p></li>
        </ol>
      </article>
    </div></div>
  </main>,
);
