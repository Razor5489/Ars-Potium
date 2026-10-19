/* Ars Potionum - indice e argomenti delle pagine affiancate, 2026-10-19 */
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

  const spreadOption = document.createElement('option');
  spreadOption.value = '__visible_spread__';
  spreadOption.disabled = true;
  select.appendChild(spreadOption);

  const topics = document.createElement('div');
  topics.id = 'spread-topics';
  topics.hidden = true;
  topics.setAttribute('aria-live', 'polite');
  const leftTopic = document.createElement('span');
  const rightTopic = document.createElement('span');
  topics.append(leftTopic, rightTopic);
  const toolbar = select.closest('.top');
  if (toolbar) toolbar.appendChild(topics);
  select.setAttribute('aria-describedby', topics.id);

  const titleFor = page => {
    const chapter = chapters.find(item => Number(item.page) - 1 === page);
    return chapter ? chapter.title : pageTitle(page);
  };

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
    topics.hidden = visible.length !== 2;
    spreadOption.hidden = topics.hidden;
    if (visible.length === 2) {
      const [left, right] = visible;
      const leftTitle = titleFor(left), rightTitle = titleFor(right);
      const leftText = 'Sinistra · p. ' + (left + 1) + ' · ' + leftTitle;
      const rightText = 'Destra · p. ' + (right + 1) + ' · ' + rightTitle;
      if (leftTopic.textContent !== leftText) leftTopic.textContent = leftText;
      if (rightTopic.textContent !== rightText) rightTopic.textContent = rightText;
      spreadOption.textContent = 'Indice · pagine ' + (left + 1) + '–' + (right + 1);
      select.value = spreadOption.value;
      select.title = leftText + ' / ' + rightText;
    } else {
      select.value = String(active.page);
      select.title = 'Tabula Materiarum · ' + active.title;
    }
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
    .top { flex-wrap:wrap;row-gap:6px; }
    #spread-topics {
      flex:0 0 100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
      gap:16px;padding-top:5px;border-top:1px solid #b8974e30;
      color:#d7c9aa;font:italic 11px/1.4 Georgia,serif;text-align:center;
    }
    #spread-topics[hidden] { display:none; }
    #spread-topics span { min-width:0;overflow-wrap:anywhere; }

  `;
  document.head.appendChild(style);
  // Ricalcola lo spazio del libro quando la riga degli argomenti cambia altezza.
  if (toolbar && typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => resize());
    observer.observe(toolbar);
    window.addEventListener('pagehide', () => observer.disconnect(), {once:true});
  }
  sync();
})();
