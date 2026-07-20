import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming, type TransitionPresentation} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {fade} from '@remotion/transitions/fade';
import {flip} from '@remotion/transitions/flip';
import {zoom} from './transitions/zoom';
import {
  MagicBackdrop,
  MagicTitleLayer,
  magicCameraScale,
  type MagicDirection,
  type MagicSceneShape,
} from './magic/MagicScene';
import manifest from './manifest.generated.json';

type Scene = (typeof manifest.scenes)[number];
type AttentionBeat = {at: number; type: 'zoom' | 'flash' | 'overlay' | 'parallax' | string};

const sourceFrames = (seconds: number, fps: number) => Math.round(seconds * fps);
const TRANSITION_FRAMES = 12;
const publicAsset = (path: string) =>
  /^https?:\/\//.test(path) ? path : staticFile(path.replace(/^\//, ''));
const sourceAudioPath =
  'sourcePublicPath' in manifest.audio
    ? manifest.audio.sourcePublicPath
    : manifest.source.publicPath;
// Honest option flags: the manifest only carries what the user enabled, and
// the component must not render features whose flags are off.
const manifestFlags = manifest as {showCaptions?: boolean; showTitles?: boolean};
const SHOW_CAPTIONS = manifestFlags.showCaptions !== false;
const SHOW_TITLES = manifestFlags.showTitles !== false;
// Opaque (no background-removal) sources render as a full-frame subject.
const SUBJECT_HAS_ALPHA = manifest.source.hasAlpha !== false;
const CAPTION_SCALE = Number((manifest.style as {captionScale?: number}).captionScale ?? 1);
const BRAND_COLOR = String((manifest.style as {brandColor?: string}).brandColor ?? '#2f80ff');
// OneShare Magic template: scenes carry a per-scene "magic" direction and
// render through the Magic backdrop/title/camera instead of the defaults.
const TEMPLATE = String((manifest as {template?: string}).template ?? 'default');
const magicFor = (scene: Scene): MagicDirection | null =>
  TEMPLATE === 'oneshare_magic'
    ? ((scene as {magic?: MagicDirection}).magic ?? null)
    : null;

// Deterministic per-scene hash → each Magic frame opens at a different (but
// stable across re-renders) zoom level.
const magicHash = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
// Magic subject staging constants: the head sits ~25% from the top (top band
// stays clear for the 3D titles), and the per-scene base zoom rotates through
// these levels — capped so the head never exceeds 90% of the frame width.
const MAGIC_HEAD_TARGET_TOP = 0.25;
const MAGIC_ZOOM_LEVELS = [1.0, 1.2, 1.5, 1.85, 2.3];

const styles = `
@font-face {
  font-family: ConnecAssistant;
  src: url('${publicAsset('/remotion/fonts/Assistant-Medium.ttf')}') format('truetype');
}
@font-face {
  font-family: ConnecCairo;
  src: url('${publicAsset('/remotion/fonts/Cairo-Regular.ttf')}') format('truetype');
}
@font-face {
  font-family: ConnecCairo;
  src: url('${publicAsset('/remotion/fonts/Cairo-Bold.ttf')}') format('truetype');
  font-weight: 800;
}
`;

const TATWEEL = 'ـ';
const ARABIC_WORD = /[\u0600-\u06FF]+/g;

const TITLE_PUNCT = /[.,\u060C\u061B\u061F;:!?\u2026'"\u201C\u201D()\[\]{}\-\u2014_\u0640]/g;
const AR_CHAR = /[\u0600-\u06FF]/;
const HE_CHAR = /[\u0590-\u05FF]/;
// Letters that can carry a stretch; a stretch is never placed on the last
// letter of the word (end-of-word stretches are forbidden).
const STRETCH_AR = new Set(Array.from('\u062C\u062D\u062E\u0647\u0639\u063A\u0641\u0642\u062B\u0635\u0636\u0634\u0633\u064A\u0628\u062A\u0646\u0645\u0643\u0638\u0637'));
const STRETCH_HE = new Set(Array.from('\u05E0\u05E6\u05EA'));
const STRETCH_EN = new Set(Array.from('etlz'));

type TitlePlan = {
  before: string;
  core: string;
  after: string;
  mode: 'tatweel' | 'repeat' | 'scalex' | 'side';
  rtl: boolean;
};

const planBehindTitle = (raw: string): TitlePlan => {
  // 3D titles carry no punctuation, and Arabic/Hebrew must flow RTL.
  const clean = String(raw || '').replace(TITLE_PUNCT, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter(Boolean);
  const word = [...words].sort((a, b) => b.length - a.length)[0] ?? clean;
  const rtl = AR_CHAR.test(word) || HE_CHAR.test(word);
  const letters = Array.from(word);
  const set = AR_CHAR.test(word) ? STRETCH_AR : HE_CHAR.test(word) ? STRETCH_HE : STRETCH_EN;
  const candidates = letters
    .map((ch, index) => ({ch: ch.toLowerCase(), index}))
    .filter(({ch, index}) => index < letters.length - 1 && set.has(ch));
  if (!candidates.length) {
    // No stretchable letter: the whole word sits beside the head instead.
    return {before: word, core: '', after: '', mode: 'side', rtl};
  }
  const mid = (letters.length - 1) / 2;
  const pick = candidates.reduce((best, c) =>
    Math.abs(c.index - mid) < Math.abs(best.index - mid) ? c : best,
  );
  const after = letters.slice(pick.index + 1).join('');
  if (AR_CHAR.test(word)) {
    return {before: letters.slice(0, pick.index + 1).join(''), core: TATWEEL.repeat(12), after, mode: 'tatweel', rtl};
  }
  const before = letters.slice(0, pick.index).join('');
  if (letters.length % 2 === 0) {
    return {before, core: letters[pick.index].repeat(8), after, mode: 'repeat', rtl};
  }
  return {before, core: letters[pick.index], after, mode: 'scalex', rtl};
};

const behindTitleLayout = (title: string) => {
  const length = Array.from(title).length;
  const width = 972; // 90% of the 1080px vertical canvas.
  const scaleX = length > 22 ? 1.02 : length > 17 ? 1.08 : 1.14;
  const preferred = length > 24 ? 126 : length > 20 ? 144 : length > 16 ? 164 : 188;
  const safe = Math.floor(width / Math.max(1, length * 0.46 * scaleX));

  return {
    fontSize: Math.max(112, Math.min(preferred, safe)),
    scaleX,
    width,
  };
};

const sceneProgress = (frame: number, durationInFrames: number) =>
  Math.max(0, Math.min(1, frame / Math.max(1, durationInFrames)));

const attentionBeatsForScene = (scene: Scene, durationInFrames: number, fps: number): AttentionBeat[] => {
  if ('attentionBeats' in scene && Array.isArray(scene.attentionBeats)) {
    return scene.attentionBeats as AttentionBeat[];
  }
  const seconds = durationInFrames / fps;
  const count = Math.max(1, Math.floor(seconds / 2.7));
  return Array.from({length: count}, (_, index) => ({
    at: Math.min(seconds - 0.2, 0.55 + index * 2.8),
    type: ['zoom', 'flash', 'overlay', 'parallax'][index % 4],
  }));
};

const beatPulse = (frame: number, fps: number, beats: AttentionBeat[], types?: string[]) => {
  return beats.reduce((value, beat) => {
    if (types && !types.includes(beat.type)) return value;
    const beatFrame = Math.round((beat.at || 0) * fps);
    const distance = Math.abs(frame - beatFrame);
    if (distance > 18) return value;
    return Math.max(value, interpolate(distance, [0, 18], [1, 0], {extrapolateRight: 'clamp'}));
  }, 0);
};

const SceneBackground = ({scene, durationInFrames}: {scene: Scene; durationInFrames: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = sceneProgress(frame, durationInFrames);
  const beats = attentionBeatsForScene(scene, durationInFrames, fps);
  const beat = beatPulse(frame, fps, beats);
  const parallaxBeat = beatPulse(frame, fps, beats, ['parallax', 'overlay']);
  const flashBeat = beatPulse(frame, fps, beats, ['flash']);
  const pulse = (Math.sin(frame / 18) + 1) / 2;
  const slowPulse = (Math.sin(frame / 56) + 1) / 2;
  const entrance = interpolate(frame, [0, TRANSITION_FRAMES], [1.08, 1], {
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - TRANSITION_FRAMES), durationInFrames],
    [1, 1.035],
    {extrapolateLeft: 'clamp'},
  );
  const [base, accent, light] = scene.palette;
  const backgroundImage =
    'backgroundImagePublicPath' in scene ? scene.backgroundImagePublicPath : null;
  const backgroundVideo =
    'backgroundVideoPublicPath' in scene
      ? (scene as {backgroundVideoPublicPath?: string | null}).backgroundVideoPublicPath
      : null;
  const hasBackgroundMedia = Boolean(backgroundImage || backgroundVideo);
  const mediaStyle: React.CSSProperties = {
    filter: `saturate(${1.16 + beat * 0.18}) contrast(${1.08 + beat * 0.1}) brightness(${0.86 + flashBeat * 0.12})`,
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    transform: `translate3d(${interpolate(progress, [0, 1], [-18, 18]) + parallaxBeat * 28}px, ${interpolate(
      slowPulse,
      [0, 1],
      [-14, 14],
    ) - parallaxBeat * 20}px, 0) scale(${(1.08 + pulse * 0.028 + beat * 0.035) * entrance * exit})`,
    width: '100%',
  };

  return (
    <AbsoluteFill
      style={{
        background: hasBackgroundMedia
          ? '#07090d'
          : `radial-gradient(circle at ${30 + pulse * 35}% 22%, ${accent} 0, transparent 31%),
          linear-gradient(145deg, ${base}, #0a0d13 62%, ${light})`,
        zIndex: 0,
      }}
    >
      {backgroundImage ? (
        <Img src={publicAsset(backgroundImage)} style={mediaStyle} />
      ) : null}
      {backgroundVideo ? (
        <OffthreadVideo
          muted
          src={publicAsset(backgroundVideo)}
          style={{
            ...mediaStyle,
            opacity: 0.82,
          }}
        />
      ) : null}
      {/* Unified brand stage: a constant floor band on EVERY scene so
          generated, library, and user backgrounds all share one branded set.
          Sits above the background media, under the subject (zIndex 2). */}
      <div
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${BRAND_COLOR}2e 40%, #04070de6 100%)`,
          bottom: 0,
          height: '28%',
          left: 0,
          opacity: 0.5,
          pointerEvents: 'none',
          position: 'absolute',
          right: 0,
        }}
      />
      <div
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '108px 108px',
          inset: '-10%',
          opacity: 0.08 + slowPulse * 0.035,
          position: 'absolute',
          transform: `translate3d(${interpolate(progress, [0, 1], [-36, 36])}px, ${interpolate(
            progress,
            [0, 1],
            [24, -24],
          )}px, 0) rotate(-4deg)`,
        }}
      />
      <div
        style={{
          background: `radial-gradient(circle at ${50 + Math.sin(frame / 11) * 22}% ${34 + Math.cos(frame / 13) * 20}%, #ffffff99 0, ${scene.palette[1]}66 9%, transparent 28%)`,
          filter: 'blur(18px)',
          inset: 0,
          opacity: beat * 0.32,
          position: 'absolute',
          transform: `scale(${1 + beat * 0.06})`,
        }}
      />
      <div
        style={{
          background: `linear-gradient(100deg, transparent 0%, ${scene.palette[2]}88 48%, transparent 100%)`,
          filter: 'blur(5px)',
          height: '125%',
          left: '-25%',
          opacity: flashBeat * 0.42,
          position: 'absolute',
          top: '-12%',
          transform: `translateX(${interpolate(flashBeat, [0, 1], [-240, 760])}px) rotate(12deg)`,
          width: 180,
        }}
      />
      <div
        style={{
          background: `radial-gradient(circle at ${72 - pulse * 34}% ${20 + slowPulse * 44}%, ${
            scene.palette[1]
          }55 0, transparent 22%), radial-gradient(circle at ${18 + pulse * 48}% ${
            68 - slowPulse * 18
          }%, ${scene.palette[2]}26 0, transparent 24%)`,
          filter: 'blur(4px)',
          inset: 0,
          opacity: 0.68,
          position: 'absolute',
        }}
      />
      <div
        style={{
          background:
            'linear-gradient(180deg, #02040a44 0%, transparent 30%, transparent 64%, #02040a99 100%)',
          inset: 0,
          position: 'absolute',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 54,
          border: `2px solid ${light}33`,
          borderRadius: 34,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: 210,
          height: 5,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.75,
        }}
      />
    </AbsoluteFill>
  );
};

const BehindPersonText = ({scene}: {scene: Scene}) => {
  const frame = useCurrentFrame();
  const {fps, height: canvasHeight} = useVideoConfig();
  const durationInFrames = sourceFrames(scene.sourceEnd - scene.sourceStart, fps);
  const titlePlan = planBehindTitle(scene.behindText);
  const visualLength =
    Array.from(titlePlan.before + titlePlan.after).length +
    (titlePlan.mode === 'tatweel' ? 12 : titlePlan.mode === 'repeat' ? 8 : titlePlan.mode === 'scalex' ? 6 : 0);
  const titleLayout = behindTitleLayout('x'.repeat(Math.max(1, visualLength)));
  // Pin the title to the subject's head: mirror the subject transform
  // (face-height origin + user zoom/offset) applied to the measured top of
  // the alpha matte, so the title stays just above the head wherever the
  // user places the subject.
  const styleCfg = manifest.style as {
    subjectZoom?: number;
    subjectOffsetXPct?: number;
    subjectOffsetYPct?: number;
  };
  const subjectOffsetX = Number(styleCfg.subjectOffsetXPct ?? 0);
  const subjectTopRel = Number(
    (manifest.source as {subjectTopRel?: number | null}).subjectTopRel ?? 0.08,
  );
  const userZoom = Math.min(3, Math.max(1, Number(styleCfg.subjectZoom ?? 1)));
  const offsetYPx =
    (Math.max(-40, Math.min(40, Number(styleCfg.subjectOffsetYPct ?? 0))) / 100) * canvasHeight;
  const originY = canvasHeight * 0.25;
  const headTopPx =
    originY + (subjectTopRel * canvasHeight - originY) * 1.055 * userZoom + offsetYPx;
  const titlePaddingTop = Math.max(
    46,
    Math.min(canvasHeight * 0.45, headTopPx - titleLayout.fontSize * 0.52),
  );
  const introOpacity = interpolate(frame, [0, 14, 70], [0, 0.92, 0.78], {
    extrapolateRight: 'clamp',
  });
  const outroOpacity = interpolate(
    frame,
    [Math.max(0, durationInFrames - TRANSITION_FRAMES), durationInFrames],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const scale = interpolate(frame, [0, 18, 90], [0.82, 1, 1.045], {
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 18], [-44, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        // A title with no stretchable letter moves beside the head, on the
        // emptier side of the canvas, instead of vanishing behind it.
        alignItems: titlePlan.mode === 'side' ? (subjectOffsetX >= 0 ? 'flex-start' : 'flex-end') : 'center',
        justifyContent: 'flex-start',
        padding: `${titlePaddingTop}px 44px 0`,
        // Behind an opaque full-frame subject the title would be invisible,
        // so it moves above the video layer instead.
        zIndex: SUBJECT_HAS_ALPHA ? 1 : 3,
      }}
    >
      <div
        style={{
          borderRadius: 24,
          color: scene.palette[2],
          filter: `drop-shadow(0 16px 0 ${scene.palette[0]}dd) drop-shadow(0 20px 34px #000e) drop-shadow(0 0 22px ${scene.palette[1]}dd) drop-shadow(0 0 58px ${scene.palette[1]}99)`,
          fontFamily: manifest.style.arabicFontFamily,
          fontSize: titleLayout.fontSize,
          fontWeight: 800,
          letterSpacing: 0,
          lineHeight: 0.9,
          maxWidth: titleLayout.width,
          opacity: introOpacity * outroOpacity * 0.86,
          overflowWrap: 'anywhere',
          textAlign: 'center',
          textShadow: `0 4px 0 ${scene.palette[1]}cc, 0 9px 0 ${scene.palette[0]}cc, 0 20px 38px #000f, 0 0 36px ${scene.palette[1]}ee`,
          transform: `translateY(${y}px) scaleX(${titleLayout.scaleX}) scale(${scale})`,
          width: titleLayout.width,
          whiteSpace: 'nowrap',
        }}
      >
        <span dir={titlePlan.rtl ? 'rtl' : 'ltr'} style={{direction: titlePlan.rtl ? 'rtl' : 'ltr', unicodeBidi: 'isolate'}}>
          {titlePlan.mode === 'scalex' ? (
            <>
              {titlePlan.before}
              <span style={{display: 'inline-block', margin: '0 0.5em', transform: 'scaleX(5.5)'}}>{titlePlan.core}</span>
              {titlePlan.after}
            </>
          ) : (
            `${titlePlan.before}${titlePlan.core}${titlePlan.after}`
          )}
        </span>
      </div>
    </AbsoluteFill>
  );
};

type CaptionChunk = {
  start: number;
  end: number;
  words: Array<{text: string; start: number}>;
};

const Captions = ({scene}: {scene: Scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const durationInFrames = sourceFrames(scene.sourceEnd - scene.sourceStart, fps);
  const seconds = frame / fps;
  const chunks = ((scene as {captionChunks?: CaptionChunk[]}).captionChunks ?? []).filter(
    (chunk) => Array.isArray(chunk.words) && chunk.words.length > 0,
  );
  const activeChunk = chunks.length
    ? chunks.find((chunk) => seconds >= chunk.start && seconds < chunk.end) ??
      chunks[chunks.length - 1]
    : null;
  const y = interpolate(frame, [0, 12], [28, 0], {extrapolateRight: 'clamp'});
  const introOpacity = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const outroOpacity = interpolate(
    frame,
    [Math.max(0, durationInFrames - TRANSITION_FRAMES), durationInFrames - 2],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        // Keep captions above the Reels/TikTok profile-name and action UI.
        padding: '0 66px 430px',
        zIndex: 3,
      }}
    >
      <div
        dir="rtl"
        style={{
          alignSelf: 'center',
          backgroundColor: '#05070bc0',
          border: `2px solid ${scene.palette[2]}55`,
          borderRadius: 18,
          boxShadow: `0 18px 58px #0009, 0 0 26px ${scene.palette[1]}55`,
          color: '#fff',
          fontFamily: manifest.style.arabicFontFamily,
          fontSize: Math.round((activeChunk ? 56 : scene.caption.length > 95 ? 42 : 52) * CAPTION_SCALE),
          fontWeight: 800,
          lineHeight: 1.14,
          maxWidth: 930,
          opacity: introOpacity * outroOpacity,
          padding: '24px 34px 30px',
          textAlign: 'center',
          transform: `translateY(${y}px)`,
        }}
      >
        {activeChunk
          ? (() => {
              // Karaoke highlight: the word being spoken sits in a
              // brand-colored pill; upcoming words stay dimmed.
              const spokenIndex = activeChunk.words.reduce(
                (best, word, index) => (seconds >= word.start ? index : best),
                -1,
              );
              return activeChunk.words.map((word, index) => {
                const isSpoken = index === spokenIndex;
                return (
                  <span
                    key={`${activeChunk.start}-${index}`}
                    style={{
                      backgroundColor: isSpoken ? BRAND_COLOR : 'transparent',
                      borderRadius: 14,
                      display: 'inline-block',
                      margin: '0 4px',
                      opacity: interpolate(
                        seconds,
                        [word.start - 0.06, word.start + 0.08],
                        [0.3, 1],
                        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                      ),
                      padding: isSpoken ? '0 14px' : '0 2px',
                      transform: `translateY(${interpolate(
                        seconds,
                        [word.start - 0.06, word.start + 0.12],
                        [10, 0],
                        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                      )}px) scale(${isSpoken ? 1.06 : 1})`,
                      transition: 'none',
                    }}
                  >
                    {word.text}
                  </span>
                );
              });
            })()
          : scene.caption}
      </div>
    </AbsoluteFill>
  );
};

const SceneLayer = ({scene, durationInFrames}: {scene: Scene; durationInFrames: number}) => {
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  const startFrom = sourceFrames(scene.sourceStart, fps);
  const endAt = sourceFrames(scene.sourceEnd, fps);
  const sourceFrame = startFrom + frame;
  const frameSrc =
    'framesPublicPath' in manifest.source
      ? publicAsset(
          `${manifest.source.framesPublicPath}/frame_${String(sourceFrame).padStart(
            5,
            '0',
          )}.png`,
        )
      : null;
  const progress = sceneProgress(frame, durationInFrames);
  const beats = attentionBeatsForScene(scene, durationInFrames, fps);
  const zoomBeat = beatPulse(frame, fps, beats, ['zoom']);
  const overlayBeat = beatPulse(frame, fps, beats, ['overlay']);
  const flashBeat = beatPulse(frame, fps, beats, ['flash']);
  const float = Math.sin(frame / 22);
  const montageStyle = manifest.style as {
    subjectZoom?: number;
    subjectOffsetXPct?: number;
    subjectOffsetYPct?: number;
  };
  const {width: canvasWidth, height: canvasHeight} = useVideoConfig();
  // Subject zoom now allows up to 5x (was 3).
  const userZoomRaw = Number(montageStyle.subjectZoom ?? 1);
  const userSetZoom = userZoomRaw > 1.001;
  const userZoom = Math.min(5, Math.max(1, userZoomRaw));
  const userOffsetXRaw = Number(montageStyle.subjectOffsetXPct ?? 0);
  const userOffsetYRaw = Number(montageStyle.subjectOffsetYPct ?? 0);
  const userSetOffsetY = Math.abs(userOffsetYRaw) > 0.001;
  const userOffsetX = (Math.max(-40, Math.min(40, userOffsetXRaw)) / 100) * canvasWidth;
  const userOffsetY = (Math.max(-40, Math.min(40, userOffsetYRaw)) / 100) * canvasHeight;
  // Magic subjects stand DEAD STILL — the staged camera does all the moving
  // (snap-and-hold). The default template keeps its breathing drift.
  const magic = magicFor(scene);
  const isMagicScene = Boolean(magic);

  // Magic subject: pushed DOWN so the head sits ~25% from the top (the top band
  // stays clear for the 3D titles; the lower body crops off-frame), with a
  // per-scene base zoom so every frame opens at a different size. The user's
  // explicit x/y offset or zoom overrides the automatic staging.
  const src = manifest.source as {subjectTopRel?: number | null; subjectHeadWidthRel?: number | null};
  const headTopRel = Math.min(0.4, Math.max(0.02, Number(src.subjectTopRel ?? 0.12)));
  const headWidthRel = Math.min(0.6, Math.max(0.1, Number(src.subjectHeadWidthRel ?? 0.24)));
  // Cap zoom so the head never exceeds 90% of the frame width.
  const magicMaxZoom = Math.min(5, 0.9 / headWidthRel);
  const autoMagicZoom = MAGIC_ZOOM_LEVELS[magicHash(String(scene.id ?? '')) % MAGIC_ZOOM_LEVELS.length];
  const magicZoom = Math.min(magicMaxZoom, userSetZoom ? userZoom : autoMagicZoom);
  const magicOffsetY = userSetOffsetY
    ? userOffsetY
    : Math.max(0, (MAGIC_HEAD_TARGET_TOP - headTopRel) * canvasHeight);

  const subjectScale = isMagicScene
    ? magicZoom
    : (interpolate(progress, [0, 0.5, 1], [1.035, 1.075, 1.045]) + zoomBeat * 0.07) * userZoom;
  const subjectX = isMagicScene ? 0 : interpolate(progress, [0, 1], [-10, 10]) + overlayBeat * 12;
  // Scale from face height (~25% down the canvas): any zoom > 1 then pushes
  // the matte's bottom edge BELOW the canvas (hiding mid-leg cuts and objects
  // near the frame bottom) while keeping the head in view. Vertical drift is
  // downward-only so the cut edge never rises into the frame.
  const subjectY = isMagicScene ? 0 : Math.abs(float) * 4 + zoomBeat * 10;
  const subjectStyle: React.CSSProperties = {
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    transform: isMagicScene
      ? `translate3d(${userOffsetX}px, ${magicOffsetY}px, 0) scale(${magicZoom})`
      : `translate3d(${subjectX + userOffsetX}px, ${subjectY + userOffsetY}px, 0) scale(${subjectScale})`,
    // Magic scales around the head so the zoom keeps the face in place before
    // the downward push; the default template scales around ~25% down.
    transformOrigin: isMagicScene ? `50% ${headTopRel * 100}%` : '50% 25%',
    width: '100%',
    zIndex: 2,
  };

  // The Magic camera move scales the whole staged scene (backdrop + titles +
  // subject) while captions and audio stay fixed.
  const cameraScale = magic ? magicCameraScale(magic.camera, frame, durationInFrames) : 1;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={
          magic
            ? {transform: `scale(${cameraScale})`, transformOrigin: '50% 42%'}
            : undefined
        }
      >
        {magic ? (
          <MagicBackdrop
            scene={scene as unknown as MagicSceneShape}
            direction={magic}
            durationInFrames={durationInFrames}
          />
        ) : (
          <SceneBackground scene={scene} durationInFrames={durationInFrames} />
        )}
        {SHOW_TITLES ? (
          magic ? (
            <MagicTitleLayer
              scene={scene as unknown as MagicSceneShape}
              direction={magic}
              durationInFrames={durationInFrames}
            />
          ) : (
            <BehindPersonText scene={scene} />
          )
        ) : null}
        {frameSrc ? (
          <Img
            src={frameSrc}
            style={subjectStyle}
          />
        ) : (
          <OffthreadVideo
            muted
            src={publicAsset(manifest.source.publicPath)}
            startFrom={startFrom}
            endAt={endAt}
            style={subjectStyle}
          />
        )}
        {/* Solid scenes place a word IN FRONT of the speaker: this layer paints
            after the subject (zIndex 3) so the front-slotted words cross over. */}
        {SHOW_TITLES && magic && magic.background === 'solid' ? (
          <AbsoluteFill style={{pointerEvents: 'none', zIndex: 3}}>
            <MagicTitleLayer
              scene={scene as unknown as MagicSceneShape}
              direction={magic}
              durationInFrames={durationInFrames}
              layer="front"
            />
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
      <Audio src={publicAsset(sourceAudioPath)} startFrom={startFrom} endAt={endAt} />
      {SHOW_CAPTIONS ? <Captions scene={scene} /> : null}
      <AbsoluteFill style={{pointerEvents: 'none', zIndex: 3}}>
        <div
          style={{
            border: `3px solid ${scene.palette[2]}55`,
            borderRadius: 38,
            inset: 70,
            opacity: overlayBeat * 0.7,
            position: 'absolute',
            transform: `scale(${1 - overlayBeat * 0.035})`,
          }}
        />
        <div
          style={{
            background: `linear-gradient(90deg, transparent, ${scene.palette[1]}aa, transparent)`,
            bottom: 360,
            height: 8,
            left: 120,
            opacity: (overlayBeat + flashBeat) * 0.62,
            position: 'absolute',
            right: 120,
            transform: `translateY(${overlayBeat * -22}px)`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
export const AiMontage = () => {
  const {fps} = useVideoConfig();
  const timedScenes = manifest.scenes.reduce<Array<{duration: number; from: number; scene: Scene}>>((items, scene) => {
    const duration = sourceFrames(scene.sourceEnd - scene.sourceStart, fps);
    const previous = items.at(-1);
    const from = previous ? previous.from + previous.duration : 0;
    return [...items, {duration, from, scene}];
  }, []);
  const backgroundMusic = manifest.audio.backgroundMusic;
  const soundEffects = manifest.audio.soundEffects ?? [];
  const sceneTransitions =
    'sceneTransitions' in manifest && Array.isArray(manifest.sceneTransitions)
      ? (manifest.sceneTransitions as Array<{
          type: 'slide' | 'flip' | 'zoom' | 'fade';
          durationInFrames: number;
          direction?: string | null;
        }>)
      : [];

  const presentationFor = (
    t: (typeof sceneTransitions)[number],
  ): TransitionPresentation<Record<string, unknown>> => {
    if (t.type === 'slide')
      return slide({direction: t.direction === 'from-right' ? 'from-right' : 'from-left'}) as TransitionPresentation<Record<string, unknown>>;
    if (t.type === 'flip') return flip() as TransitionPresentation<Record<string, unknown>>;
    if (t.type === 'zoom')
      return zoom() as unknown as TransitionPresentation<Record<string, unknown>>;
    return fade() as TransitionPresentation<Record<string, unknown>>;
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#08090d'}}>
      <style>{styles}</style>
      {backgroundMusic?.publicPath ? (
        <Audio
          src={publicAsset(backgroundMusic.publicPath)}
          volume={backgroundMusic.volume ?? 0.14}
        />
      ) : null}
      {soundEffects.map((effect, index) => (
        <Sequence
          key={`sfx-${index}`}
          from={Math.max(0, sourceFrames(effect.at ?? 0, fps))}
          durationInFrames={Math.max(1, sourceFrames(0.7, fps))}
        >
          <Audio src={publicAsset(effect.publicPath)} volume={effect.volume ?? 0.2} />
        </Sequence>
      ))}
      <TransitionSeries>
        {timedScenes.flatMap(({duration, scene}, index) => {
          // Each boundary's transition frames are split across its two neighbouring
          // sequences (ceil from the left boundary, floor into the right) so every
          // boundary's two halves sum to exactly its own durationInFrames and the whole
          // TransitionSeries length equals sum(D) — i.e. the continuous audio length —
          // for any transition length, odd or even.
          const leftT =
            index > 0 && sceneTransitions[index - 1]
              ? sceneTransitions[index - 1].durationInFrames
              : 0;
          const rightT =
            index < timedScenes.length - 1 && sceneTransitions[index]
              ? sceneTransitions[index].durationInFrames
              : 0;
          const seqFrames = duration + Math.ceil(leftT / 2) + Math.floor(rightT / 2);
          const nodes = [
            <TransitionSeries.Sequence key={scene.id} durationInFrames={seqFrames}>
              <SceneLayer scene={scene} durationInFrames={duration} />
            </TransitionSeries.Sequence>,
          ];
          const t = sceneTransitions[index];
          if (index < timedScenes.length - 1 && t) {
            nodes.push(
              <TransitionSeries.Transition
                key={`${scene.id}-t`}
                presentation={presentationFor(t)}
                timing={linearTiming({durationInFrames: t.durationInFrames})}
              />,
            );
          }
          return nodes;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
