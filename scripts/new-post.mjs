import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { slugPattern, validateContent } from "../src/lib/content-registry.mjs";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      title: { type: "string" },
      description: { type: "string" },
      category: { type: "string", default: "notes" },
      tags: { type: "string", default: "" },
    },
  });
  const [slug] = positionals;
  if (!slug || !slugPattern.test(slug) || positionals.length !== 1)
    throw new Error(
      '用法：npm run new -- my-note --title "笔记标题" --category notes --tags writing',
    );
  const metadata = validateContent();
  if (!Object.hasOwn(metadata.categories, values.category))
    throw new Error(`分类不存在：${values.category}`);
  const tags = [
    ...new Set(
      values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
  for (const tag of tags)
    if (!Object.hasOwn(metadata.tags, tag))
      throw new Error(`标签不存在：${tag}`);
  const folder = resolve("content/posts", slug);
  if (existsSync(folder) || metadata.posts[slug])
    throw new Error(`文章已经存在：${slug}，不会覆盖。`);
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
  }).format(new Date());
  const source = `---\nslug: ${slug}\ntitle: ${JSON.stringify(values.title || slug)}\ndescription: ${JSON.stringify(values.description || "用一句话说明这篇文章讨论什么。")}\npubDate: ${date}\ndraft: true\n---\n\n## 从一个问题开始\n\n在这里写下你的想法。\n`;
  const originalMetadata = readFileSync("content/meta.json", "utf8");
  mkdirSync(resolve(folder, "images"), { recursive: true });
  try {
    writeFileSync(resolve(folder, "index.md"), source, { flag: "wx" });
    writeFileSync(resolve(folder, "images/.gitkeep"), "");
    metadata.posts[slug] = { category: values.category, tags };
    writeFileSync(
      "content/meta.json",
      JSON.stringify(metadata, null, 2) + "\n",
    );
    validateContent();
  } catch (error) {
    rmSync(folder, { recursive: true, force: true });
    writeFileSync("content/meta.json", originalMetadata);
    throw error;
  }
  console.log(
    `已创建草稿：content/posts/${slug}/index.md\n准备发布时运行：npm run publish -- ${slug}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
