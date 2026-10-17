/**
 * PropertyDesk presentations — count-up number animation.
 * Marks: class "countup" and/or [data-count]
 * Triggers: CountUp.play(root) when a slide becomes active / reveals.
 */
(function (global) {
  "use strict";

  const reduceMotion = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function normalizeMinus(s) {
    return String(s).replace(/[−–—]/g, "-");
  }

  /**
   * Parse display strings like:
   *  "4.520.000 €", "1.340.000", "−50%", "30", "50%", "12"
   * Skip non-countables (dates "01.09", "01.09.2026").
   */
  function parseCountText(raw) {
    const text = normalizeMinus(String(raw || "").trim());
    if (!text) return null;

    // Skip date-like values: 01.09 / 01.09.2026 / 1.9.2026
    if (/^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/.test(text)) return null;
    // Skip codes / short dotted labels that aren't money
    if (/^[A-Z]{2,}/.test(text)) return null;

    const m = text.match(/^([^0-9\-+]*?)(-?)(\d[\d.,\s]*)(.*)$/);
    if (!m) return null;

    const prefix = m[1] || "";
    const sign = m[2] || "";
    const numPart = m[3].replace(/\s/g, "");
    const suffixFull = (m[4] || "").trim();
    // Keep only a trailing unit for animation (% / €); drop trailing words like "early"
    const unitMatch = suffixFull.match(/^([%€])\b/);
    let suffix = unitMatch ? unitMatch[1] : suffixFull.split(/\s+/)[0] || "";
    if (suffix && !/^[%€]/.test(suffix) && !/^\w{1,4}$/.test(suffix)) {
      suffix = "";
    }
    if (suffix && !/^[%€]/.test(suffix) && /[a-zA-Zčćžšđ]/i.test(suffix)) {
      // words like "early" / "dana" are not units
      suffix = unitMatch ? unitMatch[1] : "";
    }

    let value;
    let decimals = 0;
    let style; // "eu-int" | "eu-dec" | "plain"

    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(numPart)) {
      // 4.520.000 or 4.520.000,50
      const parts = numPart.split(",");
      value = parseFloat(parts[0].replace(/\./g, ""));
      if (parts[1]) {
        decimals = parts[1].length;
        value += parseFloat("0." + parts[1]);
        style = "eu-dec";
      } else {
        style = "eu-int";
      }
    } else if (/^\d+,\d+$/.test(numPart)) {
      const p = numPart.split(",");
      value = parseFloat(p[0] + "." + p[1]);
      decimals = p[1].length;
      style = "eu-dec";
    } else if (/^\d+(\.\d+)?$/.test(numPart)) {
      value = parseFloat(numPart);
      decimals = numPart.includes(".") ? numPart.split(".")[1].length : 0;
      style = "plain";
    } else {
      return null;
    }

    if (!isFinite(value)) return null;
    if (sign === "-") value = -value;

    // Skip tiny non-meaningful or huge weirdness
    if (Math.abs(value) > 1e12) return null;

    return {
      original: text,
      prefix: prefix,
      suffix: suffix ? (suffix.charAt(0) === " " ? suffix : " " + suffix) : "",
      suffixRaw: suffix,
      value: value,
      decimals: decimals,
      style: style,
    };
  }

  function formatEuInt(n) {
    const neg = n < 0;
    const s = Math.round(Math.abs(n)).toString();
    const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "−" : "") + out;
  }

  function formatEuDec(n, decimals) {
    const neg = n < 0;
    const abs = Math.abs(n);
    const fixed = abs.toFixed(decimals);
    const parts = fixed.split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "−" : "") + intPart + "," + parts[1];
  }

  function formatPlain(n, decimals) {
    const neg = n < 0;
    const abs = Math.abs(n);
    const body = decimals > 0 ? abs.toFixed(decimals) : String(Math.round(abs));
    return (neg ? "−" : "") + body;
  }

  function formatParsed(parsed, current) {
    let body;
    if (parsed.style === "eu-int") body = formatEuInt(current);
    else if (parsed.style === "eu-dec") body = formatEuDec(current, parsed.decimals);
    else body = formatPlain(current, parsed.decimals);

    let suffix = parsed.suffixRaw
      ? parsed.suffixRaw.match(/^[€%]/)
        ? " " + parsed.suffixRaw
        : parsed.suffixRaw.charAt(0) === " "
          ? parsed.suffixRaw
          : " " + parsed.suffixRaw
      : "";
    // Keep tight suffix for % (no space) if original had no space
    if (
      parsed.suffixRaw === "%" &&
      !/\s%$/.test(parsed.original) &&
      !parsed.original.includes(" %")
    ) {
      suffix = "%";
    } else if (parsed.suffixRaw === "%" && parsed.original.includes(" %")) {
      suffix = " %";
    } else if (parsed.suffixRaw === "€") {
      suffix = parsed.original.includes(" €") ? " €" : "€";
    }

    return parsed.prefix + body + suffix;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function prepare(el) {
    if (el.dataset.countReady === "1") return el._countParsed || null;
    const source = el.getAttribute("data-count") || el.textContent;
    const parsed = parseCountText(source);
    if (!parsed) {
      el.dataset.countReady = "0";
      return null;
    }
    if (!el.getAttribute("data-count")) {
      el.setAttribute("data-count", parsed.original);
    }
    el._countParsed = parsed;
    el.dataset.countReady = "1";
    el.textContent = formatParsed(parsed, 0);
    return parsed;
  }

  function animateEl(el, duration) {
    const parsed = prepare(el);
    if (!parsed) return;

    if (reduceMotion) {
      el.textContent = formatParsed(parsed, parsed.value);
      return;
    }

    const from = 0;
    const to = parsed.value;
    let start = null;
    duration = duration || 900;

    if (el._countRaf) cancelAnimationFrame(el._countRaf);

    function frame(ts) {
      if (start == null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = easeOutCubic(t);
      const current = from + (to - from) * eased;
      el.textContent = formatParsed(parsed, current);
      if (t < 1) {
        el._countRaf = requestAnimationFrame(frame);
      } else {
        el.textContent = formatParsed(parsed, to);
        el._countRaf = null;
      }
    }

    el._countRaf = requestAnimationFrame(frame);
  }

  function collect(root) {
    if (!root) return [];
    const list = [];
    root.querySelectorAll(".countup, [data-count]").forEach(function (el) {
      list.push(el);
    });
    // Auto-detect common KPI / mega number nodes if not already marked
    root
      .querySelectorAll(
        ".cover-visual .row strong, .kpi-strip .n, .panel .mega, .stat .n, .big-number, .price-box .now",
      )
      .forEach(function (el) {
        if (list.indexOf(el) === -1) list.push(el);
      });
    return list.filter(function (el) {
      return !!prepare(el);
    });
  }

  function reset(root) {
    collect(root).forEach(function (el) {
      if (el._countRaf) cancelAnimationFrame(el._countRaf);
      el._countRaf = null;
      const parsed = el._countParsed;
      if (parsed) el.textContent = formatParsed(parsed, 0);
    });
  }

  function play(root, opts) {
    opts = opts || {};
    const els = collect(root);
    const baseDelay = opts.delay != null ? opts.delay : 120;
    const duration = opts.duration || 950;
    const stagger = opts.stagger != null ? opts.stagger : 90;

    els.forEach(function (el, i) {
      if (el._countRaf) cancelAnimationFrame(el._countRaf);
      const parsed = el._countParsed;
      if (parsed) el.textContent = formatParsed(parsed, 0);
      setTimeout(
        function () {
          animateEl(el, duration);
        },
        baseDelay + i * stagger,
      );
    });
  }

  global.CountUp = { play: play, reset: reset, collect: collect, prepare: prepare };
})(typeof window !== "undefined" ? window : this);
