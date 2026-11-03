import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import matter from "gray-matter";
import { isPublished } from "../src/lib/content-registry.mjs";

const root = resolve("dist");
assert.ok(existsSync(join(root, "index.html")), "请先运行 npm run build");
const base = (process.env.BASE_PATH || "/").replace(/\/$/, "");
function walk(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(folder, entry.name))
      : [join(folder, entry.name)],
  );
}
const htmlFiles = walk(root).filter((path) => path.endsWith(".html"));
let linkCount = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const pathname = decodeURI(href.split(/[?#]/)[0]);
    assert.ok(
      !base || pathname === base || pathname.startsWith(base + "/"),
      `缺少 base 前缀：${href} (${file})`,
    );
    const local = pathname.slice(base.length).replace(/^\//, "");
    const target = join(root, local);
    assert.ok(
      existsSync(extname(target) ? target : join(target, "index.html")),
      `内部链接或资源不存在：${href} (${file})`,
    );
    linkCount++;
  }
}
const search = JSON.parse(
  readFileSync(join(root, "search-index.json"), "utf8"),
);
const feed = readFileSync(join(root, "rss.xml"), "utf8");
const home = readFileSync(join(root, "index.html"), "utf8");
const directory = readFileSync(join(root, "directory/index.html"), "utf8");
const experiences = readFileSync(join(root, "experiences/index.html"), "utf8");
const metadata = JSON.parse(readFileSync("content/meta.json", "utf8"));
const published = [];
let publicCount = 0;
for (const entry of readdirSync("content/posts", {
  withFileTypes: true,
}).filter((item) => item.isDirectory())) {
  const { data } = matter(
    readFileSync(resolve("content/posts", entry.name, "index.md"), "utf8"),
  );
  const url = `${base}/posts/${data.slug}/`;
  if (isPublished(data)) {
    publicCount++;
    published.push(data);
    assert.ok(existsSync(join(root, "posts", data.slug, "index.html")));
    assert.ok(search.some((item) => item.url === url));
    assert.ok(feed.includes(url));
    assert.ok(home.includes(`href="${url}"`), `首页文件树缺少公开文章：${data.slug}`);
    const inExperiences = experiences.includes(`href="${url}"`);
    assert.equal(inExperiences, metadata.posts[data.slug].category === 'experiences', `体验文件夹收录错误：${data.slug}`);
  } else {
    assert.ok(
      !existsSync(join(root, "posts", data.slug, "index.html")),
      `草稿或未来文章生成了公开页：${data.slug}`,
    );
    assert.ok(!search.some((item) => item.url === url), "草稿泄漏到搜索");
    assert.ok(!feed.includes(url), "草稿泄漏到 RSS");
    assert.ok(!home.includes(url), "草稿泄漏到首页或文档树");
    assert.ok(!experiences.includes(url), "草稿泄漏到体验文件夹");
  }
}
assert.equal(search.length, publicCount);
const homeSlugs = [...home.matchAll(/data-post-id="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(homeSlugs.sort(), published.map((post) => post.slug).sort(), '首页目录遗漏或重复收录文章');
assert.ok(home.includes('data-file-explorer'), '首页缺少文件树');
assert.ok(!home.includes('collection-pagination') && !home.includes('post-grid'), '首页仍保留集合或分页');
assert.ok(!existsSync(join(root, 'page')), '仍生成了集合分页');
assert.ok(directory.includes('http-equiv="refresh"'), '旧目录地址未跳转首页');
assert.ok(existsSync(join(root, "pagefind/pagefind.js")), "缺少生产搜索索引");
console.log(
  `构建验证通过：${htmlFiles.length} 个 HTML、${linkCount} 处内部链接与资源、${publicCount} 篇公开文章；首页文件树、体验归类、旧地址跳转与草稿隔离正常。`,
);
