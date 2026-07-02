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

const sourceFrames = (seconds: number, fps: number) => Math.round(seconds * fps);
const TRANSITION_FRAMES = 12;
const BRIDGE_FRAMES = 14;
const publicAsset = (path: string) => staticFile(path.replace(/^\//, ''));
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

const sceneProgress = (frame: number, durationInFrames: number) =>
  Math.max(0, Math.min(1, frame / Math.max(1, durationInFrames)));

const SceneBackground = ({scene, durationInFrames}: {scene: Scene; durationInFrames: number}) => {
  const frame = useCurrentFrame();
  const progress = sceneProgress(frame, durationInFrames);
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

  return (
    <AbsoluteFill
      style={{
        background: backgroundImage
          ? '#07090d'
          : `radial-gradient(circle at ${30 + pulse * 35}% 22%, ${accent} 0, transparent 31%),
          linear-gradient(145deg, ${base}, #0a0d13 62%, ${light})`,
        zIndex: 0,
      }}
    >
      {backgroundImage ? (
        <Img
          src={publicAsset(backgroundImage)}
          style={{
            filter: 'saturate(1.16) contrast(1.08) brightness(0.86)',
            height: '100%',
            inset: 0,
            objectFit: 'cover',
            position: 'absolute',
            transform: `translate3d(${interpolate(progress, [0, 1], [-18, 18])}px, ${interpolate(
              slowPulse,
              [0, 1],
              [-14, 14],
            )}px, 0) scale(${(1.08 + pulse * 0.028) * entrance * exit})`,
            width: '100%',
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
  const {fps} = useVideoConfig();
  const durationInFrames = sourceFrames(scene.sourceEnd - scene.sourceStart, fps);
  const displayTitle = stretchedTitle(scene.behindText);
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
        padding: '132px 0 0',
        zIndex: 1,
      }}
    >
      <div
        style={{
          borderRadius: 24,
          color: scene.palette[2],
          filter: `drop-shadow(0 16px 0 ${scene.palette[0]}dd) drop-shadow(0 20px 34px #000e) drop-shadow(0 0 22px ${scene.palette[1]}dd) drop-shadow(0 0 58px ${scene.palette[1]}99)`,
          fontFamily: manifest.style.arabicFontFamily,
          fontSize: displayTitle.length > 24 ? 152 : 182,
          fontWeight: 800,
          letterSpacing: 0,
          lineHeight: 0.82,
          minWidth: 1420,
          opacity: introOpacity * outroOpacity * 0.86,
          textAlign: 'center',
          textShadow: `0 4px 0 ${scene.palette[1]}cc, 0 9px 0 ${scene.palette[0]}cc, 0 20px 38px #000f, 0 0 36px ${scene.palette[1]}ee`,
          transform: `translateY(${y}px) scaleX(1.12) scale(${scale})`,
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

const Captions = ({scene}: {scene: Scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const durationInFrames = sourceFrames(scene.sourceEnd - scene.sourceStart, fps);
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
        padding: '0 66px 104px',
        zIndex: 3,
      }}
    >
      <div
        style={{
          alignSelf: 'center',
          backgroundColor: '#05070bc0',
          border: `2px solid ${scene.palette[2]}55`,
          borderRadius: 18,
          boxShadow: `0 18px 58px #0009, 0 0 26px ${scene.palette[1]}55`,
          color: '#fff',
          fontFamily: manifest.style.arabicFontFamily,
          fontSize: scene.caption.length > 95 ? 42 : 52,
          fontWeight: 800,
          lineHeight: 1.14,
          maxWidth: 930,
          opacity: introOpacity * outroOpacity,
          padding: '24px 34px 30px',
          textAlign: 'center',
          transform: `translateY(${y}px)`,
        }}
      >
        {scene.caption}
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
  const float = Math.sin(frame / 22);
  const subjectScale = interpolate(progress, [0, 0.5, 1], [1.035, 1.075, 1.045]);
  const subjectX = interpolate(progress, [0, 1], [-10, 10]);
  const subjectY = float * 5;
  const subjectStyle: React.CSSProperties = {
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    transform: `translate3d(${subjectX}px, ${subjectY}px, 0) scale(${subjectScale})`,
    transformOrigin: '50% 46%',
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

  return (
    <AbsoluteFill style={{backgroundColor: '#08090d'}}>
      <style>{styles}</style>
      {backgroundMusic?.publicPath ? (
        <Audio
          src={publicAsset(backgroundMusic.publicPath)}
          volume={backgroundMusic.volume ?? 0.28}
        />
      ) : null}
      {soundEffects.map((effect, index) => (
        <Sequence
          key={`sfx-${index}`}
          from={Math.max(0, sourceFrames(effect.at ?? 0, fps))}
          durationInFrames={Math.max(1, sourceFrames(0.7, fps))}
        >
          <Audio src={publicAsset(effect.publicPath)} volume={effect.volume ?? 0.35} />
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
