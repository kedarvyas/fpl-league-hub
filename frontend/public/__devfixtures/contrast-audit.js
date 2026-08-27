/**
 * Contrast audit — paste into the DevTools console on any page of the app.
 *
 * Walks every element in <main> that owns a text node, composites the real
 * background stack (including alpha and inherited opacity), and reports
 * anything under WCAG AA: 4.5:1, or 3:1 for text >=24px or >=18.66px bold.
 * Then repeats for all six themes.
 *
 * Written because eyeballing a screenshot cannot tell a deliberate muted grey
 * from a dead Tailwind class name rendering as inherited --foreground, and
 * because --live / --warn / --destructive are tuned as fills and were being
 * used as text. Run it after any token change.
 *
 *   await contrastAudit()            // all six themes, current page
 *   await contrastAudit(['sage'])    // one theme
 *
 * It does NOT cover non-text contrast (WCAG 1.4.11) — tracks, hairlines and
 * chart fills are out of scope, and some are deliberately below 3:1.
 */
window.contrastAudit = async (themes = ['light', 'dark', 'sage', 'ocean', 'midnight', 'turf']) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // The app transitions every colour over 300ms, so a measurement taken right
  // after a theme switch reads a blend of the two themes. This is the single
  // easiest way to get wrong numbers out of this script.
  let noTransition = document.getElementById('__contrast-audit-no-transition');
  if (!noTransition) {
    noTransition = document.createElement('style');
    noTransition.id = '__contrast-audit-no-transition';
    noTransition.textContent = '*,*::before,*::after{transition:none !important}';
    document.head.appendChild(noTransition);
  }

  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const luminance = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // Walk up for the first opaque background, compositing translucent layers.
  const backgroundOf = (el) => {
    const stack = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; }
    }
    const rootColour = parse(getComputedStyle(document.documentElement).backgroundColor);
    let acc = rootColour && rootColour.a === 1 ? rootColour : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc);
    return acc;
  };

  const scan = () => {
    const failures = [];
    document.querySelectorAll('main *').forEach((el) => {
      const ownsText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!ownsText) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return;
      // WCAG 1.4.3 exempts decorative text and inactive controls.
      if (el.closest('[aria-hidden="true"]')) return;
      if (el.closest('[disabled], [aria-disabled="true"]')) return;
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const colour = parse(cs.color);
      if (!colour) return;

      const bg = backgroundOf(el);
      const fg = over({ ...colour, a: colour.a * Number(cs.opacity) }, bg);
      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const required = large ? 3 : 4.5;
      const measured = ratio(fg, bg);
      if (measured < required) {
        failures.push({
          ratio: +measured.toFixed(2),
          required,
          size,
          text: el.textContent.trim().slice(0, 40),
          className: el.className.toString().slice(0, 70),
        });
      }
    });
    return failures;
  };

  const startingTheme = document.documentElement.getAttribute('data-theme');
  const report = {};
  for (const theme of themes) {
    document.documentElement.setAttribute('data-theme', theme);
    await sleep(30);
    // Collapse identical class+ratio pairs so one repeated row isn't 15 lines.
    const unique = {};
    for (const f of scan()) {
      const key = `${f.className}@${f.ratio}`;
      unique[key] = unique[key] || { ...f, count: 0 };
      unique[key].count += 1;
    }
    const rows = Object.values(unique);
    if (rows.length) report[theme] = rows;
  }
  document.documentElement.setAttribute('data-theme', startingTheme || 'light');

  const total = Object.values(report).reduce((n, r) => n + r.length, 0);
  console.log(total === 0
    ? `contrast-audit: clean on ${location.pathname} across ${themes.length} themes`
    : `contrast-audit: ${total} distinct failure(s) on ${location.pathname}`);
  return report;
};
'contrastAudit() ready';
