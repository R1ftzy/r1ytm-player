  /* ---------- build the bar ---------- */
  const bar = el('div', 'am-bar am-idle', document.body);
  bar.addEventListener('click', togglePage);

  const btn = (parent, icon, onClick, extra) => {
    const b = el('button', 'am-btn' + (extra ? ' ' + extra : ''), parent);
    b.append(svg(P[icon]));
    b.addEventListener('click', e => { e.stopPropagation(); onClick(b); });
    return b;
  };
  const clickYt = name => () => {
    const t = yt(name);
    if (t) { t.click(); return; }
    console.warn('[am-bar] YT button not found, using fallback:', name);
    const v = video();
    if (name === 'PlayPause' && v) v.paused ? v.play() : v.pause();
    else if (name === 'Next') key('N', true);
    else if (name === 'Previous') key('P', true);
  };

  // left: transport
  const left = el('div', 'am-group am-left', bar);
  const shuf = btn(left, 'shuffle', clickYt('Shuffle'), 'am-dim');
  btn(left, 'rew', clickYt('Previous'));
  const play = btn(left, 'play', clickYt('PlayPause'), 'am-big');
  btn(left, 'ff', clickYt('Next'));
  const rep = btn(left, 'repeat', clickYt('Repeat'), 'am-dim');

  // center: now playing (or logo when idle)
  const lcd = el('div', 'am-lcd', bar);
  const logo = el('div', 'am-logo', lcd);
  logo.append(ytLogo());
  const art = el('img', 'am-art', lcd);
  const info = el('div', 'am-info', lcd);
  const title = el('div', 'am-title', info);
  const artist = el('div', 'am-artist', info);
  const likeBtn = btn(lcd, 'heart', () => {
    const t = ytLike();
    if (t) t.click();
    else console.warn('[am-bar] like button not found');
  }, 'am-lcd-btn am-like');
  likeBtn.title = 'Like';
  const moreBtn = btn(lcd, 'more', b => openMenu(b), 'am-lcd-btn am-lcd-more');
  const track = el('div', 'am-track', lcd);
  const fill = el('div', 'am-fill', track);
  // click or drag to seek. While dragging only the fill follows the pointer; the song seeks once, on release
  let seeking = null;            // the position (0..1) being dragged to, null when not dragging
  const trackPos = e => {
    const r = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  track.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (!songTime()) return;
    e.stopPropagation();
    track.setPointerCapture(e.pointerId);
    track.classList.add('am-drag');
    seeking = trackPos(e);
    fill.style.width = seeking * 100 + '%';
  });
  track.addEventListener('pointermove', e => {
    if (seeking === null) return;
    seeking = trackPos(e);
    fill.style.width = seeking * 100 + '%';
  });
  const endSeek = commit => {
    if (seeking === null) return;
    const st = songTime();
    if (commit && st) seekSong(seeking * st.dur);
    seeking = null;
    track.classList.remove('am-drag');
  };
  track.addEventListener('pointerup', () => endSeek(true));
  track.addEventListener('pointercancel', () => endSeek(false));
  track.addEventListener('click', e => e.stopPropagation());     // a click here must not open the player page

