/* Project links use the persistent PROJECTS id, never a shuffled card position. */
(() => {
  const toast = document.getElementById('photoShareToast');
  let toastTimer;

  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function projectUrl(project) {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('project', String(project.id));
    return url;
  }

  function setProject(project) {
    const url = new URL(location.href);
    url.searchParams.set('project', String(project.id));
    history.replaceState(history.state, '', url);
  }

  function clearProject() {
    const url = new URL(location.href);
    if (!url.searchParams.has('project')) return;
    url.searchParams.delete('project');
    history.replaceState(history.state, '', url);
  }

  function copyFallback(text) {
    const focus = document.activeElement;
    const input = document.createElement('textarea');
    input.value = text;
    input.readOnly = true;
    input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
    document.body.appendChild(input);
    let copied = false;
    try {
      input.focus({preventScroll:true});
      input.select();
      input.setSelectionRange(0, text.length);
      copied = document.execCommand('copy');
    } catch (_) {
      copied = false;
    } finally {
      input.remove();
      focus?.focus({preventScroll:true});
    }
    return copied;
  }

  async function copyProject(project) {
    if (!project) return;
    const url = projectUrl(project).toString();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
    } catch (_) {
      if (!copyFallback(url)) {
        window.prompt('포트폴리오 링크를 복사해 주세요.', url);
        return;
      }
    }
    notify('포트폴리오 링크 복사됨');
  }

  function openSharedProject() {
    const params = new URLSearchParams(location.search);
    if (!params.has('project')) return;
    const id = params.get('project');
    const project = /^\d+$/.test(id) && PROJECTS.find(item => String(item.id) === id);
    if (!project) {
      notify('공유된 포트폴리오를 찾을 수 없습니다.');
      return;
    }
    openLightbox(project.id, 0);
  }

  window.PhotoShare = {setProject, clearProject};
  document.getElementById('pvShare').addEventListener('click', () => copyProject(pvProj));
  document.getElementById('galShare').addEventListener('click', () => copyProject(activeProj));
  addHover(document.getElementById('pvShare'));
  addHover(document.getElementById('galShare'));
  window.addEventListener('popstate', () => {
    if (new URLSearchParams(location.search).has('project')) openSharedProject();
    else if (document.getElementById('photoview').classList.contains('open')) closeLightbox();
  });
  // Defer until all viewer and watermark elements have been parsed.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openSharedProject, {once:true});
  } else {
    openSharedProject();
  }
})();
