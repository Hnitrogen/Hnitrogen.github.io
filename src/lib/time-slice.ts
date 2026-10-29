/** Plain text is the source of truth; list interactions only change checkbox markers. */
export interface SliceSnapshot {
  id: string;
  createdAt: string;
  document: string;
  focus: string;
  note: string;
}

export interface SliceWorkspace {
  version: 1;
  document: string;
  focus: string;
  note: string;
  updatedAt: string;
  snapshots: SliceSnapshot[];
}

export interface SliceLine {
  index: number;
  depth: number;
  text: string;
  task: boolean;
  done: boolean;
}

const taskPattern = /^(\s*)([-*+]\s+)(?:\[([ xX])\]\s*)?(.*)$/;
export const STORAGE_KEY = 'nitro-time-slice:v1';

export function emptyWorkspace(): SliceWorkspace {
  return { version: 1, document: '', focus: '', note: '', updatedAt: '', snapshots: [] };
}

export function parseLines(document: string): SliceLine[] {
  // Accept pasted outlines using either two spaces, wider indentation, or tabs.
  const levels = [0];
  return document.split('\n').flatMap((line, index) => {
    if (!line.trim()) return [];
    const match = line.match(taskPattern);
    const indent = (match?.[1] || line.match(/^\s*/)?.[0] || '').replaceAll('\t', '  ').length;
    while (levels.length > 1 && indent < levels[levels.length - 1]) levels.pop();
    if (indent > levels[levels.length - 1]) levels.push(indent);
    return [{
      index,
      depth: levels.length - 1,
      text: match ? match[4] : line.trim(),
      task: Boolean(match),
      done: Boolean(match?.[3]?.toLowerCase() === 'x'),
    }];
  });
}

export function toggleLine(document: string, index: number): string {
  const lines = document.split('\n');
  const match = lines[index]?.match(taskPattern);
  if (!match) return document;
  lines[index] = `${match[1]}${match[2]}[${match[3]?.toLowerCase() === 'x' ? ' ' : 'x'}] ${match[4]}`;
  return lines.join('\n');
}

export function continuation(line: string): string | null {
  const match = line.match(taskPattern);
  return match ? `${match[1]}${match[2]}${match[3] === undefined ? '' : '[ ] '}` : null;
}

export function makeSnapshot(state: SliceWorkspace, now = new Date()): SliceSnapshot {
  return {
    id: crypto.randomUUID(), createdAt: now.toISOString(),
    document: state.document, focus: state.focus, note: state.note,
  };
}

export function hasContent(state: Pick<SliceWorkspace, 'document' | 'focus' | 'note'>): boolean {
  return Boolean(state.document.trim() || state.focus.trim() || state.note.trim());
}

/** Reject malformed backups before replacing anything in storage. */
export function readWorkspace(raw: string): SliceWorkspace {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('无效的备份');
  const data = value as Record<string, unknown>;
  const textFields = (item: Record<string, unknown>) =>
    ['document', 'focus', 'note'].every((key) => typeof item[key] === 'string');
  const validDate = (date: unknown) => typeof date === 'string' && Number.isFinite(Date.parse(date));
  if (data.version !== 1 || !textFields(data) || !Array.isArray(data.snapshots) ||
    !(data.updatedAt === '' || validDate(data.updatedAt))) throw new Error('无效的备份');
  const ids = new Set<string>();
  for (const entry of data.snapshots) {
    if (!entry || typeof entry !== 'object' || !textFields(entry) ||
      typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || !validDate(entry.createdAt)) {
      throw new Error('无效的留档');
    }
    ids.add(entry.id);
  }
  return {
    version: 1, document: data.document as string, focus: data.focus as string,
    note: data.note as string, updatedAt: data.updatedAt as string,
    snapshots: data.snapshots.map((item) => ({
      id: item.id, createdAt: item.createdAt, document: item.document, focus: item.focus, note: item.note,
    })),
  };
}

/** Keep a rescue copy and the existing history when restoring or importing. */
export function replaceWorkspace(current: SliceWorkspace, incoming: SliceWorkspace): SliceWorkspace {
  const rescue = hasContent(current) ? [makeSnapshot(current)] : [];
  const seen = new Set<string>();
  return {
    ...incoming,
    snapshots: [...rescue, ...current.snapshots, ...incoming.snapshots].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  };
}
