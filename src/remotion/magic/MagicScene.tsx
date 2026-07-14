import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  AtSign,
  Ghost,
  Globe,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Users,
} from 'lucide-react';
import manifest from '../manifest.generated.json';

/**
 * OneShare Magic scene components.
 *
 * Every scene is staged individually by the backend director
 * (api/services/montage_magic_director.py): split/full layout, solid brand
 * stage vs media background, a huge 3D shadowed title, a converging subtitle,
 * literal emoji icons, an emphasized word and a camera move. These components
 * only ever use CSS transforms/filters — shader/WebGL effects crash the
 * headless render.
 */
export type MagicDirection = {
  layout?: 'split' | 'full' | string;
  background?: 'solid' | 'video' | 'image' | string;
  title?: string;
  subtitle?: string;
  icons?: string[];
  emphasis?: string;
  camera?: 'zoom_in' | 'zoom_out' | 'punch_in' | 'none' | string;
  sfx?: string | null;
};

export type MagicSceneShape = {
  sourceStart: number;
  sourceEnd: number;
  caption: string;
  behindText: string;
  palette: string[];
  backgroundImagePublicPath?: string | null;
  backgroundVideoPublicPath?: string | null;
};

const publicAsset = (path: string) =>
  /^https?:\/\//.test(path) ? path : staticFile(path.replace(/^\//, ''));

const STYLE = manifest.style as {
  arabicFontFamily?: string;
  fontFamily?: string;
  brandColor?: string;
};
const BRAND = String(STYLE.brandColor ?? '#2f80ff');
const ARABIC_FONT = String(STYLE.arabicFontFamily ?? 'ConnecCairo');

/** Multiply a hex color's channels: factor < 1 darkens, > 1 lightens. */
const shade = (hex: string, factor: number): string => {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const channel = (offset: number) =>
    Math.max(0, Math.min(255, Math.round(parseInt(full.slice(offset, offset + 2), 16) * factor)));
  return `#${[channel(0), channel(2), channel(4)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

const STAGE_DEEP = shade(BRAND, 0.34);
const STAGE_DARK = shade(BRAND, 0.55);
const STAGE_LIGHT = shade(BRAND, 1.35);

/**
 * Camera scale for the scene: zoom_in rides the whole scene, zoom_out settles
 * in, punch_in snaps twice ("زوم إن، زوم إن") with a springy overshoot.
 */
export const magicCameraScale = (
  camera: string | undefined,
  frame: number,
  durationInFrames: number,
): number => {
  const progress = Math.max(0, Math.min(1, frame / Math.max(1, durationInFrames)));
  if (camera === 'zoom_in') {
    return interpolate(progress, [0, 1], [1, 1.14], {easing: Easing.out(Easing.quad)});
  }
  if (camera === 'zoom_out') {
    return interpolate(progress, [0, 1], [1.16, 1.01], {easing: Easing.out(Easing.quad)});
  }
  const punchAt = (at: number) =>
    interpolate(frame, [Math.round(durationInFrames * at), Math.round(durationInFrames * at) + 6], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.back(1.7)),
    });
  if (camera === 'punch_in') {
    return 1.02 + punchAt(0.28) * 0.08 + punchAt(0.62) * 0.08;
  }
  if (camera === 'triple_punch') {
    // Three escalating snaps — the reference's hardest emphasis moment.
    return 1.0 + punchAt(0.2) * 0.075 + punchAt(0.48) * 0.075 + punchAt(0.76) * 0.075;
  }
  if (camera === 'zoom_in_out') {
    // Push in on the key word, hold, settle back before the cut.
    return interpolate(progress, [0, 0.38, 0.62, 1], [1, 1.15, 1.15, 1.0], {
      easing: Easing.inOut(Easing.quad),
    });
  }
  return interpolate(progress, [0, 1], [1, 1.03]);
};

/** Split layouts reserve the top of the frame for the background media. */
const MEDIA_ZONE_HEIGHT = 0.52;

type GlyphProps = {color?: string; size?: number; strokeWidth?: number};

// Brand logos were removed from lucide-react, so the social glyphs are
// inlined with the same stroke aesthetic.
const brandGlyph = (paths: React.ReactNode) => {
  const Glyph = ({color = '#fff', size = 24, strokeWidth = 2}: GlyphProps) => (
    <svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths}
    </svg>
  );
  return Glyph;
};

const InstagramGlyph = brandGlyph(
  <>
    <rect height="20" rx="5" width="20" x="2" y="2" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </>,
);
const FacebookGlyph = brandGlyph(
  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
);
const YoutubeGlyph = brandGlyph(
  <>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </>,
);
const LinkedinGlyph = brandGlyph(
  <>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v2a6 6 0 0 1 4-2z" />
    <rect height="12" width="4" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </>,
);
const XGlyph = brandGlyph(
  <path d="M4 3h4.5l4.1 5.9L17.5 3H21l-6.7 8L21 21h-4.5l-4.4-6.3L7 21H3.5l7-8.4z" />,
);

// Contact icon keywords the director may stage (anything else in
// direction.icons is an emoji). Kept in sync with MAGIC_ICON_KEYWORDS in
// api/services/montage_magic_director.py.
const ICON_GLYPHS: Record<string, React.ComponentType<GlyphProps>> = {
  instagram: InstagramGlyph,
  facebook: FacebookGlyph,
  tiktok: Music2,
  whatsapp: MessageCircle,
  youtube: YoutubeGlyph,
  linkedin: LinkedinGlyph,
  x: XGlyph,
  snapchat: Ghost,
  phone: Phone,
  email: AtSign,
  location: MapPin,
  web: Globe,
  people: Users,
};

// Arc placement (degrees; 0° = right, 180° = left) around the head for 1-4
// icons — the reference's contact-network constellation.
const ICON_ARC_ANGLES: Record<number, number[]> = {
  1: [115],
  2: [150, 30],
  3: [160, 90, 20],
  4: [165, 115, 65, 15],
};

/**
 * Icons zoom out from BEHIND the speaker's head: each badge starts small at
 * the head center and springs outward to its arc position, then thin network
 * lines connect the constellation.
 */
const MagicIconNetwork = ({icons, outro}: {icons: string[]; outro: number}) => {
  const frame = useCurrentFrame();
  const {fps, width: canvasWidth, height: canvasHeight} = useVideoConfig();
  const centerX = canvasWidth / 2;
  const headY = canvasHeight * 0.24;
  const angles = ICON_ARC_ANGLES[Math.min(4, Math.max(1, icons.length))] ?? [];
  const radiusX = canvasWidth * 0.36;
  const radiusY = canvasHeight * 0.09;
  const points = icons.slice(0, 4).map((icon, index) => {
    const angle = ((angles[index] ?? 90) * Math.PI) / 180;
    const emerge = spring({
      frame: Math.max(0, frame - 4 - index * 3),
      fps,
      config: {damping: 12, stiffness: 130, mass: 0.9},
    });
    return {
      icon,
      emerge,
      x: centerX + Math.cos(angle) * radiusX * emerge,
      y: headY - Math.sin(angle) * radiusY * emerge - 40 * emerge,
    };
  });
  const linesIn = interpolate(frame, [16, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      {points.length > 1 ? (
        <svg
          height={canvasHeight}
          style={{left: 0, opacity: linesIn * 0.4 * outro, position: 'absolute', top: 0}}
          width={canvasWidth}
        >
          <polyline
            fill="none"
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            stroke={STAGE_LIGHT}
            strokeDasharray="3 9"
            strokeWidth={3}
          />
        </svg>
      ) : null}
      {points.map(({icon, emerge, x, y}, index) => {
        const Glyph = ICON_GLYPHS[icon];
        return (
          <div
            key={`${icon}-${index}`}
            style={{
              alignItems: 'center',
              backgroundColor: `${STAGE_DEEP}b8`,
              border: '3px solid rgba(255,255,255,0.85)',
              borderRadius: 999,
              boxShadow: `0 12px 26px rgba(0,0,0,0.5), 0 0 26px ${STAGE_LIGHT}66`,
              display: 'flex',
              height: 108,
              justifyContent: 'center',
              left: x - 54,
              opacity: Math.min(1, emerge * 1.3) * outro,
              position: 'absolute',
              top: y - 54 + Math.sin(frame / 21 + index * 1.7) * 5,
              transform: `scale(${0.15 + emerge * 0.85})`,
              width: 108,
            }}
          >
            {Glyph ? (
              <Glyph color="#ffffff" size={54} strokeWidth={2.2} />
            ) : (
              <span style={{fontSize: 56, lineHeight: 1}}>{icon}</span>
            )}
          </div>
        );
      })}
    </>
  );
};

export const MagicBackdrop = ({
  scene,
  direction,
  durationInFrames,
}: {
  scene: MagicSceneShape;
  direction: MagicDirection;
  durationInFrames: number;
}) => {
  const frame = useCurrentFrame();
  const progress = Math.max(0, Math.min(1, frame / Math.max(1, durationInFrames)));
  const slowPulse = (Math.sin(frame / 52) + 1) / 2;
  const backgroundImage = scene.backgroundImagePublicPath || null;
  const backgroundVideo = scene.backgroundVideoPublicPath || null;
  const hasMedia = Boolean(backgroundImage || backgroundVideo) && direction.background !== 'solid';
  const split = direction.layout === 'split';

  const mediaDrift: React.CSSProperties = {
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    transform: `translate3d(${interpolate(progress, [0, 1], [-14, 14])}px, ${interpolate(
      slowPulse,
      [0, 1],
      [-10, 10],
    )}px, 0) scale(1.12)`,
    width: '100%',
    filter: 'saturate(1.14) contrast(1.06)',
  };
  const media = hasMedia ? (
    backgroundVideo ? (
      <OffthreadVideo muted src={publicAsset(backgroundVideo)} style={mediaDrift} />
    ) : (
      <Img src={publicAsset(backgroundImage as string)} style={mediaDrift} />
    )
  ) : null;

  return (
    <AbsoluteFill
      style={{
        // The solid brand stage: the floor of every Magic scene, and the whole
        // frame when the director calls a typographic scene.
        background: `linear-gradient(180deg, ${STAGE_DARK} 0%, ${BRAND} 46%, ${STAGE_DEEP} 100%)`,
        zIndex: 0,
      }}
    >
      {hasMedia && split ? (
        // Media fills the top zone and melts into the solid stage — no hard
        // seam between the visual and the typography below it.
        <div
          style={{
            height: `${MEDIA_ZONE_HEIGHT * 100}%`,
            left: 0,
            overflow: 'hidden',
            position: 'absolute',
            right: 0,
            top: 0,
            WebkitMaskImage: 'linear-gradient(180deg, #000 56%, transparent 99%)',
            maskImage: 'linear-gradient(180deg, #000 56%, transparent 99%)',
          }}
        >
          {media}
          <div
            style={{
              background: `linear-gradient(180deg, transparent 40%, ${STAGE_DARK}66 100%)`,
              inset: 0,
              position: 'absolute',
            }}
          />
        </div>
      ) : null}
      {hasMedia && !split ? (
        <>
          {media}
          <div
            style={{
              background: `linear-gradient(180deg, ${STAGE_DEEP}55 0%, transparent 26%, transparent 58%, ${STAGE_DEEP}e8 100%)`,
              inset: 0,
              position: 'absolute',
            }}
          />
        </>
      ) : null}
      {/* Depth grid drifting toward the vanishing point of the 3D titles. */}
      <div
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,.07) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          inset: '-12%',
          opacity: 0.07 + slowPulse * 0.03,
          position: 'absolute',
          transform: `perspective(900px) rotateX(38deg) translateY(${interpolate(progress, [0, 1], [0, 46])}px)`,
          transformOrigin: '50% 100%',
        }}
      />
      {/* Soft key light behind the subject on the solid stage. */}
      <div
        style={{
          background: `radial-gradient(circle at 50% ${split ? 74 : 58}%, ${STAGE_LIGHT}55 0, transparent 44%)`,
          filter: 'blur(10px)',
          inset: 0,
          opacity: 0.75,
          position: 'absolute',
        }}
      />
      <div
        style={{
          background: `linear-gradient(180deg, #02040a3d 0%, transparent 26%, transparent 66%, #02040a8f 100%)`,
          inset: 0,
          position: 'absolute',
        }}
      />
    </AbsoluteFill>
  );
};

const titleFontSize = (title: string): number => {
  const length = Math.max(3, Array.from(title.replace(/\s+/g, '')).length);
  return Math.max(96, Math.min(210, Math.floor(1040 / length) + 66));
};

export const MagicTitleLayer = ({
  scene,
  direction,
  durationInFrames,
}: {
  scene: MagicSceneShape;
  direction: MagicDirection;
  durationInFrames: number;
}) => {
  const frame = useCurrentFrame();
  const {fps, height: canvasHeight} = useVideoConfig();
  const split = direction.layout === 'split';
  const title = String(direction.title || scene.behindText || '').trim();
  const subtitle = String(direction.subtitle || '').trim();
  const emphasis = String(direction.emphasis || '').trim();
  const icons = Array.isArray(direction.icons) ? direction.icons.slice(0, 4) : [];
  const rtl = /[\u0590-\u05FF\u0600-\u06FF]/.test(title || subtitle);

  const pop = spring({frame, fps, config: {damping: 12, stiffness: 150, mass: 0.9}});
  const outro = interpolate(
    frame,
    [Math.max(0, durationInFrames - 12), durationInFrames],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const fontSize = titleFontSize(title);
  // The title always lives in the top band: on split scenes it sits OVER the
  // media zone (the reference look — a huge 3D headline on the top-half
  // video), on full scenes just above the subject's head. Anything below
  // ~45% of the canvas drowns behind the subject.
  const titleTop = split ? canvasHeight * 0.1 : canvasHeight * 0.075;
  const subtitleTop = titleTop + fontSize * 1.18;
  // Hard 3D extrusion: stacked solid shadows in the deep brand shade, then a
  // long soft drop — the "3D مع شادو" block look.
  const extrusion = [
    `0 3px 0 ${STAGE_DEEP}`,
    `0 7px 0 ${STAGE_DEEP}`,
    `0 11px 0 ${STAGE_DEEP}`,
    `0 15px 0 ${shade(BRAND, 0.22)}`,
    `0 19px 0 ${shade(BRAND, 0.18)}`,
    '0 34px 52px rgba(0,0,0,0.62)',
    `0 0 46px ${STAGE_LIGHT}66`,
  ].join(', ');

  if (!title && !subtitle && !icons.length) return null;

  return (
    <AbsoluteFill style={{perspective: 1100, perspectiveOrigin: '50% 30%', zIndex: 1}}>
      {icons.length ? <MagicIconNetwork icons={icons} outro={outro} /> : null}
      {title ? (
        <div
          dir={rtl ? 'rtl' : 'ltr'}
          style={{
            color: '#ffffff',
            fontFamily: ARABIC_FONT,
            fontSize,
            fontWeight: 800,
            left: 40,
            lineHeight: 1.02,
            opacity: Math.min(1, pop * 1.2) * outro,
            position: 'absolute',
            right: 40,
            textAlign: 'center',
            textShadow: extrusion,
            top: titleTop,
            // Leaning toward a far vanishing point; the subtitle leans the
            // opposite way so the two read as one 3D corridor.
            transform: `rotateX(14deg) translateY(${(1 - pop) * -70}px) scale(${0.7 + pop * 0.3})`,
            transformOrigin: '50% 100%',
          }}
        >
          {title}
        </div>
      ) : null}
      {emphasis ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            left: 0,
            position: 'absolute',
            right: 0,
            top: subtitleTop + (subtitle ? 100 : 0),
          }}
        >
          <span
            dir={rtl ? 'rtl' : 'ltr'}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 999,
              boxShadow: `0 14px 34px rgba(0,0,0,0.45), 0 0 30px ${STAGE_LIGHT}88`,
              color: STAGE_DEEP,
              fontFamily: ARABIC_FONT,
              fontSize: 46,
              fontWeight: 800,
              opacity: spring({frame: Math.max(0, frame - 10), fps, config: {damping: 11, stiffness: 170}}) * outro,
              padding: '10px 36px 14px',
              transform: `rotate(-2.5deg) scale(${spring({
                frame: Math.max(0, frame - 10),
                fps,
                config: {damping: 11, stiffness: 170},
              })})`,
            }}
          >
            {emphasis}
          </span>
        </div>
      ) : null}
      {subtitle ? (
        <div
          dir={rtl ? 'rtl' : 'ltr'}
          style={{
            top: subtitleTop,
            color: '#ffffffee',
            fontFamily: ARABIC_FONT,
            fontSize: 54,
            fontWeight: 800,
            left: 70,
            opacity: interpolate(frame, [8, 22], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }) * outro,
            position: 'absolute',
            right: 70,
            textAlign: 'center',
            textShadow: `0 4px 0 ${STAGE_DEEP}, 0 18px 34px rgba(0,0,0,0.6)`,
            transform: `rotateX(-13deg) translateY(${(1 - pop) * 40}px)`,
            transformOrigin: '50% 0%',
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
