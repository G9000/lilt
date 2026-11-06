import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import "../../src/styles/editor.css";
import "../../src/styles/courses.css";
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
  <main className="ve" style={{ height: "100dvh", gridTemplateColumns: "minmax(0, 1fr)" }}>
    <div className="ve-doc"><div className="ve-page">
      <article className="ve-col">
        <header className="ve-head ve-head-remix">
          <h1>A chapter with a longer, descriptive title</h1>
          <p className="ve-subtitle">A clear workspace for any subject</p>
          <div className="ve-head-actions"><button className="ve-edit-btn">Edit</button><button className="ve-remix-btn" disabled>Remix · Coming soon</button></div>
        </header>
        <nav className="ve-course-jumps" aria-label="Course shortcuts"><a href="#example">Continue</a><button>Browse chapters ↓</button></nav>
        <Markdown src={sample} className="ve-md" />
        <section className="ci" aria-label="Nested content in a tip"><ol className="ci-tips"><li><span className="ci-ic">1</span><div><b>Try this</b><Markdown src={"- First nested item\n  - A second level\n\nA paragraph after the list.\n\nAnother paragraph, with room to breathe."} /></div></li></ol></section>
        <div className="ve-ba-scale"><small>Less useful</small>{[1, 2, 3, 4, 5].map(n => <button key={n}>{n}</button>)}<small>More useful</small></div>
        <ol className="ve-items" aria-label="Exercise spacing examples">
          <li className="ve-item"><span className="ve-mk num" aria-hidden="true">1.</span><span className="ve-checkin">Check-in · record it each visit</span><p className="readtext">Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.</p><p className="ve-hint">Keep a comfortable pace and compare the beginning with the end.</p></li>
          <li className="ve-item on"><span className="ve-mk num" aria-hidden="true">12.</span><p className="readtext">One, two, three, four, five.</p><p className="ve-hint">Leave room between each word.</p></li>
          <li className="ve-item done"><span className="ve-mk num" aria-hidden="true">✓</span><p className="readtext">A completed exercise.</p><p className="ve-hint">Saved for next time.</p></li>
        </ol>
      </article>
    </div></div>
  </main>,
);
