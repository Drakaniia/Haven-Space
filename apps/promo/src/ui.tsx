import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadFraunces} from '@remotion/google-fonts/Fraunces';
import {loadFont as loadHanken} from '@remotion/google-fonts/HankenGrotesk';
import type React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {FPS, type Line} from './timeline';

// Haven Space design tokens (apps/web/src/styles/app.css).
export const C = {
  moss: '#3b6a2a',
  mossStrong: '#35612a',
  mossDark: '#22401a',
  mossLight: '#8db46f',
  mint: '#e6eedb',
  cream: '#f6f2e9',
  surface: '#fffdf8',
  subtle: '#efeadf',
  border: '#e4ddcd',
  borderStrong: '#cbc2ae',
  ink: '#1c2019',
  grayInk: '#565b51',
  muted: '#7d8276',
  clay: '#b4532d',
  successTint: '#e3f1df',
  successInk: '#1f5a2a',
  successBorder: '#bddcb5',
};
export const SHADOW_CARD = '0 2px 0 rgb(28 32 25 / 0.03), 0 3px 10px rgb(28 32 25 / 0.07)';
export const SHADOW_POP = '0 4px 12px rgb(28 32 25 / 0.07), 0 48px 96px -24px rgb(28 32 25 / 0.3)';

// latin-ext carries the ₱ sign.
export const display = loadFraunces('normal', {weights: ['500', '600'], subsets: ['latin', 'latin-ext']}).fontFamily;
loadFraunces('italic', {weights: ['500'], subsets: ['latin', 'latin-ext']});
export const sans = loadHanken('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin', 'latin-ext']})
  .fontFamily;
export const hand = loadCaveat('normal', {weights: ['700'], subsets: ['latin']}).fontFamily;

// Motion helpers. Timing comes from the voiceover (see timeline.ts), so it is computed, not keyframed.
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** 0 → 1 over `duration` frames from `at`, eased out. */
export const enter = (frame: number, at: number, duration = 18) =>
  interpolate(frame, [at, at + duration], [0, 1], {...clamp, easing: EASE});

/** Fade-and-rise entrance. */
export const rise = (frame: number, at: number, distance = 40): React.CSSProperties => {
  const p = enter(frame, at, 20);
  return {opacity: p, translate: `0px ${(1 - p) * distance}px`};
};

/** Springy 0 → 1 with a little overshoot, for things that pop in. */
export const pop = (frame: number, at: number) =>
  spring({frame: Math.max(0, frame - at), fps: FPS, config: {damping: 12, stiffness: 170}});

/** 0 → 1 → 0 around `at`, for presses and pulses. */
export const blip = (frame: number, at: number) => interpolate(frame, [at - 4, at, at + 8], [0, 1, 0], clamp);

/** `text` typed out from `at`. */
export const typed = (text: string, frame: number, at: number, framesPerChar = 2) =>
  text.slice(0, Math.max(0, Math.floor((frame - at) / framesPerChar)));

const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5 21 21" />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19 7" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <circle cx="12" cy="13.5" r="3.5" />
      <path d="M8.5 7 10 4.5h4L15.5 7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19 6v5.5c0 4.6-3 8.3-7 9.5-4-1.2-7-4.9-7-9.5V6Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  cap: (
    <>
      <path d="M2 9.5 12 4.5l10 5-10 5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export const Icon = ({
  name,
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
}: {
  name: keyof typeof ICONS;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{flexShrink: 0}}
  >
    {ICONS[name]}
  </svg>
);

// Faint paper texture, like the site's `paper-grain`.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const Paper = ({
  color = C.cream,
  grain = 0.08,
  children,
}: {
  color?: string;
  grain?: number;
  children?: React.ReactNode;
}) => (
  <AbsoluteFill style={{backgroundColor: color}}>
    <AbsoluteFill style={{backgroundImage: GRAIN, opacity: grain, mixBlendMode: 'multiply'}} />
    {children}
  </AbsoluteFill>
);

export const Logo = ({size, color = C.ink, tile = false}: {size: number; color?: string; tile?: boolean}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.3}}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        backgroundColor: tile ? C.surface : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Img
        src={staticFile('logo.png')}
        style={{width: tile ? size * 0.74 : size, height: tile ? size * 0.74 : size, objectFit: 'contain'}}
      />
    </div>
    <div
      style={{
        fontFamily: display,
        fontWeight: 600,
        fontSize: size * 0.6,
        letterSpacing: '-0.01em',
        color,
        whiteSpace: 'nowrap',
      }}
    >
      Haven Space
    </div>
  </div>
);

export const Kicker = ({children, style}: {children: React.ReactNode; style?: React.CSSProperties}) => (
  <div style={{fontFamily: sans, fontWeight: 600, fontSize: 38, color: C.moss, ...style}}>{children}</div>
);

export const Headline = ({
  children,
  size = 96,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      fontFamily: display,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1.04,
      letterSpacing: '-0.02em',
      color: C.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

export const FieldLabel = ({children, style}: {children: React.ReactNode; style?: React.CSSProperties}) => (
  <div style={{fontFamily: sans, fontWeight: 600, fontSize: 22, color: C.grayInk, ...style}}>{children}</div>
);

/** Desktop browser window. Children are laid out inside the page area below the toolbar. */
export const Browser = ({
  url,
  width,
  height,
  style,
  children,
}: {
  url: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) => (
  <div
    style={{
      position: 'absolute',
      width,
      height,
      borderRadius: 26,
      overflow: 'hidden',
      backgroundColor: C.surface,
      border: `2px solid ${C.border}`,
      boxShadow: SHADOW_POP,
      ...style,
    }}
  >
    <div
      style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 22px',
        backgroundColor: C.subtle,
        borderBottom: `2px solid ${C.border}`,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: 15, height: 15, borderRadius: 8, backgroundColor: C.borderStrong}} />
      ))}
      <div
        style={{
          marginLeft: 16,
          width: 560,
          height: 38,
          borderRadius: 11,
          backgroundColor: C.surface,
          border: `2px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          fontFamily: sans,
          fontSize: 20,
          color: C.grayInk,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <Icon name="lock" size={18} color={C.muted} />
        {url}
      </div>
    </div>
    <div style={{position: 'relative', height: height - 64, overflow: 'hidden'}}>{children}</div>
  </div>
);

/** Haven Space top bar inside a browser mockup. */
export const AppBar = ({role, tab}: {role: string; tab: string}) => (
  <div
    style={{
      height: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      borderBottom: `2px solid ${C.border}`,
    }}
  >
    <Logo size={38} />
    <div style={{display: 'flex', gap: 12, fontFamily: sans, fontWeight: 600, fontSize: 21}}>
      <div style={{padding: '8px 16px', borderRadius: 10, backgroundColor: C.subtle, color: C.ink}}>{tab}</div>
      <div style={{padding: '8px 16px', borderRadius: 10, backgroundColor: C.mint, color: C.mossDark}}>{role}</div>
    </div>
  </div>
);

/** Phone frame (336 × 696 screen). */
export const Phone = ({style, children}: {style?: React.CSSProperties; children?: React.ReactNode}) => (
  <div
    style={{
      position: 'absolute',
      width: 360,
      height: 720,
      borderRadius: 60,
      padding: 12,
      backgroundColor: C.ink,
      boxShadow: SHADOW_POP,
      ...style,
    }}
  >
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 48,
        overflow: 'hidden',
        backgroundColor: C.cream,
      }}
    >
      {children}
      <div
        style={{position: 'absolute', top: 12, left: 118, width: 100, height: 30, borderRadius: 15, backgroundColor: C.ink}}
      />
    </div>
  </div>
);

/** Expanding ring at a tap/click. Place inside a positioned wrapper at the tap point. */
export const Ripple = ({age, size = 64}: {age: number; size?: number}) => {
  if (age < 0 || age > 18) {
    return null;
  }
  const p = age / 18;
  return (
    <div
      style={{
        position: 'absolute',
        left: -size / 2,
        top: -size / 2,
        width: size,
        height: size,
        borderRadius: size,
        border: `4px solid ${C.moss}`,
        opacity: 1 - p,
        scale: String(0.3 + p),
      }}
    />
  );
};

export type Key = [frame: number, x: number, y: number];

/** Mouse pointer gliding through `path` (frames must increase), pressing at `clicks`. */
export const Cursor = ({path, clicks = [], until = 1e6}: {path: Key[]; clicks?: number[]; until?: number}) => {
  const frame = useCurrentFrame();
  const frames = path.map((k) => k[0]);
  const x = interpolate(frame, frames, path.map((k) => k[1]), {...clamp, easing: EASE_IN_OUT});
  const y = interpolate(frame, frames, path.map((k) => k[2]), {...clamp, easing: EASE_IN_OUT});
  const opacity =
    interpolate(frame, [frames[0] - 8, frames[0]], [0, 1], clamp) * interpolate(frame, [until, until + 8], [1, 0], clamp);
  const pressed = Math.max(0, ...clicks.map((c) => blip(frame, c)));
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity}}>
      {clicks.map((c) => (
        <Ripple key={c} age={frame - c} />
      ))}
      <svg
        width={46}
        height={46}
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          left: -8,
          top: -4,
          scale: String(1 - pressed * 0.16),
          transformOrigin: '8px 4px',
          filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.28))',
        }}
      >
        <path
          d="M4 2v17l4.5-4.2 3.1 6.8 3-1.3-3-6.7h6.2Z"
          fill={C.ink}
          stroke="#ffffff"
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const Button = ({
  children,
  variant = 'primary',
  size = 24,
  scale = 1,
  style,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'light';
  size?: number;
  scale?: number;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: size * 0.4,
      height: size * 2.3,
      padding: `0 ${size * 1.1}px`,
      borderRadius: size * 0.55,
      fontFamily: sans,
      fontWeight: 600,
      fontSize: size,
      whiteSpace: 'nowrap',
      scale: String(scale),
      backgroundColor: variant === 'primary' ? C.mossStrong : variant === 'light' ? C.surface : 'transparent',
      color: variant === 'primary' ? '#ffffff' : variant === 'light' ? C.mossDark : 'inherit',
      border: variant === 'outline' ? '2px solid currentColor' : '2px solid transparent',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Badge = ({
  children,
  tone = 'success',
  size = 18,
  style,
}: {
  children: React.ReactNode;
  tone?: 'success' | 'neutral';
  size?: number;
  style?: React.CSSProperties;
}) => {
  const [bg, fg, line] =
    tone === 'success' ? [C.successTint, C.successInk, C.successBorder] : [C.subtle, C.grayInk, C.border];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.45,
        padding: `${size * 0.3}px ${size * 0.6}px`,
        borderRadius: size * 0.4,
        backgroundColor: bg,
        color: fg,
        border: `2px solid ${line}`,
        fontFamily: sans,
        fontWeight: 600,
        fontSize: size,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <div style={{width: size * 0.45, height: size * 0.45, borderRadius: size, backgroundColor: fg}} />
      {children}
    </div>
  );
};

export const Chip = ({
  children,
  on = false,
  size = 20,
  style,
}: {
  children: React.ReactNode;
  on?: boolean;
  size?: number;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.35,
      height: size * 2,
      padding: `0 ${size * 0.8}px`,
      borderRadius: size * 0.5,
      border: `2px solid ${on ? C.mossLight : C.border}`,
      backgroundColor: on ? C.mint : C.surface,
      color: on ? C.mossDark : C.grayInk,
      fontFamily: sans,
      fontWeight: 600,
      fontSize: size,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {on ? <Icon name="check" size={size} color={C.moss} strokeWidth={2.6} /> : null}
    {children}
  </div>
);

// Illustrated room "photos" in the brand palette (no stock photos of real places).
const ROOMS = [
  {wall: '#e6eedb', floor: '#d9cdb4', blanket: '#3b6a2a', accent: '#b4532d'},
  {wall: '#f6e4d9', floor: '#d8c6aa', blanket: '#565b51', accent: '#3b6a2a'},
  {wall: '#efeadf', floor: '#cfc0a0', blanket: '#b4532d', accent: '#8db46f'},
  {wall: '#e2ecf7', floor: '#d6c9ae', blanket: '#2a64a8', accent: '#c77a0a'},
];

export const Photo = ({variant = 0}: {variant?: number}) => {
  const r = ROOMS[variant % ROOMS.length];
  return (
    <svg
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      style={{display: 'block', width: '100%', height: '100%'}}
    >
      <g transform={variant % 2 ? 'translate(400 0) scale(-1 1)' : undefined}>
        <rect width="400" height="260" fill={r.wall} />
        <rect y="196" width="400" height="64" fill={r.floor} />
        <rect x="36" y="38" width="112" height="104" rx="6" fill="#fffdf8" />
        <rect x="44" y="46" width="96" height="88" rx="3" fill="#cfe0ea" />
        <circle cx="118" cy="70" r="12" fill="#fbe7b0" />
        <path d="M44 134 74 104 96 122 114 108 140 130v4Z" fill="#8db46f" />
        <rect x="90" y="46" width="4" height="88" fill="#fffdf8" />
        <rect x="282" y="56" width="62" height="46" rx="4" fill="#fffdf8" stroke={r.accent} strokeWidth="4" />
        <path d="M290 94 306 76 318 88 326 80 336 94Z" fill={r.accent} opacity="0.6" />
        <rect x="196" y="112" width="18" height="90" rx="4" fill="#7a5a3c" />
        <rect x="204" y="150" width="176" height="44" rx="8" fill="#fffdf8" />
        <rect x="252" y="146" width="128" height="50" rx="8" fill={r.blanket} />
        <rect x="214" y="132" width="44" height="22" rx="8" fill="#fffdf8" stroke="#e4ddcd" strokeWidth="2" />
        <rect x="208" y="194" width="8" height="12" fill="#7a5a3c" />
        <rect x="368" y="194" width="8" height="12" fill="#7a5a3c" />
        <path d="M166 198 162 172h28l-4 26Z" fill={r.accent} />
        <ellipse cx="170" cy="158" rx="8" ry="17" fill="#3b6a2a" transform="rotate(-25 170 158)" />
        <ellipse cx="184" cy="156" rx="8" ry="17" fill="#4f8a3a" transform="rotate(22 184 156)" />
        <ellipse cx="177" cy="150" rx="7" ry="18" fill="#3b6a2a" />
      </g>
    </svg>
  );
};

/** Photos sliding one after another, like swiping a listing gallery. */
export const Gallery = ({variants, at, every}: {variants: number[]; at: number; every: number}) => {
  const frame = useCurrentFrame();
  const input: number[] = [];
  const output: number[] = [];
  for (let i = 1; i < variants.length; i++) {
    input.push(at + i * every - 12, at + i * every);
    output.push(i - 1, i);
  }
  const pos = input.length ? interpolate(frame, input, output, {...clamp, easing: EASE_IN_OUT}) : 0;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: `${variants.length * 100}%`,
          translate: `${(-pos / variants.length) * 100}% 0px`,
        }}
      >
        {variants.map((v, i) => (
          <div key={i} style={{width: `${100 / variants.length}%`, height: '100%'}}>
            <Photo variant={v} />
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', justifyContent: 'center', gap: 8}}>
        {variants.map((v, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: C.surface,
              opacity: 1 - Math.min(1, Math.abs(pos - i)) * 0.55,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/** A search result row: photo, name, area, monthly price, open rooms. */
export const ListingRow = ({
  title,
  place,
  price,
  open,
  variant = 0,
  photo,
  highlight = false,
  pulse = 0,
  style,
}: {
  title: string;
  place: string;
  price: string;
  open: string;
  variant?: number;
  photo?: React.ReactNode;
  highlight?: boolean;
  pulse?: number;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      display: 'flex',
      gap: 20,
      padding: 14,
      borderRadius: 20,
      backgroundColor: C.surface,
      border: `2px solid ${highlight ? C.mossLight : C.border}`,
      boxShadow: SHADOW_CARD,
      ...style,
    }}
  >
    <div style={{position: 'relative', width: 200, height: 150, borderRadius: 14, overflow: 'hidden', flexShrink: 0}}>
      {photo ?? <Photo variant={variant} />}
    </div>
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0}}>
      <div
        style={{fontFamily: display, fontWeight: 600, fontSize: 27, letterSpacing: '-0.01em', color: C.ink, whiteSpace: 'nowrap'}}
      >
        {title}
      </div>
      <div style={{fontFamily: sans, fontSize: 20, color: C.grayInk}}>{place}</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4}}>
        <span style={{fontFamily: display, fontWeight: 600, fontSize: 32, color: C.clay}}>{price}</span>
        <span style={{fontFamily: sans, fontSize: 19, color: C.grayInk}}>/month</span>
      </div>
      <Badge size={17} style={{alignSelf: 'flex-start', scale: String(1 + 0.12 * pulse), transformOrigin: '0% 50%'}}>
        {open}
      </Badge>
    </div>
  </div>
);

type Pin = {x: number; y: number; label: string; at: number; active?: boolean};

/** Stylised street map with price pins that drop in. Pin x/y are pixels inside the map. */
export const MapView = ({
  width,
  height,
  pins,
  school,
  style,
}: {
  width: number;
  height: number;
  pins: Pin[];
  school?: {x: number; y: number; at: number; label: string};
  style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        width,
        height,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#ebe4d4',
        border: `2px solid ${C.border}`,
        ...style,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 500 440"
        preserveAspectRatio="xMidYMid slice"
        style={{position: 'absolute', left: 0, top: 0}}
      >
        <path d="M-20 318C110 280 230 360 520 270v46C240 400 110 322-20 362Z" fill="#cfe0ea" />
        <rect x="318" y="150" width="120" height="84" rx="14" fill="#dbe6cc" />
        <rect x="30" y="200" width="110" height="70" rx="10" fill="#e4dccb" />
        <g stroke="#fffdf8" strokeLinecap="round" fill="none">
          <path d="M-10 168 510 118" strokeWidth="20" />
          <path d="M165-10 205 450" strokeWidth="13" />
          <path d="M385-10 340 450" strokeWidth="9" />
          <path d="M-10 58 510 30" strokeWidth="8" />
          <path d="M60-10 88 450" strokeWidth="8" />
          <path d="M-10 410 510 392" strokeWidth="8" />
        </g>
        <text
          x="290"
          y="124"
          fontSize="14"
          fontWeight="600"
          fill="#9a9686"
          fontFamily={sans}
          transform="rotate(-5.5 290 124)"
        >
          Perino St
        </text>
      </svg>
      {school ? (
        <div
          style={{
            position: 'absolute',
            left: school.x,
            top: school.y,
            translate: '-50% -50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            scale: String(pop(frame, school.at)),
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: C.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cap" size={30} color="#ffffff" />
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 18,
              color: C.ink,
              backgroundColor: 'rgb(255 253 248 / 0.9)',
              padding: '1px 8px',
              borderRadius: 6,
            }}
          >
            {school.label}
          </div>
        </div>
      ) : null}
      {pins.map((pin) => {
        const p = pop(frame, pin.at);
        const fill = pin.active ? C.mossStrong : C.surface;
        return (
          <div
            key={pin.label}
            style={{
              position: 'absolute',
              left: pin.x,
              top: pin.y,
              translate: '-50% -100%',
              opacity: Math.min(1, p * 1.5),
              scale: String(0.6 + 0.4 * p),
              transformOrigin: '50% 100%',
            }}
          >
            <div
              style={{
                padding: '7px 14px',
                borderRadius: 12,
                backgroundColor: fill,
                color: pin.active ? '#ffffff' : C.ink,
                border: `2px solid ${pin.active ? C.mossStrong : C.borderStrong}`,
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 21,
                whiteSpace: 'nowrap',
                boxShadow: SHADOW_CARD,
              }}
            >
              {pin.label}
            </div>
            <div
              style={{
                width: 14,
                height: 14,
                margin: '-8px auto 0',
                rotate: '45deg',
                backgroundColor: fill,
                borderRight: `2px solid ${pin.active ? C.mossStrong : C.borderStrong}`,
                borderBottom: `2px solid ${pin.active ? C.mossStrong : C.borderStrong}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/** The voiceover line being spoken, as a caption pill. */
export const Captions = ({lines}: {lines: Line[]}) => {
  const frame = useCurrentFrame();
  let index = -1;
  lines.forEach((line, i) => {
    if (frame >= line.from) {
      index = i;
    }
  });
  if (index === -1 || frame > lines[index].to + 10) {
    return null;
  }
  const line = lines[index];
  const p = enter(frame, line.from, 8);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 54}}>
      <div
        style={{
          maxWidth: 1500,
          padding: '14px 36px 18px',
          borderRadius: 22,
          backgroundColor: 'rgb(28 32 25 / 0.86)',
          color: C.surface,
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 58,
          lineHeight: 1.22,
          textAlign: 'center',
          opacity: p,
          translate: `0px ${(1 - p) * 14}px`,
        }}
      >
        {line.text}
      </div>
    </AbsoluteFill>
  );
};
