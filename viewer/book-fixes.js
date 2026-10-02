'use strict';
(() => {
  if (window.__arsPotionumBookFixes) return;
  window.__arsPotionumBookFixes = true;

  const fixes = {
    9:[{top:1227,old:'Attendi 3-15 secondi',text:'Attendi tra i 3 e massimo 15 secondi'}],
    10:[{top:1242,old:'Attendi 5-25 secondi',text:'Attendi tra i 5 e massimo 25 secondi'}],
    12:[{top:1227,old:'Attendi 3-12 secondi',text:'Attendi tra i 3 e massimo 12 secondi'}],
    13:[{top:1227,old:'Attendi 3-12 secondi',text:'Attendi tra i 3 e massimo 12 secondi'}],
    15:[{top:1171,old:'Attendi 8-30 secondi',text:'Attendi tra i 8 e massimo 30 secondi'}],
    16:[{top:1190,old:'Attendi 3-14 secondi',text:'Attendi tra i 3 e massimo 14 secondi'}],
    17:[{top:1190,old:'Attendi 3-14 secondi',text:'Attendi tra i 3 e massimo 14 secondi'}],
    19:[{top:1227,old:'Attendi 4-18 secondi',text:'Attendi tra i 4 e massimo 18 secondi'}],
    20:[{top:1190,old:'Attendi 5-20 secondi',text:'Attendi tra i 5 e massimo 20 secondi'}],
    22:[{top:1283,old:'Attendi 5-20 secondi',text:'Attendi tra i 5 e massimo 20 secondi'}],
    23:[{top:1171,old:'Attendi 6-25 secondi',text:'Attendi tra i 6 e massimo 25 secondi'}],
    24:[{top:1358,old:'Attendi 4-18 secondi',text:'Attendi tra i 4 e massimo 18 secondi'}],
    26:[{top:1206,old:'Attendi 4-18 secondi',text:'Attendi tra i 4 e massimo 18 secondi'}],
    27:[{top:1246,old:'Attendi 8-30 secondi',text:'Attendi tra i 8 e massimo 30 secondi'}],
    28:[{top:1209,old:'Attendi 10-40 secondi',text:'Attendi tra i 10 e massimo 40 secondi'}],
    30:[{top:1246,old:'Attendi 4-16 secondi',text:'Attendi tra i 4 e massimo 16 secondi'}],
    31:[
      {top:1339,old:'Attendi 12-45 secondi',text:'Attendi tra i 12 e massimo 45 secondi'},
      {top:1488,old:'Attendi 5-20 secondi',text:'Attendi tra i 5 e massimo 20 secondi'}
    ]
  };

  for (const [key,rows] of Object.entries(fixes)) {
    const i = Number(key);
    if (!data.pages[i]) continue;
    let t = data.pages[i].text || '';
    for (const row of rows) t = t.replace(row.old,row.text);
    data.pages[i].text = t;
  }

  if (!data.pages.some(p => p && p.__arsBackCover)) {
    const blank = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1608" height="2274" viewBox="0 0 1608 2274"><rect width="1608" height="2274" fill="#f8f4e8"/></svg>');
    data.pages.push({image:blank,text:''});
    data.pages.push({image:data.pages[0].image,text:'ARS POTIONUM\nCopertina finale',__arsBackCover:true});
  }

  const total = () => data.pages.length;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const overlay = i => {
    const rows = fixes[i];
    if (!rows) return '';
    let body = '';
    for (const row of rows) {
      const y = row.top - 7;
      const baseline = row.top + 24;
      body += '<rect x="205" y="' + y + '" width="620" height="37" fill="#f8f4e8"/>';
      body += '<text x="218" y="' + baseline + '" fill="#23362f" font-family="Noto Serif, Georgia, Times New Roman, serif" font-size="29">' + esc(row.text) + '</text>';
    }
    return '<svg class="wait-fix" viewBox="0 0 1608 2274" aria-hidden="true">' + body + '</svg>';
  };

  const style = document.createElement('style');
  style.textContent = '.wait-fix{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;overflow:visible}';
  document.head.appendChild(style);

  loadImage = function(i){
    if(i<0||i>=total()) return Promise.resolve();
    if(preload.has(i)) return preload.get(i);
    const promise = new Promise(resolve=>{const im=new Image();im.onload=resolve;im.onerror=resolve;im.src=data.pages[i].image});
    preload.set(i,promise);return promise;
  };
  imageAt = function(i){
    if(i<0||i>=total()) return '';
    return '<img draggable="false" alt="Pagina '+(i+1)+'" src="'+data.pages[i].image+'">'+overlay(i);
  };
  last = function(){return single?total()-1:Math.floor(total()/2)};
  classes = function(){
    stage.classList.toggle('single',single);
    stage.classList.toggle('cover',!single&&current===0);
    stage.classList.toggle('end',!single&&current===last()&&total()%2===0);
  };
  controls = function(){
    const [l,r]=indexPair(current),valid=[l,r].filter(i=>i>=0&&i<total());
    $('status').textContent=valid.length===2?'Pagine '+(valid[0]+1)+' e '+(valid[1]+1)+' di '+total():'Pagina '+(valid[0]+1)+' di '+total();
    $('pageInput').value=valid[0]+1;
    $('prev').disabled=$('edgePrev').disabled=busy||current===0;
    $('next').disabled=$('edgeNext').disabled=busy||current===last();
    $('mode').disabled=$('zoom').disabled=busy;
    $('mode').textContent=single?'Due pagine':'Una pagina';
    $('zoom').textContent=zoomed?'Adatta':'Ingrandisci';$('zoom').setAttribute('aria-pressed',String(zoomed));
    $('reading').textContent=valid.map(i=>data.pages[i].text||'').join('\n\n');
    valid.forEach(i=>{loadImage(i);loadImage(i+1);loadImage(i+2);loadImage(i-1)});
  };
  goPage = function(n){n=Math.max(0,Math.min(total()-1,n));return turnTo(single?n:n===0?0:Math.floor((n+1)/2))};
  $('pageInput').max=total();
  render();resize();
})();