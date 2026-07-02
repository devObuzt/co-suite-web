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

const SceneBackground = ({scene, durationInFrames}: {scene: Scene; durationInFrames: number}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame % 90, [0, 45, 90], [0, 1, 0]);
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
            filter: 'saturate(1.08) contrast(1.04)',
            height: '100%',
            inset: 0,
            objectFit: 'cover',
            position: 'absolute',
            transform: `scale(${(1.03 + pulse * 0.015) * entrance * exit})`,
            width: '100%',
          }}
        />
      ) : null}
      <div
        style={{
          background:
            'linear-gradient(180deg, #02040a66 0%, transparent 28%, transparent 62%, #02040aaa 100%)',
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
  const scale = interpolate(frame, [0, 18, 90], [0.86, 1, 1.035], {
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 18], [-32, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '160px 22px 0',
        zIndex: 1,
      }}
    >
      <div
        style={{
          borderRadius: 24,
          color: scene.palette[1],
          filter: `drop-shadow(0 22px 34px ${scene.palette[0]}ee) drop-shadow(0 0 18px ${scene.palette[1]}cc) drop-shadow(0 0 42px ${scene.palette[1]}88)`,
          fontFamily: manifest.style.arabicFontFamily,
          fontSize: displayTitle.length > 24 ? 126 : 146,
          fontWeight: 800,
          letterSpacing: 0,
          lineHeight: 0.9,
          maxWidth: 1080,
          opacity: introOpacity * outroOpacity,
          textAlign: 'center',
          textShadow: `0 4px 0 ${scene.palette[0]}dd, 0 12px 30px #000e, 0 0 34px ${scene.palette[1]}cc`,
          transform: `translateY(${y}px) scale(${scale})`,
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
          opacity: transitionOpacity * 0.08,
          position: 'absolute',
        }}
      />
      <div
        style={{
          background: `linear-gradient(90deg, transparent, #ffffffaa, ${scene.palette[1]}aa, transparent)`,
          filter: `blur(${8 + transitionOpacity * 8}px)`,
          height: '125%',
          left: 0,
          opacity: sweepOpacity * transitionOpacity,
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
        padding: '0 72px 126px',
        zIndex: 3,
      }}
    >
      <div
        style={{
          alignSelf: 'center',
          backgroundColor: '#05070bcc',
          border: `2px solid ${scene.palette[2]}55`,
          borderRadius: 18,
          boxShadow: '0 22px 70px #0009',
          color: '#fff',
          fontFamily: manifest.style.arabicFontFamily,
          fontSize: scene.caption.length > 95 ? 44 : 56,
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

  return (
    <AbsoluteFill>
      <SceneBackground scene={scene} durationInFrames={durationInFrames} />
      <BehindPersonText scene={scene} />
      {frameSrc ? (
        <Img
          src={frameSrc}
          style={{
            height: '100%',
            inset: 0,
            objectFit: 'cover',
            position: 'absolute',
            width: '100%',
            zIndex: 2,
          }}
        />
      ) : (
        <OffthreadVideo
          src={publicAsset(manifest.source.publicPath)}
          startFrom={startFrom}
          endAt={endAt}
          style={{
            height: '100%',
            inset: 0,
            objectFit: 'cover',
            position: 'absolute',
            width: '100%',
            zIndex: 2,
          }}
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
  let cursor = 0;
  const timedScenes = manifest.scenes.map((scene) => {
    const duration = sourceFrames(scene.sourceEnd - scene.sourceStart, fps);
    const from = cursor;
    cursor += duration;
    return {duration, from, scene};
  });
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
