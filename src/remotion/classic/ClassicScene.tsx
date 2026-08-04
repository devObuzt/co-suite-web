import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import manifest from '../manifest.generated.json';

/**
 * OneShare Classic scene components — a calm, professional "editor's cut" look,
 * intentionally the opposite of the flashy Magic family: no 3D titles, no hard
 * zooms, no emoji icons.
 *
 * Two modes, keyed off the montage template:
 *  - "oneshare_classic": per-scene background (gently drifting, dimmed) + a
 *    clean lower-third title bar.
 *  - "oneshare_minimal": ONE static brand backdrop for every scene, captions
 *    only, no titles and no per-scene media.
 *
 * CSS transforms/filters only — shader/WebGL effects crash the headless render.
 */

const publicAsset = (path: string) =>
  /^https?:\/\//.test(path) ? path : staticFile(path.replace(/^\//, ''));

const STYLE = manifest.style as {arabicFontFamily?: string; brandColor?: string};
const BRAND = String(STYLE.brandColor ?? '#2f80ff');
const ARABIC_FONT = String(STYLE.arabicFontFamily ?? 'ConnecCairo');

const shade = (hex: string, factor: number): string => {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const channel = (offset: number) =>
    Math.max(0, Math.min(255, Math.round(parseInt(full.slice(offset, offset + 2), 16) * factor)));
  return `#${[channel(0), channel(2), channel(4)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

const DEEP = shade(BRAND, 0.3);
const DARK = shade(BRAND, 0.5);

export type ClassicSceneShape = {
  sourceStart: number;
  sourceEnd: number;
  caption: string;
  behindText: string;
  backgroundImagePublicPath?: string | null;
  backgroundVideoPublicPath?: string | null;
};

/** A calm, single-tone brand backdrop used by minimal mode (and as the base
 *  floor of classic mode). No busy grid/flashes — just a soft gradient. */
const BrandBackdrop = () => {
  const frame = useCurrentFrame();
  const drift = (Math.sin(frame / 90) + 1) / 2;
  return (
    <AbsoluteFill style={{background: `linear-gradient(165deg, ${DARK} 0%, ${BRAND} 55%, ${DEEP} 100%)`, zIndex: 0}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% ${30 + drift * 8}%, ${shade(BRAND, 1.25)}44 0, transparent 46%)`,
        }}
      />
      {/* Soft top + bottom vignette for legibility. */}
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #02040a55 0%, transparent 22%, transparent 60%, #02040add 100%)'}} />
    </AbsoluteFill>
  );
};

export const ClassicBackdrop = ({
  scene,
  minimal,
  durationInFrames,
}: {
  scene: ClassicSceneShape;
  minimal: boolean;
  durationInFrames: number;
}) => {
  const frame = useCurrentFrame();
  const progress = Math.max(0, Math.min(1, frame / Math.max(1, durationInFrames)));
  const image = scene.backgroundImagePublicPath || null;
  const video = scene.backgroundVideoPublicPath || null;

  if (minimal || !(image || video)) {
    // Minimal mode — one static brand backdrop everywhere. Also the fallback
    // for a classic scene that never got its own background.
    return <BrandBackdrop />;
  }

  // Classic mode: the scene's background, gently drifting (no hard zoom), dimmed
  // under a legibility gradient so titles/captions/subject read cleanly.
  const media: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    height: '100%',
    width: '100%',
    objectFit: 'cover',
    transform: `translateX(${interpolate(progress, [0, 1], [-10, 10])}px) scale(1.06)`,
    filter: 'saturate(1.05) brightness(0.82)',
  };
  return (
    <AbsoluteFill style={{background: DEEP, zIndex: 0}}>
      {video ? (
        <OffthreadVideo muted src={publicAsset(video)} style={media} />
      ) : (
        <Img src={publicAsset(image as string)} style={media} />
      )}
      {/* Legibility wash + brand-tinted bottom stage. */}
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, #02040a66 0%, transparent 28%, transparent 52%, ${DEEP}f2 100%)`}} />
    </AbsoluteFill>
  );
};

/** A clean lower-third: a slim brand bar + the scene headline. Classic only. */
export const ClassicLowerThird = ({scene}: {scene: ClassicSceneShape}) => {
  const frame = useCurrentFrame();
  const title = String(scene.behindText || '').trim();
  if (!title) return null;
  const rtl = /[֐-׿؀-ۿ]/.test(title);
  const slideIn = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{zIndex: 3, pointerEvents: 'none'}}>
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        style={{
          position: 'absolute',
          left: 56,
          right: 56,
          bottom: 260,
          opacity: slideIn,
          transform: `translateY(${(1 - slideIn) * 16}px)`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 6, height: 40, borderRadius: 3, backgroundColor: shade(BRAND, 1.35)}} />
          <span
            style={{
              color: '#ffffff',
              fontFamily: ARABIC_FONT,
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.05,
              textShadow: '0 3px 18px rgba(0,0,0,0.6)',
            }}
          >
            {title}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
