import {
  STORAGE_KEY, continuation, emptyWorkspace, hasContent, makeSnapshot,
  parseLines, readWorkspace, replaceWorkspace, toggleLine,
  type SliceWorkspace,
} from '../lib/time-slice';
import { initializeSliceLock } from './time-slice-lock';

const app = document.querySelector<HTMLElement>('[data-time-slice]');
if (app) initializeSliceLock(app, () => initialize(app));

function initialize(app: HTMLElement) {
  const get = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
  const editor = get<HTMLTextAreaElement>('[data-editor]');
  const focus = get<HTMLInputElement>('[data-slice-focus]');
  const note = get<HTMLTextAreaElement>('[data-slice-note]');
  const list = get<HTMLDivElement>('[data-list]');
  const hideDone = get<HTMLInputElement>('[data-hide-done]');
  const saveStatus = get<HTMLElement>('[data-save-status]');
  const warning = get<HTMLElement>('[data-storage-warning]');
  const files = get<HTMLDetailsElement>('.slice-files');
  const fileInput = get<HTMLInputElement>('[data-import-file]');
  const restoreDialog = get<HTMLDialogElement>('[data-restore-dialog]');
  const importDialog = get<HTMLDialogElement>('[data-import-dialog]');
  let state = emptyWorkspace();
  let original = '';
  let blocked = false;
  let unsaved = false;
  let pendingRestore = '';
  let pendingImport: SliceWorkspace | null = null;

  const dateLabel = (date: string) => new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(date));

  function alert(message: string) {
    warning.hidden = false;
    get<HTMLElement>('[data-storage-message]').textContent = message;
  }

  try {
    original = localStorage.getItem(STORAGE_KEY) || '';
    if (original) state = readWorkspace(original);
  } catch {
    blocked = true;
    alert(original
      ? '本地记录暂时无法读取，已停止自动保存。请先下载原始记录备份，避免覆盖。'
      : '当前浏览器不允许本地存储。你仍可编辑和导出，但关闭页面前请下载备份。');
    get<HTMLButtonElement>('[data-download-original]').hidden = !original;
  }

  function save(message?: string) {
    unsaved = true;
    if (blocked) {
      saveStatus.textContent = '尚未保存，请导出备份';
      return false;
    }
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      unsaved = false;
      warning.hidden = true;
      saveStatus.textContent = message || `已自动保存 · ${dateLabel(state.updatedAt)}`;
      return true;
    } catch {
      alert('本地保存失败，可能是存储空间不足或浏览器限制。内容仍在当前页，请通过「文件」备份全部记录。');
      saveStatus.textContent = '保存失败，请导出备份';
      return false;
    }
  }

  function renderCounts() {
    const tasks = parseLines(state.document).filter((line) => line.task);
    const done = tasks.filter((line) => line.done).length;
    get<HTMLElement>('[data-count]').textContent = tasks.length
      ? `${tasks.length - done} 件待处理 / ${done} 件已处理`
      : '还没有待办，先放一件小事进来。';
    const lineCount = state.document.split('\n').length;
    get<HTMLElement>('[data-line-count]').textContent = `${lineCount} ${lineCount === 1 ? 'LINE' : 'LINES'}`;
  }

  function renderList() {
    const lines = parseLines(state.document);
    const fragment = document.createDocumentFragment();
    for (const line of lines) {
      if (line.done && hideDone.checked) continue;
      const row = document.createElement('div');
      row.className = `slice-row${line.depth === 0 && line.task ? ' slice-root' : ''}${line.done ? ' done' : ''}${line.task ? '' : ' slice-plain'}`;
      row.style.setProperty('--depth', String(Math.min(line.depth, 6)));
      if (line.task) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = line.done;
        checkbox.id = `slice-task-${line.index}`;
        checkbox.dataset.line = String(line.index);
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = line.text || '未命名事项';
        row.append(checkbox, label);
      } else {
        row.textContent = line.text;
      }
      fragment.append(row);
    }
    list.replaceChildren(fragment);
    get<HTMLElement>('[data-empty]').hidden = lines.length > 0;
    get<HTMLElement>('[data-all-done]').hidden = !lines.length || list.childElementCount > 0;
    renderCounts();
  }

  function renderHistory() {
    const history = get<HTMLElement>('[data-history]');
    const fragment = document.createDocumentFragment();
    for (const entry of state.snapshots) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      const time = document.createElement('time');
      time.dateTime = entry.createdAt;
      time.textContent = `${new Date(entry.createdAt).getFullYear()}/${dateLabel(entry.createdAt)}`;
      const title = document.createElement('strong');
      title.textContent = entry.focus || parseLines(entry.document)[0]?.text || '留给下次的记录';
      summary.append(time, title);
      const memo = document.createElement('p');
      memo.className = 'slice-history-note';
      memo.textContent = entry.note || '这一刻的清单，已经存好。';
      const preview = document.createElement('pre');
      preview.textContent = entry.document || '（空清单）';
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'slice-restore';
      restore.dataset.restore = entry.id;
      restore.textContent = '从这里接着做 ↗';
      details.append(summary, memo, preview, restore);
      fragment.append(details);
    }
    history.replaceChildren(fragment);
    get<HTMLElement>('[data-history-count]').textContent = String(state.snapshots.length).padStart(2, '0');
    get<HTMLElement>('[data-history-empty]').hidden = state.snapshots.length > 0;
  }

  function syncFields() {
    editor.value = state.document;
    focus.value = state.focus;
    note.value = state.note;
    renderList();
    renderHistory();
  }

  function setView(next: 'list' | 'text', moveFocus = false) {
    get<HTMLElement>('[data-list-panel]').hidden = next !== 'list';
    get<HTMLElement>('[data-text-panel]').hidden = next !== 'text';
    app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
      const active = button.dataset.view === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (next === 'list') renderList();
    if (moveFocus) {
      if (next === 'text') editor.focus();
      else get<HTMLButtonElement>('[data-view="list"]').focus();
    }
  }

  function editorChanged() {
    state.document = editor.value;
    renderCounts();
    save();
  }

  function replaceSelection(text: string, start = editor.selectionStart, end = editor.selectionEnd) {
    editor.setRangeText(text, start, end, 'end');
    editorChanged();
  }

  function indent(outdent = false) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const first = editor.value.slice(0, start).lastIndexOf('\n') + 1;
    const selectedEnd = end > start && editor.value[end - 1] === '\n' ? end - 1 : end;
    const next = editor.value.indexOf('\n', selectedEnd);
    const last = next === -1 ? editor.value.length : next;
    const lines = editor.value.slice(first, last).split('\n');
    const adjusted = lines.map((line) => outdent ? line.replace(/^( {1,2}|\t)/, '') : `  ${line}`);
    const firstDelta = adjusted[0].length - lines[0].length;
    const totalDelta = adjusted.join('\n').length - lines.join('\n').length;
    editor.setRangeText(adjusted.join('\n'), first, last, 'preserve');
    editor.setSelectionRange(Math.max(first, start + firstDelta), Math.max(first, end + totalDelta));
    editor.focus();
    editorChanged();
  }

  function toggleSelected() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const first = editor.value.slice(0, start).split('\n').length - 1;
    const last = editor.value.slice(0, end > start && editor.value[end - 1] === '\n' ? end - 1 : end).split('\n').length - 1;
    let text = editor.value;
    for (let i = first; i <= last; i++) text = toggleLine(text, i);
    const delta = text.length - editor.value.length;
    editor.setRangeText(text, 0, editor.value.length, 'preserve');
    editor.setSelectionRange(start, Math.max(start, end + delta));
    editor.focus();
    editorChanged();
  }

  editor.addEventListener('input', editorChanged);
  focus.addEventListener('input', () => { state.focus = focus.value; save(); });
  note.addEventListener('input', () => { state.note = note.value; save(); });
  hideDone.addEventListener('change', renderList);
  list.addEventListener('change', (event) => {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.dataset.line === undefined) return;
    const index = Number(checkbox.dataset.line);
    state.document = toggleLine(state.document, index);
    editor.value = state.document;
    save();
    renderList();
    (list.querySelector<HTMLInputElement>(`[data-line="${index}"]`) || list.querySelector<HTMLInputElement>('input') || hideDone).focus({ preventScroll: true });
  });

  editor.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'Tab') {
      event.preventDefault(); indent(event.shiftKey);
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault(); toggleSelected();
    } else if (event.key === 'Escape') {
      event.preventDefault(); setView('list', true);
    } else if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
      const start = editor.selectionStart;
      const lineStart = editor.value.slice(0, start).lastIndexOf('\n') + 1;
      const prefix = continuation(editor.value.slice(lineStart, start));
      if (prefix !== null) {
        event.preventDefault();
        const line = editor.value.slice(lineStart, start);
        if (/^\s*[-*+]\s+(\[[ xX]\]\s*)?$/.test(line)) replaceSelection('', lineStart, editor.selectionEnd);
        else replaceSelection(`\n${prefix}`);
      }
    }
  });

  app.addEventListener('keydown', (event) => {
    if (get<HTMLElement>('[data-slice-content]').hidden) return;
    if (event.isComposing || event.key.toLowerCase() !== 's' || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault(); save('已保存到当前浏览器');
  });
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => button.addEventListener('click', () => {
    setView(button.dataset.view as 'list' | 'text', button.dataset.view === 'text');
  }));
  app.querySelectorAll<HTMLButtonElement>('[data-indent]').forEach((button) => button.addEventListener('click', () => indent(button.dataset.indent === 'out')));
  get('[data-toggle-line]').addEventListener('click', toggleSelected);
  function addTask() {
    setView('text', true);
    const suffix = editor.value.length ? `${editor.value.endsWith('\n') ? '' : '\n'}- [ ] ` : '- [ ] ';
    replaceSelection(suffix, editor.value.length, editor.value.length);
    editor.scrollTop = editor.scrollHeight;
  }
  get('[data-add]').addEventListener('click', addTask);
  get('[data-start]').addEventListener('click', addTask);

  get('[data-pause]').addEventListener('click', () => {
    if (!hasContent(state)) {
      saveStatus.textContent = '先写一件事，或留一句话，再存成时间片。';
      note.focus(); return;
    }
    const previous = state.snapshots[0];
    if (previous && ['document', 'focus', 'note'].every((key) => previous[key as keyof typeof previous] === state[key as keyof SliceWorkspace])) {
      if (unsaved) save('时间片已留档，下次从这里接着来。');
      else saveStatus.textContent = '内容没有变化，上一份留档还在。';
      return;
    }
    state.snapshots.unshift(makeSnapshot(state));
    save('时间片已留档，下次从这里接着来。');
    renderHistory();
  });

  get('[data-history]').addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-restore]');
    if (!target) return;
    pendingRestore = target.dataset.restore || '';
    restoreDialog.returnValue = '';
    restoreDialog.showModal();
  });
  restoreDialog.addEventListener('close', () => {
    if (restoreDialog.returnValue !== 'restore') return;
    const entry = state.snapshots.find((item) => item.id === pendingRestore);
    if (!entry) return;
    state = replaceWorkspace(state, { ...state, document: entry.document, focus: entry.focus, note: entry.note });
    save('已载入时间片，原来的内容也已留档。');
    syncFields();
    setView('list');
  });

  function download(text: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportFile(kind: string) {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    if (kind === 'backup') download(JSON.stringify(state, null, 2), `time-slice-${date}.json`, 'application/json');
    else download(state.document, `time-slice-${date}.md`, 'text/markdown;charset=utf-8');
    files.open = false;
    saveStatus.textContent = kind === 'backup' ? '已导出全部清单和留档的 JSON 备份' : '已导出当前清单的 Markdown';
  }
  app.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((button) => button.addEventListener('click', () => exportFile(button.dataset.export || 'backup')));
  get('[data-download-original]').addEventListener('click', () => download(original, 'time-slice-recovery.txt', 'text/plain;charset=utf-8'));
  get('[data-import]').addEventListener('click', () => { files.open = false; fileInput.click(); });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { saveStatus.textContent = '文件超过 4 MB，请选择较小的文本或备份。'; return; }
    try {
      const raw = (await file.text()).replace(/^\uFEFF/, '');
      pendingImport = file.name.toLowerCase().endsWith('.json')
        ? readWorkspace(raw)
        : { ...emptyWorkspace(), document: raw.replace(/\r\n?/g, '\n') };
      get<HTMLElement>('[data-import-name]').textContent = file.name;
      importDialog.returnValue = '';
      importDialog.showModal();
    } catch {
      pendingImport = null;
      saveStatus.textContent = '无法读取这份文件，请选择有效的时间片 JSON 备份或文本。';
    }
  });
  importDialog.addEventListener('close', () => {
    if (importDialog.returnValue === 'import' && pendingImport) {
      state = replaceWorkspace(state, pendingImport);
      save('记录已导入，原来的内容也已留档。');
      syncFields(); setView('list');
    }
    pendingImport = null;
  });

  window.addEventListener('storage', (event) => {
    if ((event.key !== STORAGE_KEY && event.key !== null) || event.storageArea !== localStorage) return;
    blocked = true;
    alert('另一个标签页修改了本地记录，已停止本页的自动保存。请先导出本页的 JSON 备份，再刷新载入最新记录。');
    saveStatus.textContent = '检测到另一页的修改，请先备份';
  });
  window.addEventListener('beforeunload', (event) => {
    if (!unsaved) return;
    event.preventDefault();
  });
  document.addEventListener('click', (event) => {
    if (!files.contains(event.target as Node)) files.open = false;
  });
  files.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { files.open = false; files.querySelector('summary')?.focus(); }
  });

  syncFields();
  if (blocked) saveStatus.textContent = '本地存储不可用，请导出备份';
  else if (state.updatedAt) saveStatus.textContent = `已恢复本地记录 · ${dateLabel(state.updatedAt)}`;
}
