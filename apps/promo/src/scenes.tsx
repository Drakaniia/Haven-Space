import type React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {Line} from './timeline';
import {
  AppBar,
  Badge,
  Browser,
  Button,
  C,
  Chip,
  Cursor,
  EASE,
  EASE_IN_OUT,
  FieldLabel,
  Gallery,
  Headline,
  Icon,
  Kicker,
  ListingRow,
  Logo,
  MapView,
  Paper,
  Phone,
  Photo,
  Ripple,
  SHADOW_CARD,
  SHADOW_POP,
  blip,
  clamp,
  display,
  enter,
  hand,
  pop,
  rise,
  sans,
  typed,
  type Key,
} from './ui';

// Every scene gets its voiceover lines (scene-relative frames) and keys its beats off them,
// so the picture follows the voice when real clips replace the estimates.
type SceneProps = {lines: Line[]};
const starts = (lines: Line[]) => lines.map((l) => l.from);
/** Frame at fraction `t` of a line. */
const along = (line: Line, t: number) => Math.round(line.from + (line.to - line.from) * t);

// 1. Hook ---------------------------------------------------------------------------------------

const CHAT = [
  {text: 'Hi po! May vacant pa?', me: true},
  {text: 'Wala na po, full na.', me: false},
  {text: 'Anything near BSU po?', me: true},
];

const Door = ({at}: {at: number}) => {
  const frame = useCurrentFrame();
  const p = enter(frame, at, 22);
  const sway = Math.sin((frame - at) / 9) * 1.6 * p;
  return (
    <div
      style={{position: 'absolute', left: 1080, top: 410, width: 330, height: 410, opacity: p, translate: `0px ${(1 - p) * 30}px`}}
    >
      <svg width={330} height={410} viewBox="0 0 330 410">
        <rect width="330" height="410" rx="10" fill={C.subtle} />
        <rect x="22" y="22" width="286" height="388" rx="6" fill="#9c6b48" />
        <rect x="46" y="48" width="238" height="150" rx="6" fill="#8a5d3d" />
        <rect x="46" y="222" width="238" height="164" rx="6" fill="#8a5d3d" />
        <circle cx="272" cy="228" r="11" fill="#e8c27a" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 50,
          top: 66,
          width: 230,
          padding: '18px 14px 20px',
          backgroundColor: C.surface,
          boxShadow: '0 6px 14px rgb(0 0 0 / 0.2)',
          rotate: `${-3 + sway}deg`,
          transformOrigin: '50% 0%',
          textAlign: 'center',
          fontFamily: hand,
          fontWeight: 700,
          color: C.ink,
        }}
      >
        <div
          style={{position: 'absolute', top: -12, left: 86, width: 58, height: 24, backgroundColor: 'rgb(226 214 180 / 0.85)', rotate: '4deg'}}
        />
        <div style={{fontSize: 54, lineHeight: 0.95}}>ROOM FOR RENT</div>
        <div style={{fontSize: 32, color: C.grayInk, marginTop: 8}}>inquire inside</div>
      </div>
    </div>
  );
};

export const Hook = ({lines}: SceneProps) => {
  const frame = useCurrentFrame();
  const [a, b] = starts(lines);
  const days = Math.round(interpolate(frame, [b + 14, b + 54], [1, 23], {...clamp, easing: EASE}));
  return (
    <Paper>
      <div
        style={{
          position: 'absolute',
          left: 959,
          top: 110,
          width: 2,
          height: 690,
          backgroundColor: C.border,
          scale: `1 ${enter(frame, 0, 30)}`,
          transformOrigin: '50% 0%',
        }}
      />

      <div style={{position: 'absolute', left: 150, top: 120, ...rise(frame, a - 4)}}>
        <Kicker>Students</Kicker>
        <Headline size={108} style={{marginTop: 12}}>
          Still asking
          <br />
          around?
        </Headline>
      </div>
      <div style={{position: 'absolute', left: 150, top: 440, width: 680, display: 'flex', flexDirection: 'column', gap: 18}}>
        {CHAT.map((m, i) => {
          const p = pop(frame, a + 16 + i * 14);
          return (
            <div
              key={m.text}
              style={{
                alignSelf: m.me ? 'flex-end' : 'flex-start',
                padding: '16px 28px',
                borderRadius: 28,
                borderBottomRightRadius: m.me ? 8 : 28,
                borderBottomLeftRadius: m.me ? 28 : 8,
                backgroundColor: m.me ? C.mossStrong : C.surface,
                color: m.me ? '#ffffff' : C.ink,
                border: `2px solid ${m.me ? C.mossStrong : C.border}`,
                fontFamily: sans,
                fontWeight: 500,
                fontSize: 38,
                opacity: Math.min(1, p * 2),
                scale: String(0.85 + 0.15 * p),
                transformOrigin: m.me ? '100% 100%' : '0% 100%',
              }}
            >
              {m.text}
            </div>
          );
        })}
        <div
          style={{alignSelf: 'flex-end', fontFamily: sans, fontWeight: 500, fontSize: 26, color: C.muted, opacity: enter(frame, a + 64, 10)}}
        >
          Seen 9:41 PM
        </div>
      </div>

      <div style={{position: 'absolute', left: 1070, top: 120, ...rise(frame, b - 4)}}>
        <Kicker>Landlords</Kicker>
        <Headline size={108} style={{marginTop: 12}}>
          Room still
          <br />
          empty?
        </Headline>
      </div>
      <Door at={b + 6} />
      <div
        style={{
          position: 'absolute',
          left: 1460,
          top: 470,
          width: 310,
          padding: '24px 30px 26px',
          borderRadius: 26,
          backgroundColor: C.surface,
          border: `2px solid ${C.border}`,
          boxShadow: SHADOW_CARD,
          ...rise(frame, b + 12),
        }}
      >
        <div style={{fontFamily: sans, fontWeight: 600, fontSize: 28, color: C.grayInk}}>Vacant for</div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 600,
            fontSize: 132,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: C.clay,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {days}
        </div>
        <div style={{fontFamily: sans, fontWeight: 600, fontSize: 28, color: C.grayInk}}>days and counting</div>
      </div>
    </Paper>
  );
};

// 2. Meet the app ---------------------------------------------------------------------------------

const Em = ({children}: {children: React.ReactNode}) => (
  <span style={{fontStyle: 'italic', color: C.mint}}>{children}</span>
);

export const Meet = ({lines}: SceneProps) => {
  const frame = useCurrentFrame();
  const [a, b, c] = starts(lines);
  const out = enter(frame, b - 8, 14);
  const logo = pop(frame, b);
  const lift = enter(frame, c - 6, 22);
  return (
    <Paper color={C.mossStrong} grain={0.12}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 462,
          textAlign: 'center',
          fontFamily: display,
          fontWeight: 500,
          fontSize: 132,
          letterSpacing: '-0.02em',
          color: C.surface,
          opacity: enter(frame, a, 16) * (1 - out),
          translate: `0px ${(1 - enter(frame, a, 20)) * 40 - out * 60}px`,
        }}
      >
        There’s an <Em>easier</Em> way.
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 480 - lift * 220,
          display: 'flex',
          justifyContent: 'center',
          opacity: Math.min(1, logo * 1.4),
          scale: String((0.7 + 0.3 * logo) * (1.25 - 0.25 * lift)),
        }}
      >
        <Logo size={120} color={C.surface} tile />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          fontFamily: display,
          fontWeight: 500,
          fontSize: 104,
          letterSpacing: '-0.02em',
          color: C.surface,
        }}
      >
        <div style={rise(frame, c)}>One app.</div>
        <div style={{display: 'flex', gap: 40}}>
          <div style={rise(frame, along(lines[2], 0.3))}>
            Find a <Em>place.</Em>
          </div>
          <div style={rise(frame, along(lines[2], 0.62))}>
            Fill your <Em>rooms.</Em>
          </div>
        </div>
      </div>
    </Paper>
  );
};

// 3. Students -------------------------------------------------------------------------------------

const SB = {x: 700, y: 96, w: 1100, h: 704}; // the student's browser window

const Caret = ({hidden}: {hidden: boolean}) => {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        display: 'inline-block',
        width: 3,
        height: 30,
        marginLeft: 3,
        verticalAlign: 'middle',
        backgroundColor: C.moss,
        opacity: hidden || Math.floor(frame / 8) % 2 ? 0 : 1,
      }}
    />
  );
};

export const Students = ({lines}: SceneProps) => {
  const frame = useCurrentFrame();
  const [b0, b1, b2, b3] = starts(lines);
  const tour = along(lines[2], 0.3);
  const message = along(lines[2], 0.58);
  const step = frame >= b2 ? 2 : frame >= b1 ? 1 : 0;
  const detail = enter(frame, b2 + 5, 16);
  const outro = enter(frame, b3 - 8, 18); // the browser steps aside for the closing words
  const hover = frame >= b1 + 10;
  const requested = frame >= tour + 2;
  const at = (f: number, x: number, y: number): Key => [f, SB.x + 2 + x, SB.y + 62 + y];
  return (
    <Paper>
      <div style={{position: 'absolute', left: 140, top: 120, width: 520, opacity: 1 - outro}}>
        <Kicker style={rise(frame, b0 - 8)}>For students</Kicker>
        <Headline size={84} style={{marginTop: 14, ...rise(frame, b0 - 4)}}>
          Find a place near school.
        </Headline>
        <div style={{marginTop: 56, display: 'flex', flexDirection: 'column', gap: 24}}>
          {['Search', 'Compare', 'Tour or message'].map((label, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 46,
                color: step === i ? C.ink : C.muted,
                ...rise(frame, b0 + 4 + i * 5),
              }}
            >
              <div style={{width: 10, height: 58, borderRadius: 5, backgroundColor: step === i ? C.moss : C.border}} />
              {label}
            </div>
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', left: 140, top: 230}}>
        {['Affordable.', 'Nearby.', 'Easy to find.'].map((word, i) => (
          <div
            key={word}
            style={{
              fontFamily: display,
              fontWeight: 500,
              fontSize: 100,
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              color: i === 0 ? C.clay : C.ink,
              ...rise(frame, along(lines[3], [0, 0.3, 0.55][i])),
            }}
          >
            {word}
          </div>
        ))}
      </div>

      <Browser
        url="haven-space.pages.dev/find-a-room"
        width={SB.w}
        height={SB.h}
        style={{left: SB.x, top: SB.y, scale: String(1 - 0.1 * outro), transformOrigin: '100% 50%', ...rise(frame, 0, 60)}}
      >
        <AppBar role="Student" tab="Find a room" />
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 92,
            width: 470,
            height: 64,
            borderRadius: 14,
            border: `2px solid ${frame >= b0 + 4 ? C.mossLight : C.border}`,
            backgroundColor: C.surface,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 18px',
            fontFamily: sans,
            fontSize: 26,
          }}
        >
          <Icon name="search" size={26} color={C.grayInk} />
          {frame < b0 + 6 ? (
            <span style={{color: C.muted}}>School, area or budget</span>
          ) : (
            <span style={{color: C.ink, fontWeight: 600}}>
              {typed('BSU, Sumpong', frame, b0 + 6)}
              <Caret hidden={frame > b0 + 40} />
            </span>
          )}
        </div>
        <div style={{position: 'absolute', left: 520, top: 104, display: 'flex', gap: 12}}>
          <Chip on style={{scale: String(pop(frame, b0 + 34))}}>
            Under ₱4,000
          </Chip>
          <Chip on style={{scale: String(pop(frame, b0 + 40))}}>
            Wi-Fi
          </Chip>
        </div>
        <ListingRow
          title="Onda’s Boarding House"
          place="Perino St, Sumpong"
          price="₱750"
          open="2 of 6 rooms open"
          photo={<Gallery variants={[0, 2, 3]} at={b1 + 14} every={20} />}
          highlight={hover}
          pulse={blip(frame, along(lines[1], 0.72))}
          style={{position: 'absolute', left: 28, top: 176, width: 560, ...rise(frame, b0 + 44)}}
        />
        <ListingRow
          title="University Haven Dorm"
          place="Dapitan St, Sumpong"
          price="₱3,800"
          open="1 of 4 rooms open"
          variant={1}
          pulse={blip(frame, along(lines[1], 0.72) + 6)}
          style={{position: 'absolute', left: 28, top: 379, width: 560, ...rise(frame, b0 + 52)}}
        />
        <MapView
          width={456}
          height={440}
          style={{left: 612, top: 176, ...rise(frame, b0 + 40)}}
          school={{x: 215, y: 118, at: b0 + 46, label: 'BSU'}}
          pins={[
            {x: 150, y: 178, label: '₱750', at: b0 + 50, active: hover},
            {x: 302, y: 290, label: '₱3,800', at: b0 + 56},
            {x: 392, y: 84, label: '₱4,200', at: b0 + 62},
          ]}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 72,
            width: '100%',
            height: SB.h - 64 - 72,
            backgroundColor: C.surface,
            translate: `${(1 - detail) * 100}% 0px`,
          }}
        >
          <div style={{position: 'absolute', left: 28, top: 24, width: 520, height: 380, borderRadius: 20, overflow: 'hidden'}}>
            <Photo variant={0} />
          </div>
          <div style={{position: 'absolute', left: 580, top: 24, width: 488}}>
            <div style={{fontFamily: display, fontWeight: 600, fontSize: 44, lineHeight: 1.06, letterSpacing: '-0.015em', color: C.ink}}>
              Onda’s Boarding House
            </div>
            <div style={{fontFamily: sans, fontSize: 23, color: C.grayInk, marginTop: 10}}>Perino St, Sumpong</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 16}}>
              <span style={{fontFamily: display, fontWeight: 600, fontSize: 52, color: C.clay}}>₱750</span>
              <span style={{fontFamily: sans, fontSize: 23, color: C.grayInk}}>/month</span>
            </div>
            <Badge size={19} style={{marginTop: 12}}>
              2 of 6 rooms open
            </Badge>
            <div style={{display: 'flex', gap: 10, marginTop: 16}}>
              <Chip size={19}>Wi-Fi</Chip>
              <Chip size={19}>Shared kitchen</Chip>
              <Chip size={19}>Study area</Chip>
            </div>
          </div>
          <div style={{position: 'absolute', left: 580, top: 380, display: 'flex', gap: 12}}>
            <Button
              size={22}
              scale={1 - 0.06 * blip(frame, tour)}
              style={requested ? {backgroundColor: C.successInk} : undefined}
            >
              {requested ? (
                <>
                  <Icon name="check" size={24} color="#ffffff" strokeWidth={2.6} />
                  Requested
                </>
              ) : (
                'Request a tour'
              )}
            </Button>
            <Button size={22} variant="outline" style={{color: frame >= message ? C.moss : C.ink}}>
              Message landlord
            </Button>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 580,
              top: 466,
              width: 470,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 20px',
              borderRadius: 18,
              backgroundColor: C.successTint,
              border: `2px solid ${C.successBorder}`,
              color: C.successInk,
              ...rise(frame, tour + 6, 20),
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: C.successInk,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={28} color="#ffffff" strokeWidth={3} />
            </div>
            <div style={{fontFamily: sans}}>
              <div style={{fontWeight: 700, fontSize: 24}}>Tour requested</div>
              <div style={{fontSize: 20}}>The landlord will confirm a time.</div>
            </div>
          </div>
        </div>
      </Browser>

      <Cursor
        path={[
          at(b1 - 12, 860, 640),
          at(b1 + 10, 142, 265),
          at(b2 - 4, 400, 210),
          at(tour - 5, 690, 477),
          at(tour + 14, 690, 477),
          at(message, 932, 477),
        ]}
        clicks={[b2 + 2, tour]}
        until={b3 - 10}
      />
    </Paper>
  );
};

// 4. Landlords ------------------------------------------------------------------------------------

const LB = {x: 120, y: 96, w: 1100, h: 704}; // the landlord's browser window

const LANDLORD_LISTINGS = [
  {title: 'Onda’s Boarding House', place: 'Perino St, Sumpong', price: '₱750', open: '2 of 6 rooms open', variant: 0},
  {title: 'Casa Amara Boarding House', place: 'Aguinaldo Hwy, Dasmariñas', price: '₱3,000', open: '1 of 4 rooms open', variant: 3},
];

export const Landlords = ({lines}: SceneProps) => {
  const frame = useCurrentFrame();
  const [b0, b1, b2] = starts(lines);
  const at1 = (t: number) => along(lines[1], t);
  const publish = along(lines[2], 0.2);
  const manage = along(lines[2], 0.42);
  const live = frame >= publish + 2;
  const step = frame >= b2 ? 2 : frame >= at1(0.5) ? 1 : frame >= b1 ? 0 : -1;
  const listings = enter(frame, manage, 18);
  const price = typed('750', frame, at1(0.55), 3);
  const at = (f: number, x: number, y: number): Key => [f, LB.x + 2 + x, LB.y + 62 + y];
  return (
    <Paper>
      <Browser
        url="haven-space.pages.dev/landlord/listings/create"
        width={LB.w}
        height={LB.h}
        style={{left: LB.x, top: LB.y, ...rise(frame, 0, 60)}}
      >
        <AppBar role="Landlord" tab="Listings" />
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 88,
            fontFamily: display,
            fontWeight: 600,
            fontSize: 40,
            letterSpacing: '-0.015em',
            color: C.ink,
            ...rise(frame, b0),
          }}
        >
          New listing
        </div>
        <div style={{position: 'absolute', right: 28, top: 96, ...rise(frame, b0)}}>
          {live ? (
            <Badge size={20} style={{scale: String(pop(frame, publish + 2))}}>
              Live
            </Badge>
          ) : (
            <Badge size={20} tone="neutral">
              Draft
            </Badge>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 160,
            width: 520,
            height: 230,
            borderRadius: 18,
            border: `3px dashed ${C.borderStrong}`,
            backgroundColor: C.cream,
            ...rise(frame, b0 + 6),
          }}
        >
          <FieldLabel style={{position: 'absolute', left: 22, top: 14}}>Photos</FieldLabel>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 84,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 22,
              color: C.grayInk,
              opacity: 1 - enter(frame, at1(0), 8),
            }}
          >
            <Icon name="camera" size={40} color={C.muted} />
            Add photos
          </div>
          {[0, 2, 3].map((v, i) => (
            <div
              key={v}
              style={{
                position: 'absolute',
                left: 22 + i * 162,
                top: 62,
                width: 148,
                height: 140,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: SHADOW_CARD,
                scale: String(pop(frame, at1(0.04 + i * 0.07))),
              }}
            >
              <Photo variant={v} />
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 572,
            top: 160,
            width: 496,
            height: 230,
            borderRadius: 18,
            border: `2px solid ${C.border}`,
            backgroundColor: C.surface,
            overflow: 'hidden',
            ...rise(frame, b0 + 12),
          }}
        >
          <FieldLabel style={{position: 'absolute', left: 22, top: 14}}>Location</FieldLabel>
          <MapView
            width={452}
            height={118}
            style={{left: 20, top: 52}}
            pins={[{x: 226, y: 96, label: 'Your place', at: at1(0.27), active: true}]}
          />
          <div
            style={{
              position: 'absolute',
              left: 22,
              top: 184,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 21,
              color: C.ink,
              opacity: enter(frame, at1(0.3), 10),
            }}
          >
            <Icon name="pin" size={22} color={C.moss} />
            Perino St, Sumpong
          </div>
        </div>

        <div style={{position: 'absolute', left: 28, top: 410, ...rise(frame, b0 + 18)}}>
          <FieldLabel>Monthly rent</FieldLabel>
          <div
            style={{
              marginTop: 8,
              width: 300,
              height: 64,
              borderRadius: 14,
              border: `2px solid ${price ? C.mossLight : C.border}`,
              backgroundColor: C.surface,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 18px',
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 30,
            }}
          >
            <span style={{color: C.muted}}>₱</span>
            <span style={{color: C.ink}}>{price}</span>
            <span style={{color: C.muted, fontSize: 22, fontWeight: 500, marginLeft: 'auto'}}>/month</span>
          </div>
        </div>
        <div style={{position: 'absolute', left: 352, top: 410, ...rise(frame, b0 + 21)}}>
          <FieldLabel>Rooms open</FieldLabel>
          <div
            style={{
              marginTop: 8,
              width: 200,
              height: 64,
              borderRadius: 14,
              border: `2px solid ${C.border}`,
              backgroundColor: C.surface,
              display: 'flex',
              alignItems: 'center',
              padding: '0 18px',
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 30,
              color: C.ink,
            }}
          >
            <span style={{opacity: enter(frame, at1(0.68), 8)}}>2 of 6</span>
          </div>
        </div>
        <div style={{position: 'absolute', left: 580, top: 410, width: 490, ...rise(frame, b0 + 24)}}>
          <FieldLabel>Includes</FieldLabel>
          <div style={{marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 10}}>
            {['Wi-Fi', 'Shared kitchen', 'Laundry', 'Study area'].map((label, i) => (
              <Chip key={label} on={frame >= at1(0.76 + i * 0.05)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 562,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 18px',
            borderRadius: 14,
            backgroundColor: C.successTint,
            border: `2px solid ${C.successBorder}`,
            color: C.successInk,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 22,
            opacity: Math.min(1, pop(frame, b2) * 1.5),
            scale: String(0.7 + 0.3 * pop(frame, b2)),
          }}
        >
          <Icon name="shield" size={28} color={C.successInk} strokeWidth={2.2} />
          Verified landlord
        </div>
        <Button
          size={24}
          scale={1 - 0.06 * blip(frame, publish)}
          style={{position: 'absolute', left: 820, top: 556, ...rise(frame, b0 + 26)}}
        >
          {live ? (
            <>
              <Icon name="check" size={26} color="#ffffff" strokeWidth={2.6} />
              Published
            </>
          ) : (
            'Publish listing'
          )}
        </Button>

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 72,
            width: '100%',
            height: LB.h - 64 - 72,
            backgroundColor: C.surface,
            translate: `${(1 - listings) * 100}% 0px`,
          }}
        >
          <div
            style={{position: 'absolute', left: 28, top: 22, fontFamily: display, fontWeight: 600, fontSize: 40, letterSpacing: '-0.015em', color: C.ink}}
          >
            My listings
          </div>
          <Button size={20} variant="outline" style={{position: 'absolute', right: 28, top: 22, color: C.ink}}>
            <Icon name="plus" size={22} />
            New listing
          </Button>
          {LANDLORD_LISTINGS.map((l, i) => (
            <div
              key={l.title}
              style={{
                position: 'absolute',
                left: 28,
                top: 104 + i * 168,
                width: 1040,
                height: 148,
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                padding: 14,
                borderRadius: 20,
                border: `2px solid ${C.border}`,
                backgroundColor: C.surface,
                boxShadow: SHADOW_CARD,
                ...rise(frame, manage + 8 + i * 6, 30),
              }}
            >
              <div style={{width: 160, height: 116, borderRadius: 12, overflow: 'hidden', flexShrink: 0}}>
                <Photo variant={l.variant} />
              </div>
              <div style={{flex: 1}}>
                <div style={{fontFamily: display, fontWeight: 600, fontSize: 30, color: C.ink}}>{l.title}</div>
                <div style={{fontFamily: sans, fontSize: 21, color: C.grayInk, marginTop: 4}}>{l.place}</div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, paddingRight: 8}}>
                <div>
                  <span style={{fontFamily: display, fontWeight: 600, fontSize: 32, color: C.clay}}>{l.price}</span>
                  <span style={{fontFamily: sans, fontSize: 20, color: C.grayInk}}> /month</span>
                </div>
                <div style={{display: 'flex', gap: 10}}>
                  <Badge size={18}>Live</Badge>
                  <Badge size={18} tone="neutral">
                    {l.open}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Browser>

      <div style={{position: 'absolute', left: 1300, top: 120, width: 500}}>
        <Kicker style={rise(frame, b0 - 8)}>For landlords</Kicker>
        <Headline size={84} style={{marginTop: 14, ...rise(frame, b0 - 4)}}>
          Get your rooms seen.
        </Headline>
        <div style={{marginTop: 56, display: 'flex', flexDirection: 'column', gap: 24}}>
          {['Photos & location', 'Price & details', 'Verified & live'].map((label, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 42,
                color: step === i ? C.ink : C.muted,
                ...rise(frame, b0 + 4 + i * 5),
              }}
            >
              <div style={{width: 10, height: 54, borderRadius: 5, backgroundColor: step === i ? C.moss : C.border}} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <Cursor
        path={[at(b2 - 14, 700, 660), at(publish - 4, 936, 584), at(publish + 10, 936, 584), at(manage, 1000, 300)]}
        clicks={[publish]}
        until={manage}
      />
    </Paper>
  );
};

// 5. The connection -------------------------------------------------------------------------------

const ARC = 'M920 400 Q1145 170 1370 400';
const onArc = (t: number) => {
  const u = 1 - t;
  return {x: u * u * 920 + 2 * u * t * 1145 + t * t * 1370, y: u * u * 400 + 2 * u * t * 170 + t * t * 400};
};

const MiniCard = ({
  title,
  price,
  variant,
  isNew = false,
  style,
}: {
  title: string;
  price: string;
  variant: number;
  isNew?: boolean;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      width: 300,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: C.surface,
      border: `2px solid ${isNew ? C.mossLight : C.border}`,
      boxShadow: SHADOW_CARD,
      ...style,
    }}
  >
    <div style={{position: 'relative', height: 150}}>
      <Photo variant={variant} />
      {isNew ? (
        <Badge size={15} style={{position: 'absolute', left: 12, top: 12}}>
          New
        </Badge>
      ) : null}
    </div>
    <div style={{padding: '12px 16px 14px'}}>
      <div style={{fontFamily: display, fontWeight: 600, fontSize: 23, color: C.ink, whiteSpace: 'nowrap'}}>{title}</div>
      <div style={{marginTop: 6}}>
        <span style={{fontFamily: display, fontWeight: 600, fontSize: 25, color: C.clay}}>{price}</span>
        <span style={{fontFamily: sans, fontSize: 16, color: C.grayInk}}> /month</span>
      </div>
    </div>
  </div>
);

export const Connect = ({lines}: SceneProps) => {
  const frame = useCurrentFrame();
  const [b0, b1, b2] = starts(lines);
  const landAt = along(lines[1], 0.22);
  const fly = interpolate(frame, [b1, landAt], [0, 1], {...clamp, easing: EASE_IN_OUT});
  const landed = frame >= landAt;
  const tapCard = along(lines[1], 0.3);
  const detailIn = enter(frame, tapCard + 2, 16);
  const tapTour = along(lines[1], 0.8);
  const requested = frame >= tapTour + 2;
  const back = interpolate(frame, [b2, b2 + 22], [0, 1], {...clamp, easing: EASE_IN_OUT});
  const card = onArc(fly);
  const note = onArc(1 - back);
  const every = Math.max(14, Math.round(0.15 * (lines[1].to - b1)));
  return (
    <Paper>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <path
          d={ARC}
          fill="none"
          stroke={C.borderStrong}
          strokeWidth={5}
          strokeDasharray="2 14"
          strokeLinecap="round"
          opacity={enter(frame, b0 + 20, 14)}
        />
        <path
          d={ARC}
          fill="none"
          stroke={C.moss}
          strokeWidth={7}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={back - 1}
        />
        {[920, 1370].map((x) => (
          <circle key={x} cx={x} cy={400} r={14 * pop(frame, b2 + 22)} fill={C.moss} />
        ))}
      </svg>

      <Browser url="haven-space.pages.dev/landlord/listings" width={760} height={520} style={{left: 150, top: 170, ...rise(frame, 0, 60)}}>
        <AppBar role="Landlord" tab="Listings" />
        <ListingRow
          title="Onda’s Boarding House"
          place="Perino St, Sumpong"
          price="₱750"
          open="2 of 6 rooms open"
          style={{position: 'absolute', left: 28, top: 92, width: 700, ...rise(frame, b0)}}
        />
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 298,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontFamily: sans,
            fontSize: 22,
            color: C.grayInk,
            opacity: Math.min(1, pop(frame, b0 + 22) * 1.5),
          }}
        >
          <Badge size={20} style={{scale: String(0.7 + 0.3 * pop(frame, b0 + 22))}}>
            Live
          </Badge>
          Students searching near BSU can see it
        </div>
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 352,
            width: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 20px',
            borderRadius: 18,
            backgroundColor: C.mint,
            border: `2px solid ${C.mossLight}`,
            opacity: Math.min(1, pop(frame, b2 + 22) * 1.5),
            scale: String(0.8 + 0.2 * pop(frame, b2 + 22)),
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: C.mossStrong,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="calendar" size={26} color="#ffffff" />
          </div>
          <div style={{fontFamily: sans}}>
            <div style={{fontWeight: 700, fontSize: 24, color: C.mossDark}}>New tour request</div>
            <div style={{fontSize: 20, color: C.grayInk}}>Onda’s Boarding House · Sat, 10:00 AM</div>
          </div>
        </div>
      </Browser>

      <Phone style={{left: 1380, top: 110, ...rise(frame, 4, 60)}}>
        <div style={{position: 'absolute', left: 18, right: 18, top: 62}}>
          <div style={{fontFamily: display, fontWeight: 600, fontSize: 32, letterSpacing: '-0.015em', color: C.ink}}>Find a room</div>
          <div
            style={{
              marginTop: 12,
              height: 50,
              borderRadius: 14,
              border: `2px solid ${C.border}`,
              backgroundColor: C.surface,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 19,
              color: C.ink,
            }}
          >
            <Icon name="search" size={22} color={C.grayInk} />
            Near BSU
          </div>
          <div style={{position: 'relative', marginTop: 16}}>
            <MiniCard
              title="Onda’s Boarding House"
              price="₱750"
              variant={0}
              isNew
              style={{position: 'absolute', top: 0, opacity: landed ? 1 : 0, scale: String(landed ? 0.92 + 0.08 * pop(frame, landAt) : 1)}}
            />
            <MiniCard
              title="University Haven Dorm"
              price="₱3,800"
              variant={1}
              style={{position: 'absolute', top: 0, translate: `0px ${enter(frame, landAt - 2, 14) * 266}px`}}
            />
          </div>
        </div>
        <div style={{position: 'absolute', left: 168, top: 298}}>
          <Ripple age={frame - tapCard} />
        </div>

        <div style={{position: 'absolute', inset: 0, backgroundColor: C.cream, translate: `${(1 - detailIn) * 100}% 0px`}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 336, height: 280}}>
            <Gallery variants={[0, 2, 3]} at={tapCard} every={every} />
          </div>
          <div style={{position: 'absolute', left: 20, top: 296, width: 296}}>
            <div style={{fontFamily: display, fontWeight: 600, fontSize: 30, lineHeight: 1.08, letterSpacing: '-0.015em', color: C.ink}}>
              Onda’s Boarding House
            </div>
            <div style={{fontFamily: sans, fontSize: 18, color: C.grayInk, marginTop: 8}}>Perino St, Sumpong</div>
            <div style={{marginTop: 10}}>
              <span style={{fontFamily: display, fontWeight: 600, fontSize: 36, color: C.clay}}>₱750</span>
              <span style={{fontFamily: sans, fontSize: 18, color: C.grayInk}}> /month</span>
            </div>
            <Badge size={16} style={{marginTop: 10}}>
              2 of 6 rooms open
            </Badge>
          </div>
          <div style={{position: 'absolute', left: 20, top: 598, width: 296}}>
            <Button
              size={21}
              scale={1 - 0.06 * blip(frame, tapTour)}
              style={{width: '100%', ...(requested ? {backgroundColor: C.successInk} : {})}}
            >
              {requested ? (
                <>
                  <Icon name="check" size={24} color="#ffffff" strokeWidth={2.6} />
                  Tour requested
                </>
              ) : (
                'Request a tour'
              )}
            </Button>
          </div>
          <div style={{position: 'absolute', left: 168, top: 622}}>
            <Ripple age={frame - tapTour} />
          </div>
        </div>
      </Phone>

      {fly > 0 && fly < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: card.x,
            top: card.y,
            translate: '-50% -50%',
            scale: String(1 - 0.25 * fly),
            rotate: `${Math.sin(fly * Math.PI) * -6}deg`,
          }}
        >
          <MiniCard title="Onda’s Boarding House" price="₱750" variant={0} style={{boxShadow: SHADOW_POP}} />
        </div>
      ) : null}
      {back > 0 && back < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: note.x,
            top: note.y,
            translate: '-50% -50%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 16,
            backgroundColor: C.mossStrong,
            color: '#ffffff',
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 24,
            whiteSpace: 'nowrap',
            boxShadow: SHADOW_POP,
          }}
        >
          <Icon name="calendar" size={26} color="#ffffff" />
          Tour request
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 868,
          textAlign: 'center',
          fontFamily: display,
          fontWeight: 500,
          fontSize: 92,
          letterSpacing: '-0.02em',
          color: C.ink,
          ...rise(frame, b2 + 2),
        }}
      >
        Just like that — <span style={{fontStyle: 'italic', color: C.moss}}>connected.</span>
      </div>
    </Paper>
  );
};

// 6. Benefits -------------------------------------------------------------------------------------

const PerkCard = ({
  left,
  title,
  icon,
  tint,
  perks,
  at,
  enterAt,
}: {
  left: number;
  title: string;
  icon: 'cap' | 'home';
  tint: string;
  perks: string[];
  at: number;
  enterAt: number;
}) => {
  const frame = useCurrentFrame();
  const shown = enter(frame, enterAt, 20);
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 120,
        width: 780,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: C.surface,
        border: `2px solid ${C.border}`,
        boxShadow: SHADOW_CARD,
        opacity: shown * interpolate(frame, [at - 10, at], [0.5, 1], clamp),
        translate: `0px ${(1 - shown) * 40}px`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 22, height: 128, padding: '0 40px', backgroundColor: tint}}>
        <Icon name={icon} size={56} color={C.mossDark} />
        <div style={{fontFamily: display, fontWeight: 500, fontSize: 68, letterSpacing: '-0.02em', color: C.ink}}>{title}</div>
      </div>
      <div style={{padding: '22px 40px 30px', display: 'flex', flexDirection: 'column', gap: 6}}>
        {perks.map((perk, i) => {
          const t = at + 4 + i * 6;
          const p = enter(frame, t, 14);
          return (
            <div
              key={perk}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                height: 92,
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 52,
                color: C.ink,
                opacity: p,
                translate: `${(1 - p) * -24}px 0px`,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: C.mossStrong,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scale: String(0.6 + 0.4 * pop(frame, t)),
                }}
              >
                <Icon name="check" size={34} color="#ffffff" strokeWidth={3} />
              </div>
              {perk}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Benefits = ({lines}: SceneProps) => {
  const [a, b] = starts(lines);
  return (
    <Paper>
      <PerkCard
        left={150}
        title="For students"
        icon="cap"
        tint={C.mint}
        perks={['Affordable rooms', 'Near your school', 'Compare options', 'See what’s open', 'Save time searching']}
        at={a}
        enterAt={0}
      />
      <PerkCard
        left={990}
        title="For landlords"
        icon="home"
        tint={C.subtle}
        perks={['Promote open rooms', 'Reach more students', 'Show off your place', 'Get found online', 'Fill empty rooms']}
        at={b}
        enterAt={6}
      />
    </Paper>
  );
};

// 7. Call to action -------------------------------------------------------------------------------

export const Cta = ({lines}: SceneProps) => {
  const frame = useCurrentFrame();
  const [a, b, c] = starts(lines);
  const end = lines[2].to;
  const reveal = enter(frame, c - 4, 24);
  return (
    <Paper>
      <div style={{position: 'absolute', left: 150, top: 330, ...rise(frame, a - 4)}}>
        <Headline size={100}>
          Looking for
          <br />a place?
        </Headline>
        <Button size={40} scale={1 - 0.06 * blip(frame, along(lines[0], 0.6))} style={{marginTop: 44}}>
          Start searching
        </Button>
      </div>
      <div style={{position: 'absolute', left: 1070, top: 330, ...rise(frame, b - 4)}}>
        <Headline size={100}>
          Have a room
          <br />
          to rent?
        </Headline>
        <Button size={40} scale={1 - 0.06 * blip(frame, along(lines[1], 0.6))} style={{marginTop: 44}}>
          List it today
        </Button>
      </div>

      <AbsoluteFill style={{backgroundColor: C.mossStrong, clipPath: `circle(${reveal * 1150}px at 960px 540px)`}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 230,
            display: 'flex',
            justifyContent: 'center',
            opacity: Math.min(1, pop(frame, c + 2) * 1.4),
            scale: String(0.8 + 0.2 * pop(frame, c + 2)),
          }}
        >
          <Logo size={150} color={C.surface} tile />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 450,
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            fontFamily: display,
            fontWeight: 500,
            fontSize: 72,
            letterSpacing: '-0.02em',
            color: C.surface,
          }}
        >
          <div style={rise(frame, along(lines[2], 0.2))}>
            Find your next <Em>place.</Em>
          </div>
          <div style={rise(frame, along(lines[2], 0.6))}>
            Fill your next <Em>room.</Em>
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 620, display: 'flex', justifyContent: 'center', gap: 24, ...rise(frame, end + 2)}}>
          <Button size={34} variant="light">
            Find a room
          </Button>
          <Button size={34} variant="outline" style={{color: C.surface}}>
            List your property
          </Button>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 790,
            textAlign: 'center',
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 46,
            color: C.mint,
            ...rise(frame, end + 10),
          }}
        >
          haven-space.pages.dev
        </div>
      </AbsoluteFill>
    </Paper>
  );
};
