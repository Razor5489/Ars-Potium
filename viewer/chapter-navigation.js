/* Ars Potionum - indice sincronizzato con la lettura, 2026-10-19 */
(() => {
  'use strict';
  if (window.__arsChapterNavigation) return;
  const select = document.getElementById('chapters');
  if (!select || typeof data === 'undefined' || typeof goPage !== 'function' || typeof window.controls !== 'function') return;
  window.__arsChapterNavigation = true;

  const chapters = data.chapters
    .filter(chapter => Number.isInteger(Number(chapter.page)) && Number(chapter.page) >= 1 && Number(chapter.page) <= data.pages.length)
    .slice().sort((a, b) => Number(a.page) - Number(b.page));
  if (!chapters.length) return;
  let preferredPage = null;
  const placeholder = select.querySelector('option[value=""]');
  if (placeholder) placeholder.disabled = true;

  const sync = () => {
    select.disabled = busy;
    if (busy) return;
    const visible = indexPair(current).filter(page => page >= 0 && page < data.pages.length);
    const first = visible[0];
    if (first === undefined) return;
    if (preferredPage !== null && !visible.includes(preferredPage)) preferredPage = null;
    const page = preferredPage === null ? first : preferredPage;
    let active = chapters[0];
    for (const chapter of chapters) {
      if (Number(chapter.page) - 1 > page) break;
      active = chapter;
    }
    select.value = String(active.page);
    select.title = 'Tabula Materiarum · ' + active.title;
  };

  const originalControls = window.controls;
  window.controls = function (...args) {
    const result = originalControls.apply(this, args);
    sync();
    return result;
  };

  select.onchange = () => {
    if (select.value === '' || busy) { sync(); return; }
    const page = Number(select.value) - 1;
    if (!Number.isInteger(page) || page < 0 || page >= data.pages.length) { sync(); return; }
    preferredPage = page;
    // I capitoli usano pagine da 1, mentre goPage usa indici da 0.
    Promise.resolve(goPage(page)).then(sync, sync);
  };
  select.addEventListener('focus', () => wake());
  select.addEventListener('pointerdown', () => wake());
  select.addEventListener('blur', () => wake());

  const style = document.createElement('style');
  style.textContent = `
    .shell.idle .top:focus-within {
      opacity:1;transform:none;pointer-events:auto;
    }
    #chapters option { background:#13261e;color:#e8ddc0; }
  `;
  document.head.appendChild(style);
  sync();
})();
