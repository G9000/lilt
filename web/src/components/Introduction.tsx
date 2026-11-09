import { useEffect, useRef, useState } from 'react';
import type { Texts } from '../api';
import { DEFAULT_COURSE } from '../courseIds';
import { dailyPath, guidedPath, practicePath } from '../courseNavigation';
import { creatorStory, introductionFinished } from '../introduction';
import { saveIntroduction, useIntroduction, useIntroductionSaved } from '../useIntroduction';
import { shared } from '../ui/shared';
import { Markdown } from './Markdown';

const primary = `btn btn-primary ${shared.btn} ${shared['btn-primary']}`;
const secondary = `btn btn-secondary ${shared.btn} ${shared['btn-secondary']}`;
const quiet = `textlink ${shared.textlink}`;
const actions = 'mt-6 flex flex-wrap items-center gap-3';
export const introductionPath = (course: string) => `${practicePath(course)}/welcome`;

export function IntroductionStorageNotice({ course }: { course: string }) {
  const saved = useIntroductionSaved(course);
  return saved ? null : <p className="my-4 text-ink-2" role="status">Your introduction choice lasts for this visit. Your browser couldn't save it for next time.</p>;
}

export function HomeIntroduction({ course, home = '' }: { course: string; home?: string }) {
  const state = useIntroduction(course);
  const story = course === DEFAULT_COURSE ? creatorStory(home) : '';
  return <section className="home-introduction mb-8 max-w-[68ch]" aria-label="Welcome to Lilt">
    <h2 className="mb-3 text-[24px] font-semibold tracking-tight">A little room to learn</h2>
    <p className="mb-3 text-[17px] leading-relaxed">Lilt is a private place for self-directed learning. Read a little, try something, and return to it at your own pace. Your courses, recordings and reflections stay on your computer.</p>
    <p className="text-ink-2 leading-relaxed">There are no grades or streaks to keep up with. You can explore a chapter, follow a few daily cards, or stop whenever you have enough for today.</p>
    {story && <div className="mt-6 [&_img]:max-h-56 [&_img]:w-full [&_img]:object-cover"><Markdown src={story} course={course} /></div>}
    <div className={actions}>
      <a className={primary} href={`#${introductionPath(course)}`}>{introductionFinished(state) ? 'Read the introduction again' : state === 'new' ? 'Your first practice' : 'Continue your introduction'}</a>
      <a className={secondary} href={`#${dailyPath(course)}`} onClick={() => { if (!introductionFinished(state)) saveIntroduction(course, 'skipped'); }}>Go to Today</a>
    </div>
    <IntroductionStorageNotice course={course} />
  </section>;
}

export function FirstPractice({ course, texts }: { course: string; texts: Texts }) {
  const state = useIntroduction(course);
  const [step, setStep] = useState(() => state === '1' || state === '2' || state === '3' ? Number(state) : 0);
  const [saved, setSaved] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const voice = course === DEFAULT_COURSE;
  const first = texts.levels[0];
  const hum = texts.levels.find(level => level.id === 'warmup')?.items.find(item => item.id === 'hum-to-hello');
  const titles = ['How practice works', voice ? 'Settle in and breathe' : 'Make a little space', 'Try one small thing', 'Choose what comes next'];
  useEffect(() => { heading.current?.focus(); }, [step]);
  const move = (next: number) => {
    setSaved(saveIntroduction(course, next === 0 ? 'new' : String(next) as '1' | '2' | '3'));
    setStep(next);
  };
  const finish = (outcome: 'skipped' | 'complete') => {
    const persisted = saveIntroduction(course, outcome);
    setSaved(persisted);
    // Keep the outcome visible even when storage is unavailable; leaving is always an explicit link.
    setStep(4);
  };
  return <article className="first-practice max-w-[68ch]">
    <header className="mb-7">
      <p className="mb-2 text-sm text-ink-2">Your first practice{step < 4 ? ` · ${step + 1} of 4` : ''}</p>
      <h1 ref={heading} tabIndex={-1} className="text-title font-semibold tracking-tight outline-none">{step === 4 ? 'Whenever you’re ready' : titles[step]}</h1>
    </header>
    <div className="space-y-4 text-[17px] leading-relaxed">
      {step === 0 && <>
        <p>Start with a little reading, try one thing, then notice what happened. You can leave yourself a short reflection and return to it another day.</p>
        <p>Chapters explain the ideas and give you something to try. Today picks a few cards to revisit. You can browse freely; there is nothing to unlock or pass.</p>
        <p>Recording is optional. You can learn without turning on your microphone, and you never have to listen back before you feel ready.</p>
      </>}
      {step === 1 && (voice ? <>
        <p>Find a comfortable position and let your shoulders and jaw soften. Let a breath come and go easily, without taking a big breath or holding it.</p>
        <p>You are making room for an easy sound, not trying to change your voice yet. There is no breathing target or timer to follow.</p>
        <p>If your voice feels strained, sore or tired, stop and rest. You can just read today.</p>
        <a className={quiet} href="#/studio/your-voice">Read about looking after your voice</a>
      </> : <>
        <p>Choose somewhere you can give this a little attention. Have the materials your chapter asks for nearby.</p>
        <p>Read the instructions before you begin. Keep the first attempt small, take breaks when you need them, and follow any care notes in your course.</p>
      </>)}
      {step === 2 && (voice ? <>
        <p>A gentle hum can help you notice an easy sound before bringing it into words. The aim is comfort, not a particular pitch.</p>
        {hum ? <>
          <Markdown src={hum.text} course={course} />
          {hum.hint && <Markdown src={hum.hint} course={course} />}
          <p>Try it once if you feel ready. Do the words feel as easy as the hum? If anything tightens or strains, stop. Reading the example is enough too.</p>
          <a className={quiet} href="#/studio/warmup/hum-to-hello">Open this exercise in its chapter</a>
        </> : <p>You can explore an exercise in the first chapter when you feel ready. You don't need to make a recording.</p>}
      </> : <>
        <p>{first ? `Begin with “${first.title}”. Read its explanation, then choose one small exercise to try.` : 'When this course has a chapter, read its explanation and choose one small exercise to try.'}</p>
        <p>Notice one thing about the attempt. What felt clear? What would you like to explore next? A few words are enough; nothing is graded.</p>
        {first && <a className={quiet} href={`#${practicePath(course, first.id)}`}>Open the first chapter</a>}
      </>)}
      {step === 3 && <>
        <p>You can finish here. When you want more, open a chapter or let Today suggest a few cards.</p>
        <p>{voice ? 'If you want a starting recording, count in your everyday voice. You can use it later to listen for changes; there is no need to change your voice or choose a target range now.' : 'If it helps your course, record a short explanation or reflection. You can also practise and reflect without recording.'}</p>
        <p>One small attempt is a whole visit. Come back whenever you like.</p>
      </>}
      {step === 4 && <p>{state === 'skipped' ? 'You’ve skipped the introduction. You can reopen it from Home whenever you like.' : 'You can choose a next step, or leave it here for today. The introduction is always on Home.'}</p>}
    </div>
    {!saved && <p className="mt-4 text-ink-2" role="status">This choice lasts for this visit. Your browser couldn't save it for next time.</p>}
    <div className={actions} role="group" aria-label="Introduction">
      {step > 0 && step < 4 && <button className={secondary} onClick={() => move(step - 1)}>Back</button>}
      {step < 3 && <button className={primary} onClick={() => move(step + 1)}>Continue</button>}
      {step === 3 && <button className={primary} onClick={() => finish('complete')}>Finish introduction</button>}
      {step < 4 && <button className={quiet} onClick={() => finish('skipped')}>Skip introduction</button>}
      {step === 4 && <>
        <a className={primary} href={`#${dailyPath(course)}`}>Go to Today</a>
        {first && <a className={secondary} href={`#${practicePath(course, first.id)}`}>Explore a chapter</a>}
        <a className={secondary} href={`#${voice ? '/studio/start' : guidedPath(course)}`}>{voice ? 'Make a starting recording' : 'Try guided practice'}</a>
      </>}
      <a className={quiet} href={`#${practicePath(course)}`}>Back to Home</a>
    </div>
  </article>;
}
