/* Reading refinements. Page artwork and editorial text remain authoritative. */
(() => {
  'use strict';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const folio = i => data.pages[i]?.folio || String(i + 1);
  const title = i => {
    const lines = pageText(i).split('\n').filter(Boolean);
    const special={0:'Copertina',49:'Restrizioni speciali',57:'Finis',60:'Controguardia posteriore',61:'Quarta di copertina'};
    return special[i] || lines[2] || lines[0] || pageTitle(i);
  };
  let selectedPage = null;
  const activePage = () => indexPair(current).includes(selectedPage) ? selectedPage : currentPage();
  let bookmarks = read('ars-bookmarks-v1', []);
  if (!Array.isArray(bookmarks)) bookmarks = [];
  bookmarks = bookmarks.filter(i => Number.isInteger(i) && i >= 0 && i < count);
  const tools = document.querySelector('.tools');
  const indexButton = document.createElement('button');
  indexButton.id = 'open-index'; indexButton.textContent = 'Indice & ricerca';
  indexButton.setAttribute('aria-haspopup','dialog'); tools.prepend(indexButton);
  const bookmark = document.createElement('button');
  bookmark.id = 'bookmark-page'; bookmark.textContent = 'Segna pagina'; tools.append(bookmark);
  const options = document.createElement('details'); options.className = 'reader-options';
  options.innerHTML = '<summary>Opzioni</summary><div class="options-content"></div>';
  tools.append(options);
  const moveOptions = () => {
    for (const selector of ['#sound','#full','.music-controls','#scholar-presence-inline']) {
      const el = document.querySelector(selector);
      if (el && el.parentElement !== options.lastElementChild) options.lastElementChild.append(el);
    }
  };
  moveOptions(); new MutationObserver(moveOptions).observe(tools,{childList:true,subtree:true});
  const dialog = document.createElement('dialog'); dialog.id = 'reader-index';
  dialog.innerHTML = '<div class="index-heading"><div><small>TABULA MATERIARUM</small><h2>Il tuo volume</h2></div><button id="close-index" aria-label="Chiudi indice">×</button></div><label for="book-search">Cerca una pozione, un ingrediente o una pagina</label><input type="search" id="book-search" placeholder="Es. Pepata, zenzero, 08A…"><div class="index-filters"><button id="show-all" aria-pressed="true">Tutto il volume</button><button id="show-saved" aria-pressed="false">Segnalibri</button></div><p id="search-count" role="status"></p><nav id="index-results" aria-label="Pagine del volume"></nav>';
  document.body.append(dialog);
  const search = $('book-search'); let savedOnly = false;
  const normalized = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const results = () => {
    const query = normalized(search.value.trim()); const list = $('index-results'); list.replaceChildren();
    data.pages.forEach((page,i) => {
      if (savedOnly && !bookmarks.includes(i)) return;
      if (query && !normalized(page.text+' '+folio(i)).includes(query)) return;
      const button = document.createElement('button'); button.className = 'index-entry';
      const name = document.createElement('span'); name.textContent = title(i);
      const number = document.createElement('small'); number.textContent = folio(i);
      button.append(name,number); button.onclick = () => { dialog.close(); goPage(i); };
      list.append(button);
    });
    $('search-count').textContent = list.children.length ? `${list.children.length} ${list.children.length===1?'pagina':'pagine'}${savedOnly ? (list.children.length===1?' segnata':' segnate') : ''}` : 'Nessuna pagina trovata.';
  };
  const openIndex = () => { results(); dialog.showModal(); search.focus(); };
  indexButton.onclick = openIndex; $('close-index').onclick = () => dialog.close();
  dialog.addEventListener('click', e => {if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('keydown', e => e.stopPropagation());
  dialog.addEventListener('close', () => indexButton.focus());
  search.oninput = results;
  $('show-all').onclick = () => { savedOnly=false; $('show-all').setAttribute('aria-pressed','true');$('show-saved').setAttribute('aria-pressed','false');results(); };
  $('show-saved').onclick = () => { savedOnly=true; $('show-all').setAttribute('aria-pressed','false');$('show-saved').setAttribute('aria-pressed','true');results(); };
  const tabs = document.createElement('nav'); tabs.className = 'ribbon-tabs'; tabs.setAttribute('aria-label','Segnalibri dei capitoli');
  const sections = [['Indice',2],['Fondamenti',4],['I',14],['II',18],['III',22],['IV',27],['V',31],['VI',36],['VII',42],['Appendici',46],['Ingredienti',51],['Lessico',55]];
  sections.forEach(([label,page],i) => {
    const b=document.createElement('button');b.textContent=label;b.title=title(page);b.setAttribute('aria-label',label+' · '+title(page));b.dataset.page=page;
    b.onclick=()=>goPage(page);tabs.append(b);
  });
  stage.append(tabs);
  const baseControls = window.controls;
  window.controls = function (...args) {
    baseControls.apply(this,args);
    const visible=indexPair(current).filter(i=>i>=0&&i<count);
    $('status').textContent=(visible.length===2?'Pagine ':'Pagina ')+visible.map(folio).join(' · ');
    $('status').title='Posizione nel lettore: '+visible.map(i=>i+1).join('–')+' di '+count;
    if(document.activeElement!==$('pageInput'))$('pageInput').value=folio(visible[0]);
    const marked=bookmarks.includes(activePage());bookmark.textContent=marked?'Pagina segnata':'Segna pagina';bookmark.setAttribute('aria-pressed',String(marked));bookmark.title='Segnalibro: pagina '+folio(activePage());bookmark.disabled=busy;
    const p=activePage(); let active=0;sections.forEach((s,i)=>{if(p>=s[1])active=i;});
    [...tabs.children].forEach((b,i)=>{b.disabled=busy;b.setAttribute('aria-current',i===active&&p>=2?'page':'false');});
    if(!busy)save('ars-last-page-v1',activePage());
  };
  const input=$('pageInput');input.type='text';input.removeAttribute('min');input.removeAttribute('max');input.setAttribute('aria-label','Numero stampato sulla pagina, ad esempio 08A');input.title='Numero stampato nel libro, es. 13 o 08A';
  const canonical=s=>String(s).trim().toUpperCase().replace(/^0+(?=\d)/,'');
  $('jump').onsubmit=e=>{e.preventDefault();const n=data.pages.findIndex((_,i)=>canonical(folio(i))===canonical(input.value));if(n<0){input.setCustomValidity('Inserisci un numero stampato nel libro, per esempio 13 o 08A.');input.reportValidity();}else{input.setCustomValidity('');goPage(n);}};
  input.oninput=()=>input.setCustomValidity('');
  bookmark.onclick=()=>{const p=activePage();bookmarks=bookmarks.includes(p)?bookmarks.filter(i=>i!==p):[...bookmarks,p];save('ars-bookmarks-v1',bookmarks);controls();};
  // Long jumps crossfade once; adjacent pages retain their paper turn.
  window.goPage = async function(n) {
    n=Math.max(0,Math.min(count-1,n));const target=single?n:n===0?0:Math.floor((n+1)/2);
    if(busy)return;
    selectedPage=n;
    if(target===current){controls();return;}
    if(Math.abs(target-current)===1)return turnTo(target);
    busy=true;controls();
    try {
      await Promise.all(indexPair(target).map(loadImage));
      current=target;render();
      if(!reduce.matches)await book.animate([{opacity:.35},{opacity:1}],{duration:180,easing:'ease-out'}).finished;
    } catch {} finally {busy=false;render();wake();viewport.scrollTo({top:0,left:0});}
  };
  // A single page uses the available width on small screens, with native vertical scroll.
  const baseResize=window.resize;
  window.resize=function(){
    baseResize();
    if(isCompact()&&!zoomed){const w=Math.max(180,viewport.clientWidth-36);stage.style.setProperty('--width',w+'px');stage.style.setProperty('--height',(w*841.89/595.276)+'px');canvas.style.minHeight=(w*841.89/595.276+52)+'px';viewport.style.overflow='auto';}
  };
  $('mode').onclick=()=>{if(busy||isCompact())return;const p=activePage();manualMode=true;single=!single;current=single?p:p===0?0:Math.floor((p+1)/2);render();resize();};
  const saved=read('ars-last-page-v1',0);
  if(Number.isInteger(saved)&&saved>0&&saved<count){selectedPage=saved;current=single?saved:Math.floor((saved+1)/2);}
  render();resize();
})();
