  /* ---------- high-quality art (Bar & menus > Art, off by default) ---------- */
  // YTM asks Google's image server for small pictures. Two kinds of address:
  // - lh3. / yt3.googleusercontent.com, yt3.ggpht.com (song and album art, artist pictures): the size is in the address (=w60-h60..., =s120):
  //   asked again at the size shown x the screen's pixel ratio, up to 1200.
  // - i.ytimg.com/vi/<id>/... (videos, and songs that only have a video's thumbnail): maxresdefault.jpg, else hq720.jpg.
  //   A missing one is an error or a 120 x 90 gray picture; then the next one is tried, and at the end the small one stays.
  // The bigger picture is loaded first and only then put in, so nothing flashes or goes blank. The results are kept
  // (small address -> big one, or '' when there is none), so each picture is asked for once.
  // Only pictures on screen: the player page, the queue, and the song rows and cards of the page.
  const HQ_MAX = 1200, HQ_CACHE = 600, HQ_PER_TICK = 40;
  const hqCache = new Map(), hqPending = new Set();
  const hqSize = px => Math.min(HQ_MAX, Math.max(120, Math.ceil(px * (devicePixelRatio || 1) / 60) * 60));
  const hqCandidates = (src, px) => {
    let m;
    if (/^https:\/\/((lh|yt)\d+\.googleusercontent\.com|yt\d+\.ggpht\.com)\//.test(src)) {
      const n = hqSize(px);
      if ((m = src.match(/=w(\d+)-h(\d+)/))) return Math.min(+m[1], +m[2]) >= n ? [] : [src.replace(/=w\d+-h\d+/, `=w${n}-h${n}`)];
      if ((m = src.match(/=s(\d+)/))) return +m[1] >= n ? [] : [src.replace(/=s\d+/, `=s${n}`)];
      return [];
    }
    if ((m = src.match(/^https:\/\/i\d?\.ytimg\.com\/vi(?:_webp)?\/([\w-]{11})\/(default|mqdefault|hqdefault|sddefault|hq720|maxresdefault)/))) {
      if (m[2] === 'maxresdefault' || m[2] === 'hq720') return [];
      return [`https://i.ytimg.com/vi/${m[1]}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${m[1]}/hq720.jpg`];
    }
    return [];
  };
  const hqLoad = (src, cands) => {
    if (!cands.length) { hqCache.set(src, ''); return; }
    hqPending.add(src);
    const done = big => {
      hqPending.delete(src);
      if (hqCache.size >= HQ_CACHE) hqCache.delete(hqCache.keys().next().value);
      hqCache.set(src, big);
    };
    const next = i => {
      if (i >= cands.length) { done(''); return; }
      const im = new Image();
      im.onload = () => { if (im.naturalWidth <= 120) next(i + 1); else done(cands[i]); };   // 120 x 90: the "missing" picture
      im.onerror = () => next(i + 1);
      im.src = cands[i];
    };
    next(0);
  };
  // the address to show for src at px wide: the big one once it has loaded, else src (and the loading starts)
  const hqFor = (src, px) => {
    if (!settings.hqArt || !src) return src;
    if (hqCache.has(src)) return hqCache.get(src) || src;
    if (!hqPending.has(src)) hqLoad(src, hqCandidates(src, px));
    return src;
  };
  const HQ_IMGS = 'ytmusic-player-page #song-image img, ytmusic-player #song-image img, ytmusic-player-queue-item img, ' +
    'ytmusic-responsive-list-item-renderer img, ytmusic-two-row-item-renderer img, ytmusic-responsive-header-renderer img';
  // which of those pictures are on screen: an IntersectionObserver keeps the set, so only those are measured (not
  // every row picture of a long page, each second). It starts over every 10 calls: pictures YTM threw away aren't kept
  const hqVisible = new Set();
  let hqSeen = new WeakSet(), hqCalls = 0;
  const hqIO = new IntersectionObserver(entries => {
    for (const e of entries) { if (e.isIntersecting) hqVisible.add(e.target); else hqVisible.delete(e.target); }
  });
  const hqReset = () => { hqIO.disconnect(); hqVisible.clear(); hqSeen = new WeakSet(); };
  const syncHqArt = () => {
    if (!settings.hqArt) { if (hqCalls) { hqReset(); hqCalls = 0; } return; }
    if (++hqCalls % 10 === 0) hqReset();
    for (const img of document.querySelectorAll(HQ_IMGS)) if (!hqSeen.has(img)) { hqSeen.add(img); hqIO.observe(img); }
    let n = 0;
    for (const img of hqVisible) {
      if (!img.isConnected) { hqVisible.delete(img); continue; }
      const src = img.getAttribute('src') || '';
      if (!/^https:/.test(src)) continue;
      const r = img.getBoundingClientRect();
      if (r.width < 24) continue;
      const big = hqFor(src, Math.max(r.width, r.height));
      if (big !== src) {
        if (img.hasAttribute('srcset')) img.removeAttribute('srcset');   // a srcset would win over the new src
        img.src = big;
      }
      if (++n >= HQ_PER_TICK) break;
    }
  };
