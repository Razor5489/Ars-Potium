/* Ars Potionum - fruscio di carta antica, versione delicata con volume aumentato del 20% 2026-10-19 */
(() => {
  'use strict';
  if (window.__arsAntiquePageAudio) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor || typeof window.rustleSound !== 'function' || typeof window.settleSound !== 'function') return;
  window.__arsAntiquePageAudio = true;

  let audio = null;
  let paperBuffer = null;

  const enabled = () => {
    const control = document.getElementById('sound');
    return !control || control.getAttribute('aria-pressed') !== 'false';
  };
  const context = () => {
    try {
      if (!audio || audio.state === 'closed') {
        audio = new AudioCtor();
        paperBuffer = null;
      }
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      return audio;
    } catch (_) {
      return null;
    }
  };
  const noise = ctx => {
    if (paperBuffer && paperBuffer.sampleRate === ctx.sampleRate) return paperBuffer;
    const length = Math.floor(ctx.sampleRate * 0.95);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let soft = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      soft = soft * 0.72 + white * 0.28;
      samples[i] = soft * 0.63 + white * 0.37;
    }
    paperBuffer = buffer;
    return buffer;
  };

  // Un soffio vellutato, seguito dal crepitio leggero delle fibre di carta.
  const layer = (ctx, start, duration, volume, hpHz, lpStart, lpEnd) => {
    volume *= 1.2;
    const source = ctx.createBufferSource();
    const high = ctx.createBiquadFilter();
    const low = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = noise(ctx);
    source.playbackRate.value = 0.97 + Math.random() * 0.07;
    high.type = 'highpass';
    high.frequency.value = hpHz;
    high.Q.value = 0.4;
    low.type = 'lowpass';
    low.frequency.setValueAtTime(lpStart, start);
    low.frequency.exponentialRampToValueAtTime(lpEnd, start + duration * 0.75);
    low.Q.value = 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + duration * 0.24);
    gain.gain.exponentialRampToValueAtTime(volume * 0.64, start + duration * 0.53);
    gain.gain.exponentialRampToValueAtTime(volume * 0.23, start + duration * 0.81);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
    source.stop(start + duration + 0.015);
  };

  // Sostituisce il sintetico 'whoosh' con tre fruscii corti e irregolari.
  window.rustleSound = function (heavy = false) {
    if (!enabled()) return;
    const ctx = context();
    if (!ctx) return;
    const now = ctx.currentTime + 0.008;
    layer(ctx, now, heavy ? 0.45 : 0.36, heavy ? 0.098 : 0.082, 360, 2300, 2850);
    layer(ctx, now + 0.16, heavy ? 0.32 : 0.27, heavy ? 0.068 : 0.058, 680, 4000, 2500);
    layer(ctx, now + 0.36, 0.13, heavy ? 0.023 : 0.019, 1600, 4900, 3600);
  };

  // Il foglio si adagia sul volume: solo un piccolo contatto di carta, niente tono elettronico.
  window.settleSound = function (heavy = false) {
    if (!enabled()) return;
    const ctx = context();
    if (!ctx) return;
    const now = ctx.currentTime + 0.006;
    layer(ctx, now, heavy ? 0.16 : 0.12, heavy ? 0.037 : 0.027, 250, 1950, 1250);
    layer(ctx, now + 0.025, 0.09, heavy ? 0.015 : 0.012, 1250, 3600, 2200);
  };

  window.addEventListener('pagehide', () => {
    try { if (audio && audio.state !== 'closed') audio.close(); } catch (_) {}
  });
})();