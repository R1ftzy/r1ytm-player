  /* ---------- YouTube Music prompts: auto-switch for "Listen on this device?" ---------- */
  // YTM allows one device at a time on an account. It sometimes shows "Listen on this device? Your account is being
  // used on another device" and pauses, although only this device plays. With the setting on, r1ytm presses "Switch"
  // for you and shows a short note on the bar each time.
  // Safety: a wrong click could stop music on a real other device, or worse, confirm some other dialog. So r1ytm only
  // acts when the dialog's text matches this prompt AND it can tell the Switch button for sure (the confirm button of
  // a two-button dialog, its text "Switch" or the confirm slot). Anything else: it does nothing and logs it.
  // The text is checked in English only for now; amPromptProbe() records the dialog so other languages can be added.
  const PROMPT_TEXT = [/listen on this device/i, /being used on another device/i, /account is being used/i];
  const PROMPT_SWITCH = /^\s*(switch|listen here|play here)\s*$/i;
  const promptLog = [];                       // the last auto-switches and skips, for amPromptProbe()
  const dialogs = () => [...document.querySelectorAll('tp-yt-paper-dialog, ytmusic-popup-container [role="dialog"], yt-dialog-view-model')]
    .filter(d => d.getClientRects().length && getComputedStyle(d).display !== 'none' && getComputedStyle(d).visibility !== 'hidden');
  const btnText = b => (b.textContent || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
  const dialogButtons = d => [...d.querySelectorAll('button, tp-yt-paper-button, yt-button-renderer, yt-button-view-model')]
    .map(b => b.matches('button, tp-yt-paper-button') ? b : (b.querySelector('button, tp-yt-paper-button') || b))
    .filter((b, i, a) => a.indexOf(b) === i && b.getClientRects().length && btnText(b));
  // the Switch button of this prompt, or null when it isn't this prompt or the button isn't certain
  const switchButton = d => {
    const text = (d.innerText || d.textContent || '');
    if (!PROMPT_TEXT.some(re => re.test(text))) return null;
    const bs = dialogButtons(d);
    if (bs.length !== 2) return null;
    const byText = bs.filter(b => PROMPT_SWITCH.test(btnText(b)));
    if (byText.length === 1) return byText[0];
    // no English label: the confirm slot of YTM's confirm dialog
    const conf = d.querySelector('#confirm-button button, #confirm-button tp-yt-paper-button, #confirm-button');
    return conf && bs.includes(conf.matches('button, tp-yt-paper-button') ? conf : conf.querySelector('button, tp-yt-paper-button')) ? conf : null;
  };
  const describe = d => ({
    tag: d.tagName.toLowerCase(), id: d.id, cls: typeof d.className === 'string' ? d.className : '',
    text: (d.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 200),
    buttons: dialogButtons(d).map(b => ({ text: btnText(b), slot: (b.closest('[id]') || {}).id || '', tag: b.tagName.toLowerCase() })),
    renderers: [...new Set([...d.querySelectorAll('*')].map(n => n.tagName.toLowerCase()).filter(t => /renderer|view-model/.test(t)))].slice(0, 12),
  });
  let promptBusy = 0;
  const checkPrompts = () => {
    if (!settings.autoSwitch || performance.now() < promptBusy) return;
    for (const d of dialogs()) {
      const b = switchButton(d);
      if (!b) continue;
      promptBusy = performance.now() + 1500;          // one click per dialog; YTM needs a moment to close it
      d.style.setProperty('opacity', '0', 'important'); // hidden first, so it doesn't flash
      b.click();
      promptLog.push({ at: new Date().toLocaleTimeString(), dialog: describe(d) });
      if (promptLog.length > 10) promptLog.shift();
      setTimeout(() => {
        d.style.removeProperty('opacity');
        const v = video();
        if (v && v.paused) { const pp = yt('PlayPause'); if (pp) pp.click(); else v.play().catch(() => {}); }
      }, 600);
      toast('Switched to this device');
      return;
    }
  };
  // watch for dialogs as they open (no wait for the next tick), only while the setting is on
  // (at most every 100 ms: YTM changes its page all the time); the sync loop checks too, also in zen
  let promptQueued = false;
  const promptObs = new MutationObserver(() => {
    if (promptQueued) return;
    promptQueued = true;
    setTimeout(() => { promptQueued = false; checkPrompts(); }, 100);
  });
  const syncPromptWatch = () => {
    promptObs.disconnect();
    if (settings.autoSwitch) promptObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['opened', 'aria-hidden'] });
  };
  syncPromptWatch();
  // amPromptProbe(): the dialogs open now and the last auto-switches. Run it while the prompt is on screen and send the
  // output: it shows how to recognize the prompt in other languages
  window.amPromptProbe = () => {
    const open = dialogs().map(d => Object.assign(describe(d), { wouldSwitch: !!switchButton(d) }));
    console.log('[am-bar] prompts: setting ' + (settings.autoSwitch ? 'on' : 'off') + '. Open dialogs:', open, 'Last auto-switches:', promptLog);
    return { open, log: promptLog.slice() };
  };
