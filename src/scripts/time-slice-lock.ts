// A lightweight front-end gate, with a dedicated passphrase chosen for this tool.
// Replace this SHA-256 digest to change the passphrase, then rebuild the site.
const PASSWORD_DIGEST = 'a8e8f0ec611a6e0bcc71dc61600ca41b3eef006c7451c7730e5bc7c613b08bcf';
const SESSION_KEY = 'nitro-time-slice:unlocked';

export function initializeSliceLock(app: HTMLElement, onUnlock: () => void) {
  const form = app.querySelector<HTMLFormElement>('[data-slice-lock]')!;
  const password = app.querySelector<HTMLInputElement>('[data-slice-password]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const error = app.querySelector<HTMLElement>('[data-slice-lock-error]')!;
  const content = app.querySelector<HTMLElement>('[data-slice-content]')!;
  const lockButton = app.querySelector<HTMLButtonElement>('[data-slice-lock-again]')!;
  let initialized = false;

  function unlock(moveFocus: boolean) {
    if (!initialized) {
      onUnlock();
      initialized = true;
    }
    password.value = '';
    password.removeAttribute('aria-invalid');
    error.hidden = true;
    form.hidden = true;
    content.hidden = false;
    content.inert = false;
    lockButton.hidden = false;
    try {
      sessionStorage.setItem(SESSION_KEY, PASSWORD_DIGEST);
    } catch {
      // Unlocking still works for this visit when session storage is unavailable.
    }
    if (moveFocus) app.querySelector<HTMLInputElement>('[data-slice-focus]')?.focus();
  }

  lockButton.addEventListener('click', () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Nothing persisted. */ }
    content.hidden = true;
    content.inert = true;
    lockButton.hidden = true;
    form.hidden = false;
    password.value = '';
    password.removeAttribute('aria-invalid');
    error.hidden = true;
    password.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    error.hidden = true;
    try {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password.value));
      const digest = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
      if (digest === PASSWORD_DIGEST) unlock(true);
      else {
        error.textContent = '口令不对，再试一次。';
        error.hidden = false;
        password.setAttribute('aria-invalid', 'true');
        password.select();
      }
    } catch {
      error.textContent = '暂时无法校验口令，请使用 HTTPS 或 localhost 地址打开。';
      error.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });
  password.addEventListener('input', () => {
    error.hidden = true;
    password.removeAttribute('aria-invalid');
  });
  submit.disabled = false;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === PASSWORD_DIGEST) unlock(false);
  } catch {
    // Keep the password form visible when browser storage is restricted.
  }
}
