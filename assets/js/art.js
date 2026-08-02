/**
 * Card artwork, computed from the title. No image files anywhere in this repo.
 *
 * The title hashes to a seed; the seed picks hue and pattern. Same title, same
 * picture, every build - so a page added tomorrow gets its own artwork without
 * anyone drawing one. The four-character code on the card is that seed.
 *
 * The tile always renders on a dark ground regardless of the reader's theme:
 * it is a picture, not part of the surrounding surface.
 */

(function () {
  "use strict";

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function paint(canvas) {
    const seed = hash(canvas.dataset.seed || "");
    const r = rng(seed);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 180;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const c = canvas.getContext("2d");
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const hue = Math.floor(r() * 360);
    const hue2 = (hue + 40 + Math.floor(r() * 90)) % 360;
    const style = seed % 3;

    c.fillStyle = "#070910";
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";

    if (style === 0) {
      const a = 0.6 + r() * 1.8;
      const b = 0.5 + r() * 1.6;
      const phase = r() * Math.PI * 2;
      for (let i = 0; i < 160; i++) {
        let x = r() * w;
        let y = r() * h;
        c.strokeStyle = "hsla(" + (r() < 0.5 ? hue : hue2) + ", 62%, 60%, 0.16)";
        c.lineWidth = 0.6 + r() * 1.1;
        c.beginPath();
        c.moveTo(x, y);
        for (let s = 0; s < 24; s++) {
          const ang =
            Math.sin(x / (w / a) + phase) * Math.PI + Math.cos(y / (h / b)) * Math.PI;
          x += Math.cos(ang) * 3.2;
          y += Math.sin(ang) * 3.2;
          c.lineTo(x, y);
        }
        c.stroke();
      }
    } else if (style === 1) {
      const cx = w * (0.25 + r() * 0.5);
      const cy = h * (0.25 + r() * 0.5);
      const step = 3 + r() * 4;
      for (let rad = 2; rad < Math.max(w, h) * 1.2; rad += step) {
        const hu = rad % (step * 6) < step * 3 ? hue : hue2;
        c.strokeStyle = "hsla(" + hu + ", 58%, 62%, " + (0.05 + 0.12 * r()) + ")";
        c.lineWidth = 0.7 + r() * 1.4;
        c.beginPath();
        c.arc(cx + Math.sin(rad / 22) * 9, cy + Math.cos(rad / 17) * 9, rad, 0, Math.PI * 2);
        c.stroke();
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const cx = r() * w;
        const cy = r() * h;
        const rad = (0.18 + r() * 0.45) * Math.max(w, h);
        const hu = r() < 0.5 ? hue : hue2;
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, "hsla(" + hu + ", 66%, 58%, 0.30)");
        g.addColorStop(1, "hsla(" + hu + ", 66%, 58%, 0)");
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }
      c.globalCompositeOperation = "source-over";
      for (let i = 0; i < 55; i++) {
        c.fillStyle = "hsla(" + hue2 + ", 70%, 78%, " + (0.05 + r() * 0.2) + ")";
        c.fillRect(r() * w, r() * h, 1.2, 1.2);
      }
    }

    c.globalCompositeOperation = "source-over";
  }

  const canvases = Array.prototype.slice.call(document.querySelectorAll(".thumb canvas"));
  if (canvases.length === 0) return;

  if (typeof IntersectionObserver === "undefined") {
    canvases.forEach(paint);
  } else {
    const io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          paint(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "250px" }
    );
    canvases.forEach(function (cv) {
      io.observe(cv);
    });
  }

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      canvases.forEach(function (cv) {
        if (cv.width) paint(cv);
      });
    }, 200);
  });
})();
