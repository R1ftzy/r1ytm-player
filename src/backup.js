  /* ---------- backup: export / import every setting as one file (settings "Misc" -> "Backup") ---------- */
  // The file is JSON: the settings (am-settings), the bar layout, the look (am-look: font, background, page dims...),
  // zen's last length, and the files the look uses (font, background image, gradient and its strokes) from IndexedDB
  // as base64. Import checks all of it first and changes nothing when the file is not valid.
  const BACKUP_FORMAT = 1;
  const BACKUP_FILES = ['font', 'bg-image', 'bg-gradient', 'grad-paint'];      // IndexedDB keys (see look.js)
  const BACKUP_MAX = 60 * 1024 * 1024;                                         // a bigger file is not ours
  let backupMsg = '';                         // the import result, shown in the panel built again after an import

  const toB64 = buf => {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const fromB64 = s => {
    const bin = atob(s), b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  };
  // a stored file -> { kind, type, data }: the font is kept as an ArrayBuffer, the pictures as Blobs
  const packFile = async v => {
    if (v instanceof Blob) return { kind: 'blob', type: v.type || '', data: toB64(await v.arrayBuffer()) };
    if (v instanceof ArrayBuffer) return { kind: 'buffer', type: '', data: toB64(v) };
    if (ArrayBuffer.isView(v)) return { kind: 'buffer', type: '', data: toB64(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)) };
    return null;
  };
  const unpackFile = f => {
    if (!f || typeof f !== 'object' || typeof f.data !== 'string' || !/^(blob|buffer)$/.test(f.kind)) throw new Error('a file in it is damaged');
    const b = fromB64(f.data);
    return f.kind === 'blob' ? new Blob([b], { type: typeof f.type === 'string' ? f.type : '' }) : b.buffer;
  };

  const exportSettings = async note => {
    try {
      const files = {};
      for (const k of BACKUP_FILES) {
        let v = null;
        try { v = await idb.get(k); } catch {}
        const p = v ? await packFile(v) : null;
        if (p) files[k] = p;
      }
      const data = {
        app: 'r1ytm', format: BACKUP_FORMAT, version: VERSION, exported: new Date().toISOString(),
        settings: Object.assign({}, settings),
        layout: layoutNow,
        look: JSON.parse(JSON.stringify(look)),
        zenMinutes: zenMins(),
        files,
      };
      const name = 'r1ytm-settings-' + new Date().toISOString().slice(0, 10) + '.json';
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      const a = el('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      if (note) note.textContent = 'Saved ' + name;
    } catch (e) {
      console.warn('[am-bar] export failed', e);
      if (note) note.textContent = 'Export failed: ' + (e && e.message || e);
    }
  };

  // check the file and turn it into the values to apply; throws with a short reason when it is not valid
  const readBackup = text => {
    let d;
    try { d = JSON.parse(text); } catch { throw new Error('not a JSON file'); }
    if (!d || typeof d !== 'object' || d.app !== 'r1ytm') throw new Error('not an r1ytm settings file');
    if (typeof d.format !== 'number' || d.format > BACKUP_FORMAT) throw new Error('made by a newer r1ytm, update first');
    if (!d.settings || typeof d.settings !== 'object') throw new Error('it has no settings');
    // settings: every known key, a number in its range; a missing one goes back to its default
    const s = {};
    for (const def of SETTINGS) {
      if (!(def.key in d.settings)) { s[def.key] = def.def; continue; }
      const v = Number(d.settings[def.key]);
      if (!Number.isFinite(v)) throw new Error('the value of "' + (def.label || def.key) + '" is not a number');
      s[def.key] = Math.min(def.max, Math.max(def.min, v));
    }
    const layout = LAYOUTS.includes(d.layout) ? d.layout : 'full';
    // look: only the known keys, each of the same type as its default
    const lk = JSON.parse(JSON.stringify(LOOK_DEF));
    if (d.look && typeof d.look === 'object') {
      for (const k of Object.keys(LOOK_DEF)) {
        if (!(k in d.look)) continue;
        const v = d.look[k], def = LOOK_DEF[k];
        const ok = def === null ? v === null || typeof v === 'object'
          : typeof def === 'object' ? v && typeof v === 'object' && !Array.isArray(v)
          : typeof v === typeof def && (typeof v !== 'number' || Number.isFinite(v));
        if (!ok) throw new Error('the look value "' + k + '" is not valid');
        lk[k] = v;
      }
    }
    const zm = Number(d.zenMinutes);
    const files = {};
    if (d.files && typeof d.files === 'object') {
      for (const k of BACKUP_FILES) if (d.files[k]) {
        try { files[k] = unpackFile(d.files[k]); } catch (e) { throw new Error((e && e.message) || 'a file in it is damaged'); }
      }
    }
    return { settings: s, layout, look: lk, zenMinutes: Number.isFinite(zm) ? zm : null, files };
  };

  const importSettings = note => ui.file('.json,application/json', async f => {
    const say = t => { if (note) note.textContent = t; };
    try {
      if (f.size > BACKUP_MAX) throw new Error('the file is too big');
      const b = readBackup(await f.text());
      // the files first: if one can't be saved, nothing else changes
      for (const [k, v] of Object.entries(b.files)) await idb.set(k, v);
      const was = Object.assign({}, settings);
      Object.assign(settings, b.settings);
      applySettings();
      saveSettings();
      for (const s of SETTINGS) if (s.change && was[s.key] !== settings[s.key]) { try { s.change(); } catch {} }
      applyMode(b.layout);
      placeBar();
      hideBase();
      for (const k of Object.keys(look)) delete look[k];
      Object.assign(look, b.look);
      saveLook();
      if (fileFace) { document.fonts.delete(fileFace); fileFace = null; }      // a new font file: load it again
      applyFont();
      applyBg();
      applyBanner();
      applyArtist();
      if (b.zenMinutes !== null) store.set(ZEN_MIN_KEY, String(b.zenMinutes));
      // the panel built again with the new values; the note says it worked
      if (setEl) { backupMsg = 'Imported ' + f.name; rebuildSettings(); }
      else say('Imported ' + f.name);
    } catch (e) {
      console.warn('[am-bar] import failed', e);
      say('Not imported: ' + ((e && e.message) || e) + '. Nothing was changed');
    }
  });
