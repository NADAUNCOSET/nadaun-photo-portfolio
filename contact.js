/* Native modal supplies focus containment; the existing site owns mail submission. */
(() => {
  const sessions = new WeakMap();
  window.NadaunInquiry = {
    open(id) {
      const dialog = document.getElementById(id);
      if (dialog.open) return;
      sessions.set(dialog, { focus:document.activeElement, overflow:document.body.style.overflow });
      dialog.showModal(); dialog.classList.add('open'); document.body.style.overflow='hidden';
      dialog.scrollTop=0; dialog.querySelector('.nq-question').focus({preventScroll:true});
    },
    close(id) {
      const dialog=document.getElementById(id), previous=sessions.get(dialog);
      if (!dialog.open) return;
      dialog.classList.remove('open'); dialog.close();
      document.body.style.overflow=previous?.overflow || '';
      previous?.focus?.focus({preventScroll:true}); sessions.delete(dialog);
    },
    message(form) {
      const brand=form.querySelector('[name="brand"]').value.trim();
      const email=form.querySelector('[name="email"]').value.trim();
      const detail=form.querySelector('#cf-message').value.trim();
      return [brand && '브랜드 / 회사: '+brand, email && '이메일: '+email, detail].filter(Boolean).join('\n');
    }
  };
  document.querySelectorAll('.nq-dialog').forEach(dialog => {
    dialog.addEventListener('cancel', event => { event.preventDefault(); window.NadaunInquiry.close(dialog.id); });
    dialog.querySelector('.nq-close').addEventListener('click', () => window.NadaunInquiry.close(dialog.id));
    const start=dialog.querySelector('#cf-date-from'), end=dialog.querySelector('#cf-date-to');
    start.addEventListener('change', () => { end.min=start.value; });
    dialog.querySelector('form').addEventListener('reset', () => { end.min=''; });
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
      const observer=new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('nq-appear'); observer.unobserve(entry.target); }
      }), {root:dialog, threshold:.08});
      dialog.querySelectorAll('.nq-section').forEach(section => observer.observe(section));
    }
  });
})();
