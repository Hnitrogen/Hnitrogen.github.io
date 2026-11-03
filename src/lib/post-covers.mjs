import { LANDSCAPES } from './landscapes.mjs';
export const COVER_POOL_SIZE = LANDSCAPES.length;

/** @param {string | null} serialized */
export function readCoverAssignments(serialized) {
  /** @type {Map<string, number>} */
  const assignments = new Map();
  try {
    const entries = JSON.parse(serialized || "null");
    if (!Array.isArray(entries)) return assignments;
    for (const entry of entries) {
      if (
        Array.isArray(entry) &&
        typeof entry[0] === "string" &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry[0]) &&
        Number.isInteger(entry[1]) &&
        entry[1] >= 1 && entry[1] <= COVER_POOL_SIZE
      ) assignments.set(entry[0], entry[1]);
    }
  } catch {
    // An unavailable or damaged session must not prevent reading the blog.
  }
  return assignments;
}

/**
 * Retain covers during navigation, and deal a fresh set on directory reload.
 * IDs are unique within the page until the local gallery is exhausted.
 * @param {string[]} slugs
 * @param {Map<string, number>} previous
 * @param {{refresh?: boolean, poolSize?: number, random?: () => number}} options
 */
export function assignPostCovers(slugs, previous, options = {}) {
  const { refresh = false, poolSize = COVER_POOL_SIZE, random = Math.random } = options;
  if (!Number.isInteger(poolSize) || poolSize < 1) throw new RangeError("封面图库不能为空");
  const assignments = new Map(previous);
  const pool = Array.from({ length: poolSize }, (_, index) => index + 1);
  const requested = [...new Set(slugs)];
  const used = new Set();
  // Reserve retained IDs before assigning new posts, so existing covers stay put.
  const retained = new Set();
  if (!refresh) {
    for (const slug of requested) {
      const id = previous.get(slug);
      if (Number.isInteger(id) && id >= 1 && id <= poolSize && !used.has(id)) {
        retained.add(slug);
        used.add(id);
      }
    }
  }
  for (const slug of requested) {
    if (retained.has(slug)) continue;
    let available = pool.filter((id) => !used.has(id));
    if (!available.length) {
      used.clear();
      available = pool;
    }
    const different = available.filter((id) => id !== previous.get(slug));
    const candidates = different.length ? different : available;
    const id = candidates[Math.floor(random() * candidates.length)];
    assignments.set(slug, id);
    used.add(id);
  }
  return assignments;
}

/** @param {number} id */
export function postCoverUrl(id) {
  if (!Number.isInteger(id) || id < 1 || id > COVER_POOL_SIZE) {
    throw new RangeError("封面图片 ID 不在图库范围内");
  }
  return LANDSCAPES[id - 1].cover;
}
