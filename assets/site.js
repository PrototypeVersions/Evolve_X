/* Evolve_X — small, dependency-free behaviours */
(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
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

  /* ---------- Guilloché ownership seal ---------- */
  var seal = document.getElementById("seal-bands");
  if (seal) {
    var NS = "http://www.w3.org/2000/svg";
    function band(group, cls, copies, steps, radius, delay) {
      for (var k = 0; k < copies; k++) {
        var phase = (2 * Math.PI * k) / copies;
        var d = "";
        for (var i = 0; i <= steps; i++) {
          var t = (2 * Math.PI * i) / steps;
          var r = radius(t, phase);
          var x = (r * Math.cos(t)).toFixed(1);
          var y = (r * Math.sin(t)).toFixed(1);
          d += (i === 0 ? "M" : "L") + x + " " + y;
        }
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d + "Z");
        p.setAttribute("pathLength", "1");
        p.setAttribute("class", cls + " draw");
        p.setAttribute("fill", "none");
        p.setAttribute("stroke-width", cls === "band-a" ? "0.55" : "0.7");
        p.style.animationDelay = (delay + k * 0.02).toFixed(2) + "s";
        group.appendChild(p);
      }
    }
    // Outer woven band: many hands, one ring.
    band(seal, "band-a", 22, 540, function (t, ph) {
      return 138 + 13 * Math.sin(12 * t + ph) + 3 * Math.sin(36 * t - ph);
    }, 0);
    // Middle band: the network.
    band(seal, "band-b", 16, 420, function (t, ph) {
      return 96 + 17 * Math.sin(8 * t + ph) + 5 * Math.sin(24 * t + 2 * ph);
    }, 0.35);
    // Core flower: the member.
    band(seal, "band-c", 10, 300, function (t, ph) {
      return 44 + 15 * Math.sin(6 * t + ph);
    }, 0.7);
  }

  /* ---------- Chapter economics calculator ---------- */
  var calc = document.getElementById("calc");
  if (calc) {
    var fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    var fmt2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

    // Keep each range slider and its number box in step.
    Array.prototype.forEach.call(calc.querySelectorAll(".field"), function (f) {
      var box = f.querySelector('input[type="number"]');
      var slider = f.querySelector('input[type="range"]');
      if (!box || !slider) return;
      slider.addEventListener("input", function () { box.value = slider.value; update(); });
      box.addEventListener("input", function () { slider.value = box.value; update(); });
    });

    function v(id) {
      var el = document.getElementById(id);
      var n = parseFloat(el.value);
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
        Array.prototype.forEach.call(calc.querySelectorAll("input"), function (el) {
          el.value = el.defaultValue;
        });
        update();
      });
    }
    update();
  }
})();
