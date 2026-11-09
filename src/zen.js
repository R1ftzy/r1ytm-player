  /* ---------- zen mode (sidebar entry "Zen") ---------- */
  // A black title-card screen that locks the music for a time picked before entering: the only controls are play /
  // pause, next (to skip a bad pick by YTM), a sleep timer and a close button that stays locked until the time is up. Everything behind it is inert,
  // YTM's hotkeys and the media keys for next / previous / seek are blocked. The end time is saved, so a reload goes
  // straight back into zen until it's over. "No limit" runs until closed, with close available from the start.
  // Power: while zen is up the page behind it isn't rendered at all (content-visibility), r1ytm's main loop pauses, the
  // zen clock ticks once a second, and a playing music video drops to its lowest picture quality (audio is untouched).
  // The Zen group in the settings picks the layout, the two fonts, which parts show, and up to two lines of lyrics
  // (read from the Better Lyrics extension when it is installed). They apply the next time zen opens.
  const P_ZEN = 'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 14v-2c-2.24 0-4.16-.96-5.6-2.68l-1.34-1.6A1.98 1.98 0 0 0 12.53 9h-1.05c-.59 0-1.15.26-1.53.71l-1.34 1.6C7.16 13.04 5.24 14 3 14v2c2.77 0 5.19-1.17 7-3.25V15l-3.88 1.55c-.67.27-1.12.93-1.12 1.66C5 19.2 5.8 20 6.79 20H9v-.5a2.5 2.5 0 0 1 2.5-2.5h3c.28 0 .5.22.5.5s-.22.5-.5.5h-3c-.83 0-1.5.67-1.5 1.5v.5h7.21c.99 0 1.79-.8 1.79-1.79 0-.73-.45-1.39-1.12-1.66L14 15v-2.25c1.81 2.08 4.23 3.25 7 3.25z';
  const ZEN_KEY = 'am-zen';                      // { until, start } (epoch ms) while a zen session runs; until 0 = no limit
  const ZEN_MIN_KEY = 'am-zen-mins';             // last picked length in minutes; 0 = no limit
  const ZEN_PRESETS = [15, 30, 45, 60];
  const ZEN_MAX_MIN = 600;
  const SLEEP_STEPS = [0, 15, 30, 45, 60, 90, 'end'];    // minutes; 'end' = pause when this song ends
  const ZEN_FADE_MS = 450;                       // fade to black; the text then cuts in hard, like a title card
  const ZEN_BLOCKED_ACTIONS = ['previoustrack', 'seekto', 'seekbackward', 'seekforward'];   // next stays allowed

  GUIDE.unshift({ label: 'Zen', tip: 'Zen mode: lock the music for a while', icon: P_ZEN, open: () => openZen() });

  /* fonts: a tall, tight, high-contrast heavy serif and a condensed bold grotesque. The condensed (wdth axis) serif is
     tried first, with a hairline stroke to thicken its thin strokes a little; if only a normal-width serif loads, the
     serif lines are squeezed with scaleX instead (--am-zsx). */
  const zenFontStyle = el('style');
  let zenFonts = null;
  const loadZenFonts = () => zenFonts || (zenFonts = (async () => {
    const get = async q => {
      try { const r = await fetch(`https://fonts.googleapis.com/css2?family=${q}&display=block`); return r.ok ? r.text() : null; }
      catch { return null; }
    };
    let css = '', serif = null, sx = .66, stroke = 0, wght = 800;
    for (const [q, fam, s, st, w] of [['Noto+Serif+Display:wdth,wght@62.5,900', 'Noto Serif Display', .92, .018, 900],
                                      ['Noto+Serif:wdth,wght@62.5,800', 'Noto Serif', .9, 0, 800],
                                      ['Noto+Serif:wght@800', 'Noto Serif', .66, 0, 800]]) {
      const t = await get(q);
      if (t) { css += t; serif = fam; sx = s; stroke = st; wght = w; break; }
    }
    let sans = null;
    for (const [q, fam] of [['Archivo:wdth,wght@62..125,700', 'Archivo'], ['Roboto+Condensed:wght@700', 'Roboto Condensed']]) {
      const t = await get(q);
      if (t) { css += t; sans = fam; break; }
    }
    zenFontStyle.textContent = css;
    document.head.append(zenFontStyle);
    html.style.setProperty('--am-zserif', `${serif ? `"${serif}", ` : ''}"Times New Roman", Times, serif`);
    html.style.setProperty('--am-zsans', `${sans ? `"${sans}", ` : ''}"Roboto Condensed", "Arial Narrow", Arial, sans-serif`);
    html.style.setProperty('--am-zsx', String(sx));
    html.style.setProperty('--am-zstroke', stroke + 'em');
    html.style.setProperty('--am-zwght', String(wght));
    try {
      await Promise.all([document.fonts.load(`${wght} 100px "${serif}"`), document.fonts.load(`700 100px "${sans}"`)]);
    } catch {}
  })());

  /* greeting (in place of a fixed header): good morning / afternoon / evening / night, with the account's first name
     when it can be found. The name comes from YTM's account menu (if it was opened) or its account switcher data, and
     is remembered. */
  const ZEN_NAME_KEY = 'am-zen-name';
  let zenName = store.get(ZEN_NAME_KEY, '');
  const firstName = s => (s || '').trim().replace(/^@/, '').split(/\s+/)[0] || '';
  const findZenName = async () => {
    const dom = document.querySelector('ytd-active-account-header-renderer #account-name, #account-name');
    let n = dom && dom.textContent.trim();
    if (!n) {
      try {
        const r = await fetch('/getAccountSwitcherEndpoint', { credentials: 'include' });
        if (r.ok) {
          const data = JSON.parse((await r.text()).replace(/^\)\]\}'\s*/, ''));
          const found = [];
          const walk = (o, d) => {
            if (!o || typeof o !== 'object' || d > 30) return;
            if (o.accountName && (o.accountName.simpleText || o.accountName.runs)) found.push(o);
            for (const k in o) walk(o[k], d + 1);
          };
          walk(data, 0);
          const pick = found.find(o => o.isSelected) || found[0];
          if (pick) n = pick.accountName.simpleText || pick.accountName.runs.map(x => x.text).join('');
        }
      } catch {}
    }
    n = firstName(n);
    if (n && n !== zenName) { zenName = n; store.set(ZEN_NAME_KEY, n); }
  };
  const greeting = () => {
    const h = new Date().getHours();
    const part = h >= 5 && h < 12 ? 'MORNING' : h >= 12 && h < 17 ? 'AFTERNOON' : h >= 17 && h < 22 ? 'EVENING' : 'NIGHT';
    const g = zenName ? [`GOOD ${part},`, zenName.toUpperCase()] : ['GOOD', part];
    g[g.length - 1] = endWith(g[g.length - 1], settings.zenHeadEnd);
    return g;
  };
  // the punctuation picked for a line in the settings (1 full stop, 2 comma), unless it already ends in some
  const endWith = (s, k) => !s || !k || /[.,!?…;:]$/.test(s) ? s : s + (k === 1 ? '.' : ',');
  const setHead = head => {
    const g = greeting(), key = g.join('\n');
    if (head.dataset.text === key) return false;
    head.dataset.text = key;
    head.replaceChildren();
    g.forEach(t => zline(head, 'am-zserif', t));
    return true;
  };

  /* state */
  let zenEl = null;              // the overlay (setup screen or session)
  let zenMode = null;            // 'setup' | 'on'
  let zenUntil = 0;              // session end (epoch ms); 0 = no limit (close is always available)
  let zenStart = 0;              // session start (epoch ms), for the count-up clock of a no-limit session
  let zenTick = 0;
  let zenShown = '';             // title + artist on screen now, to refit only when the song changes
  let sleepIdx = 0, sleepAt = 0, sleepTitle = '', sleepSkip = false;
  const inerted = new Set();     // page elements we made inert
  let zenUi = {};                // the live session elements

  const readZen = () => { try { return JSON.parse(store.get(ZEN_KEY, 'null')); } catch { return null; } };
  const zenMins = () => {
    const v = Math.round(Number(store.get(ZEN_MIN_KEY, 15)));
    return v === 0 ? 0 : clamp(v || 15, 1, ZEN_MAX_MIN);
  };
  const zenLocked = () => zenMode === 'on' && zenUntil > 0 && Date.now() < zenUntil;
  const fmtTime = ms => {
    const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    const pad = n => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // one line of title-card text: an inline-block span inside a nowrap line (the span is what gets squeezed)
  const zline = (parent, cls, text) => {
    const d = el('div', 'am-zl ' + cls, parent);
    const s = el('span', null, d);
    s.textContent = text;
    return s;
  };
  const zbtn = (parent, text, onClick, cls) => {
    const b = el('button', 'am-zbtn' + (cls ? ' ' + cls : ''), parent);
    b.textContent = text;
    b.addEventListener('click', e => { e.stopPropagation(); if (!b.disabled) onClick(b); });
    return b;
  };

  // words -> n lines of about the same length (greedy)
  const splitLines = (words, n) => {
    const total = words.join(' ').length, target = total / n, out = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (cur && out.length < n - 1 && next.length > target && Math.abs(next.length - target) > Math.abs(cur.length - target)) {
        out.push(cur); cur = w;
      } else cur = next;
    }
    out.push(cur);
    return out;
  };

  /* sizing: --zb is the base unit (about the size of a 10-letter title filling the width). The big lines are fitted to
     the width (never bigger than --zb, so a short title doesn't explode); a long title is split onto up to 3 lines when
     that makes it clearly bigger. The greeting is shrunk if a line would be wider than the card. If the whole card
     is too tall for the screen, everything shrinks and is fitted again. */
  const fitZen = () => {
    if (!zenEl) return;
    const c = zenEl.querySelector('.am-zc'), big = c && c.querySelector('.am-zbig'), head = c && c.querySelector('.am-zhead');
    if (!c || !big) return;
    // widescreen: title block top left over about two thirds of the width, the artist bottom right, empty space between
    // (like a 16:9 title card). Narrower screens (4:3, portrait): everything stacked and centered.
    const lay = settings.zenLayout;                    // 0 auto, 1 always wide, 2 always stacked
    const wide = lay === 1 || (lay !== 2 && innerWidth / innerHeight >= 1.45);
    zenEl.classList.toggle('am-zwide', wide);
    const sub = zenEl.querySelector('.am-zsub');
    if (sub && sub.parentNode !== (wide ? zenEl : c)) {
      if (wide) zenEl.append(sub);
      else c.insertBefore(sub, c.querySelector('.am-zclock'));      // back above the clock (null on the setup screen: last)
    }
    const subOn = !!sub && sub.getClientRects().length > 0;       // the artist can be hidden in the settings
    const lbox = zenUi.lyric && zenUi.lyric.parentNode === zenEl ? zenUi.lyric : null;   // under the title it's in the card
    const sx = parseFloat(getComputedStyle(zenEl).getPropertyValue('--zbx')) || .66;     // 1 when the title font isn't the serif
    const W = c.clientWidth, H = innerHeight;
    const widest = spans => Math.max(1, ...spans.map(s => s.offsetWidth * sx));
    let B = wide ? Math.min(W * .19, H * .21) : Math.min(W * .17, H * .19);
    for (let pass = 0; pass < 3; pass++) {
      zenEl.style.setProperty('--zb', B + 'px');
      if (head) {
        head.style.fontSize = '100px';
        head.style.fontSize = Math.min(B * .46, 100 * W / widest([...head.querySelectorAll('span')])) + 'px';
      }
      const words = (big.dataset.text || '').split(/\s+/).filter(Boolean);
      let best = null;
      for (let n = 1; n <= Math.min(3, Math.max(1, words.length)); n++) {
        const lines = splitLines(words.length ? words : [''], n);
        big.replaceChildren();
        big.style.fontSize = '100px';
        const spans = lines.map(t => zline(big, 'am-zserif', t));
        const size = Math.min(B, 100 * W / widest(spans));
        // one line unless it would be small; then more lines only when clearly bigger
        if (!best || size > best.size * 1.35) best = { lines, size };
        if (size >= B * (wide ? .8 : .6) || (n === 1 && lines[0].length <= 20)) break;   // short titles stay on one line
      }
      big.replaceChildren();
      best.lines.forEach(t => zline(big, 'am-zserif', t));
      big.style.fontSize = best.size + 'px';
      let ctlTop = zenUi.ctl ? zenUi.ctl.getBoundingClientRect().top : H;
      if (lbox) {
        // the lyric box (a fixed height, empty or not) sits just above the controls; the card stays above it, so a
        // new line never changes the size of the title. Widescreen: it stops short of the artist on the right.
        lbox.style.bottom = (H - ctlTop + Math.max(16, B * .22)) + 'px';
        lbox.style.right = '';
        if (wide && subOn) {
          const sr = sub.getBoundingClientRect();
          lbox.style.right = Math.max(0, innerWidth - sr.left + B * .3) + 'px';
        }
        ctlTop = lbox.getBoundingClientRect().top;
      }
      const h = c.offsetHeight;
      let room;
      if (wide) {
        // the block hangs from the top; it must stay above the controls, and above the artist where the two overlap
        const cr = c.getBoundingClientRect(), sr = subOn ? sub.getBoundingClientRect() : null;
        let bottom = ctlTop - 24;
        if (sr && sr.left < cr.right) bottom = Math.min(bottom, sr.top - B * .15);
        room = bottom - cr.top;
      } else {
        // the card is centered at 46% of the height: it must clear the top and stay above the controls
        room = Math.min(H * .92 - 32, (ctlTop - 24 - H * .46) * 2);
      }
      if (h <= room) break;
      B *= room / h * .98;
    }
  };

  /* the overlay */
  const zenShell = () => {
    const z = el('div', 'am-zen am-zen-black', document.body);
    z.classList.add('am-zbf-' + (['serif', 'sans', 'own'][settings.zenBigFont] || 'serif'),
                    'am-zsf-' + (['sans', 'serif', 'own'][settings.zenSmallFont] || 'sans'));
    z.tabIndex = -1;
    z.setAttribute('role', 'dialog');
    z.setAttribute('aria-modal', 'true');
    z.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
    return z;
  };
  // everything else on the page becomes inert (no clicks, no focus); re-checked every tick for new popups
  const inertPage = () => {
    for (const n of document.body.children) {
      if (n === zenEl || n.inert || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
      n.inert = true;
      inerted.add(n);
    }
  };
  const uninertPage = () => { for (const n of inerted) n.inert = false; inerted.clear(); };
  // show the card after the fade to black (hard cut in); from then on the page behind isn't rendered
  const cutIn = (z, delay) => setTimeout(() => {
    if (zenEl !== z) return;
    html.classList.add('am-zen-on');
    z.classList.remove('am-zen-black');
    fitZen();
  }, delay);

  const openZen = async () => {
    if (zenEl) return;
    closeMenu();
    closeSettings();
    zenMode = 'setup';
    zenUi = {};
    const z = zenEl = zenShell();
    inertPage();
    const c = el('div', 'am-zc', z);
    setHead(el('div', 'am-zhead', c));
    const big = el('div', 'am-zbig', c);
    big.dataset.text = 'ZEN MODE';

    const lockRow = el('div', 'am-zsans am-zlock', c);
    el('span', null, lockRow).textContent = 'LOCK:';
    const inp = el('input', 'am-zinp', lockRow);
    Object.assign(inp, { type: 'text', inputMode: 'numeric', maxLength: 3, value: String(zenMins()) });
    inp.setAttribute('aria-label', 'Minutes');
    const unit = el('span', 'am-zunit', lockRow);
    unit.textContent = 'MIN';
    const pres = el('div', 'am-zpre', c);
    // 0 = no limit: shown as ∞, and the session can be closed at any time
    const setMins = m => {
      m = m === 0 ? 0 : clamp(Math.round(m) || 1, 1, ZEN_MAX_MIN);
      inp.value = m ? String(m) : '∞';
      unit.style.visibility = m ? '' : 'hidden';
      store.set(ZEN_MIN_KEY, String(m));
      preBtns.forEach(([b, p]) => b.classList.toggle('am-on', p === m));
    };
    const cur = () => +inp.value || 15;                // ∞ counts as 15 for − / +
    zbtn(pres, '−', () => setMins(cur() - 5), 'am-zstep').setAttribute('aria-label', '5 minutes less');
    const preBtns = ZEN_PRESETS.map(p => [zbtn(pres, String(p), () => setMins(p)), p]);
    zbtn(pres, '+', () => setMins(cur() + 5), 'am-zstep').setAttribute('aria-label', '5 minutes more');
    preBtns.push([zbtn(pres, 'NO LIMIT', () => setMins(0), 'am-znolimit'), 0]);
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); });
    inp.addEventListener('change', () => setMins(Math.max(1, +inp.value || 1)));
    setMins(zenMins());

    el('div', 'am-zsub', c).textContent = 'Stay with the music.';

    const ctl = zenUi.ctl = el('div', 'am-zctl', z);
    const begin = zbtn(ctl, 'BEGIN', () => {
      if (inp.value !== '∞') setMins(Math.max(1, +inp.value || 1));
      const m = zenMins(), now = Date.now();
      startZen(m ? now + m * 60000 : 0, now);
    }, 'am-zmain');
    zbtn(ctl, 'NOT NOW', () => closeZen());

    await Promise.all([loadZenFonts(), findZenName().then(() => setHead(z.querySelector('.am-zhead')))]);
    cutIn(z, ZEN_FADE_MS);
    setTimeout(() => { if (zenEl === z) begin.focus({ preventScroll: true }); }, ZEN_FADE_MS);
  };

  const startZen = async (until, start = Date.now()) => {
    zenUntil = until;
    zenStart = start;
    store.set(ZEN_KEY, JSON.stringify({ until, start }));
    const old = zenEl;
    zenMode = 'on';
    zenShown = '';
    zenUi = {};
    sleepIdx = 0; sleepAt = 0;
    const z = zenEl = zenShell();
    if (old) { z.classList.add('am-zen-now'); old.remove(); }        // from setup: straight to black, no fade
    inertPage();
    // parts turned off in the settings (hidden with CSS, so the fitting just sees nothing there)
    if (!settings.zenGreeting) z.classList.add('am-zno-head');
    if (!settings.zenAlbum) z.classList.add('am-zno-album');
    if (!settings.zenArtist) z.classList.add('am-zno-artist');
    if (!settings.zenClock) z.classList.add('am-zno-clock');
    const c = el('div', 'am-zc', z);
    zenUi.head = el('div', 'am-zhead', c);
    setHead(zenUi.head);
    zenUi.big = el('div', 'am-zbig', c);
    zenUi.album = el('div', 'am-zalbum', c);
    zenUi.sub = el('div', 'am-zsub', c);          // stacked layout: artist under the album (widescreen: bottom right)
    zenUi.clock = el('div', 'am-zclock', c);
    // lyrics: the line being sung (wraps to 2 rows at most) and, with "2 lines", the next one dimmed under it (1 row)
    if (settings.zenLyrics) {
      const under = settings.zenLyricsPos === 1;
      const box = zenUi.lyric = el('div', 'am-zlyric' + (under ? ' am-zlyric-in' : '') + (settings.zenLyrics === 2 ? ' am-zly2' : ''), under ? c : z);
      zenUi.lyCur = el('span', 'am-zly-cur', box);
      if (settings.zenLyrics === 2) zenUi.lyNext = el('span', 'am-zly-next', box);
    }
    lyr.vid = ''; lyr.sig = ''; lyr.staleSig = null;

    const ctl = zenUi.ctl = el('div', 'am-zctl', z);
    zenUi.play = zbtn(ctl, 'PAUSE', clickYt('PlayPause'));
    zenUi.next = zbtn(ctl, 'NEXT', zenNext);
    zenUi.sleep = zbtn(ctl, 'SLEEP: OFF', () => {
      sleepIdx = (sleepIdx + 1) % SLEEP_STEPS.length;
      const st = SLEEP_STEPS[sleepIdx];
      sleepAt = typeof st === 'number' && st ? Date.now() + st * 60000 : 0;
      sleepTitle = (navigator.mediaSession.metadata || {}).title || '';
      zenUpdate();
      zenSchedule();
    });
    zenUi.close = zbtn(ctl, 'CLOSE', () => { if (!zenLocked()) closeZen(); }, 'am-zclose');

    zenUpdate();
    zenSchedule();
    await loadZenFonts();
    if (!zenName) findZenName().then(() => { if (zenEl === z && setHead(zenUi.head)) fitZen(); });
    cutIn(z, old ? 350 : ZEN_FADE_MS);
  };

  const closeZen = () => {
    if (!zenEl) return;
    const z = zenEl, wasOn = zenMode === 'on';
    zenEl = null; zenMode = null; zenUi = {};
    clearTimeout(zenTick);
    sleepIdx = 0; sleepAt = 0;
    html.classList.remove('am-zen-on');
    uninertPage();
    if (wasOn) {
      store.set(ZEN_KEY, 'null');
      restoreMediaKeys();
      restoreQuality();
      restoreLyricsTab();
    }
    z.classList.add('am-zen-out');
    setTimeout(() => z.remove(), 400);
  };

  // media keys / OS media controls: next, previous and seeking do nothing while in zen (YTM sets its handlers again
  // now and then, so they are cleared every tick). After zen they drive YTM through our own hooks.
  // skipping is allowed; "sleep at the end of this song" then follows the new song instead of pausing on the skip
  const zenNext = () => {
    if (SLEEP_STEPS[sleepIdx] === 'end') sleepSkip = true;
    clickYt('Next')();
  };
  const blockMediaKeys = () => {
    for (const a of ZEN_BLOCKED_ACTIONS) try { navigator.mediaSession.setActionHandler(a, null); } catch {}
    try { navigator.mediaSession.setActionHandler('nexttrack', zenNext); } catch {}
  };
  const restoreMediaKeys = () => {
    const set = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} };
    set('nexttrack', clickYt('Next'));
    set('previoustrack', clickYt('Previous'));
    set('seekto', d => { const v = video(); if (v && d && Number.isFinite(d.seekTime)) v.currentTime = d.seekTime; });
    set('seekbackward', d => { const v = video(); if (v) v.currentTime = Math.max(0, v.currentTime - ((d && d.seekOffset) || 10)); });
    set('seekforward', d => { const v = video(); if (v) v.currentTime += (d && d.seekOffset) || 10; });
  };

  /* the album. YTM often leaves the media session's album empty, so it is looked up in YTM's own data for the song
     playing now: the queue items (and the store behind them) carry a byline whose album run links to an album page
     (pageType MUSIC_PAGE_TYPE_ALBUM / browseId MPRE…). A music video has no album itself, but its queue entry usually
     points at the matching song ("counterpart"), which does. Last resorts: the media session, then an album link in
     the player bar. Found albums are remembered per video, and a miss is retried at most once a second. */
  const curVideoId = () => {
    try { const p = document.querySelector('#movie_player'); const d = p && p.getVideoData && p.getVideoData(); if (d && d.video_id) return d.video_id; } catch {}
    return new URLSearchParams(location.search).get('v') || '';
  };
  const isAlbumRun = r => {
    const be = r && r.navigationEndpoint && r.navigationEndpoint.browseEndpoint;
    if (!be) return false;
    const cfg = be.browseEndpointContextSupportedConfigs && be.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig;
    return (cfg && cfg.pageType === 'MUSIC_PAGE_TYPE_ALBUM') || /^MPRE/.test(be.browseId || '');
  };
  // album text from one renderer (playlistPanelVideoRenderer and friends)
  const albumOf = rd => {
    for (const k of ['longBylineText', 'shortBylineText', 'subtitle', 'byline']) {
      const runs = rd && rd[k] && rd[k].runs;
      const hit = runs && runs.find(isAlbumRun);
      if (hit) return hit.text;
    }
    return '';
  };
  // every renderer for this video id, including the counterpart song of a music video
  const renderersFor = (root, id, out, seen, depth) => {
    if (!root || typeof root !== 'object' || depth > 12 || seen.has(root) || out.length > 6) return;
    seen.add(root);
    if (root instanceof Node) return;
    if (root.videoId === id && (root.longBylineText || root.shortBylineText)) out.push(root);
    const w = root.playlistPanelVideoWrapperRenderer;
    if (w) {
      const prim = w.primaryRenderer && (w.primaryRenderer.playlistPanelVideoRenderer || w.primaryRenderer);
      if (prim && prim.videoId === id) for (const c of w.counterpart || []) {
        const cr = c.counterpartRenderer && (c.counterpartRenderer.playlistPanelVideoRenderer || c.counterpartRenderer);
        if (cr) out.push(cr);
      }
    }
    for (const k in root) {
      let v; try { v = root[k]; } catch { continue; }
      if (v && typeof v === 'object') renderersFor(v, id, out, seen, depth + 1);
    }
  };
  const albumCache = new Map();
  let albumTryAt = 0, albumTryId = '';
  const zenAlbum = m => {
    const id = curVideoId();
    if (id && albumCache.has(id)) return albumCache.get(id);
    let al = '';
    if (id && (id !== albumTryId || performance.now() > albumTryAt)) {
      albumTryId = id;
      albumTryAt = performance.now() + 1000;
      const out = [], seen = new WeakSet();
      // queue items in the page first (small), then YTM's store
      for (const n of document.querySelectorAll('ytmusic-player-queue-item, ytmusic-playlist-panel-video-wrapper-renderer')) {
        renderersFor(n.data || (n.__data && n.__data.data), id, out, seen, 0);
      }
      if (!out.some(albumOf)) { try { const st = ytStore(); if (st) renderersFor(st.getState(), id, out, seen, 0); } catch {} }
      for (const rd of out) { al = albumOf(rd); if (al) break; }
    }
    if (!al && m && m.album) al = m.album;
    if (!al) {
      const link = ytLinks().find(l => /browse\/MPRE/.test(l.getAttribute('href') || ''));
      if (link) al = link.textContent.trim();
    }
    if (al && id) albumCache.set(id, al);
    return al;
  };
  // amAlbumProbe(): what the album lookup sees for the song playing now
  window.amAlbumProbe = () => {
    const id = curVideoId(), out = [], seen = new WeakSet();
    for (const n of document.querySelectorAll('ytmusic-player-queue-item, ytmusic-playlist-panel-video-wrapper-renderer'))
      renderersFor(n.data || (n.__data && n.__data.data), id, out, seen, 0);
    const fromQueue = out.length;
    try { const st = ytStore(); if (st) renderersFor(st.getState(), id, out, seen, 0); } catch {}
    console.log('[am-bar] album probe: video', id, '| renderers from queue:', fromQueue, 'total:', out.length,
      '| albums:', out.map(albumOf), '| media session:', (navigator.mediaSession.metadata || {}).album,
      '| byline links:', ytLinks().map(l => l.getAttribute('href')), '| cached:', albumCache.get(id));
  };

  /* power: a playing music video is still decoded (and downloaded) behind the black screen, so its picture drops to
     the lowest quality while zen is up and the previous setting comes back on close. Audio is a separate stream and
     doesn't change. These are YouTube player calls that may not exist in every version, so all of it is best effort. */
  let zenQuality = null, zenQualityVid = '';
  const moviePlayer = () => document.querySelector('#movie_player');
  const lowerQuality = () => {
    const id = curVideoId();
    if (!id || id === zenQualityVid) return;                // once per video (YTM may reset it on a new one)
    zenQualityVid = id;
    try {
      const p = moviePlayer();
      if (!p) return;
      if (zenQuality === null) zenQuality = (p.getPreferredQuality && p.getPreferredQuality()) || 'auto';
      if (p.setPlaybackQualityRange) p.setPlaybackQualityRange('tiny', 'tiny');
      else if (p.setPlaybackQuality) p.setPlaybackQuality('tiny');
    } catch {}
  };
  const restoreQuality = () => {
    const q = zenQuality || 'auto';
    zenQuality = null; zenQualityVid = '';
    try {
      const p = moviePlayer();
      if (!p) return;
      if (p.setPlaybackQualityRange) p.setPlaybackQualityRange(q, q);
      else if (p.setPlaybackQuality) p.setPlaybackQuality(q);
    } catch {}
  };

  /* one line of lyrics, from Better Lyrics (setting "Lyrics line"). Better Lyrics only loads lyrics while YTM's Lyrics
     tab is selected, so zen selects it (and puts the tab that was open back on close). It also stops animating its
     own view while that view is hidden, which it is behind zen, so its "active" class can't be trusted here: the
     line is picked from the start / length (seconds) it writes on every line (data-time / data-duration) against
     the video's own time. Its container doesn't say which song the lyrics belong to, so after a song change the
     old lines are ignored until they are replaced. */
  const LYRIC_LEAD = .15;                        // show a line this much early (s): reads as on time
  const lyr = { vid: '', sig: '', staleSig: null };
  const lyricTexts = new WeakMap();
  let lyricTabPrev = -1, lyricTabTry = 0;
  const lyricTabs = () => document.getElementsByClassName('tab-header style-scope ytmusic-player-page');   // Up next, Lyrics, Related
  const selectLyricsTab = () => {
    const tabs = lyricTabs(), lt = tabs[1];
    if (!lt || lt.getAttribute('aria-selected') === 'true' || performance.now() < lyricTabTry) return;
    lyricTabTry = performance.now() + 3000;
    if (lyricTabPrev < 0) lyricTabPrev = [...tabs].findIndex(t => t.getAttribute('aria-selected') === 'true');
    lt.click();
  };
  const restoreLyricsTab = () => {
    const t = lyricTabPrev >= 0 && lyricTabs()[lyricTabPrev];
    lyricTabPrev = -1; lyricTabTry = 0;
    if (t && t.getAttribute('aria-selected') !== 'true') t.click();
  };
  // the sung text of a line: its main row without the karaoke highlight copy, translation, romanization or
  // background vocals
  const lyricText = line => {
    let t = lyricTexts.get(line);
    if (t === undefined) {
      const c = (line.querySelector(':scope > .blyrics-line-main') || line).cloneNode(true);
      c.querySelectorAll('.blyrics-highlight-run, .blyrics--translated, .blyrics--romanized, .blyrics-background-line, .blyrics-background-lyric')
        .forEach(n => n.remove());
      t = c.textContent.replace(/\s+/g, ' ').trim();
      if (line.dataset.instrumental === 'true') t = '';
      lyricTexts.set(line, t);
    }
    return t;
  };
  // -> { text, nextText, next } (next: when the next line starts, s) or null
  const currentLyric = v => {
    const box = document.querySelector('#blyrics-wrapper .blyrics-container');
    const ok = box && box.dataset.noLyrics !== 'true' && box.dataset.sync !== 'none';
    const lines = ok ? [...box.querySelectorAll('.blyrics--line[data-time]')] : [];
    const last = lines[lines.length - 1];
    const sig = last ? lines.length + '|' + lines[0].dataset.time + '|' + lyricText(lines[0]) + '|' + last.dataset.time : '';
    // new song: the lines on screen now (if any) belong to the last one until they change
    const id = curVideoId();
    if (id !== lyr.vid) { lyr.staleSig = lyr.vid && lyr.sig ? lyr.sig : null; lyr.vid = id; }
    lyr.sig = sig;
    if (!sig) return null;
    if (lyr.staleSig !== null) { if (sig === lyr.staleSig) return null; lyr.staleSig = null; }
    if (v.duration && +last.dataset.time > v.duration + 1) return null;      // can't be this song's
    const t = v.currentTime + LYRIC_LEAD;
    let i = -1;
    for (let k = 0; k < lines.length && +lines[k].dataset.time <= t; k++) i = k;
    const nl = lines[i + 1], next = nl ? +nl.dataset.time : 0, nextText = nl ? lyricText(nl) : '';
    if (i < 0) return { text: '', nextText, next };
    const ln = lines[i], end = +ln.dataset.time + (+ln.dataset.duration || 0);
    // a long gap after a line (no instrumental line in between): the line goes when it's over
    return { text: +ln.dataset.duration > 0 && t > end + 1.5 ? '' : lyricText(ln), nextText, next };
  };

  /* "Smooth lyrics": the old line drifts up and fades out (a copy of it, so the new text can go in right away), the
     new one comes up into place. With 2 lines the next line is already on screen, so it slides up from where it was
     and brightens; the line after it fades in below. Only opacity and translate move (cheap for the browser). */
  const LYRIC_MOVE_MS = 420, LYRIC_EASE = 'cubic-bezier(.2, .8, .2, 1)';
  const lyricMove = (curTxt, nextTxt) => {
    const box = zenUi.lyric, c = zenUi.lyCur, n = zenUi.lyNext;
    const curChanged = c.textContent !== curTxt;
    const fromNext = curChanged && !!n && !!curTxt && n.textContent === curTxt;
    const nextTop = n ? n.offsetTop : 0;
    if (curChanged && c.textContent) {
      const ghost = c.cloneNode(true);
      ghost.classList.add('am-zly-ghost');
      Object.assign(ghost.style, { left: c.offsetLeft + 'px', top: c.offsetTop + 'px', width: c.offsetWidth + 'px' });
      box.append(ghost);
      const a = ghost.animate([{ opacity: .85, translate: '0 0' }, { opacity: 0, translate: '0 -.6em' }],
        { duration: LYRIC_MOVE_MS, easing: LYRIC_EASE });
      a.onfinish = a.oncancel = () => ghost.remove();
    }
    const nextChanged = !!n && n.textContent !== nextTxt;
    c.textContent = curTxt;
    if (n) n.textContent = nextTxt;
    if (curChanged && curTxt) {
      c.animate(fromNext
        ? [{ opacity: .35, translate: `0 ${nextTop - c.offsetTop}px` }, { opacity: .85, translate: '0 0' }]
        : [{ opacity: 0, translate: '0 .5em' }, { opacity: .85, translate: '0 0' }],
        { duration: LYRIC_MOVE_MS, easing: LYRIC_EASE });
    }
    if (nextChanged && nextTxt) {
      n.animate([{ opacity: 0, translate: '0 .5em' }, { opacity: .35, translate: '0 0' }],
        { duration: LYRIC_MOVE_MS, easing: LYRIC_EASE, delay: 90, fill: 'backwards' });
    }
  };

  // the zen loop: once a second, just after each whole second so the clock never skips or doubles; every 250ms near
  // the end of a song while "sleep at the end of this song" is set (it pauses in the last 0.6s)
  const zenSchedule = () => {
    clearTimeout(zenTick);
    if (zenMode !== 'on') return;
    const v = video();
    const nearEnd = SLEEP_STEPS[sleepIdx] === 'end' && v && v.duration && v.duration - v.currentTime < 2;
    let wait = nearEnd ? 250 : 1000 - Date.now() % 1000 + 5;
    // a lyric line: wake right when the next one starts (not more often than that)
    if (zenUi.lyricNext && v && !v.paused && !document.hidden) {
      const ms = (zenUi.lyricNext - LYRIC_LEAD - v.currentTime) / (v.playbackRate || 1) * 1000 + 15;
      if (ms > 0) wait = Math.min(wait, Math.max(40, ms));
    }
    zenTick = setTimeout(() => { zenUpdate(); zenSchedule(); }, wait);
  };

  const zenUpdate = () => {
    if (zenMode !== 'on' || !zenUi.big) return;
    const now = Date.now(), noLimit = !zenUntil, left = zenUntil - now, locked = !noLimit && left > 0;
    const shownNow = !document.hidden;              // a hidden tab only needs the sleep timer and the key blocking
    blockMediaKeys();
    lowerQuality();
    if (shownNow) inertPage();

    // song
    const m = navigator.mediaSession.metadata;
    const t = (m && m.title) || '';
    const v = video();
    if (shownNow) {
      const a = (m && m.artist) || '', al = zenAlbum(m);
      const headChanged = setHead(zenUi.head);
      if (t + '\n' + a + '\n' + al !== zenShown || headChanged) {
        zenShown = t + '\n' + a + '\n' + al;
        // the album under the title (left out when there's none, or it's just the title again)
        zenUi.album.textContent = al && al.trim().toLowerCase() !== t.trim().toLowerCase() ? endWith(al.trim(), settings.zenAlbumEnd) : '';
        const clean = t.replace(/\s*[([][^)\]]*[)\]]/g, '').trim() || t;    // "(feat. …)", "[Official Video]" off the big line
        zenUi.big.dataset.text = clean ? endWith(clean.toUpperCase(), settings.zenTitleEnd) : 'SILENCE';
        // the artist ends with a full stop by default, like a title card line
        const who = a || 'Unknown artist';
        zenUi.sub.textContent = !t ? 'Nothing is playing.' : endWith(who, settings.zenDot);
        fitZen();
      }

      // lock
      zenUi.clock.textContent = noLimit ? `ZEN:${fmtTime(now - zenStart)}` : locked ? `LOCKED:${fmtTime(left)}` : 'UNLOCKED:';
      zenUi.close.disabled = locked;
      zenUi.close.textContent = locked ? 'CLOSE · LOCKED' : 'CLOSE';
      zenUi.close.title = locked ? `Unlocks in ${fmtTime(left)}` : 'Leave zen mode';
      zenUi.close.classList.toggle('am-on', !locked);

      // lyric line: a hard cut to the new line like the rest of the card, or (setting "Smooth lyrics") a slide
      if (zenUi.lyric) {
        const on = hasBetterLyrics();
        if (on) selectLyricsTab();
        const cur = on && v ? currentLyric(v) : null;
        const curTxt = cur ? cur.text : '', nextTxt = cur ? cur.nextText : '';
        if (zenUi.lyCur.textContent !== curTxt || (zenUi.lyNext && zenUi.lyNext.textContent !== nextTxt)) {
          if (settings.zenLyricsSmooth && !reduceMotion.matches) lyricMove(curTxt, nextTxt);
          else {
            zenUi.lyCur.textContent = curTxt;
            if (zenUi.lyNext) zenUi.lyNext.textContent = nextTxt;
          }
        }
        zenUi.lyricNext = cur ? cur.next : 0;
      }

      // play / pause
      zenUi.play.textContent = !v || v.paused ? 'PLAY' : 'PAUSE';
      zenUi.play.disabled = !t;
      zenUi.next.disabled = !t;
    }

    // sleep timer
    const st = SLEEP_STEPS[sleepIdx];
    if (st === 'end' && v) {
      const changed = sleepTitle && t && t !== sleepTitle;
      if (changed && sleepSkip) { sleepTitle = t; sleepSkip = false; }
      else if (changed || (v.duration && v.currentTime >= v.duration - .6)) { v.pause(); sleepIdx = 0; }
    } else if (sleepAt && now >= sleepAt) {
      if (v && !v.paused) v.pause();
      sleepIdx = 0; sleepAt = 0;
    }
    if (!shownNow) { zenUi.lyricNext = 0; return; }
    const st2 = SLEEP_STEPS[sleepIdx];
    zenUi.sleep.textContent = !st2 ? 'SLEEP: OFF' : st2 === 'end' ? 'SLEEP: END OF SONG' : `SLEEP:${fmtTime(sleepAt - now)}`;
    zenUi.sleep.classList.toggle('am-on', !!st2);
  };

  // keys: nothing reaches YTM while the overlay is up. Space / K play-pause and Shift+N skips in a session; Escape leaves the setup
  // screen, or the session once it's unlocked; Enter in the minutes box begins.
  const zenKeys = e => {
    if (!zenEl) return;
    e.stopImmediatePropagation();
    if (e.type !== 'keydown') return;
    const inInput = e.target && e.target.tagName === 'INPUT';
    if (e.key === 'Escape') { e.preventDefault(); if (zenMode === 'setup' || !zenLocked()) closeZen(); return; }
    if (zenMode === 'setup') {
      if (inInput && e.key === 'Enter') { e.preventDefault(); zenEl.querySelector('.am-zmain').click(); }
      return;
    }
    if (e.key.toLowerCase() === 'n' && e.shiftKey) { e.preventDefault(); if (!zenUi.next.disabled) zenNext(); return; }
    if ((e.key === ' ' && !(e.target && e.target.tagName === 'BUTTON')) || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (!zenUi.play.disabled) zenUi.play.click();
    }
  };
  for (const type of ['keydown', 'keyup', 'keypress']) addEventListener(type, zenKeys, true);
  // keep focus inside
  const zenFocus = e => { if (zenEl && !zenEl.contains(e.target)) zenEl.focus({ preventScroll: true }); };
  addEventListener('focusin', zenFocus, true);
  const zenResize = () => fitZen();
  addEventListener('resize', zenResize);
  const zenVisible = () => { if (!document.hidden && zenMode === 'on') zenUpdate(); };
  document.addEventListener('visibilitychange', zenVisible);

  const zenStyle = el('style', null, document.head);
  zenStyle.textContent = `
    .am-zen { position: fixed; inset: 0; z-index: 2147483000; background: #000 !important; color: #fff; outline: none;
      overflow: hidden; user-select: none; -webkit-user-select: none; animation: am-zen-in ${ZEN_FADE_MS}ms ease-out;
      -webkit-font-smoothing: antialiased; --zx: max(16px, 8vw); --zb: 120px;
      /* fonts (settings: Title font / Text font). Big lines: family, weight, stretch, squeeze (scaleX), stroke */
      --zbf: var(--am-zserif, "Times New Roman", Times, serif); --zbw: var(--am-zwght, 800); --zbs: 62.5%;
      --zbx: var(--am-zsx, .66); --zbk: var(--am-zstroke, 0em);
      --zsf: var(--am-zsans, "Roboto Condensed", "Arial Narrow", Arial, sans-serif); --zsw: 700; --zss: 72%; }
    .am-zen.am-zbf-sans { --zbf: var(--am-zsans, "Roboto Condensed", "Arial Narrow", Arial, sans-serif); --zbw: 700;
      --zbs: 62.5%; --zbx: 1; --zbk: 0em; }
    .am-zen.am-zbf-own { --zbf: var(--am-font, system-ui, sans-serif); --zbw: 800; --zbs: normal; --zbx: 1; --zbk: 0em; }
    .am-zen.am-zsf-serif { --zsf: var(--am-zserif, "Times New Roman", Times, serif); --zsw: var(--am-zwght, 800); --zss: 62.5%; }
    .am-zen.am-zsf-own { --zsf: var(--am-font, system-ui, sans-serif); --zsw: 700; --zss: normal; }
    .am-zno-head .am-zhead, .am-zno-album .am-zalbum, .am-zno-artist .am-zsub, .am-zno-clock .am-zclock { display: none !important; }
    .am-zen.am-zen-now { animation: none; }
    .am-zen.am-zen-out { opacity: 0; transition: opacity .35s ease; pointer-events: none; }
    @keyframes am-zen-in { from { opacity: 0; } }
    .am-zen.am-zen-black .am-zc, .am-zen.am-zen-black .am-zctl { visibility: hidden; }
    /* power: nothing behind zen is styled, laid out or painted (GIF backgrounds, blur, the video's picture...);
       the elements stay in the page, so playback and YTM's state carry on */
    html.am-zen-on body > :not(.am-zen) { content-visibility: hidden !important; }

    .am-zc { position: absolute; left: var(--zx); right: var(--zx); top: 46%; translate: 0 -50%; }
    .am-zl { white-space: nowrap; }
    .am-zl > span { display: inline-block; transform-origin: 0 50%; }
    .am-zserif > span { font-family: var(--zbf); font-weight: var(--zbw);
      font-stretch: var(--zbs); letter-spacing: -.012em; transform: scaleX(var(--zbx));
      -webkit-text-stroke: var(--zbk) #fff; paint-order: stroke fill; }
    .am-zhead { font-size: calc(var(--zb) * .46); line-height: .9; }
    .am-zbig { line-height: .92; margin-top: .03em; }
    .am-zsans { font-size: calc(var(--zb) * .3); line-height: 1; margin-top: calc(var(--zb) * .2);
      font-variant-numeric: tabular-nums; white-space: nowrap; }
    /* the album under the title: condensed grotesque, smaller than the title, wraps */
    .am-zalbum { font-size: calc(var(--zb) * .17); line-height: 1.04; margin-top: calc(var(--zb) * .14);
      white-space: normal; overflow-wrap: anywhere; text-wrap: balance; }
    .am-zalbum:empty { display: none; }
    /* the lock countdown: small and quiet, so it doesn't pull the eye */
    .am-zclock { font-size: clamp(14px, 1.3vw, 19px); line-height: 1; margin-top: calc(var(--zb) * .16);
      opacity: .5; letter-spacing: .02em; font-variant-numeric: tabular-nums; white-space: nowrap; }
    /* the artist (or a line of text) under the clock: same grotesque, a little smaller, wraps */
    .am-zsub { font-size: calc(var(--zb) * .27); line-height: 1.08; margin-top: calc(var(--zb) * .07);
      white-space: normal; overflow-wrap: anywhere; text-wrap: balance; max-width: 100%; }

    /* the lyric line: a box two lines high above the controls (placed by fitZen), the text sits on its bottom */
    .am-zlyric { position: absolute; left: var(--zx); right: var(--zx); display: flex; flex-direction: column;
      justify-content: flex-end; font-size: max(16px, calc(var(--zb) * .2)); line-height: 1.1; height: 2.2em; }
    .am-zlyric.am-zly2 { height: 3.3em; }
    .am-zlyric > span { flex-shrink: 0; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
      line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; text-wrap: balance; }
    .am-zly-cur { opacity: .85; min-height: 1.1em; }
    .am-zlyric > .am-zly-next { -webkit-line-clamp: 1; line-clamp: 1; opacity: .35; }
    /* "Under title": in the card, after the clock, its rows kept at a fixed height so the card doesn't jump */
    .am-zlyric.am-zlyric-in { position: relative; inset: auto; justify-content: flex-start; margin-top: calc(var(--zb) * .16); }
    .am-zlyric > .am-zly-ghost { position: absolute; margin: 0; pointer-events: none; }
    .am-zen-black .am-zlyric { visibility: hidden; }

    .am-zlock { display: flex; align-items: baseline; gap: .18em; }
    .am-zinp { all: unset; width: 2.3ch; text-align: center; font-size: 1em; color: #fff; cursor: text;
      border-bottom: .07em solid rgb(255 255 255 / .35); font-variant-numeric: tabular-nums; }
    .am-zinp:focus { border-bottom-color: #fff; }
    .am-zunit { margin-left: .1em; }
    .am-zpre { display: flex; flex-wrap: wrap; gap: .3em .9em; margin-top: calc(var(--zb) * .12);
      font-size: max(15px, calc(var(--zb) * .14)); }

    .am-zctl { position: absolute; left: var(--zx); right: var(--zx); bottom: max(20px, 6vh); display: flex; flex-wrap: wrap;
      gap: .5em 2.2em; font-size: clamp(14px, 1.5vw, 21px); }
    .am-zbtn { all: unset; cursor: pointer; color: #fff; opacity: .55; font-size: inherit; line-height: 1.2;
      font-variant-numeric: tabular-nums; transition: opacity .15s; }
    .am-zbtn:hover, .am-zbtn:focus-visible, .am-zbtn.am-on { opacity: 1; }
    .am-zbtn:focus-visible { text-decoration: underline; text-underline-offset: .2em; }
    .am-zbtn.am-zmain { opacity: 1; }
    .am-zbtn:disabled { opacity: .22; cursor: not-allowed; }
    .am-zstep { padding: 0 .2em; }
    .am-znolimit { margin-left: .4em; }
    /* after the all: unset resets above */
    .am-zsans, .am-zsub, .am-zalbum, .am-zclock, .am-zlyric, .am-zbtn, .am-zinp { font-family: var(--zsf);
      font-weight: var(--zsw); font-stretch: var(--zss); letter-spacing: -.01em; }

    /* widescreen layout */
    .am-zen.am-zwide { --zx: max(16px, 6vw); }
    .am-zwide .am-zc { top: 13vh; translate: none; right: auto; width: 64vw; }
    .am-zwide .am-zc > .am-zsans { font-size: calc(var(--zb) * .5); margin-top: calc(var(--zb) * .07); }
    .am-zwide .am-zalbum { font-size: calc(var(--zb) * .2); margin-top: calc(var(--zb) * .1); }
    .am-zwide .am-zpre { margin-top: calc(var(--zb) * .16); }
    .am-zwide > .am-zsub { position: absolute; right: var(--zx); bottom: 22vh; max-width: 46vw; margin: 0; text-align: right;
      font-family: var(--zbf); font-weight: var(--zbw); font-stretch: var(--zbs);
      -webkit-text-stroke: var(--zbk) #fff; paint-order: stroke fill;
      font-size: calc(var(--zb) * .38); line-height: .98; letter-spacing: -.01em; }
    .am-zen-black > .am-zsub { visibility: hidden; }

    @media (prefers-reduced-motion: reduce) { .am-zen { animation: none; } .am-zen.am-zen-out { transition: none; } }
  `;

  // undo everything (for amOff)
  const zenOff = () => {
    clearTimeout(zenTick);
    if (zenEl) zenEl.remove();
    if (zenMode === 'on') { restoreQuality(); restoreLyricsTab(); }
    zenEl = null; zenMode = null;
    html.classList.remove('am-zen-on');
    uninertPage();
    document.removeEventListener('visibilitychange', zenVisible);
    for (const type of ['keydown', 'keyup', 'keypress']) removeEventListener(type, zenKeys, true);
    removeEventListener('focusin', zenFocus, true);
    removeEventListener('resize', zenResize);
    zenStyle.remove();
    zenFontStyle.remove();
    html.style.removeProperty('--am-zserif');
    for (const v of ['--am-zsx', '--am-zsans', '--am-zstroke', '--am-zwght']) html.style.removeProperty(v);
  };
  window.amZen = openZen;

  // a session that was running when the page was reloaded comes straight back
  { const z = readZen(); if (z && (z.until === 0 || z.until > Date.now())) startZen(z.until, z.start || Date.now()); }
