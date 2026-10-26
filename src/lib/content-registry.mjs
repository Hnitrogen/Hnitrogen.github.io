import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import matter from "gray-matter";

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateRegistry(registry) {
  for (const section of ["categories", "tags", "posts"]) {
    if (
      !registry[section] ||
      typeof registry[section] !== "object" ||
      Array.isArray(registry[section])
    )
      throw new Error(`meta.json 缺少 ${section} 对象`);
  }
  for (const section of ["categories", "tags"]) {
    for (const [id, item] of Object.entries(registry[section])) {
      if (
        !slugPattern.test(id) ||
        typeof item.label !== "string" ||
        !item.label.trim()
      )
        throw new Error(`${section}.${id} 需要有效 ID 和 label`);
      if (
        section === "categories" &&
        (typeof item.description !== "string" || !Number.isFinite(item.order))
      )
        throw new Error(`分类 ${id} 需要 description 和数字 order`);
    }
  }
  for (const [slug, post] of Object.entries(registry.posts)) {
    if (!slugPattern.test(slug)) throw new Error(`文章 slug 无效：${slug}`);
    if (!Object.hasOwn(registry.categories, post.category))
      throw new Error(`${slug} 的分类不存在：${post.category}`);
    if (
      !Array.isArray(post.tags) ||
      new Set(post.tags).size !== post.tags.length
    )
      throw new Error(`${slug} 的 tags 必须是不重复的数组`);
    for (const tag of post.tags)
      if (!Object.hasOwn(registry.tags, tag))
        throw new Error(`${slug} 的标签不存在：${tag}`);
    if (post.featured !== undefined && typeof post.featured !== "boolean")
      throw new Error(`${slug} 的 featured 必须是布尔值`);
  }
  return registry;
}

export function validateContent(root = process.cwd()) {
  const registry = validateRegistry(
    JSON.parse(readFileSync(resolve(root, "content/meta.json"), "utf8")),
  );
  const postsRoot = resolve(root, "content/posts");
  const seen = new Set();
  for (const entry of readdirSync(postsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(postsRoot, entry.name, "index.md");
    if (!existsSync(path)) throw new Error(`${entry.name} 缺少 index.md`);
    const { data, content } = matter(readFileSync(path, "utf8"));
    if (data.slug !== entry.name)
      throw new Error(`${entry.name} 的 slug 必须与目录名一致`);
    if (!Object.hasOwn(registry.posts, data.slug))
      throw new Error(`${data.slug} 缺少 meta.json 分类映射`);
    if (
      typeof data.title !== "string" ||
      !data.title.trim() ||
      typeof data.description !== "string" ||
      !data.description.trim()
    )
      throw new Error(`${data.slug} 需要 title 和 description`);
    if (!data.pubDate || Number.isNaN(new Date(data.pubDate).valueOf()))
      throw new Error(`${data.slug} 的 pubDate 无效`);
    if (
      data.updatedDate &&
      (Number.isNaN(new Date(data.updatedDate).valueOf()) ||
        new Date(data.updatedDate) < new Date(data.pubDate))
    )
      throw new Error(`${data.slug} 的 updatedDate 不得早于 pubDate`);
    for (const field of ["draft", "example"])
      if (data[field] !== undefined && typeof data[field] !== "boolean")
        throw new Error(`${data.slug} 的 ${field} 必须是布尔值`);
    if (!content.trim()) throw new Error(`${data.slug} 正文不能为空`);
    for (const match of content.matchAll(
      /!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))/g,
    )) {
      const image = match[1] || match[2];
      if (
        !/^(https?:|data:|\/)/.test(image) &&
        !existsSync(
          resolve(postsRoot, entry.name, decodeURI(image.split(/[?#]/)[0])),
        )
      )
        throw new Error(`${data.slug} 图片不存在：${image}`);
    }
    seen.add(data.slug);
  }
  for (const slug of Object.keys(registry.posts))
    if (!seen.has(slug)) throw new Error(`meta.json 映射 ${slug} 没有对应文章`);
  return registry;
}

export function isPublished(data, now = new Date()) {
  return data.draft !== true && new Date(data.pubDate) <= now;
}

export function readingMinutes(body = "") {
  const chinese = (body.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (
    body.replace(/[\u3400-\u9fff]/g, " ").match(/[a-zA-Z0-9]+/g) || []
  ).length;
  return Math.max(1, Math.ceil(chinese / 350 + words / 220));
}
