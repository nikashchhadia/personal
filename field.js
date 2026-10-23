// Animated ASCII field drawn over the pastel blobs from style.css.
// Glyph density follows slow 3D value noise; the cursor stirs it up.
(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const RAMP = " .·-+=*#";
  const CELL = 13;           // px per glyph cell
  const FPS = 15;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  // Blob geometry mirrors the radial-gradients on <body> in style.css.
  // [cx, cy] are viewport fractions, [rx, ry] are rem, k is strength.
  const BLOBS = [
    { v: "--b1", cx: 0.08, cy: -0.04, rx: 40, ry: 26, k: 1 },
    { v: "--b2", cx: 0.52, cy: -0.08, rx: 36, ry: 24, k: 1 },
    { v: "--b3", cx: 0.96, cy: 0.02, rx: 40, ry: 28, k: 1 },
    { v: "--b4", cx: 0.80, cy: 1.00, rx: 44, ry: 30, k: 0.8 },
  ];

  // --- value noise -------------------------------------------------------
  const hash = (x, y, z) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
    return lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
      zf);
  }
  const fbm = (x, y, z) => 0.6 * noise(x, y, z) + 0.3 * noise(x * 2.1, y * 2.1, z * 1.7) + 0.1 * noise(x * 4.3, y * 4.3, z * 2.9);

  // --- colors ---------------------------------------------------------------
  const parse = (hex) => {
    hex = hex.trim().replace("#", "");
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  let dark = false, ink = [0, 0, 0], cells = [], cols = 0, rows = 0, dpr = 1, w = 0, h = 0;
  let content = { l: 0, r: 0 };

  function layout() {
    const css = getComputedStyle(document.documentElement);
    dark = css.colorScheme.includes("dark");
    ink = parse(css.getPropertyValue("--fg"));
    const blobs = BLOBS.map((b) => ({ ...b, c: parse(css.getPropertyValue(b.v)) }));
    const rem = parseFloat(css.fontSize) || 16;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth || window.innerWidth; h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${CELL - 2}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    const page = document.querySelector(".page").getBoundingClientRect();
    content = { l: page.left + 16, r: page.right - 16 };

    cols = Math.ceil(w / CELL); rows = Math.ceil(h / CELL);
    cells = new Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * CELL + CELL / 2, y = j * CELL + CELL / 2;
        let wsum = 0, r = 0, g = 0, b = 0;
        for (const bl of blobs) {
          const dx = (x - bl.cx * w) / (bl.rx * rem), dy = (y - bl.cy * h) / (bl.ry * rem);
          const wt = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 0.85) * bl.k;
          wsum += wt; r += bl.c[0] * wt; g += bl.c[1] * wt; b += bl.c[2] * wt;
        }
        // Glyph tint: the local blob color pushed toward the ink color for contrast.
        // Light: push the pastel away from white (more saturated). Dark: brighten the deep tone.
        const base = wsum > 0.02 ? [r / wsum, g / wsum, b / wsum] : null;
        const col = base
          ? base.map((v) => Math.round(Math.max(0, Math.min(255, dark ? v * 2.4 + 20 : 255 - (255 - v) * 3))))
          : ink;
        // Quieter behind the text column.
        const inCol = x > content.l && x < content.r ? 0.45 : 1;
        cells[j * cols + i] = { x, y, s: `rgb(${col.join(",")})`, a: (0.1 + Math.min(wsum, 1.2) * 0.75) * inCol };
      }
    }
  }

  // --- pointer --------------------------------------------------------------
  const ptr = { x: -9999, y: -9999, e: 0 };
  window.addEventListener("pointermove", (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.e = 1; }, { passive: true });
  document.addEventListener("pointerleave", () => { ptr.e = 0; });

  // --- draw -----------------------------------------------------------------
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const z = t * 0.00012;
    const R = 140;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const c = cells[j * cols + i];
        let v = fbm(i * 0.075, j * 0.11, z) * 1.3 - 0.18;
        if (ptr.e) {
          const dx = c.x - ptr.x, dy = c.y - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R * 4) v += 0.55 * Math.exp(-d2 / (R * R)) * (0.75 + 0.25 * Math.sin(t * 0.004 - Math.sqrt(d2) * 0.06));
        }
        if (v <= 0.08) continue;
        const idx = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
        if (idx <= 0) continue;
        ctx.globalAlpha = Math.min(1, c.a * (0.35 + v * 0.65)) * (dark ? 0.8 : 0.9);
        ctx.fillStyle = c.s;
        ctx.fillText(RAMP[idx], c.x, c.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  let last = 0, raf = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 1000 / FPS) return;
    last = t; draw(t);
  }
  function start() {
    cancelAnimationFrame(raf);
    layout();
    if (reduced.matches) draw(0);
    else raf = requestAnimationFrame(loop);
  }

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(start, 150); });
  document.addEventListener("visibilitychange", () => (document.hidden ? cancelAnimationFrame(raf) : start()));
  reduced.addEventListener?.("change", start);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", start);
  // main.js fires this after a manual theme toggle.
  window.addEventListener("themechange", start);
  document.fonts?.ready.then(start);
  start();
})();
