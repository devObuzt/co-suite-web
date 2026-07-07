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
import manifest from './manifest.generated.json';

type Scene = (typeof manifest.scenes)[number];
type AttentionBeat = {at: number; type: 'zoom' | 'flash' | 'overlay' | 'parallax' | string};

const sourceFrames = (seconds: number, fps: number) => Math.round(seconds * fps);
const TRANSITION_FRAMES = 12;
const BRIDGE_FRAMES = 14;
const publicAsset = (path: string) =>
  /^https?:\/\//.test(path) ? path : staticFile(path.replace(/^\//, ''));
const sourceAudioPath =
  'sourcePublicPath' in manifest.audio
    ? manifest.audio.sourcePublicPath
    : manifest.source.publicPath;

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

const stretchArabicWord = (word: string) => {
  const letters = Array.from(word);
  if (letters.length <= 3) {
    return `${letters.slice(0, -1).join('')}${TATWEEL.repeat(10)}${letters.at(-1)}`;
  }

  const splitAt = Math.max(2, Math.ceil(letters.length * 0.58));
  return `${letters.slice(0, splitAt).join('')}${TATWEEL.repeat(12)}${letters
    .slice(splitAt)
    .join('')}`;
};

const stretchedTitle = (title: string) => {
  const words = title.match(ARABIC_WORD) ?? [title];
  const word = [...words].sort((a, b) => b.length - a.length)[0] ?? title;
  return stretchArabicWord(word);
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
  const displayTitle = stretchedTitle(scene.behindText);
  const titleLayout = behindTitleLayout(displayTitle);
  // Pin the title to the subject's head: mirror the subject transform
  // (face-height origin + user zoom/offset) applied to the measured top of
  // the alpha matte, so the title stays just above the head wherever the
  // user places the subject.
  const styleCfg = manifest.style as {
    subjectZoom?: number;
    subjectOffsetYPct?: number;
  };
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
    Math.min(canvasHeight * 0.45, headTopPx - titleLayout.fontSize * 0.78),
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
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: `${titlePaddingTop}px 0 0`,
        zIndex: 1,
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
        {displayTitle}
      </div>
    </AbsoluteFill>
  );
};

const TransitionEffects = ({
  scene,
  durationInFrames,
}: {
  scene: Scene;
  durationInFrames: number;
}) => {
  const frame = useCurrentFrame();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - TRANSITION_FRAMES), durationInFrames],
    [0, 1],
    {extrapolateLeft: 'clamp'},
  );
  const sweepX = interpolate(
    frame,
    [Math.max(0, durationInFrames - TRANSITION_FRAMES), durationInFrames],
    [-640, 1320],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const sweepOpacity = interpolate(frame, [0, durationInFrames], [0, 0.14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const transitionOpacity = exit;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 4}}>
      <div
        style={{
          background: scene.palette[1],
          inset: 0,
          opacity: transitionOpacity * 0.12,
          position: 'absolute',
        }}
      />
      <div
        style={{
          background: `linear-gradient(90deg, transparent, #ffffffaa, ${scene.palette[1]}aa, transparent)`,
          filter: `blur(${8 + transitionOpacity * 8}px)`,
          height: '125%',
          left: 0,
          opacity: (sweepOpacity + 0.18) * transitionOpacity,
          position: 'absolute',
          top: '-12%',
          transform: `translateX(${sweepX}px) rotate(12deg)`,
          width: 96,
        }}
      />
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
          fontSize: activeChunk ? 56 : scene.caption.length > 95 ? 42 : 52,
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
          ? activeChunk.words.map((word, index) => (
              <span
                key={`${activeChunk.start}-${index}`}
                style={{
                  display: 'inline-block',
                  margin: '0 5px',
                  opacity: interpolate(
                    seconds,
                    [word.start - 0.06, word.start + 0.08],
                    [0, 1],
                    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                  ),
                  transform: `translateY(${interpolate(
                    seconds,
                    [word.start - 0.06, word.start + 0.12],
                    [10, 0],
                    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                  )}px)`,
                }}
              >
                {word.text}
              </span>
            ))
          : scene.caption}
      </div>
    </AbsoluteFill>
  );
};

const BoundaryTransition = ({fromScene, toScene}: {fromScene: Scene; toScene: Scene}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, BRIDGE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bandX = interpolate(progress, [0, 1], [-520, 1320]);
  const veilOpacity = interpolate(progress, [0, 0.46, 1], [0, 0.72, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blur = interpolate(progress, [0, 0.5, 1], [0, 18, 0]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 9}}>
      <div
        style={{
          background: `linear-gradient(115deg, ${fromScene.palette[0]}00 0%, ${fromScene.palette[1]}66 34%, ${toScene.palette[1]}99 58%, ${toScene.palette[0]}00 100%)`,
          filter: `blur(${blur}px)`,
          inset: '-8%',
          opacity: veilOpacity,
          position: 'absolute',
          transform: `translateX(${bandX - 420}px) skewX(-12deg)`,
        }}
      />
      <div
        style={{
          background: `linear-gradient(90deg, transparent, #ffffffe6, ${toScene.palette[1]}dd, transparent)`,
          boxShadow: `0 0 80px ${toScene.palette[1]}aa`,
          filter: 'blur(8px)',
          height: '130%',
          left: 0,
          opacity: interpolate(progress, [0, 0.45, 1], [0, 0.82, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          position: 'absolute',
          top: '-15%',
          transform: `translateX(${bandX}px) rotate(10deg)`,
          width: 170,
        }}
      />
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
  const userZoom = Math.min(3, Math.max(1, Number(montageStyle.subjectZoom ?? 1)));
  const {width: canvasWidth, height: canvasHeight} = useVideoConfig();
  const userOffsetX = (Math.max(-40, Math.min(40, Number(montageStyle.subjectOffsetXPct ?? 0))) / 100) * canvasWidth;
  const userOffsetY = (Math.max(-40, Math.min(40, Number(montageStyle.subjectOffsetYPct ?? 0))) / 100) * canvasHeight;
  const subjectScale =
    (interpolate(progress, [0, 0.5, 1], [1.035, 1.075, 1.045]) + zoomBeat * 0.07) * userZoom;
  const subjectX = interpolate(progress, [0, 1], [-10, 10]) + overlayBeat * 12;
  // Scale from face height (~25% down the canvas): any zoom > 1 then pushes
  // the matte's bottom edge BELOW the canvas (hiding mid-leg cuts and objects
  // near the frame bottom) while keeping the head in view. Vertical drift is
  // downward-only so the cut edge never rises into the frame.
  const subjectY = Math.abs(float) * 4 + zoomBeat * 10;
  const subjectStyle: React.CSSProperties = {
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    transform: `translate3d(${subjectX + userOffsetX}px, ${subjectY + userOffsetY}px, 0) scale(${subjectScale})`,
    transformOrigin: '50% 25%',
    width: '100%',
    zIndex: 2,
  };

  return (
    <AbsoluteFill>
      <SceneBackground scene={scene} durationInFrames={durationInFrames} />
      <BehindPersonText scene={scene} />
      {frameSrc ? (
        <Img
          src={frameSrc}
          style={subjectStyle}
        />
      ) : (
        <OffthreadVideo
          src={publicAsset(manifest.source.publicPath)}
          startFrom={startFrom}
          endAt={endAt}
          style={subjectStyle}
        />
      )}
      <Audio src={publicAsset(sourceAudioPath)} startFrom={startFrom} endAt={endAt} />
      <Captions scene={scene} />
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
      <TransitionEffects scene={scene} durationInFrames={durationInFrames} />
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
  const visualTransitions =
    'visualTransitions' in manifest && Array.isArray(manifest.visualTransitions)
      ? (manifest.visualTransitions as Array<{
          publicPath: string;
          at?: number;
          duration?: number;
          volume?: number;
          assetId?: string;
          kind?: string;
        }>)
      : [];

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
      {visualTransitions.map((effect, index) => (
        <Sequence
          key={`visual-transition-${effect.assetId ?? index}`}
          from={Math.max(0, sourceFrames((effect.at ?? 0) - (effect.duration ?? 0.7) / 2, fps))}
          durationInFrames={Math.max(1, sourceFrames(effect.duration ?? 0.7, fps))}
        >
          <AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.82, zIndex: 12}}>
            <OffthreadVideo
              src={publicAsset(effect.publicPath)}
              style={{
                height: '100%',
                inset: 0,
                objectFit: 'cover',
                position: 'absolute',
                width: '100%',
              }}
              volume={effect.volume ?? 0.25}
            />
          </AbsoluteFill>
        </Sequence>
      ))}
      {timedScenes.map(({duration, from, scene}) => {
        return (
          <Sequence key={scene.id} from={from} durationInFrames={duration}>
            <SceneLayer scene={scene} durationInFrames={duration} />
          </Sequence>
        );
      })}
      {timedScenes.slice(0, -1).map(({from, duration, scene}, index) => {
        const next = timedScenes[index + 1].scene;
        return (
          <Sequence
            key={`${scene.id}-bridge`}
            from={from + duration - Math.floor(BRIDGE_FRAMES / 2)}
            durationInFrames={BRIDGE_FRAMES}
          >
            <BoundaryTransition fromScene={scene} toScene={next} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
