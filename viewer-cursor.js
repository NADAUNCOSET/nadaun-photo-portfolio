/* Hide the stationary native pointer over photographs, with controls unaffected. */
(() => {
  const scroll = document.getElementById('pvScroll');
  const viewer = document.getElementById('photoview');
  if (!scroll || !viewer) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let lastMove = performance.now(), x, y;
  const restore = () => scroll.classList.remove('pv-cursor-hidden');
  const hide = () => {
    if (fine.matches && viewer.classList.contains('open')) scroll.classList.add('pv-cursor-hidden');
  };
  scroll.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || (event.clientX === x && event.clientY === y)) return;
    x = event.clientX; y = event.clientY; lastMove = performance.now(); restore();
  }, { passive: true });
  scroll.addEventListener('wheel', event => { if (event.deltaY || event.deltaX) hide(); }, { passive: true });
  scroll.addEventListener('scroll', () => { if (performance.now() - lastMove > 650) hide(); }, { passive: true });
  scroll.addEventListener('pointerdown', restore, { passive: true });
  scroll.addEventListener('pointerleave', restore, { passive: true });
  document.getElementById('pvClose')?.addEventListener('click', restore);
  window.addEventListener('blur', restore);
  fine.addEventListener('change', restore);
})();
