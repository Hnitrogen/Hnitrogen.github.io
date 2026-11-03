export function initLandscape() {
  const photos = [...document.querySelectorAll<HTMLImageElement>('[data-landscape]')];
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[data-scenery]')];
  if (!photos.length) return;
  const root = document.documentElement;
  const status = document.querySelector<HTMLElement>('[data-scenery-status]');
  let request = 0;
  function syncButtons() {
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.scenery === root.dataset.scenery)));
  }
  syncButtons();
  buttons.forEach((button) => button.addEventListener('click', async () => {
    const ticket = ++request;
    const photo = photos.find((image) => image.dataset.landscape === button.dataset.scenery)!;
    photo.srcset = photo.dataset.srcset!;
    photo.src = photo.dataset.src!;
    try { await photo.decode(); } catch {
      if (ticket === request && status) status.textContent = '风景加载失败，请重试。';
      return;
    }
    if (ticket !== request) return;
    photos.forEach((image) => image.classList.toggle('is-active', image === photo));
    root.dataset.scenery = photo.dataset.landscape;
    syncButtons();
    try { localStorage.setItem('nitro-scenery:v1', root.dataset.scenery!); } catch { /* Selection still works. */ }
    if (status) status.textContent = `已切换至${button.getAttribute('aria-label')}`;
  }));
}
