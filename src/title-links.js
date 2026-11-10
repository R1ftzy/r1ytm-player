  /* ---------- clickable title / artists / album ---------- */
  let albumIdx = -1;      // index of the album link in YTM's byline, -1 if none
  let bylineKey = '';

  const openLink = i => {
    const a = ytLinks()[i];
    if (a) a.click();
    else console.warn('[am-bar] byline link not found:', i);
  };
  const linkSpan = (text, i) => {
    const s = el('span', 'am-link', artist);
    s.textContent = text;
    s.addEventListener('click', e => { e.stopPropagation(); openLink(i); });
  };
  const sep = () => {
    const s = el('span', 'am-sep', artist);
    s.textContent = ' | ';
  };

  title.addEventListener('click', e => {
    if (albumIdx < 0) return;           // no album -> let the bar open the player
    e.stopPropagation();
    openLink(albumIdx);
  });

  const renderByline = m => {
    const links = ytLinks();
    const texts = links.map(a => a.textContent.trim());
    const key = texts.join('|') + '§' + (m.artist || '') + '§' + (m.album || '');
    if (key === bylineKey) return;      // only rebuild when something changed
    bylineKey = key;

    artist.replaceChildren();
    if (!links.length) {                // fallback: plain text
      artist.textContent = (m.artist || '') + (m.album ? ' | ' + m.album : '');
      albumIdx = -1;
      title.classList.remove('am-link');
      return;
    }

    const album = (m.album || '').trim().toLowerCase();
    albumIdx = album ? texts.findIndex(t => t.toLowerCase() === album) : -1;

    let first = true;
    texts.forEach((t, i) => {
      if (i === albumIdx) return;
      if (!first) artist.append(', ');
      linkSpan(t, i);
      first = false;
    });
    if (albumIdx >= 0) {
      sep();
      linkSpan(texts[albumIdx], albumIdx);
    }
    title.classList.toggle('am-link', albumIdx >= 0);
  };

  // right: lyrics, queue, volume, mode toggle
  const right = el('div', 'am-group am-right', bar);
  const lyricsBtn = btn(right, 'lyrics', () => showTab(...LYRICS));
  const queueBtn = btn(right, 'queue', () => showTab(...UPNEXT));

  const volWrap = el('div', 'am-vol', right);
  const volRange = el('input', null, volWrap);
  volRange.type = 'range';
  volRange.min = '0';
  volRange.max = '100';
  volRange.value = String(getVolume());
  volRange.addEventListener('input', () => setVolume(+volRange.value));
  volRange.addEventListener('click', e => e.stopPropagation());
  const volBtn = btn(volWrap, 'vol', () => {
    const v = video();
    if (v) v.muted = !v.muted;
  });

  /* bar layouts: full, compact (a centered pill) and classic (YouTube Music's own order: the song on the left, the
     transport in the middle, time / like / menu / volume on the right, the progress bar along the top edge).
     Classic needs another order, so its parts move into two boxes of their own, and back for the other layouts.
     A phone always gets the full layout's order (its own CSS is built on it). */
  const LAYOUTS = ['full', 'compact', 'classic'];
  const LAYOUT_NAMES = { full: 'Full bar', compact: 'Compact bar', classic: 'Classic bar' };
  const clLeft = el('div', 'am-cl-left'), clRight = el('div', 'am-cl-right');
  const timeEl = el('span', 'am-time');
  let layoutNow = 'full', domClassic = false;
  const syncLayoutDom = () => {
    const want = layoutNow === 'classic' && !isMobile();
    if (want === domClassic) return;
    domClassic = want;
    bar.classList.toggle('am-classic', want);
    if (want) {
      clLeft.append(logo, art, info);
      clRight.append(timeEl, likeBtn, moreBtn, right);
      bar.prepend(clLeft);                      // song | transport | the rest; the progress bar on the bar itself
      left.after(clRight);
      bar.append(track);
    } else {
      lcd.prepend(logo, art, info);
      lcd.append(likeBtn, moreBtn, track);
      bar.append(right);                        // transport | now playing | the rest, as before
      clLeft.remove();
      clRight.remove();
    }
  };
  const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const nextLayout = () => LAYOUTS[(LAYOUTS.indexOf(layoutNow) + 1) % LAYOUTS.length];
  const applyMode = mode => {
    layoutNow = LAYOUTS.includes(mode) ? mode : 'full';
    bar.classList.toggle('am-compact', layoutNow === 'compact');
    syncLayoutDom();
    // the bar's own button goes to the next layout: full -> compact -> classic -> full
    const next = nextLayout();
    modeBtn.replaceChildren(svg(next === 'compact' ? P.shrink : P.expand));
    modeBtn.title = LAYOUT_NAMES[next];
    store.set('am-bar-layout', layoutNow);
  };
  const modeBtn = btn(right, 'shrink', () => { applyMode(nextLayout()); placeBar(); }, 'am-mode');
  // the old key ("am-bar-compact": 1 / 0) still counts until a layout is picked
  applyMode(store.get('am-bar-layout', store.get('am-bar-compact', '0') === '1' ? 'compact' : 'full'));

