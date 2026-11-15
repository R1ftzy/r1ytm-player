  /* ---------- keyboard shortcuts + command palette (Ctrl+K) ---------- */
  // A shortcut is stored as "Ctrl+Alt+Shift+Meta+<code>" (KeyboardEvent.code: the key's place, so it works with any
  // keyboard layout and with Alt / Option, which change e.key). YTM's own shortcuts are single keys (space, letters),
  // so r1ytm's defaults all use Alt+Shift (and Ctrl+K for the palette). Bindings live in localStorage ("am-keys"):
  // { actionId: combo or '' (none) }; a missing id uses its default.
  // Keys are ignored while typing (search, any text field), in zen, and while the settings are open.
  const volStep = d => {
    const v = video();
    if (v && v.muted && d > 0) v.muted = false;
    const val = Math.max(0, Math.min(100, Math.round(getVolume() / 5) * 5 + d));
    setVolume(val);
    volRange.value = String(val);
    showVolPct();
    toast('Volume ' + val + '%');
  };
  const speedStep = d => {
    const n = speedStepFrom(settings.speed, d);
    setSpeed(n);
    toast('Speed ' + fmtSpeed(n / 100));
  };
  const POS_NAMES = ['Bottom', 'Top', 'Left', 'Right'];
  const setBarPos = v => {
    settings.barPos = v; applySettings(); saveSettings(); placeBar(); hideBase();
    toast('Bar: ' + POS_NAMES[v]);
  };
  // turn a setting on / off (flip: its key). These are not listed again as settings in the command palette
  const flipSetting = (key, name, after) => () => {
    const s = SETTINGS.find(x => x.key === key);
    const v = settings[key] ? 0 : 1;
    applySetting(s, v);
    if (after) after();
    toast(name + ': ' + (v ? 'on' : 'off'));
  };
  const cycleLayout = () => {
    const m = nextLayout();
    applyMode(m); placeBar(); hideBase();
    toast('Bar layout: ' + m[0].toUpperCase() + m.slice(1));
  };
  // id, label, default key, run. The order is the order on the Shortcuts page
  const ACTIONS = [
    { id: 'palette', label: 'Command palette', def: 'Ctrl+KeyK', run: () => openPalette() },
    { id: 'playPause', label: 'Play / pause', def: '', run: clickYt('PlayPause') },
    { id: 'next', label: 'Next song', def: '', run: clickYt('Next') },
    { id: 'previous', label: 'Previous song', def: '', run: clickYt('Previous') },
    { id: 'like', label: 'Like / remove like', def: 'KeyL', run: () => likeBtn.click() },
    { id: 'volUp', label: 'Volume up', def: '', run: () => volStep(5) },
    { id: 'volDown', label: 'Volume down', def: '', run: () => volStep(-5) },
    { id: 'mute', label: 'Mute / unmute', def: '', run: () => { const v = video(); if (v) { v.muted = !v.muted; toast(v.muted ? 'Muted' : 'Sound on'); } } },
    { id: 'faster', label: 'Faster', def: 'Alt+Shift+Period', run: () => speedStep(1) },
    { id: 'slower', label: 'Slower', def: 'Alt+Shift+Comma', run: () => speedStep(-1) },
    { id: 'normalSpeed', label: 'Normal speed', def: 'Alt+Shift+Digit0', run: () => { setSpeed(100); toast('Speed 1×'); } },
    { id: 'player', label: 'Open / close the player page', def: 'Alt+Shift+KeyP', run: () => togglePage() },
    { id: 'lyrics', label: 'Lyrics', def: '', run: () => showTab(...LYRICS) },
    { id: 'queue', label: 'Up next (queue)', def: '', run: () => showTab(...UPNEXT) },
    { id: 'zen', label: 'Zen mode', def: 'Alt+Shift+KeyZ', run: () => openZen() },
    { id: 'shuffle', label: 'Shuffle on / off', def: '', run: clickYt('Shuffle') },
    { id: 'repeat', label: 'Repeat: off / all / one', def: '', run: clickYt('Repeat') },
    { id: 'barPos', label: 'Next bar position', def: 'Alt+Shift+KeyB', run: () => setBarPos((settings.barPos + 1) % 4) },
    { id: 'barLayout', label: 'Next bar layout', def: 'Alt+Shift+KeyL', run: cycleLayout },
    { id: 'barFloat', label: 'Floating bar on / off', def: '', flip: 'barFloat', run: flipSetting('barFloat', 'Floating bar') },
    { id: 'autoHide', label: 'Auto-hide on / off', def: '', flip: 'autoHide', run: flipSetting('autoHide', 'Auto-hide') },
    { id: 'peek', label: 'Up-next peek on / off', def: '', flip: 'peek', run: flipSetting('peek', 'Up-next peek') },
    { id: 'refract', label: 'Refraction on / off', def: '', flip: 'refract', run: () => canRefract ? flipSetting('refract', 'Refraction')() : toast('Refraction needs Chrome, Edge or Brave') },
    { id: 'artCircle', label: 'Art circle on / off', def: 'Alt+Shift+KeyA', flip: 'artCircle', run: flipSetting('artCircle', 'Art circle') },
    { id: 'hqArt', label: 'High-quality art on / off', def: '', flip: 'hqArt', run: flipSetting('hqArt', 'High-quality art', () => syncHqArt()) },
    { id: 'vinyl', label: 'Vinyl on / off', def: 'Alt+Shift+KeyV', flip: 'vinyl', run: flipSetting('vinyl', 'Vinyl') },
    { id: 'popPage', label: 'Player page pop on / off', def: '', flip: 'popPage', run: flipSetting('popPage', 'Player page pop') },
    { id: 'keepPitch', label: 'Keep pitch on / off', def: '', flip: 'keepPitch', run: flipSetting('keepPitch', 'Keep pitch', () => syncSpeed()) },
    { id: 'showBar', label: 'Show the bar (auto-hide)', def: 'Alt+Shift+KeyH', run: () => revealBar(3000) },
    { id: 'copyLink', label: 'Copy link to this song', def: 'Alt+Shift+KeyC', run: () => copyNowLink() },
    { id: 'settings', label: 'Open the settings', def: 'Alt+Shift+KeyS', run: () => openSettings() },
    { id: 'whatsNew', label: "What's new", def: '', run: () => openChangelog('all') },
  ];
  const keys = (() => { try { return JSON.parse(store.get('am-keys', '{}')) || {}; } catch { return {}; } })();
  const keyOf = a => typeof keys[a.id] === 'string' ? keys[a.id] : a.def;
  const saveKeys = () => store.set('am-keys', JSON.stringify(keys));
  const resetKeys = () => { for (const k of Object.keys(keys)) delete keys[k]; saveKeys(); };
  const MODS = ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS'];
  const comboOf = e => {
    if (!e.code || MODS.some(m => e.key === m || e.code.startsWith(m))) return '';
    return (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.metaKey ? 'Meta+' : '') + e.code;
  };
  const KEY_NAMES = { Period: '.', Comma: ',', Slash: '/', Backslash: '\\', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
    Minus: '-', Equal: '=', Backquote: '`', Space: 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc' };
  const isMac = /Mac/.test(navigator.platform || '');
  const showCombo = c => !c ? 'None' : c.split('+').map(p =>
    p === 'Meta' ? (isMac ? '⌘' : 'Win') : p === 'Alt' && isMac ? '⌥' : p === 'Ctrl' && isMac ? '⌃' : p === 'Shift' && isMac ? '⇧' :
    /^Key[A-Z]$/.test(p) ? p.slice(3) : /^Digit\d$/.test(p) ? p.slice(5) : /^Numpad/.test(p) ? 'Num ' + p.slice(6) : KEY_NAMES[p] || p
  ).join(isMac ? '' : '+');
  const typing = e => {
    const t = e.composedPath ? e.composedPath()[0] : e.target;
    return !!t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!(t.closest && t.closest('ytmusic-search-box, [contenteditable="true"]')));
  };
  let recording = null;                       // the Shortcuts row waiting for a key: { action, done(combo) }
  addEventListener('keydown', e => {
    if (recording) {                           // the Shortcuts page is listening for a new key
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { recording.done(null); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') { recording.done(''); return; }
      const c = comboOf(e);
      if (c) recording.done(c);
      return;
    }
    if (zenEl || setEl || palEl || typing(e)) return;
    const c = comboOf(e);
    if (!c) return;
    const a = ACTIONS.find(x => keyOf(x) === c);
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat && !/^vol|faster|slower/.test(a.id)) return;
    a.run();
  }, true);

  /* the Shortcuts page of the settings (built by openSettings, after Font / Background); returns a redraw function */
  const buildKeySettings = p => {
    el('div', 'am-set-group', p).textContent = 'Shortcuts';
    el('div', 'am-set-subhead', p).textContent = 'Click a key, then press the new keys. Backspace: none. Esc: cancel';
    const card = el('div', 'am-set-card', p);
    const rows = ACTIONS.map(a => {
      const row = el('div', 'am-set-row am-set-inline', card);
      const lt = el('div', 'am-set-ltext', row);
      el('div', 'am-set-label', lt).textContent = a.label;
      const note = el('div', 'am-set-note', lt);
      const chip = el('button', 'am-set-btn am-set-soft am-key-chip', row);
      const show = () => { chip.textContent = showCombo(keyOf(a)); chip.classList.toggle('am-key-none', !keyOf(a)); };
      chip.addEventListener('click', () => {
        if (recording) recording.done(null);
        chip.textContent = 'Press keys…';
        chip.classList.add('am-key-rec');
        note.textContent = '';
        recording = {
          done: c => {
            recording = null;
            chip.classList.remove('am-key-rec');
            if (c !== null) {
              const other = c && ACTIONS.find(x => x !== a && keyOf(x) === c);
              if (other) { keys[other.id] = ''; note.textContent = 'Taken from “' + other.label + '”'; }
              keys[a.id] = c;
              saveKeys();
            }
            rows.forEach(f => f());
          },
        };
      });
      show();
      return show;
    });
    return () => rows.forEach(f => f());
  };

  /* the command palette: every action above, every setting choice / switch, and the bar layouts. Type to filter;
     arrows + Enter, or a click; Esc closes */
  let palEl = null;
  const applySetting = (s, v) => {
    const was = settings[s.key];
    settings[s.key] = v; applySettings(); saveSettings();
    if (s.change && was !== v) s.change();
  };
  const paletteCommands = () => {
    const out = ACTIONS.filter(a => a.id !== 'palette').map(a => ({ label: a.label, hint: showCombo(keyOf(a)) === 'None' ? '' : showCombo(keyOf(a)), run: a.run }));
    for (const s of SETTINGS) {
      if (!s.group || (s.disabled && s.disabled()) || ACTIONS.some(a => a.flip === s.key)) continue;
      const where = s.group + (s.sub ? ' › ' + s.sub : '');
      if (s.type === 'choice') for (const [t, v] of s.options) {
        out.push({ label: s.label + ': ' + t, hint: where, on: settings[s.key] === v, run: () => { applySetting(s, v); toast(s.label + ': ' + t); } });
      } else if (s.type === 'toggle') {
        const on = !!settings[s.key];
        out.push({ label: s.label + ': turn ' + (on ? 'off' : 'on'), hint: where, run: () => { applySetting(s, on ? 0 : 1); toast(s.label + ': ' + (on ? 'off' : 'on')); } });
      } else if (s.type === 'action') out.push({ label: s.label, hint: where, run: () => s.run(null, null) });
    }
    for (const [t, m] of [['Full', 'full'], ['Compact', 'compact'], ['Classic', 'classic']]) {
      out.push({ label: 'Bar layout: ' + t, hint: 'Bar & menus', on: layoutNow === m, run: () => { applyMode(m); placeBar(); hideBase(); toast('Bar layout: ' + t); } });
    }
    for (const f of COPY_FORMATS) out.push({ label: 'Copy link as ' + f.label, hint: f.note, run: () => copyLink(nowTarget(), f.key) });
    return out;
  };
  // every word must be in the label or the hint; earlier and whole-word matches first
  const palFilter = (cmds, q) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return cmds;
    return cmds.map(c => {
      const l = c.label.toLowerCase(), h = (c.hint || '').toLowerCase();
      let score = 0;
      for (const w of words) {
        const i = l.indexOf(w);
        if (i >= 0) score += (i === 0 ? 0 : /\W/.test(l[i - 1]) ? 2 : 5) + i / 100;
        else if (h.includes(w)) score += 20;
        else return null;
      }
      return { c, score };
    }).filter(Boolean).sort((a, b) => a.score - b.score).map(x => x.c);
  };
  const closePalette = () => {
    if (!palEl) return;
    const p = palEl;
    palEl = null;
    // while it fades out it must not keep the keyboard: a key pressed then (Ctrl+K again, a shortcut) would go to
    // its text box, be taken as typing, and the next keys would reach YouTube Music
    if (p.contains(document.activeElement)) document.activeElement.blur();
    p.inert = true;
    p.classList.add('am-pal-out');
    setTimeout(() => p.remove(), 140);
  };
  const openPalette = () => {
    if (palEl) { closePalette(); return; }
    if (zenEl) return;
    closeMenu();
    closeSettings();
    const back = el('div', 'am-pal-back', document.body);
    const box = el('div', 'am-pal', back);
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'r1ytm commands');
    const input = el('input', 'am-pal-input', box);
    input.placeholder = 'Type a command or a setting…';
    input.setAttribute('aria-label', 'Command');
    const list = el('div', 'am-pal-list', box);
    list.setAttribute('role', 'listbox');
    const all = paletteCommands();
    let shown = [], sel = 0;
    const render = () => {
      shown = palFilter(all, input.value).slice(0, 60);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.replaceChildren();
      if (!shown.length) { el('div', 'am-pal-empty', list).textContent = 'Nothing found'; return; }
      shown.forEach((c, i) => {
        const r = el('div', 'am-pal-item' + (i === sel ? ' am-kb' : '') + (c.on ? ' am-pal-on' : ''), list);
        r.setAttribute('role', 'option');
        el('span', 'am-pal-label', r).textContent = c.label;
        if (c.hint) el('span', 'am-pal-hint', r).textContent = c.hint;
        r.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(); } });
        r.addEventListener('click', () => run(c));
      });
    };
    const mark = () => [...list.children].forEach((r, i) => r.classList.toggle('am-kb', i === sel));
    const run = c => { closePalette(); c.run(); };
    input.addEventListener('input', () => { sel = 0; render(); });
    back.addEventListener('keydown', e => {
      e.stopPropagation();                             // no YTM hotkeys while typing here
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!shown.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
        mark();
        const r = list.children[sel];
        if (r) r.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); if (shown[sel]) run(shown[sel]); }
      else if (comboOf(e) === keyOf(ACTIONS[0])) { e.preventDefault(); closePalette(); }   // the palette key again
    });
    back.addEventListener('mousedown', e => { if (e.target === back) { e.preventDefault(); closePalette(); } });
    render();
    palEl = back;
    input.focus({ preventScroll: true });
  };
  window.amPalette = openPalette;

  const keyStyle = el('style', null, document.head);
  keyStyle.textContent = `
    .am-key-chip { min-width: 64px; text-align: center; font-variant-numeric: tabular-nums; background: rgb(255 255 255 / .08); }
    .am-key-chip.am-key-none { color: rgb(255 255 255 / .4); }
    .am-key-chip.am-key-rec { background: #fa586a; color: #fff; }
    .am-pal-back { position: fixed; inset: 0; z-index: 100003; display: flex; justify-content: center; align-items: flex-start;
      padding: 14vh 16px 16px; background: rgb(0 0 0 / .3); animation: am-set-fade .14s ease; }
    .am-pal-back.am-pal-out { opacity: 0; transition: opacity .12s ease; pointer-events: none; }
    .am-pal { width: min(560px, 100%); max-height: 60vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 16px;
      color: #fff; font-family: var(--am-font, "Switzer", "SF Pro", system-ui, sans-serif);
      background: rgb(34 34 36 / .82); backdrop-filter: blur(40px) saturate(190%); -webkit-backdrop-filter: blur(40px) saturate(190%);
      border: 1px solid rgb(255 255 255 / .12); box-shadow: 0 24px 70px rgb(0 0 0 / .5); animation: am-set-in .16s cubic-bezier(.2, .8, .2, 1); }
    .am-pal-input { all: unset; box-sizing: border-box; width: 100%; padding: 15px 18px; font-size: 15px;
      border-bottom: 1px solid rgb(255 255 255 / .1); }
    .am-pal-input::placeholder { color: rgb(255 255 255 / .4); }
    .am-pal-list { overflow-y: auto; padding: 6px; scrollbar-width: thin; }
    .am-pal-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-size: 13.5px; }
    .am-pal-item.am-kb { background: rgb(255 255 255 / .12); }
    .am-pal-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .am-pal-on .am-pal-label::after { content: " ✓"; color: #fa586a; }
    .am-pal-hint { margin-left: auto; flex-shrink: 0; font-size: 11.5px; color: rgb(255 255 255 / .45); white-space: nowrap; }
    .am-pal-empty { padding: 14px; font-size: 13px; color: rgb(255 255 255 / .5); }
    @media (prefers-reduced-motion: reduce) { .am-pal-back, .am-pal { animation: none; } }
  `;
