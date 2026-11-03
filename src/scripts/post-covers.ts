import { assignPostCovers, postCoverUrl, readCoverAssignments } from '../lib/post-covers.mjs';
import { withBase } from '../lib/paths';

export function initPostCovers() {
  const images = [...document.querySelectorAll<HTMLImageElement>('[data-cover-slug]')];
  if (!images.length) return;
  const storageKey = `nitro-post-covers:landscape-v1:${import.meta.env.BASE_URL}`;
  let saved: string | null = null;
  try { saved = sessionStorage.getItem(storageKey); } catch { /* Covers still work without storage. */ }
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const refresh = !!document.querySelector('[data-file-explorer]') && navigation?.type === 'reload';
  const assignments = assignPostCovers(
    images.map((image) => image.dataset.coverSlug!),
    readCoverAssignments(saved),
    { refresh },
  );
  try { sessionStorage.setItem(storageKey, JSON.stringify([...assignments])); } catch { /* Keep the page usable. */ }

  function load(image: HTMLImageElement) {
    const id = assignments.get(image.dataset.coverSlug!);
    if (!id || image.dataset.coverState !== 'pending') return;
    image.dataset.coverId = String(id);
    image.dataset.coverState = 'loading';
    let completed = false;
    const timeout = window.setTimeout(fallback, 12_000);
    function cleanup() {
      window.clearTimeout(timeout);
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', fallback);
    }
    async function loaded() {
      try { await image.decode(); } catch { fallback(); return; }
      if (completed) return;
      completed = true;
      cleanup();
      image.dataset.coverState = 'loaded';
    }
    function fallback() {
      if (completed) return;
      completed = true;
      cleanup();
      // Keep the pending indicator until the fallback has also decoded.
      image.dataset.coverState = 'fallback-loading';
      image.addEventListener('load', async () => {
        try {
          await image.decode();
          image.dataset.coverState = 'fallback';
        } catch { image.dataset.coverState = 'error'; }
      }, { once: true });
      image.addEventListener('error', () => { image.dataset.coverState = 'error'; }, { once: true });
      image.src = image.dataset.coverFallback!;
    }
    image.addEventListener('load', loaded);
    image.addEventListener('error', fallback);
    image.src = withBase(postCoverUrl(id));
  }

  // Closed folders and offscreen rows should not request images yet.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        load(entry.target as HTMLImageElement);
      }
    }, { rootMargin: '240px' });
    images.forEach((image) => observer.observe(image));
  } else images.forEach(load);
}
