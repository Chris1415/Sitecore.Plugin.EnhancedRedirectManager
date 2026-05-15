/* ============================================================================
 * script.js — PRD-002 V4 refined POC interactions
 *
 * Discipline: minimal, vanilla, no frameworks. Every animation respects
 * prefers-reduced-motion. Easing: cubic-bezier(0.16, 1, 0.3, 1) for motion;
 * easeOutCubic for numeric counters.
 *
 * Modules:
 *   1. Kinetic letter reveal on [data-letter-reveal] (hero headlines)
 *   2. Count-up on [data-count] (stat tiles, hero stats, hero count header)
 *   3. Bar-fill on [data-bar-fill] (Dashboard top destinations)
 *   4. Plume backdrop is pure CSS — no JS arming needed
 *   5. Sonner-style toast helper (window.elevToast) for decorative hero CTAs
 *   6. Multi-match dropdown interactive (chip-or-dropdown commitment: dropdown)
 * ============================================================================ */

(function () {
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ---- 1. Kinetic letter reveal on hero headlines ----------------------
  function wrapForLetterReveal() {
    var targets = document.querySelectorAll("[data-letter-reveal]");
    targets.forEach(function (node) {
      if (node.dataset.letterRevealApplied === "true") return;
      var text = node.textContent;
      node.textContent = "";
      Array.from(text).forEach(function (ch, i) {
        var span = document.createElement("span");
        span.className = "letter";
        span.style.transitionDelay = i * 28 + "ms";
        span.textContent = ch === " " ? "\u00A0" : ch;
        node.appendChild(span);
      });
      node.dataset.letterRevealApplied = "true";
      // Trigger reveal
      requestAnimationFrame(function () {
        node.querySelectorAll(".letter").forEach(function (l) {
          l.style.opacity = "1";
          l.style.transform = "translateY(0)";
        });
      });
    });
  }

  // ---- 2. Count-up animation for [data-count] --------------------------
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function countUp(node) {
    var end = Number(node.dataset.count || node.textContent || "0");
    var duration = Number(node.dataset.duration || 1400);
    if (prefersReducedMotion) {
      node.textContent = end.toLocaleString("en-US");
      return;
    }
    var start = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = easeOutCubic(t);
      var value = Math.round(end * eased);
      node.textContent = value.toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- Generic arming helper ------------------------------------------
  function arm(target, fn) {
    if (!("IntersectionObserver" in window)) {
      fn(target);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            fn(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(target);
  }

  // ---- 3. Bar-fill on Dashboard top destinations ----------------------
  function armBars() {
    document.querySelectorAll("[data-bar-fill]").forEach(function (el) {
      arm(el, function (node) {
        var target = node.dataset.barFill;
        if (prefersReducedMotion) {
          node.style.width = target + "%";
          return;
        }
        requestAnimationFrame(function () {
          node.style.width = target + "%";
        });
      });
    });
  }

  // ---- 5. Sonner-style toast helper ----------------------------------
  function ensureToastRegion() {
    var region = document.getElementById("elev-toast-region");
    if (region) return region;
    region = document.createElement("div");
    region.id = "elev-toast-region";
    region.className = "elev-toast-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
    return region;
  }
  window.elevToast = function (copy) {
    var region = ensureToastRegion();
    var toast = document.createElement("div");
    toast.className = "elev-toast";
    toast.setAttribute("role", "status");
    var glyph = document.createElement("span");
    glyph.className = "elev-toast__glyph glyph";
    // monochrome info glyph (inline SVG; respects currentColor — never an emoji)
    glyph.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/>' +
      '<path d="M12 8h.01M11 12h1v5h1"/>' +
      "</svg>";
    var body = document.createElement("span");
    body.className = "elev-toast__copy";
    body.textContent = copy;
    toast.appendChild(glyph);
    toast.appendChild(body);
    region.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("elev-toast--visible");
    });
    setTimeout(function () {
      toast.classList.remove("elev-toast--visible");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 4500);
  };

  // ---- 6. Multi-match dropdown re-bind ---------------------------------
  function armMultiMatchDropdown() {
    var dd = document.querySelector("[data-multi-match-dropdown]");
    if (!dd) return;
    var typeDisplay = document.querySelector("[data-multi-match-type]");
    var hintNode = document.querySelector("[data-multi-match-hint]");
    dd.addEventListener("change", function (e) {
      var opt = e.target.options[e.target.selectedIndex];
      var newType = opt.dataset.redirectType;
      var newMapName = opt.dataset.mapName;
      if (typeDisplay) typeDisplay.value = newType;
      if (hintNode) {
        hintNode.textContent = "Uses " + newMapName + "'s redirect type";
      }
    });
  }

  // ---- 7. Decorative hero CTAs ----------------------------------------
  function armDecorativeCtas() {
    var ctas = document.querySelectorAll("[data-decorative-cta]");
    ctas.forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        var copy = btn.dataset.toastCopy ||
          "Coming in a follow-on release.";
        window.elevToast(copy);
      });
    });
  }

  // ---- 8. Quick form submit (POC stub — fires success toast) -----------
  function armQuickForm() {
    var form = document.querySelector("[data-quick-form]");
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var copy = form.dataset.toastCopy || "Redirect added.";
      window.elevToast(copy);
    });
  }

  // ---- Init ------------------------------------------------------------
  function init() {
    if (!prefersReducedMotion) wrapForLetterReveal();
    document.querySelectorAll("[data-count]").forEach(function (el) {
      arm(el, countUp);
    });
    armBars();
    armMultiMatchDropdown();
    armDecorativeCtas();
    armQuickForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
