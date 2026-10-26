import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import matter from "gray-matter";
import { slugPattern, validateContent } from "../src/lib/content-registry.mjs";

const [slug, ...rest] = process.argv.slice(2);
try {
  if (!slug || !slugPattern.test(slug) || rest.length)
    throw new Error("用法：npm run publish -- my-note");
  validateContent();
  const path = resolve("content/posts", slug, "index.md");
  const original = readFileSync(path, "utf8");
  const { data } = matter(original);
  if (!data.draft)
    throw new Error(`${slug} 已经公开；修改正文后直接检查并提交即可。`);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
  }).format(new Date());
  // Replace only frontmatter fields, preserving the author's formatting and body verbatim.
  const boundary = original.indexOf("\n---", 4);
  let frontmatter = original
    .slice(0, boundary)
    .replace(/^draft:\s*true\s*$/m, "draft: false")
    .replace(/^pubDate:.*$/m, `pubDate: ${today}`);
  if (Object.hasOwn(data, "updatedDate"))
    frontmatter = frontmatter.replace(
      /^updatedDate:.*$/m,
      `updatedDate: ${today}`,
    );
  if (boundary < 0 || !/^draft:\s*false$/m.test(frontmatter))
    throw new Error("无法更新 frontmatter，请使用标准的 draft: true 字段。");
  writeFileSync(path, frontmatter + original.slice(boundary));
  try {
    validateContent();
    for (const task of ["check", "build"]) {
      const result = spawnSync(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["run", task],
        { stdio: "inherit", shell: false },
      );
      if (result.status !== 0) throw new Error(`${task} 失败，已恢复草稿。`);
    }
  } catch (error) {
    writeFileSync(path, original);
    throw error;
  }
  console.log(
    `\n${slug} 已通过检查，发布状态已更新。\n提交并推送 content/ 后，已配置的部署流水线会自动发布。`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
