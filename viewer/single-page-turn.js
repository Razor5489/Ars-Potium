/* Ars Potionum - sfogliamento singolo senza copia laterale, 2026-10-19 */
(() => {
  'use strict';
  if (window.__arsSinglePageTurn || typeof window.turnTo !== 'function') return;
  window.__arsSinglePageTurn = true;
  const originalTurnTo = window.turnTo;

  window.turnTo = async function (target) {
    if (!single || reduce.matches) return originalTurnTo(target);
    target = Math.max(0, Math.min(last(), target));
    if (busy || target === current) return;

    const previous = current;
    const forward = target > previous;
    const involved = [previous, target];
    const heavy = isHeavyTurn(involved);
    const divider = isDividerTurn(involved);
    let leaf = null;
    busy = true;
    controls();
    rustleSound(heavy);
    try {
      await loadImage(target);
      // Una sola faccia: il foglio non oltrepassa il bordo della pagina.
      setPage($('right'), forward ? target : previous);
      leaf = document.createElement('div');
      leaf.className = 'leaf ' + (forward ? 'forward' : 'backward');
      leaf.dataset.kind = heavy ? 'cover' : divider ? 'divider' : 'paper';
      leaf.append(face(forward ? previous : target));
      book.append(leaf);

      const frames = forward ? [
        {transform:'rotateY(0deg) translateZ(0)', opacity:1, offset:0},
        {transform:'rotateY(-32deg) translateZ(2px)', opacity:1, offset:0.38},
        {transform:'rotateY(-72deg) translateZ(1px)', opacity:1, offset:0.78},
        {transform:'rotateY(-89.7deg) translateZ(0)', opacity:0, offset:1}
      ] : [
        {transform:'rotateY(89.7deg) translateZ(0)', opacity:0, offset:0},
        {transform:'rotateY(72deg) translateZ(1px)', opacity:1, offset:0.22},
        {transform:'rotateY(32deg) translateZ(2px)', opacity:1, offset:0.62},
        {transform:'rotateY(0deg) translateZ(0)', opacity:1, offset:1}
      ];
      const duration = heavy ? (isCompact() ? 900 : 1120)
        : divider ? (isCompact() ? 820 : 1020) : (isCompact() ? 720 : 900);
      const motion = leaf.animate(frames, {
        duration, easing:'cubic-bezier(.18,.67,.18,1)', fill:'forwards'
      });
      try { await motion.finished; } catch (_) {}
    } finally {
      current = target;
      if (leaf) leaf.remove();
      busy = false;
      render();
      settleSound(heavy);
      wake();
    }
  };
})();
