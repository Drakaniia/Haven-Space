import {ALL_FORMATS, Input, UrlSource} from 'mediabunny';
import {staticFile, type CalculateMetadataFunction} from 'remotion';
import script from '../../../docs/promo-voiceover.md';

export const FPS = 30; // keep in sync with <Composition fps> in Root.tsx
export const TRANSITION = 15; // frames two neighbouring scenes overlap
const LEAD = 0.3; // seconds of picture before a scene's voice starts
const TAIL = 0.8; // seconds after it ends; also covers the transition overlap
const END_HOLD = 2.5; // seconds the end card stays up after the last line
// ponytail: speaking-rate guess, only used until public/vo/N.mp3 exists
const WORDS_PER_SECOND = 2.8;

export type Line = {text: string; from: number; to: number}; // frames, scene-relative
export type SceneTiming = {frames: number; voice: string | null; lines: Line[]};
export type PromoProps = {scenes: SceneTiming[]; music: string | null};

// Each "## " section's ```text block, one caption per line.
const parseScript = (md: string) =>
  md
    .split(/^## /m)
    .slice(1)
    .map((section) =>
      (/```text\r?\n([\s\S]*?)```/.exec(section)?.[1] ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );

// Length of public/<file> in seconds, or null while it hasn't been added.
const durationOf = async (file: string) => {
  try {
    const input = new Input({formats: ALL_FORMATS, source: new UrlSource(staticFile(file))});
    return await input.computeDuration();
  } catch {
    return null;
  }
};

const timeScene = async (lines: string[], index: number, last: boolean): Promise<SceneTiming> => {
  const voice = `vo/${index + 1}.mp3`;
  const measured = await durationOf(voice);
  const words = lines.map((line) => line.split(/\s+/).length);
  const total = words.reduce((a, b) => a + b, 0);
  const speech = measured ?? total / WORDS_PER_SECOND + 0.25 * (lines.length - 1);
  // Lines share the clip in proportion to their word count.
  let spoken = 0;
  const timed = lines.map((text, i) => {
    const from = Math.round((LEAD + (spoken / total) * speech) * FPS);
    spoken += words[i];
    return {text, from, to: Math.round((LEAD + (spoken / total) * speech) * FPS)};
  });
  return {
    frames: Math.ceil((LEAD + speech + (last ? END_HOLD : TAIL)) * FPS),
    voice: measured === null ? null : voice,
    lines: timed,
  };
};

export const calculateMetadata: CalculateMetadataFunction<PromoProps> = async ({props}) => {
  const sections = parseScript(script);
  if (sections.length !== 7 || sections.some((lines) => lines.length === 0)) {
    throw new Error('docs/promo-voiceover.md needs 7 "## " scenes, each with a ```text block.');
  }
  const scenes = await Promise.all(sections.map((lines, i) => timeScene(lines, i, i === sections.length - 1)));
  const music = (await durationOf('music.mp3')) === null ? null : 'music.mp3';
  return {
    durationInFrames: scenes.reduce((sum, s) => sum + s.frames, 0) - TRANSITION * (scenes.length - 1),
    props: {...props, scenes, music},
  };
};
