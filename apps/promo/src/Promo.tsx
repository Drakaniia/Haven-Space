import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useVideoConfig,
  Track,
} from 'remotion';
import {Benefits, Connect, Cta, Hook, Landlords, Meet, Students} from './scenes';
import {TRANSITION, type PromoProps, type SceneTiming} from './timeline';
import {C, Captions, clamp} from './ui';

const slideTiming = springTiming({config: {damping: 200}, durationInFrames: TRANSITION});
const fadeTiming = linearTiming({durationInFrames: TRANSITION});

/** A scene's voice clip (once public/vo/N.mp3 exists) and its captions. `hide` skips lines already on screen as big type. */
const Voice = ({scene, hide = []}: {scene: SceneTiming; hide?: number[]}) => (
  <>
    {scene.voice ? <Audio name="Voiceover" src={staticFile(scene.voice)} from={scene.lines[0].from} /> : null}
    <Captions lines={scene.lines.filter((_, i) => hide.indexOf(i) === -1)} />
  </>
);

export const Promo = ({scenes, music}: PromoProps) => {
  const {durationInFrames} = useVideoConfig();
  if (scenes.length !== 7) {
    return null; // calculateMetadata fills these in from the voiceover script
  }
  const [s1, s2, s3, s4, s5, s6, s7] = scenes;

  // Where someone is speaking (global frames), so the music can dip under the voice.
  let sceneStart = 0;
  const speech = scenes.map((s) => {
    const span = [sceneStart + s.lines[0].from, sceneStart + s.lines[s.lines.length - 1].to];
    sceneStart += s.frames - TRANSITION;
    return span;
  });
  const musicVolume = (f: number) => {
    const talking = Math.max(...speech.map(([a, b]) => interpolate(f, [a - 10, a, b, b + 10], [0, 1, 1, 0], clamp)));
    const ends = interpolate(f, [0, 20, durationInFrames - 60, durationInFrames - 1], [0, 1, 1, 0], clamp);
    return (0.32 - 0.2 * talking) * ends;
  };

  return (
    <>
      <AbsoluteFill style={{backgroundColor: C.cream}}>
        <style>{'*, *::before, *::after { box-sizing: border-box; }'}</style>
        <TransitionSeries>
          <TransitionSeries.Sequence name="1 Hook" durationInFrames={s1.frames}>
            <Hook lines={s1.lines} />
            <Voice scene={s1} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({direction: 'from-bottom'})} timing={slideTiming} />
          <TransitionSeries.Sequence name="2 Meet the app" durationInFrames={s2.frames}>
            <Meet lines={s2.lines} />
            <Voice scene={s2} hide={[0, 1, 2]} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={slideTiming} />
          <TransitionSeries.Sequence name="3 Students" durationInFrames={s3.frames}>
            <Students lines={s3.lines} />
            <Voice scene={s3} hide={[3]} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={slideTiming} />
          <TransitionSeries.Sequence name="4 Landlords" durationInFrames={s4.frames}>
            <Landlords lines={s4.lines} />
            <Voice scene={s4} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
          <TransitionSeries.Sequence name="5 Connection" durationInFrames={s5.frames}>
            <Connect lines={s5.lines} />
            <Voice scene={s5} hide={[2]} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({direction: 'from-bottom'})} timing={slideTiming} />
          <TransitionSeries.Sequence name="6 Benefits" durationInFrames={s6.frames}>
            <Benefits lines={s6.lines} />
            <Voice scene={s6} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
          <TransitionSeries.Sequence name="7 Call to action" durationInFrames={s7.frames}>
            <Cta lines={s7.lines} />
            <Voice scene={s7} hide={[0, 1, 2]} />
          </TransitionSeries.Sequence>
        </TransitionSeries>
        {music ? (
          <Audio name="Music" src={staticFile(music)} loop loopVolumeCurveBehavior="extend" volume={musicVolume} />
        ) : null}
      </AbsoluteFill>
      <Track
        name="ElevenLabs_2026-11-15T12_41_19_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3"
      >
        <Audio
          src={staticFile('ElevenLabs_2026-11-15T12_41_19_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
          from={10}
          durationInFrames={87}
        />
        <Audio
          src={staticFile('ElevenLabs_2026-11-15T12_41_19_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
          from={121}
          durationInFrames={77}
          trimBefore={87}
        />
        <Audio
          src={staticFile('ElevenLabs_2026-11-15T12_41_19_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
          from={210}
          durationInFrames={38}
          trimBefore={164}
        />
        <Audio
          src={staticFile('ElevenLabs_2026-11-15T12_41_19_Hope - upbeat and clear_pvc_s50_sim75_v4.mp3')}
          from={257}
          durationInFrames={1720.97}
          trimBefore={210}
        />
      </Track>
    </>
  );
};
