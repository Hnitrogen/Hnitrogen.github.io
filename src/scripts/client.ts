const root = document.documentElement;
const themeButton = document.querySelector<HTMLButtonElement>(
  "[data-theme-toggle]",
);
function syncThemeButton() {
  themeButton?.setAttribute(
    "aria-label",
    root.dataset.theme === "dark" ? "切换浅色主题" : "切换深色主题",
  );
}
syncThemeButton();
themeButton?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("nitro-theme", root.dataset.theme);
  } catch {
    /* Theme still works when storage is unavailable. */
  }
  syncThemeButton();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener(
  "change",
  (event) => {
    try {
      if (localStorage.getItem("nitro-theme")) return;
    } catch {
      /* Follow system preference. */
    }
    root.dataset.theme = event.matches ? "dark" : "light";
    syncThemeButton();
  },
);

const menu = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const sidebar = document.querySelector<HTMLElement>(".sidebar")!;
const mobileLayout = matchMedia("(max-width: 760px)");
function syncSidebarAccess() {
  sidebar.inert =
    mobileLayout.matches && !document.body.classList.contains("sidebar-open");
}
function closeMenu() {
  const wasOpen = document.body.classList.contains("sidebar-open");
  document.body.classList.remove("sidebar-open");
  menu?.setAttribute("aria-expanded", "false");
  syncSidebarAccess();
  if (wasOpen && mobileLayout.matches) menu?.focus();
}
menu?.addEventListener("click", () => {
  const open = document.body.classList.toggle("sidebar-open");
  menu.setAttribute("aria-expanded", String(open));
  syncSidebarAccess();
  if (open) sidebar.querySelector<HTMLElement>("a, button")?.focus();
});
mobileLayout.addEventListener("change", closeMenu);
syncSidebarAccess();
document
  .querySelector("[data-menu-close]")
  ?.addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
  if (
    event.key === "Tab" &&
    mobileLayout.matches &&
    document.body.classList.contains("sidebar-open")
  ) {
    const items = [
      ...sidebar.querySelectorAll<HTMLElement>("a, button, summary"),
    ].filter((element) => element.getClientRects().length);
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});
document
  .querySelectorAll(".sidebar a")
  .forEach((link) => link.addEventListener("click", closeMenu));

let activeCategory = "all";
const rows = [...document.querySelectorAll<HTMLElement>(".post-row")];
const sort = document.querySelector<HTMLSelectElement>("#post-sort");
function updatePosts() {
  let visible = 0;
  rows.sort((a, b) =>
    sort?.value === "oldest"
      ? Number(a.dataset.date) - Number(b.dataset.date)
      : sort?.value === "updated"
        ? Number(b.dataset.updated) - Number(a.dataset.updated)
        : Number(b.dataset.date) - Number(a.dataset.date),
  );
  rows.forEach((row) => {
    row.hidden =
      activeCategory !== "all" && row.dataset.category !== activeCategory;
    row.parentElement?.append(row);
    if (!row.hidden) {
      visible++;
      const number = row.querySelector(".post-index");
      if (number) number.textContent = String(visible).padStart(2, "0");
    }
  });
  const count = document.querySelector("[data-visible-count]");
  if (count) count.textContent = String(visible);
  const empty = document.querySelector<HTMLElement>(".filter-empty");
  if (empty) empty.hidden = visible !== 0;
}
document
  .querySelectorAll<HTMLButtonElement>("[data-category-filter]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      activeCategory = button.dataset.categoryFilter || "all";
      document.querySelectorAll("[data-category-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      updatePosts();
    }),
  );
sort?.addEventListener("change", updatePosts);

async function copyText(value: string) {
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(value);
  throw new Error("Clipboard unavailable");
}
document
  .querySelector<HTMLButtonElement>("[data-copy-link]")
  ?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const label = button.querySelector("span")!;
    try {
      await copyText(location.href.split("#")[0]);
      label.textContent = "已复制";
    } catch {
      label.textContent = "复制失败";
    }
    setTimeout(() => {
      label.textContent = "复制链接";
    }, 1800);
  });
document.querySelectorAll<HTMLPreElement>(".prose pre").forEach((pre) => {
  const wrapper = document.createElement("div");
  wrapper.className = "code-wrapper";
  pre.replaceWith(wrapper);
  wrapper.append(pre);
  const label = document.createElement("span");
  label.className = "code-label";
  label.textContent =
    pre.dataset.language ||
    pre.querySelector("code")?.className.replace("language-", "") ||
    "code";
  wrapper.append(label);
  const copy = document.createElement("button");
  copy.className = "code-copy";
  copy.textContent = "复制";
  copy.setAttribute("aria-label", "复制代码");
  wrapper.append(copy);
  copy.addEventListener("click", async () => {
    try {
      await copyText(
        pre.querySelector("code")?.textContent || pre.textContent || "",
      );
      copy.textContent = "已复制";
    } catch {
      copy.textContent = "复制失败";
    }
    setTimeout(() => {
      copy.textContent = "复制";
    }, 1800);
  });
});
document.querySelectorAll(".prose table").forEach((table) => {
  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll";
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", "可横向滚动的表格");
  table.replaceWith(wrapper);
  wrapper.append(table);
});

const headings = [
  ...document.querySelectorAll<HTMLElement>(".prose h2, .prose h3"),
];
const tocLinks = [
  ...document.querySelectorAll<HTMLAnchorElement>(".toc-nav a"),
];
const progress = document.querySelector<HTMLElement>(".reading-progress");
let queued = false;
function updateReading() {
  queued = false;
  const height = document.documentElement.scrollHeight - innerHeight;
  if (progress)
    progress.style.transform = `scaleX(${height > 0 ? Math.min(1, Math.max(0, scrollY / height)) : 1})`;
  let current = headings[0]?.id;
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= 145) current = heading.id;
  }
  tocLinks.forEach((link) => {
    const active = decodeURIComponent(link.hash.slice(1)) === current;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
if (progress) {
  addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(updateReading);
      }
    },
    { passive: true },
  );
  addEventListener("resize", updateReading);
  updateReading();
}

interface SearchEntry {
  title: string;
  description: string;
  text: string;
  url: string;
  category: string;
}
interface PagefindData {
  url: string;
  excerpt: string;
  meta: { title?: string; description?: string };
  filters?: { category?: string[] };
}
interface Pagefind {
  search: (
    query: string,
  ) => Promise<{ results: { data: () => Promise<PagefindData> }[] }>;
}
const dialog = document.querySelector<HTMLDialogElement>("#search-dialog")!;
const input = document.querySelector<HTMLInputElement>("#search-input")!;
const resultContainer = document.querySelector<HTMLElement>("#search-results")!;
const base = dialog.dataset.base!;
let returnFocus: HTMLElement | null = null;
let pagefindPromise: Promise<Pagefind | null> | undefined;
let fallbackPromise: Promise<SearchEntry[]> | undefined;
let generation = 0;
let debounce: ReturnType<typeof setTimeout>;
let selected = -1;
function message(value: string) {
  resultContainer.replaceChildren();
  const p = document.createElement("p");
  p.className = "search-hint";
  p.textContent = value;
  resultContainer.append(p);
}
function openSearch() {
  closeMenu();
  returnFocus = document.activeElement as HTMLElement;
  if (!dialog.open) dialog.showModal();
  input.focus();
}
document
  .querySelectorAll("[data-search-open]")
  .forEach((button) => button.addEventListener("click", openSearch));
document
  .querySelector("[data-search-close]")
  ?.addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => returnFocus?.focus());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (dialog.open) dialog.close();
    else openSearch();
  }
});
function highlight(element: HTMLElement, text: string, query: string) {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${terms.join("|")})`, "ig");
  for (const part of text.split(pattern)) {
    if (terms.some((term) => new RegExp(`^${term}$`, "i").test(part))) {
      const mark = document.createElement("mark");
      mark.textContent = part;
      element.append(mark);
    } else element.append(document.createTextNode(part));
  }
}
function renderResults(results: SearchEntry[], query: string, total: number) {
  resultContainer.replaceChildren();
  selected = -1;
  if (!results.length) {
    message(`没有找到「${query}」相关的笔记，试试其他关键词。`);
    return;
  }
  const summary = document.createElement("p");
  summary.className = "search-summary";
  summary.textContent = `${total} 篇相关笔记`;
  resultContainer.append(summary);
  for (const entry of results) {
    const link = document.createElement("a");
    link.className = "search-result";
    link.href = entry.url;
    const category = document.createElement("span");
    category.className = "result-category";
    category.textContent = entry.category;
    link.append(category);
    const title = document.createElement("h3");
    highlight(title, entry.title, query);
    link.append(title);
    const excerpt = document.createElement("p");
    highlight(excerpt, entry.description, query);
    link.append(excerpt);
    resultContainer.append(link);
  }
}
async function search(query: string, token: number) {
  if (!query) {
    message("从一个关键词开始，找到相关的笔记。");
    return;
  }
  try {
    if (import.meta.env.PROD)
      pagefindPromise ||= import(
        /* @vite-ignore */ `${base}pagefind/pagefind.js`
      ).catch(() => null);
    const pagefind = await pagefindPromise;
    let indexed: SearchEntry[] = [];
    let indexedCount = 0;
    if (pagefind) {
      try {
        const response = await pagefind.search(query);
        const data = await Promise.all(
          response.results.slice(0, 12).map((result) => result.data()),
        );
        indexedCount = response.results.length;
        indexed = data.map((entry) => ({
          title: entry.meta.title || "未命名笔记",
          url: entry.url,
          text: "",
          category: entry.filters?.category?.join(" / ") || "笔记",
          description:
            new DOMParser().parseFromString(
              entry.excerpt || entry.meta.description || "",
              "text/html",
            ).body.textContent || "",
        }));
      } catch {
        /* Exact matching remains available if the optional Pagefind index cannot load. */
      }
    }
    // Supplement segmented search with exact text matching, including taxonomy labels.
    fallbackPromise ||= fetch(`${base}search-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error("搜索索引加载失败");
        return response.json();
      })
      .catch((error) => {
        fallbackPromise = undefined;
        throw error;
      });
    const entries = await fallbackPromise.catch((error) => {
      if (indexed.length) return [] as SearchEntry[];
      throw error;
    });
    if (token !== generation) return;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = entries
      .filter((entry) =>
        terms.every((term) =>
          `${entry.title} ${entry.description} ${entry.text} ${entry.category}`
            .toLowerCase()
            .includes(term),
        ),
      )
      .map((entry) => {
        if (
          terms.some((term) => entry.description.toLowerCase().includes(term))
        )
          return entry;
        const plain = entry.text
          .replace(/^---[\s\S]*?---/m, "")
          .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
          .replace(/[#*`>|]/g, "")
          .replace(/\s+/g, " ");
        const index = plain.toLowerCase().indexOf(terms[0]);
        return index >= 0
          ? {
              ...entry,
              description: `${index > 25 ? "…" : ""}${plain.slice(Math.max(0, index - 25), index + 130)}${plain.length > index + 130 ? "…" : ""}`,
            }
          : entry;
      });
    const combined = new Map(indexed.map((entry) => [entry.url, entry]));
    for (const match of matches)
      if (!combined.has(match.url)) combined.set(match.url, match);
    const result = [...combined.values()].sort(
      (a, b) =>
        Number(b.title.toLowerCase().includes(query.toLowerCase())) -
        Number(a.title.toLowerCase().includes(query.toLowerCase())),
    );
    renderResults(
      result.slice(0, 12),
      query,
      Math.max(indexedCount, result.length),
    );
  } catch {
    if (token === generation) message("暂时无法加载搜索，请稍后重试。");
  }
}
input.addEventListener("input", () => {
  clearTimeout(debounce);
  const token = ++generation;
  const query = input.value.trim();
  if (!query) {
    message("从一个关键词开始，找到相关的笔记。");
    return;
  }
  message("正在寻找相关笔记…");
  debounce = setTimeout(() => {
    void search(query, token);
  }, 150);
});
dialog.addEventListener("keydown", (event) => {
  const links = [
    ...resultContainer.querySelectorAll<HTMLAnchorElement>(".search-result"),
  ];
  if (!links.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    selected =
      event.key === "ArrowDown"
        ? (selected + 1) % links.length
        : (selected - 1 + links.length) % links.length;
    links.forEach((link, index) =>
      link.classList.toggle("selected", index === selected),
    );
    links[selected].scrollIntoView({ block: "nearest" });
  }
  if (
    event.key === "Enter" &&
    selected >= 0 &&
    document.activeElement === input
  ) {
    event.preventDefault();
    links[selected].click();
  }
});
