/* Evolve_X — visual engine and small behaviours. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- */
  /* Mobile navigation                                                 */
  /* ---------------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Seeded randomness so every medallion is unique but repeatable     */
  /* ---------------------------------------------------------------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, list) { return list[Math.floor(r() * list.length)]; }

  var INKS = {
    silver: "#a9c6e8", aqua: "#46d3c8", leaf: "#5fd39c", gold: "#f2c451", pale: "#dcefe8"
  };

  /* Each band is a family of phase-shifted polar curves:
     r(t) = r0 + a1 sin(n1 t + ph) + a2 sin(n2 t + m ph)                */
  var PRESETS = {
    hero: {
      bands: [
        { r0: 150, a1: 13, n1: 12, a2: 3.2, n2: 36, m: -1, copies: 30, steps: 800, w: 0.6, alpha: 0.72, inks: ["silver", "aqua", "leaf", "silver"], spin: 0.010 },
        { r0: 106, a1: 19, n1: 8, a2: 5, n2: 24, m: 2, copies: 24, steps: 640, w: 0.64, alpha: 0.78, inks: ["aqua", "leaf", "gold", "aqua"], spin: -0.018 },
        { r0: 56, a1: 16, n1: 6, a2: 2, n2: 18, m: 1, copies: 16, steps: 400, w: 0.7, alpha: 0.85, inks: ["gold", "leaf", "gold"], spin: 0.03 }
      ],
      backing: false
    }
  };

  function generated(seed, opts) {
    var r = rng(seed * 7919 + 17);
    var outerN = pick(r, [9, 10, 11, 12, 13, 14, 15, 16]);
    var midN = pick(r, [5, 6, 7, 8, 9, 10]);
    var coreN = pick(r, [4, 5, 6, 7, 8]);
    var palettes = [
      ["silver", "aqua", "leaf", "silver"],
      ["aqua", "leaf", "gold", "aqua"],
      ["leaf", "gold", "aqua", "leaf"],
      ["gold", "leaf", "silver", "gold"]
    ];
    var p0 = Math.floor(r() * palettes.length);
    return {
      bands: [
        { r0: 150 + r() * 6, a1: 9 + r() * 8, n1: outerN, a2: 2 + r() * 3, n2: outerN * 3, m: pick(r, [-2, -1, 1, 2]), copies: 22, steps: 640, w: 0.7, alpha: 0.7, inks: palettes[p0], spin: 0.012 * (r() > .5 ? 1 : -1) },
        { r0: 98 + r() * 10, a1: 14 + r() * 10, n1: midN, a2: 3 + r() * 5, n2: midN * pick(r, [2, 3]), m: pick(r, [1, 2, 3]), copies: 18, steps: 520, w: 0.75, alpha: 0.8, inks: palettes[(p0 + 1) % palettes.length], spin: -0.02 },
        { r0: 46 + r() * 8, a1: 12 + r() * 8, n1: coreN, a2: r() * 3, n2: coreN * 2, m: 1, copies: 14, steps: 360, w: 0.8, alpha: 0.88, inks: palettes[(p0 + 2) % palettes.length], spin: 0.03 }
      ],
      backing: !!(opts && opts.backing)
    };
  }

  function specFor(el) {
    var key = el.getAttribute("data-medallion") || "hero";
    if (PRESETS[key]) return PRESETS[key];
    var seed = parseInt(key.replace(/\D/g, ""), 10) || 1;
    return generated(seed, { backing: el.hasAttribute("data-backing") });
  }

  /* Paint one band into its own offscreen canvas (device pixels). */
  function paintBand(size, band) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = size;
    var ctx = cv.getContext("2d");
    var scale = size / 440;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.translate(size / 2, size / 2);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = "lighter";
    var grad;
    if (ctx.createConicGradient) {
      grad = ctx.createConicGradient(-Math.PI / 2, 0, 0);
    } else {
      grad = ctx.createLinearGradient(-200, -200, 200, 200);
    }
    for (var s = 0; s < band.inks.length; s++) {
      grad.addColorStop(s / (band.inks.length - 1), INKS[band.inks[s]]);
    }
    ctx.strokeStyle = grad;
    ctx.globalAlpha = band.alpha;
    ctx.lineWidth = Math.max(0.35, (band.w * dpr) / scale) ;
    ctx.lineJoin = "round";
    for (var k = 0; k < band.copies; k++) {
      var ph = (TAU * k) / band.copies;
      ctx.beginPath();
      for (var i = 0; i <= band.steps; i++) {
        var t = (TAU * i) / band.steps;
        var rr = band.r0 + band.a1 * Math.sin(band.n1 * t + ph) + band.a2 * Math.sin(band.n2 * t + band.m * ph);
        var x = rr * Math.cos(t), y = rr * Math.sin(t);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    return cv;
  }

  function Medallion(el) {
    this.el = el;
    this.canvas = el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.spec = specFor(el);
    this.spins = el.hasAttribute("data-spin") && !reduceMotion;
    this.sweep = el.hasAttribute("data-sweep") && !reduceMotion;
    this.layers = null;
    this.size = 0;
    this.start = 0;
    this.visible = false;
  }
  Medallion.prototype.build = function () {
    var css = this.el.getBoundingClientRect().width;
    if (!css) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, this.spins ? 1.75 : 2);
    var size = Math.round(css * dpr);
    if (this.layers && Math.abs(size - this.size) < 8) return true;
    this.size = size;
    this.canvas.width = this.canvas.height = size;
    var self = this;
    this.layers = this.spec.bands.map(function (b) { return paintBand(size, b); });
    return true;
  };
  Medallion.prototype.draw = function (now) {
    var ctx = this.ctx, size = this.size, c = size / 2;
    if (!size) return;
    var elapsed = (now - this.start) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (this.spec.backing) {
      // A dark coin so the light reads on any background.
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath(); ctx.arc(c, c, c * 0.985, 0, TAU);
      ctx.fillStyle = "#06152b"; ctx.fill();
      ctx.lineWidth = Math.max(1, size / 260);
      ctx.strokeStyle = "rgba(234,242,245,.38)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(c, c, c * 0.905, 0, TAU);
      ctx.strokeStyle = "rgba(234,242,245,.16)"; ctx.stroke();
    }
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < this.layers.length; i++) {
      var band = this.spec.bands[i];
      var angle = this.spins ? elapsed * band.spin : 0;
      var progress = 1;
      if (this.sweep) {
        var delay = i * 0.32;
        var p = Math.min(1, Math.max(0, (elapsed - delay) / 1.9));
        progress = 1 - Math.pow(1 - p, 3);
      }
      if (progress <= 0) continue;
      ctx.save();
      ctx.translate(c, c);
      if (progress < 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, c, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
        ctx.closePath();
        ctx.clip();
      }
      ctx.rotate(angle);
      ctx.drawImage(this.layers[i], -c, -c);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  var medallions = [];
  var running = false;
  function frame(now) {
    var any = false;
    for (var i = 0; i < medallions.length; i++) {
      var m = medallions[i];
      if (!m.visible || !m.layers) continue;
      var animating = m.spins || (m.sweep && (now - m.start) < 3200);
      if (animating) { m.draw(now); any = true; }
    }
    if (any && !document.hidden) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  var medEls = document.querySelectorAll(".medallion[data-medallion]");
  if (medEls.length) {
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var m = en.target.__med;
        if (!m) return;
        m.visible = en.isIntersecting;
        if (m.visible) {
          if (!m.layers) {
            if (!m.build()) return;
            m.start = performance.now();
          }
          m.draw(performance.now());
          kick();
        }
      });
    }, { rootMargin: "120px" }) : null;

    Array.prototype.forEach.call(medEls, function (el) {
      var m = new Medallion(el);
      el.__med = m;
      medallions.push(m);
      if (io) io.observe(el); else { m.visible = true; m.build(); m.start = performance.now(); m.draw(m.start); }
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        medallions.forEach(function (m) { if (m.layers && m.build()) m.draw(performance.now()); });
        kick();
      }, 180);
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
  }

  /* ---------------------------------------------------------------- */
  /* Wave fields: banknote background lines                            */
  /* ---------------------------------------------------------------- */
  var NS = "http://www.w3.org/2000/svg";
  Array.prototype.forEach.call(document.querySelectorAll(".wavefield"), function (box, idx) {
    var lines = parseInt(box.getAttribute("data-lines"), 10) || 34;
    var W = 1440, H = 300;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    var gid = "wf-" + idx;
    var defs = document.createElementNS(NS, "defs");
    defs.innerHTML = '<linearGradient id="' + gid + '" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" stop-color="#46d3c8"/><stop offset=".5" stop-color="#5fd39c"/><stop offset="1" stop-color="#f2c451"/></linearGradient>';
    svg.appendChild(defs);
    var r = rng(idx * 31 + 7);
    var f1 = 0.004 + r() * 0.002, f2 = 0.011 + r() * 0.004;
    var flip = box.hasAttribute("data-flip");
    for (var i = 0; i < lines; i++) {
      var base = (H / (lines + 2)) * (i + 1.5);
      var amp1 = 14 + 10 * Math.sin(i * 0.21);
      var d = "";
      for (var x = 0; x <= W; x += 10) {
        var y = base + amp1 * Math.sin(x * f1 + i * 0.32) + 4 * Math.sin(x * f2 - i * 0.18);
        d += (x === 0 ? "M" : "L") + x + " " + y.toFixed(1);
      }
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("stroke", "url(#" + gid + ")");
      var depth = flip ? (1 - i / lines) : (i / lines);
      p.setAttribute("stroke-opacity", (0.03 + 0.26 * depth).toFixed(3));
      svg.appendChild(p);
    }
    box.appendChild(svg);
  });

  /* ---------------------------------------------------------------- */
  /* Flywheel: stop the travelling light if motion is reduced          */
  /* ---------------------------------------------------------------- */
  if (reduceMotion) {
    Array.prototype.forEach.call(document.querySelectorAll(".flywheel animateMotion"), function (a) {
      var g = a.parentNode;
      g.removeChild(a);
      g.setAttribute("transform", "translate(220 70)");
    });
  }

  /* ---------------------------------------------------------------- */
  /* Texas: light the chapters in rollout order when the map is seen   */
  /* ---------------------------------------------------------------- */
  var tx = document.querySelector(".texas");
  if (tx) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      tx.classList.add("lit");
    } else {
      var txo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { tx.classList.add("lit"); txo.disconnect(); }
        });
      }, { threshold: 0.35 });
      txo.observe(tx);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Chapter economics calculator                                      */
  /* ---------------------------------------------------------------- */
  var calc = document.getElementById("calc");
  if (calc) {
    var fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    var fmt2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

    Array.prototype.forEach.call(calc.querySelectorAll(".field"), function (f) {
      var box = f.querySelector('input[type="number"]');
      var slider = f.querySelector('input[type="range"]');
      if (!box || !slider) return;
      slider.addEventListener("input", function () { box.value = slider.value; update(); });
      box.addEventListener("input", function () { slider.value = box.value; update(); });
    });

    function v(id) {
      var n = parseFloat(document.getElementById(id).value);
      return isFinite(n) ? n : 0;
    }
    function set(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function update() {
      var members = v("members"), plan = v("plan"), biz = v("biz"), bizPlan = v("bizplan");
      var other = v("other"), staff = v("staff"), pay = v("pay"), compute = v("compute");
      var facility = v("facility"), dues = v("dues") / 100, reserve = v("reserve") / 100;
      var cashShare = Math.max(20, Math.min(100, v("cash"))) / 100, chapters = Math.max(1, v("chapters"));

      var personal = members * plan * 12;
      var business = biz * bizPlan * 12;
      var revenue = personal + business + other;
      var duesCost = revenue * dues;
      var wages = staff * pay;
      var costs = wages + compute + facility + duesCost;
      var surplus = revenue - costs;

      set("r-revenue", fmt.format(revenue));
      set("r-wages", fmt.format(wages));
      set("r-other-costs", fmt.format(compute + facility));
      set("r-dues", fmt.format(duesCost));
      set("r-surplus", fmt.format(surplus));

      var warn = document.getElementById("r-warn");
      var good = document.getElementById("r-good");
      if (surplus <= 0) {
        warn.hidden = false;
        good.hidden = true;
        set("r-warn-text", "At these assumptions the chapter runs a deficit of " + fmt.format(-surplus) +
          " a year, so there is no patronage to return. Add members or business clients, adjust prices, or lower costs.");
        ["r-reserve", "r-pool", "r-member-cash", "r-member-acct", "r-biz-cash", "r-biz-acct",
         "r-scale-pool", "r-scale-dues"].forEach(function (id) { set(id, fmt.format(0)); });
        set("r-rate", "$0.00");
      } else {
        warn.hidden = true;
        good.hidden = false;
        var reserveAmt = surplus * reserve;
        var pool = surplus - reserveAmt;
        var patronBase = personal + business;
        var rate = patronBase > 0 ? pool / patronBase : 0;
        var memberBack = plan * 12 * rate;
        var bizBack = bizPlan * 12 * rate;
        set("r-reserve", fmt.format(reserveAmt));
        set("r-pool", fmt.format(pool));
        set("r-rate", fmt2.format(rate * 100));
        set("r-member-cash", fmt2.format(memberBack * cashShare));
        set("r-member-acct", fmt2.format(memberBack * (1 - cashShare)));
        set("r-biz-cash", fmt.format(bizBack * cashShare));
        set("r-biz-acct", fmt.format(bizBack * (1 - cashShare)));
        set("r-scale-pool", fmt.format(pool * chapters));
        set("r-scale-dues", fmt.format(duesCost * chapters));
      }
      set("r-scale-members", num.format(members * chapters));
      set("r-scale-jobs", num.format(staff * chapters));
      set("r-chapters", num.format(chapters));
    }

    var reset = document.getElementById("calc-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        Array.prototype.forEach.call(calc.querySelectorAll("input"), function (el) { el.value = el.defaultValue; });
        update();
      });
    }
    update();
  }
})();
