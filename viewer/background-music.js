(() => {
  'use strict';

  const toolbar = document.querySelector('.tools');
  if (!toolbar || document.getElementById('background-music')) return;

  const style = document.createElement('style');
  style.textContent = `
    .music-controls{position:relative;display:flex;align-items:center;gap:5px}
    #music-toggle{white-space:nowrap;min-width:137px}
    #music-toggle[aria-pressed="true"]{color:#ecd7a7;border-color:#c6a768;background:#203c2c}
    #music-info{padding-inline:11px;color:#c6a768}
    .music-panel{position:absolute;right:0;top:calc(100% + 10px);width:min(290px,calc(100vw - 30px));padding:17px;border:1px solid #6e6446;border-radius:9px;background:#10271d;color:#eee9db;box-shadow:0 10px 30px #0008;z-index:30;line-height:1.6}
    .music-panel[hidden]{display:none}
    .music-panel p{margin:0 0 12px}
    .music-panel a{color:#e1c68d;text-decoration:underline;text-underline-offset:3px}
    .music-panel label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}
    #music-volume{display:block;width:100%;min-height:30px;accent-color:#c6a768;cursor:pointer}
    .music-panel small{display:block;color:#bdcbbb;font-size:12px}
    #music-status{margin:8px 0 0;font-size:12px;color:#d6d9c9}
    @media(max-width:1100px){.top{flex-wrap:wrap}.tools{flex-wrap:wrap}}
    @media(max-width:850px){#music-toggle{min-width:130px}.music-controls{position:static}.tools{position:relative}.music-panel{right:0}}
  `;
  document.head.appendChild(style);

  const audio = document.createElement('audio');
  audio.id = 'background-music';
  audio.preload = 'none';
  audio.loop = true;
  audio.setAttribute('playsinline', '');
  // Stream the unmodified recording from the composer's official website.
  const trackUrl = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dreams%20Become%20Real.mp3';

  const group = document.createElement('div');
  group.className = 'music-controls';
  group.innerHTML = `
    <button id="music-toggle" type="button" aria-pressed="false" aria-label="Attiva la musica di sottofondo" title="Dreams Become Real — Kevin MacLeod"><span aria-hidden="true">♫</span> Musica: OFF</button>
    <button id="music-info" type="button" aria-label="Volume e crediti della musica" aria-expanded="false" aria-controls="music-panel" title="Volume e crediti">ⓘ</button>
    <section class="music-panel" id="music-panel" aria-label="Musica di sottofondo" hidden>
      <p><strong>Dreams Become Real</strong><br>Kevin MacLeod · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500027" target="_blank" rel="noopener noreferrer">incompetech.com</a><br><small>Licenza <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0</a></small></p>
      <label for="music-volume">Volume <output id="music-volume-value" for="music-volume">20%</output></label>
      <input id="music-volume" type="range" min="0" max="100" value="20" step="1" aria-label="Volume della musica">
      <small>La musica continua mentre sfogli il libro.</small>
      <p id="music-status" role="status" aria-live="polite">Premi Musica per iniziare l’ascolto.</p>
    </section>
  `;
  toolbar.append(group);
  document.body.append(audio);

  const toggle = document.getElementById('music-toggle');
  const info = document.getElementById('music-info');
  const panel = document.getElementById('music-panel');
  const volume = document.getElementById('music-volume');
  const volumeValue = document.getElementById('music-volume-value');
  const status = document.getElementById('music-status');
  let request = 0;
  let starting = false;

  const showPanel = open => {
    panel.hidden = !open;
    info.setAttribute('aria-expanded', String(open));
  };
  const render = () => {
    const playing = !audio.paused;
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? 'Spegni la musica di sottofondo' : 'Attiva la musica di sottofondo');
    toggle.innerHTML = '<span aria-hidden="true">♫</span> Musica: ' + (starting ? '…' : playing ? 'ON' : 'OFF');
  };
  const fail = () => {
    starting = false;
    audio.pause();
    render();
    status.textContent = 'Musica non disponibile. Premi Musica per riprovare.';
    showPanel(true);
  };

  let savedVolume = 20;
  try {
    const saved = localStorage.getItem('ars-potionum-music-volume');
    if (saved !== null && Number.isFinite(Number(saved))) savedVolume = Math.max(0, Math.min(100, Number(saved)));
  } catch (_) {}
  audio.volume = savedVolume / 100;
  audio.muted = savedVolume === 0;
  volume.value = String(savedVolume);
  volumeValue.value = savedVolume + '%';
  if (Math.abs(audio.volume - savedVolume / 100) > 0.001) {
    // Some mobile browsers leave volume control to the device buttons.
    volume.hidden = true;
    panel.querySelector('label').textContent = 'Regola il volume con i tasti del dispositivo.';
  }
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    audio.muted = Number(volume.value) === 0;
    volumeValue.value = volume.value + '%';
    try { localStorage.setItem('ars-potionum-music-volume', volume.value); } catch (_) {}
  });

  toggle.addEventListener('click', async () => {
    const currentRequest = ++request;
    if (starting || !audio.paused) {
      starting = false;
      audio.pause();
      status.textContent = 'Musica in pausa.';
      render();
      return;
    }
    starting = true;
    render();
    status.textContent = 'Caricamento della musica…';
    if (!audio.hasAttribute('src') || audio.error) audio.src = trackUrl;
    try {
      // Called directly from the click so mobile browsers can allow playback.
      await audio.play();
      if (currentRequest !== request) return;
      starting = false;
      status.textContent = 'In ascolto: Dreams Become Real — Kevin MacLeod.';
      render();
    } catch (error) {
      if (currentRequest !== request || error.name === 'AbortError') return;
      fail();
    }
  });
  audio.addEventListener('playing', () => {
    starting = false;
    status.textContent = 'In ascolto: Dreams Become Real — Kevin MacLeod.';
    render();
  });
  audio.addEventListener('pause', render);
  audio.addEventListener('error', fail);
  info.addEventListener('click', () => showPanel(panel.hidden));
  document.addEventListener('click', event => {
    if (!group.contains(event.target)) showPanel(false);
  });
  group.addEventListener('keydown', event => {
    // Keep reader shortcuts from turning pages while using music controls.
    event.stopPropagation();
    if (event.key === 'Escape' && !panel.hidden) {
      showPanel(false);
      info.focus();
    }
  });
  window.addEventListener('pagehide', () => audio.pause());
  window.dispatchEvent(new Event('resize'));
})();
