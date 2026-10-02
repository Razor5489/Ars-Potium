(() => {
  'use strict';

  if (window.__arsPotionumPageTurnSound) return;
  window.__arsPotionumPageTurnSound = true;

  const book = document.getElementById('book');
  if (!book) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  let ctx = null;
  let noiseBuffer = null;
  let lastPlayed = 0;

  const ensureAudio = () => {
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };

  const unlock = () => { ensureAudio(); };
  document.addEventListener('pointerdown', unlock, {capture:true, passive:true});
  document.addEventListener('touchstart', unlock, {capture:true, passive:true});
  document.addEventListener('keydown', unlock, {capture:true});

  const getNoise = audio => {
    if (noiseBuffer && noiseBuffer.sampleRate === audio.sampleRate) return noiseBuffer;
    const duration = 0.42;
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      smooth = smooth * 0.55 + white * 0.45;
      const t = i / length;
      const envelope = Math.sin(Math.PI * Math.min(1, t * 1.16));
      data[i] = (white * 0.74 + smooth * 0.26) * envelope;
    }

    noiseBuffer = buffer;
    return buffer;
  };

  const makeRustle = (audio, when, volume, highpass, lowpass, playbackRate) => {
    const source = audio.createBufferSource();
    const hp = audio.createBiquadFilter();
    const lp = audio.createBiquadFilter();
    const gain = audio.createGain();

    source.buffer = getNoise(audio);
    source.playbackRate.value = playbackRate;

    hp.type = 'highpass';
    hp.frequency.value = highpass;
    hp.Q.value = 0.55;

    lp.type = 'lowpass';
    lp.frequency.value = lowpass;
    lp.Q.value = 0.35;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.025);
    gain.gain.exponentialRampToValueAtTime(volume * 0.48, when + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.38);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(audio.destination);
    source.start(when);
    source.stop(when + 0.4);
  };

  const playPageTurn = () => {
    const nowMs = performance.now();
    if (nowMs - lastPlayed < 220) return;
    lastPlayed = nowMs;

    const audio = ensureAudio();
    if (!audio || audio.state !== 'running') return;

    const now = audio.currentTime + 0.005;
    makeRustle(audio, now, 0.085, 430, 6800, 1.0);
    makeRustle(audio, now + 0.075, 0.045, 900, 5200, 1.13);
  };

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1 && node.classList && node.classList.contains('leaf')) {
          playPageTurn();
          return;
        }
      }
    }
  });
  observer.observe(book, {childList:true});

  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const status = document.getElementById('status');
  if (status && reduce) {
    let previous = status.textContent;
    const statusObserver = new MutationObserver(() => {
      const current = status.textContent;
      if (current !== previous) {
        previous = current;
        if (reduce.matches) playPageTurn();
      }
    });
    statusObserver.observe(status, {childList:true, characterData:true, subtree:true});
  }

  window.addEventListener('pagehide', () => {
    try { if (ctx && ctx.state !== 'closed') ctx.close(); } catch (_) {}
  });
})();