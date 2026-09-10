// Native category scrolling with taps through the unpainted part of the menu.
// Keep touch/pointer listeners passive: the browser owns panning and momentum.
(() => {
  const menu = document.getElementById('filterWrap') || document.getElementById('sidebar');
  const cardSelector = menu?.id === 'filterWrap' ? '#pGrid .pcard' : '#grid .card';
  if (!menu) return;
  let gesture = null;
  menu.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) { gesture = null; return; }
    gesture = { id:event.pointerId, x:event.clientX, y:event.clientY, scrollTop:menu.scrollTop, moved:false, down:true };
  }, { passive:true });
  menu.addEventListener('pointermove', event => {
    if (!gesture || !gesture.down || gesture.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) gesture.moved = true;
  }, { passive:true });
  menu.addEventListener('scroll', () => {
    if (gesture?.down && Math.abs(menu.scrollTop - gesture.scrollTop) > 2) gesture.moved = true;
  }, { passive:true });
  menu.addEventListener('pointercancel', event => {
    if (gesture?.id === event.pointerId) { gesture.moved = true; gesture.down = false; }
  }, { passive:true });
  menu.addEventListener('pointerup', event => {
    if (gesture?.id === event.pointerId) gesture.down = false;
  }, { passive:true });
  menu.addEventListener('click', event => {
    // A swipe must never open a photo or select a category on release.
    if (event.detail !== 0 && gesture?.moved) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.target.closest('button') || event.button !== 0 || event.detail === 0) return;
    // elementsFromPoint reads the underlying stack without disabling the scroller.
    const photo = document.elementsFromPoint(event.clientX, event.clientY)
      .map(element => element.closest(cardSelector))
      .find(Boolean);
    if (photo) {
      event.preventDefault();
      event.stopPropagation();
      photo.click();
    }
  }, true);
  menu.addEventListener('click', event => {
    if (!event.target.closest('button')) return;
    const selected = menu.querySelector('button.active');
    if (!selected) return;
    const menuBox = menu.getBoundingClientRect();
    const selectedBox = selected.getBoundingClientRect();
    const edge = parseFloat(getComputedStyle(menu).paddingTop) || 0;
    if (selectedBox.top >= menuBox.top + edge && selectedBox.bottom <= menuBox.bottom - edge) return;
    menu.scrollTo({
      top:menu.scrollTop + selectedBox.top - menuBox.top - (menu.clientHeight - selectedBox.height) / 2,
      behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  });
})();
