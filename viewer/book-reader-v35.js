'use strict';

const data=window.ARS_V35_DATA,count=data.pages.length;
const $=id=>document.getElementById(id);
const stage=$('stage'),book=$('book'),viewport=$('viewport'),shell=$('shell'),canvas=$('canvas');
$('pageInput').max=count;
const MOBILE_BREAKPOINT=900;
function safeGetSound(){try{return localStorage.getItem('ars-potionum-sound')!=='off'}catch(e){return true}}
function safeSetSound(v){try{localStorage.setItem('ars-potionum-sound',v?'on':'off')}catch(e){}}
let single=window.matchMedia(`(max-width:${MOBILE_BREAKPOINT}px)`).matches,current=0,busy=false,zoomed=false,
    soundOn=false,idleTimer=null,audioCtx=null,manualMode=false;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const isCompact=()=>window.matchMedia(`(max-width:${MOBILE_BREAKPOINT}px)`).matches||viewport.clientWidth<=MOBILE_BREAKPOINT;
const indexPair=n=>single?[-1,n]:n===0?[-1,0]:[n*2-1,n*2<count?n*2:-1];
const last=()=>single?count-1:Math.floor(count/2);
const currentPage=()=>single?current:current===0?0:current*2-1;
const preload=new Map();

function pageText(i){return i>=0&&i<count?(data.pages[i].text||''):''}
function pageKind(i){
  if(i<0||i>=count)return 'blank';
  const t=pageText(i),u=t.toUpperCase();
  if(i===0||i===count-1)return 'cover';
  if(u.includes('CONTROGUARDIA'))return 'endpaper';
  if(u.startsWith('PAGINA DI RISPETTO'))return 'respect';
  if(u.includes('\nANNO I\n')||u.includes('\nANNO II\n')||u.includes('\nANNO III\n')||u.includes('\nANNO IV\n')||u.includes('\nANNO V\n')||u.includes('\nANNO VI\n')||u.includes('\nANNO VII\n'))return 'divider';
  if(u.includes('RICETTARIO'))return 'recipe';
  if(u.includes('\nFINIS\n'))return 'finis';
  if(u.includes('APPENDICE'))return 'appendix';
  return 'theory';
}
function pageTitle(i){
  const lines=pageText(i).split('\n').map(x=>x.trim()).filter(Boolean);
  const generic=/^(ARS POTIONUM|ANNO \d+|ANNO [IVX]+|FONDAMENTI|APPENDICE|MANUALE|PAGINA DI RISPETTO)/i;
  return lines.find(x=>!generic.test(x))||`Pagina ${i+1}`;
}
function loadImage(i){
  if(i<0||i>=count)return Promise.resolve();
  if(preload.has(i))return preload.get(i);
  const promise=new Promise(resolve=>{const im=new Image();im.decoding='async';im.onload=resolve;im.onerror=resolve;im.src=data.pages[i].image});
  preload.set(i,promise);return promise
}
function imageAt(i){
  if(i<0||i>=count)return '';
  const alt=(pageTitle(i)+' · pagina '+(i+1)).replace(/"/g,'&quot;');
  return '<img draggable="false" decoding="async" alt="'+alt+'" src="'+data.pages[i].image+'">'
}
function setPage(el,i){
  el.innerHTML=imageAt(i);el.classList.toggle('blank',i<0||i>=count);el.dataset.kind=pageKind(i);el.dataset.page=String(i+1)
}
function classes(){
  stage.classList.toggle('single',single);stage.classList.toggle('cover',!single&&current===0);
  stage.classList.toggle('end',!single&&current===last()&&count%2===0);stage.classList.toggle('zoomed',zoomed);shell.classList.toggle('zoomed',zoomed)
}
function controls(){
  const[l,r]=indexPair(current),valid=[l,r].filter(i=>i>=0);
  $('status').textContent=valid.length===2?'Pagine '+(valid[0]+1)+'–'+(valid[1]+1)+' di '+count:'Pagina '+(valid[0]+1)+' di '+count;
  $('pageInput').value=valid[0]+1;
  $('prev').disabled=$('edgePrev').disabled=busy||current===0;$('next').disabled=$('edgeNext').disabled=busy||current===last();
  $('mode').disabled=busy||isCompact();$('zoom').disabled=busy;
  $('mode').textContent=single?'Due pagine':'Una pagina';$('zoom').textContent=zoomed?'Adatta':'Ingrandisci';
  $('zoom').setAttribute('aria-pressed',String(zoomed));$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').textContent=soundOn?'Suono':'Muto';
  $('reading').textContent=valid.map(i=>data.pages[i].text).join('\n\n');
  valid.forEach(i=>{loadImage(i);loadImage(i+1);loadImage(i+2);loadImage(i-1)})
}
function render(){classes();const[l,r]=indexPair(current);setPage($('left'),l);setPage($('right'),r);controls()}
function syncResponsiveMode(){
  const compact=isCompact();
  if(compact&&!single){const p=currentPage();single=true;current=p;render()}
  else if(!compact&&!manualMode&&single){const p=currentPage();single=false;current=p===0?0:Math.floor((p+1)/2);render()}
}
function resize(){
  syncResponsiveMode();stage.classList.toggle('zoomed',zoomed);shell.classList.toggle('zoomed',zoomed);
  const compact=isCompact(),ratio=595.276/841.89,pages=single?1:2,padX=compact?20:96,padY=compact?18:62;
  const availableW=Math.max(180,viewport.clientWidth-padX),availableH=Math.max(250,viewport.clientHeight-padY);
  const fittedPageW=Math.min(availableW/pages,availableH*ratio,760),fittedH=fittedPageW/ratio;
  const scale=zoomed?(compact?1.52:1.62):1,height=fittedH*scale,pageW=height*ratio,stageW=pageW*pages;
  stage.style.setProperty('--height',height+'px');stage.style.setProperty('--width',pageW+'px');
  canvas.style.width=zoomed?Math.max(viewport.clientWidth,stageW+(compact?34:120))+'px':'100%';
  canvas.style.minHeight=zoomed?Math.max(viewport.clientHeight,height+(compact?34:84))+'px':'100%';
  viewport.style.overflow=zoomed?'auto':'hidden'
}
function face(image,back=false){
  const d=document.createElement('div');d.className='face '+(back?'back':'front');d.dataset.kind=pageKind(image);d.innerHTML=imageAt(image);return d
}
function isHeavyTurn(indices){return indices.some(i=>pageKind(i)==='cover'||pageKind(i)==='endpaper')}
function isDividerTurn(indices){return indices.some(i=>pageKind(i)==='divider')}

function makeNoiseBuffer(duration){
  audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  const len=Math.max(1,Math.floor(audioCtx.sampleRate*duration)),buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),ch=buf.getChannelData(0);
  let smooth=0;for(let i=0;i<len;i++){const white=Math.random()*2-1;smooth=smooth*.82+white*.18;ch[i]=smooth*.78+white*.22}return buf
}
function rustleSound(heavy=false){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();
    const duration=(heavy?.28:.21)+Math.random()*.035,src=audioCtx.createBufferSource(),high=audioCtx.createBiquadFilter(),low=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();
    src.buffer=makeNoiseBuffer(duration);src.playbackRate.value=.95+Math.random()*.08;
    high.type='highpass';high.frequency.value=heavy?115:210;high.Q.value=.3;low.type='lowpass';low.frequency.value=heavy?1750:2450;low.Q.value=.4;
    const now=audioCtx.currentTime,peak=heavy?.022:.018;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(peak,now+.035);
    gain.gain.exponentialRampToValueAtTime(.006,now+duration*.62);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    src.connect(high);high.connect(low);low.connect(gain);gain.connect(audioCtx.destination);src.start(now)
  }catch(e){}
}
function settleSound(heavy=false){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
    osc.type='sine';osc.frequency.setValueAtTime(heavy?92:118,now);osc.frequency.exponentialRampToValueAtTime(heavy?70:88,now+.055);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(heavy?.010:.006,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.07);
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+.075)
  }catch(e){}
}
/* Chromium fix: no CSS filter on the rotating 3D leaf; filters can flatten its two faces and reveal mirrored text. */
function turnFrames(forward,heavy=false){
  const s=forward?-1:1;
  if(heavy)return[
    {transform:'rotateY(0deg) translateZ(0) scaleX(1)',offset:0},
    {transform:`rotateY(${s*18}deg) translateZ(3px) scaleX(.999)`,offset:.18},
    {transform:`rotateY(${s*78}deg) translateZ(13px) scaleX(.992)`,offset:.48},
    {transform:`rotateY(${s*145}deg) translateZ(7px) scaleX(.997)`,offset:.82},
    {transform:`rotateY(${s*180}deg) translateZ(0) scaleX(1)`,offset:1}
  ];
  return[
    {transform:'rotateY(0deg) translateZ(0) scaleX(1) skewY(0deg)',offset:0},
    {transform:`rotateY(${s*20}deg) translateZ(4px) scaleX(.998) skewY(${s*.12}deg)`,offset:.14},
    {transform:`rotateY(${s*65}deg) translateZ(17px) scaleX(.985) skewY(${s*.38}deg)`,offset:.38},
    {transform:`rotateY(${s*103}deg) translateZ(25px) scaleX(.968) skewY(${s*.52}deg)`,offset:.56},
    {transform:`rotateY(${s*151}deg) translateZ(9px) scaleX(.991) skewY(${s*.22}deg)`,offset:.83},
    {transform:`rotateY(${s*180}deg) translateZ(0) scaleX(1) skewY(0deg)`,offset:1}
  ]
}
async function turnTo(target){
  target=Math.max(0,Math.min(last(),target));if(busy||target===current)return;
  busy=true;controls();
  const forward=target>current,[ol,or]=indexPair(current),[nl,nr]=indexPair(target),involved=[ol,or,nl,nr].filter(i=>i>=0);
  const heavy=isHeavyTurn(involved),divider=isDividerTurn(involved);rustleSound(heavy);
  await Promise.all([loadImage(nl),loadImage(nr)]);
  if(reduce.matches){current=target;busy=false;render();resize();settleSound(heavy);return}
  const leaf=document.createElement('div');leaf.className='leaf '+(forward?'forward':'backward');leaf.dataset.kind=heavy?'cover':divider?'divider':'paper';
  if(single){setPage($('right'),nr);leaf.append(face(or),face(nr,true))}
  else{
    if(forward){setPage($('left'),ol);setPage($('right'),nr);leaf.append(face(or),face(nl,true))}
    else{setPage($('left'),nl);setPage($('right'),or);leaf.append(face(ol),face(nr,true))}
    const was=current;current=target;classes();current=was
  }
  book.append(leaf);
  const duration=heavy?(isCompact()?900:1120):divider?(isCompact()?820:1020):(isCompact()?720:900);
  const motion=leaf.animate(turnFrames(forward,heavy),{duration,easing:heavy?'cubic-bezier(.22,.58,.20,1)':'cubic-bezier(.18,.67,.18,1)',fill:'forwards'});
  try{await motion.finished}catch(e){}
  current=target;leaf.remove();busy=false;render();settleSound(heavy);wake()
}
const next=()=>turnTo(current+1),prev=()=>turnTo(current-1);
$('next').onclick=$('edgeNext').onclick=next;$('prev').onclick=$('edgePrev').onclick=prev;
function goPage(n){n=Math.max(0,Math.min(count-1,n));return turnTo(single?n:n===0?0:Math.floor((n+1)/2))}
$('jump').onsubmit=e=>{e.preventDefault();const n=Number($('pageInput').value);if(Number.isFinite(n))goPage(n-1)};
$('mode').onclick=()=>{if(busy||isCompact())return;const p=currentPage();manualMode=true;single=!single;current=single?p:p===0?0:Math.floor((p+1)/2);render();resize()};
$('zoom').onclick=()=>{zoomed=!zoomed;resize();controls();if(!zoomed)viewport.scrollTo({top:0,left:0});else viewport.scrollTo({top:0,left:Math.max(0,(canvas.scrollWidth-viewport.clientWidth)/2),behavior:'smooth'})};
$('sound').onclick=()=>{soundOn=false;controls();wake()};
$('full').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{$('full').title='Schermo intero non disponibile'}};
for(const chapter of data.chapters){const op=document.createElement('option');op.value=chapter.page;op.textContent=chapter.title;$('chapters').append(op)}
$('chapters').onchange=e=>{if(e.target.value!=='')goPage(Number(e.target.value)-1);e.target.value=''};
document.addEventListener('keydown',e=>{
  wake();if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();next()}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();prev()}
  if(e.key==='Home'){e.preventDefault();turnTo(0)}if(e.key==='End'){e.preventDefault();turnTo(last())}
  if(e.key.toLowerCase()==='f'&&!e.ctrlKey&&!e.metaKey){$('full').click()}
});
let swipe=null;
book.addEventListener('touchstart',e=>{wake();const t=e.changedTouches[0];swipe={x:t.clientX,y:t.clientY}},{passive:true});
book.addEventListener('touchend',e=>{if(!swipe)return;const t=e.changedTouches[0],dx=t.clientX-swipe.x,dy=t.clientY-swipe.y;if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.3){dx<0?next():prev()}swipe=null},{passive:true});
function wake(){shell.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(()=>shell.classList.add('idle'),2400)}
['mousemove','mousedown','touchstart','wheel'].forEach(ev=>document.addEventListener(ev,wake,{passive:true}));
let resizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,80)});document.addEventListener('fullscreenchange',resize);
render();resize();wake();loadImage(0).then(()=>$('loading').hidden=true);
