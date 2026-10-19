/* Ars Potionum - indice sincronizzato con la lettura, 2026-10-19 */
(() => {
  'use strict';
  if (window.__arsChapterNavigation) return;
  const select = document.getElementById('chapters');
  if (!select || typeof data === 'undefined' || typeof goPage !== 'function' || typeof window.controls !== 'function') return;
  window.__arsChapterNavigation = true;

  const romanYears = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const normalizeTitle = title => title
    .replace(/^ANTE IGNEM\s*—\s*/, 'Ante Ignem · ')
    .replace(/^IL CALDERONE\s*—\s*/, 'Il calderone · ')
    .replace(/^ARS IGNIS\s*—\s*/, 'Ars Ignis · ')
    .replace(/^DE MOTU\s*—\s*/, 'De Motu · ')
    .replace(/^TEMPUS\s*—\s*/, 'Tempus · ')
    .replace(/^DE LICENTIA\s*—\s*/, 'De Licentia · ')
    .replace(/^IUDICIUM POTIONARII\s*—\s*/, 'Iudicium Potionarii · ')
    .replace(/^GLOSSARIUM POTIONARIUM$/, 'Glossarium Potionarium')
    .replace(/^NOTA D’AUTORE$/, 'Nota d’autore')
    .replace(/^COPYRIGHT & RISERVA AI\/TDM$/, 'Copyright · Riserva AI/TDM');

  const titleFor = (page, index) => {
    const lines = String(page.text || '').split('\n').map(line => line.trim()).filter(Boolean);
    if (index === 0) return 'Copertina';
    if (lines[0] === 'Quarta di copertina. Ars Potionum. Lucian Sharp. Hogwarts · MDCCC.') return 'Quarta di copertina';
    if (lines[0] === 'Controguardia posteriore marmorizzata.') return 'Controguardia posteriore';
    const section = lines[1] || '';
    const title = lines[2] || pageTitle(index);
    if (section === 'FINIS') return 'Finis';
    if (section === 'PRAEFATIO') return 'Praefatio · ' + title;
    if (section === 'TABULA MATERIARUM') return 'Tabula Materiarum · Indice del volume';
    if (section === 'RESTRICTIONES SPECIALES') return 'Restrizioni speciali';
    const year = section.match(/^ANNO ([IVX]+|\d+)(\s*·\s*RICETTARIO)?$/);
    if (year) {
      if (year[2]) return title;
      const number = Number(year[1]);
      const roman = romanYears[number] || year[1];
      return 'Anno ' + roman + ' · ' + title + (number ? ' (introduzione)' : '');
    }
    if (section.startsWith('APPENDICE II ·')) {
      return 'Inventario degli ingredienti · ' + (lines[3].startsWith('Seconda parte.') ? 'Seconda parte' : 'Prima parte');
    }
    return normalizeTitle(title);
  };

  const chapters = data.pages.map((page, index) => ({page:index + 1, title:titleFor(page, index)}));
  // Ogni voce corrisponde alla pagina effettiva, senza ereditare l'argomento precedente.
  const originalPlaceholder = select.querySelector('option[value=""]');
  select.replaceChildren();
  if (originalPlaceholder) select.appendChild(originalPlaceholder);
  for (const chapter of chapters) {
    const option = document.createElement('option');
    option.value = String(chapter.page);
    option.textContent = chapter.title;
    select.appendChild(option);
  }
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
