import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router";

/* ------------------------------------------------------------------ */
/*  CONTENT                                                            */
/*  No posters needed: every video shows its own first frame via the   */
/*  `#t=0.001` trick (see `frame()` below). `poster` is still honoured */
/*  if you ever want to override a specific clip.                      */
/* ------------------------------------------------------------------ */
const CREATOR = {
  first: "Tinu",
  last: "The Creator",
  email: "tinujacob24@gmail.com",
};

const WORLDS = ["Beauty", "Hair", "Lifestyle"];

const REEL = [
  {
    world: "Beauty",
    label: "Lip gloss swipe",
    src: "/Landscape Beauty.mp4",
    poster: "",
    bg: ["#D8321F", "#5A0F18"],
  },
  {
    world: "Hair",
    label: "Linen swirl",
    src: "/Landscape Hairstyle.mp4",
    poster: "",
    bg: ["#C9B8A3", "#2F3A4A"],
  },
  {
    world: "Lifestyle",
    label: "Rooftop breakfast",
    src: "/Landscape Lifestyle .mp4",
    poster: "",
    bg: ["#F2C6A0", "#7C5A44"],
  },
];

/* `ratio` still drives each tile's shape; `span` is no longer used
   because the mosaic now balances columns automatically. */
const WORK = [
  {
    slug: "bytehub-cafe-promotion",
    title: "Byte Hub Cafe Promotion",
    client: "Byte hub",
    world: "Lifestyle",
    format: "Campaign",
    ratio: "4 / 5",
    bg: ["#F4B8A8", "#8E3B46"],
    src: "/Lifestyle 1.mp4",
    poster: "",
  },
  // {
  //   slug: "sunday-ragu",
  //   title: "Sunday ragu",
  //   client: "Casa Fonte",
  //   world: "Food",
  //   format: "Brand film",
  //   ratio: "2.39 / 1",
  //   bg: ["#C8452B", "#2B1810"],
  //   src: "",
  //   poster: "",
  // },
  {
    slug: "lifestyle-vlog",
    title: "Lifestyle Vlog",
    client: "Personal",
    world: "Lifestyle",
    format: "Reels",
    ratio: "9 / 16",
    bg: ["#B3202A", "#2A0A10"],
    src: "/Lifestyle.mp4",
    poster: "",
  },
  {
    slug: "starella-fashion-show",
    title: "Starella Fashion Show",
    client: "Starella Fashion Academy",
    world: "Beauty",
    format: "Reels",
    ratio: "4 / 5",
    bg: ["#F7D9A8", "#A4673B"],
    src: "/Fashion Reel.mp4",
    poster: "",
  },
  {
    slug: "gemba-hotel",
    title: "Gemba Hotel Promotion",
    client: "Gemba Hotel & Resort",
    world: "Lifestyle",
    format: "Reels",
    ratio: "9 / 16",
    bg: ["#B3202A", "#2A0A10"],
    src: "/Lifestyle 5.mp4",
    poster: "",
  },
  {
    slug: "feelings-devas",
    title: "Feelings by Devas Promotion",
    client: "Feelings by Devas",
    world: "Lifestyle",
    format: "Reels",
    ratio: "4 / 5",
    bg: ["#B3202A", "#2A0A10"],
    src: "/Lifestyle 3.mp4",
    poster: "",
  },
  {
    slug: "hair-vlog",
    title: "Hair vlog",
    client: "Personal",
    world: "Hair",
    format: "Reels",
    ratio: "9 / 16",
    bg: ["#B3202A", "#2A0A10"],
    src: "/Hair 1.mp4",
    poster: "",
  },
  {
    slug: "queeniez-kitchen",
    title: "Queeniez Kitchen Promotion",
    client: "Queeniez Kitchen",
    world: "Food",
    format: "Reels",
    ratio: "4 / 5",
    bg: ["#B3202A", "#2A0A10"],
    src: "/Food_Lifestyle 2.mp4",
    poster: "",
  },
  {
    slug: "smookies-promotion",
    title: "Smookies Promotion",
    client: "Smookies by Chef Ette",
    world: "Food",
    format: "Campaign",
    ratio: "9 / 16",
    bg: ["#D9D0C1", "#3C4A5C"],
    src: "/Food_Lifestyle.mp4",
    poster: "",
  },
];

const BRANDS = [
  "Gemba Hotel & Resort",
  "Feelings by Devas",
  "Smookies by Chef Ette",
  "ByteHub Cafe",
  "Cafe One",
  "Queeniez Kitchen",
  "Starellas Academy",
  "Lush Hair",
  "Munchies",
  "Hara Grills",
];

const FPS = 24;
const REEL_SECONDS = 48;
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const timecode = (sec) => {
  const f = Math.floor(sec * FPS);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(0)}:${p(Math.floor(f / (FPS * 60)) % 60)}:${p(Math.floor(f / FPS) % 60)}:${p(f % FPS)}`;
};

const grad = (bg) => `linear-gradient(155deg, ${bg[0]} 0%, ${bg[1]} 100%)`;

/* Media-fragment trick: asking for t=0.001 makes the browser decode and
   display the first frame as soon as metadata arrives, so the video acts
   as its own poster with no separate image file. */
const frame = (src) => `${src}#t=0.001`;

/* ------------------------------------------------------------------ */
/*  Mosaic layout                                                      */
/*  Tiles are dealt into columns so every tile starts exactly where    */
/*  the one above it ends. Column heights are balanced by moving and   */
/*  swapping tiles, then any tiny leftover difference is absorbed by   */
/*  stretching the tiles slightly (videos are object-fit: cover), so   */
/*  the bottom edge ends up flush too.                                 */
/* ------------------------------------------------------------------ */
const ratioOf = (r) => {
  const [a, b] = String(r).split("/").map(Number);
  return a / (b || 1);
};

const GAP_UNITS = 0.02; // approx. gap, relative to column width

function buildColumns(items, cols) {
  if (cols <= 1) return [items];
  const h = items.map((it) => 1 / ratioOf(it.ratio) + GAP_UNITS);

  // 1. Greedy: each tile goes to the currently shortest column.
  const assign = [];
  const sums = Array(cols).fill(0);
  h.forEach((x, i) => {
    const c = sums.indexOf(Math.min(...sums));
    assign[i] = c;
    sums[c] += x;
  });

  // 2. Improve: try moves and swaps that shrink the tallest-to-shortest gap.
  const range = (a) => {
    const s = Array(cols).fill(0);
    a.forEach((c, i) => (s[c] += h[i]));
    return Math.max(...s) - Math.min(...s);
  };
  let best = range(assign);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < h.length; i++) {
      for (let c = 0; c < cols; c++) {
        if (c === assign[i]) continue;
        const prev = assign[i];
        assign[i] = c;
        const r = range(assign);
        if (r < best - 1e-9) {
          best = r;
          improved = true;
        } else assign[i] = prev;
      }
    }
    for (let i = 0; i < h.length; i++) {
      for (let j = i + 1; j < h.length; j++) {
        if (assign[i] === assign[j]) continue;
        [assign[i], assign[j]] = [assign[j], assign[i]];
        const r = range(assign);
        if (r < best - 1e-9) {
          best = r;
          improved = true;
        } else [assign[i], assign[j]] = [assign[j], assign[i]];
      }
    }
  }

  const out = Array.from({ length: cols }, () => []);
  items.forEach((it, i) => out[assign[i]].push(it)); // keeps original order within a column
  return out;
}

function useColumns() {
  const get = () => {
    if (typeof window === "undefined") return 3;
    const w = window.innerWidth;
    return w >= 1000 ? 3 : w >= 520 ? 2 : 1;
  };
  const [n, setN] = useState(get);
  useEffect(() => {
    const on = () => setN(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
}

/* ------------------------------------------------------------------ */
/*  Hero: scrolling scrubs the reel. Each scroll zone is a hard cut.   */
/* ------------------------------------------------------------------ */
function Hero({ soundOn, onToggleSound }) {
  const wrap = useRef(null);
  const videos = useRef([]);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const max = el.offsetHeight - window.innerHeight;
        setP(Math.min(1, Math.max(0, -el.getBoundingClientRect().top / max)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const idx = Math.min(REEL.length - 1, Math.floor(p * REEL.length));

  // Play the active clip, pause the rest, keep audio in sync with the toggle.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return;
      v.muted = !soundOn;
      if (i === idx && !reducedMotion()) v.play().catch(() => {});
      else v.pause();
    });
  }, [idx, soundOn]);

  return (
    <section ref={wrap} className="hero" aria-label="Showreel">
      <div className="hero-stick">
        {REEL.map((c, i) => (
          <div
            key={c.label}
            className="hero-clip"
            style={{ opacity: i === idx ? 1 : 0, background: grad(c.bg) }}
          >
            {c.src && (
              <video
                ref={(el) => (videos.current[i] = el)}
                src={frame(c.src)}
                poster={c.poster || undefined}
                loop
                muted
                playsInline
                /* current and neighbouring clips buffer fully, the rest only fetch metadata */
                preload={Math.abs(i - idx) <= 1 ? "auto" : "metadata"}
              />
            )}
          </div>
        ))}

        <div className="hero-top">
          <span className="tc" aria-live="off">
            {timecode(p * REEL_SECONDS)}
          </span>
          <span className="hero-world">{REEL[idx].world}</span>
          {/* <button
            className="sound"
            onClick={onToggleSound}
            aria-pressed={soundOn}
          >
            {soundOn ? "Sound on" : "Sound off"}
          </button> */}
        </div>

        <h1
          className="hero-name"
          aria-label={`${CREATOR.first} ${CREATOR.last}`}
        >
          <span>{CREATOR.first}</span>
          <span>{CREATOR.last}</span>
        </h1>

        {/* <div className="hero-foot">
          <div className="playhead" aria-hidden="true">
            {REEL.map((_, i) => (
              <i key={i} className={i <= idx ? "on" : ""} />
            ))}
            <b style={{ left: `${p * 100}%` }} />
          </div>
          <span className="hint">Scroll to scrub the reel</span>
        </div> */}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tile                                                               */
/*  - first frame shows instantly (metadata + #t trick)                */
/*  - once within 1.5 screens of the viewport it switches to           */
/*    preload="auto", so it is buffered before the user hovers         */
/*  - play() starts as soon as enough data exists, no full download    */
/*  - on touch devices (no hover) the tile plays while mostly in view  */
/* ------------------------------------------------------------------ */
function Tile({ item, soundOn, setCursor }) {
  const box = useRef(null);
  const vid = useRef(null);
  const [near, setNear] = useState(false);
  const rate = { Beauty: 1, Fashion: 1, Food: 1, Lifestyle: 1, Hair: 1 }[
    item.world
  ];

  // Start buffering well before the tile scrolls into view.
  useEffect(() => {
    const el = box.current;
    if (!el || !("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Touch devices: no hover, so play whichever tiles are mostly on screen.
  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches || reducedMotion()) return;
    const el = box.current;
    const v = vid.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.6) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: [0, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const enter = () => {
    setCursor("Listen");
    const v = vid.current;
    if (!v || reducedMotion()) return;
    v.playbackRate = rate;
    v.muted = !soundOn;
    v.play().catch(() => {});
  };
  const leave = () => {
    setCursor(null);
    const v = vid.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <div
      ref={box}
      className="tile"
      style={{
        aspectRatio: item.ratio,
        flexGrow: 1 / ratioOf(item.ratio), // absorbs leftover column height proportionally
        background: grad(item.bg),
      }}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      {item.src ? (
        <video
          ref={vid}
          src={frame(item.src)}
          poster={item.poster || undefined}
          loop
          muted
          playsInline
          preload={near ? "auto" : "metadata"}
        />
      ) : (
        <span className="ph">Placeholder clip</span>
      )}
      <span className="tile-meta">
        <strong>{item.title}</strong>
        <em>
          {item.client}, {item.format}
        </em>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [soundOn, setSoundOn] = useState(false);
  const [filter, setFilter] = useState("All");
  const [cursorLabel, setCursorLabel] = useState(null);
  const cursor = useRef(null);
  const cols = useColumns();

  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const move = (e) => {
      if (cursor.current)
        cursor.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const setCursor = useCallback((l) => setCursorLabel(l), []);
  const columns = useMemo(
    () =>
      buildColumns(
        WORK.filter((w) => filter === "All" || w.world === filter),
        cols,
      ),
    [filter, cols],
  );

  return (
    <div className="home">
      <style>{CSS}</style>
      <div className="grain" aria-hidden="true" />
      <div
        ref={cursor}
        className={`cursor ${cursorLabel ? "show" : ""}`}
        aria-hidden="true"
      >
        <span>{cursorLabel}</span>
      </div>

      {/* <header className="nav">
        <Link to="/" className="logo">
          {CREATOR.first} {CREATOR.last}
        </Link>
        <nav aria-label="Main">
          <Link to="/work">Work</Link>
          <Link to="/about">About</Link>
          <Link to="/contact" className="nav-cta">
            Start a project
          </Link>
        </nav>
      </header> */}

      <Hero soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} />

      <section className="work" id="work">
        <div className="work-head">
          <h2>Selected work</h2>
          <div className="filters" role="group" aria-label="Filter by world">
            {["All", ...WORLDS].map((w) => (
              <button
                key={w}
                onClick={() => setFilter(w)}
                aria-pressed={filter === w}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="mosaic" style={{ "--cols": cols }}>
          {columns.map((col, ci) => (
            <div className="mosaic-col" key={ci}>
              {col.map((item) => (
                <Tile
                  key={item.slug}
                  item={item}
                  soundOn={soundOn}
                  setCursor={setCursor}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="brands" aria-label="Brands worked with">
        <div className="brands-track">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span key={i}>{b}</span>
          ))}
        </div>
      </section>

      <section className="about">
        <div className="about-vid">
          <img src="/Profile Photo.JPG" alt="Tinu" />
        </div>
        <div className="about-copy">
          <h2>I'm Tinu The Creator.</h2>
          <p>
            I'm a law graduate and a professional content creator. From
            lifestyle to beauty, fashion, food, social media management,
            consulting, and corporate videography, my mission remains the same:
            to offer scroll-stopping, top-tier content that converts.
          </p>
          <div className="links-container">
            <a
              href="https://www.tiktok.com/@tinu_thecreator"
              className="link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tiktok
            </a>
            <a
              href="https://www.instagram.com/tinu.baby_/"
              className="link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </div>
      </section>

      <section className="contact">
        <h2>Got a brand? Let&rsquo;s make it look irresistible.</h2>
        <a
          href="mailto:tinujacob24@gmail.com?subject=Let's%20collab"
          className="big-cta"
        >
          Tell me about it
        </a>
        <a href={`mailto:${CREATOR.email}`} className="mail">
          {CREATOR.email}
        </a>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..800&family=DM+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.home{
  --paper:#F3EEE6; --ink:#1B1612; --red:#D8321F; --muted:#6F655B;
  --serif:'Fraunces',Georgia,serif; --sans:'DM Sans',system-ui,sans-serif; --mono:'IBM Plex Mono',ui-monospace,monospace;
  background:var(--paper); color:var(--ink); font-family:var(--sans); line-height:1.55; overflow-x:clip;
}
.home *{ box-sizing:border-box; }
.home a{ color:inherit; text-decoration:none; }
.home h1,.home h2{ font-family:var(--serif); font-weight:500; margin:0; letter-spacing:-0.02em; }
.home :focus-visible{ outline:2px solid var(--red); outline-offset:3px; }

.grain{ position:fixed; inset:0; z-index:90; pointer-events:none; opacity:.07; mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }

.cursor{ position:fixed; top:0; left:0; z-index:100; pointer-events:none; }
.cursor span{ position:absolute; left:14px; top:14px; background:var(--red); color:#fff; font:500 12px var(--mono); padding:6px 10px; border-radius:99px; opacity:0; transform:scale(.6); transform-origin:left top; transition:opacity .15s, transform .15s; white-space:nowrap; }
.cursor.show span{ opacity:1; transform:scale(1); }
@media (hover:none){ .cursor{ display:none; } }

/* nav */
.nav{ position:fixed; top:0; left:0; right:0; z-index:60; display:flex; justify-content:space-between; align-items:center; padding:20px clamp(16px,3vw,40px); color:#fff; mix-blend-mode:difference; }
.nav .logo{ font:600 18px var(--serif); font-style:italic; }
.nav nav{ display:flex; gap:clamp(14px,2.5vw,32px); align-items:center; font-size:15px; }
.nav-cta{ border:1px solid currentColor; padding:8px 16px; border-radius:99px; }

/* hero */
.hero{ height:400vh; position:relative; padding: 0px}
.hero-stick{ position:sticky; top:0; height:100vh; height:100svh; overflow:hidden; color:#fff; background:#000; }
.hero-clip{ position:absolute; inset:0; }
.hero-clip video{ width:100%; height:100%; object-fit:cover; }
.hero-clip::after{ content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.45), transparent 45%, rgba(0,0,0,.25)); }
.ph{ position:absolute; left:50%; top:42%; transform:translateX(-50%); font:400 12px var(--mono); opacity:.7; text-align:center; padding:0 16px; z-index:1; }
.hero-top{ position:absolute; top:32px; left:clamp(16px,3vw,40px); right:clamp(16px,3vw,40px); display:flex; justify-content:space-between; align-items:center; z-index:3; font:400 13px var(--mono); }
.tc{ background:rgba(0,0,0,.45); padding:6px 10px; border-radius:4px; font-variant-numeric:tabular-nums; }
.hero-world{ font:italic 400 clamp(20px,2.4vw,30px) var(--serif); }
.sound{ font:500 13px var(--mono); color:#fff; background:transparent; border:1px solid rgba(255,255,255,.7); border-radius:99px; padding:7px 14px; cursor:pointer; }
.sound[aria-pressed="true"]{ background:var(--red); border-color:var(--red); }

.hero-name{ position:absolute; left:0; right:0; bottom:150px; z-index:2; display:flex; flex-direction:column; line-height:.76; font-weight:600; font-size:clamp(88px,25vw,240px); letter-spacing:-0.05em; padding-left:clamp(8px,2vw,28px); transform:translateY(17%); pointer-events:none; color:var(--paper-h,#F3EEE6); }
.hero-name span:last-child{ font-style:italic; font-weight:400; padding-left:.35em; }
.hero-foot{ position:absolute; left:clamp(16px,3vw,40px); right:clamp(16px,3vw,40px); bottom:calc(25vw * .46 + 8px); bottom:min(calc(25vw * .46 + 8px),180px); z-index:3; display:grid; grid-template-columns:minmax(0,320px) 1fr auto; gap:24px; align-items:end; font-size:15px; }
.hero-foot p{ margin:0; max-width:30ch; }
.hint{ font:400 12px var(--mono); opacity:.8; }
.playhead{ position:relative; display:flex; gap:4px; height:20px; align-items:center; }
.playhead i{ flex:1; height:2px; background:rgba(255,255,255,.35); }
.playhead i.on{ background:#fff; }
.playhead b{ position:absolute; top:0; width:2px; height:20px; background:var(--red); box-shadow:0 0 0 3px rgba(216,50,31,.25); }
@media (max-width:700px){
  .hero-foot{ grid-template-columns:1fr; bottom:32vw; gap:12px; }
  .hint{ display:none; }
}

/* work */
.work{ padding:clamp(64px,10vw,140px) clamp(16px,3vw,40px) 40px; }
.work-head{ display:flex; justify-content:space-between; align-items:end; gap:24px; flex-wrap:wrap; margin-bottom:32px; }
.work-head h2{ font-size:clamp(36px,6vw,84px); line-height:1; }
.filters{ display:flex; gap:8px; flex-wrap:wrap; }
.filters button{ font:500 15px var(--sans); color:var(--ink); background:transparent; border:1px solid color-mix(in srgb,var(--ink) 30%,transparent); border-radius:99px; padding:8px 16px; cursor:pointer; transition:background .15s,color .15s; }
.filters button:hover{ border-color:var(--ink); }
.filters button[aria-pressed="true"]{ background:var(--ink); color:var(--paper); border-color:var(--ink); }

/* mosaic: columns of stacked tiles, equal height, equal gaps */
.mosaic{ --gap:clamp(10px,1.5vw,20px); display:grid; grid-template-columns:repeat(var(--cols),minmax(0,1fr)); gap:var(--gap); }
.mosaic-col{ display:flex; flex-direction:column; gap:var(--gap); }
.tile{ position:relative; flex-shrink:0; overflow:hidden; display:block; border-radius:2px; color:#fff; width:100%; }
.tile video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.tile::after{ content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.6), transparent 50%); }
.tile-meta{ position:absolute; left:16px; right:16px; bottom:14px; z-index:2; display:flex; flex-direction:column; gap:2px; }
.tile-meta strong{ font:500 clamp(18px,2vw,26px) var(--serif); }
.tile-meta em{ font:400 13px var(--sans); font-style:normal; opacity:.85; }
.tile:hover .ph{ opacity:0; }
.work-note{ color:var(--muted); font-size:14px; max-width:60ch; margin:24px 0 0; }

/* brands */
.brands{ overflow:hidden; padding:28px 0; border-block:1px solid color-mix(in srgb,var(--ink) 18%,transparent); margin-top:56px; }
.brands-track{ display:flex; gap:56px; width:max-content; font:italic 400 clamp(22px,3vw,38px) var(--serif); animation:slide 40s linear infinite; }
@keyframes slide{ to{ transform:translateX(-50%); } }
@media (prefers-reduced-motion:reduce){ .brands-track{ animation:none; } }

/* about */
.about{ display:grid; grid-template-columns:minmax(0,380px) minmax(0,1fr); gap:clamp(24px,6vw,96px); padding:clamp(64px,10vw,140px) clamp(16px,3vw,40px); align-items:center; }
.about-vid{ position:relative; aspect-ratio:4/5; background:linear-gradient(160deg,#EBC1A6,#7C4A3A); border-radius:2px; transform:rotate(-1.5deg); box-shadow:0 0 0 10px var(--paper), 0 0 0 11px color-mix(in srgb,var(--ink) 20%,transparent); color:#fff; }
.about-vid img {
height:100%}
.about-copy h2{ font-size:clamp(32px,4.6vw,64px); line-height:1.05; max-width:16ch; }
.about-copy p{ max-width:52ch; font-size:18px; margin:24px 0; }
.about dl{ display:flex; gap:clamp(20px,4vw,56px); flex-wrap:wrap; margin:0 0 28px; }
.about dt{ font:400 12px var(--mono); color:var(--muted); }
.about dd{ margin:2px 0 0; font:500 22px var(--serif); }
.link{ border-bottom:2px solid var(--red); padding-bottom:2px; font-weight:500; }
@media (max-width:760px){ .about{ grid-template-columns:1fr; } .about-vid{ max-width:300px; } }
.links-container{display:flex;gap:2rem}

/* contact */
.contact{ background:var(--red); color:#FFF6EE; padding:clamp(72px,12vw,160px) clamp(16px,3vw,40px); text-align:left; }
.contact h2{ font-size:clamp(40px,8vw,128px); line-height:.95; max-width:14ch; }
.big-cta{ display:inline-block; margin-top:40px; background:#FFF6EE; color:var(--red)!important; font:600 20px var(--sans); padding:18px 32px; border-radius:99px; transition:transform .15s; }
.big-cta:hover{ transform:rotate(-2deg) scale(1.03); }
.mail{ display:block; margin-top:28px; font:400 15px var(--mono); opacity:.9; }
`;

/* ------------------------------------------------------------------ */
/*  DEPENDENCIES                                                       */
/*                                                                     */
/*  npm install react react-dom react-router                           */
/*  (no new packages were added for these changes)                     */
/*                                                                     */
/*  ENCODE YOUR VIDEOS FOR THE WEB (this matters more than any code):  */
/*                                                                     */
/*  Tile previews (small, fast, progressive):                          */
/*    ffmpeg -i in.mp4 -vf "scale=720:-2" -c:v libx264 -crf 28 \       */
/*      -preset slow -an -movflags +faststart out.mp4                  */
/*  (drop `-an` if a tile should keep its audio)                       */
/*                                                                     */
/*  Hero reel (landscape, 1080p):                                      */
/*    ffmpeg -i in.mp4 -vf "scale=1920:-2" -c:v libx264 -crf 25 \      */
/*      -preset slow -c:a aac -b:a 96k -movflags +faststart out.mp4    */
/*                                                                     */
/*  `-movflags +faststart` moves the metadata to the start of the      */
/*  file. Without it, the first-frame poster and play-while-loading    */
/*  can't work until the whole file has downloaded.                    */
/* ------------------------------------------------------------------ */
