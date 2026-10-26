import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  validateRegistry,
  validateContent,
  isPublished,
  readingMinutes,
} from "../src/lib/content-registry.mjs";

const registry = () => ({
  categories: { notes: { label: "随记", description: "记录", order: 1 } },
  tags: { writing: { label: "写作" } },
  posts: { "test-note": { category: "notes", tags: ["writing"] } },
});
function fixture(fn) {
  const root = mkdtempSync(resolve(tmpdir(), "nitro-content-"));
  mkdirSync(resolve(root, "content/posts/test-note"), { recursive: true });
  writeFileSync(resolve(root, "content/meta.json"), JSON.stringify(registry()));
  writeFileSync(
    resolve(root, "content/posts/test-note/index.md"),
    "---\nslug: test-note\ntitle: 测试\ndescription: 摘要\npubDate: 2026-01-01\ndraft: true\n---\n\n测试正文。\n",
  );
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("真实内容的分类、slug、日期和本地图片均有效", () => {
  assert.ok(validateContent().posts["building-with-agents"]);
});
test("未知分类、未知标签和重复标签会阻止构建", () => {
  const badCategory = registry();
  badCategory.posts["test-note"].category = "missing";
  assert.throws(() => validateRegistry(badCategory), /分类不存在/);
  const badTag = registry();
  badTag.posts["test-note"].tags = ["missing"];
  assert.throws(() => validateRegistry(badTag), /标签不存在/);
  const duplicateTag = registry();
  duplicateTag.posts["test-note"].tags.push("writing");
  assert.throws(() => validateRegistry(duplicateTag), /不重复/);
});
test("草稿和未来日期不能进入公开内容", () => {
  const now = new Date("2026-10-26T10:00:00Z");
  assert.equal(isPublished({ draft: true, pubDate: "2026-01-01" }, now), false);
  assert.equal(
    isPublished({ draft: false, pubDate: "2027-01-01" }, now),
    false,
  );
  assert.equal(isPublished({ draft: false, pubDate: "2026-10-26" }, now), true);
});
test("中英文阅读时长都计入估算", () => {
  assert.equal(readingMinutes("中".repeat(701)), 3);
  assert.equal(readingMinutes("word ".repeat(441)), 3);
});
test("缺图和孤立的元数据映射会被发现", () =>
  fixture((root) => {
    const path = resolve(root, "content/posts/test-note/index.md");
    const original = readFileSync(path, "utf8");
    writeFileSync(path, original + "\n![缺图](./images/missing.png)");
    assert.throws(() => validateContent(root), /图片不存在/);
    writeFileSync(path, original);
    const meta = registry();
    meta.posts.orphan = { category: "notes", tags: [] };
    writeFileSync(resolve(root, "content/meta.json"), JSON.stringify(meta));
    assert.throws(() => validateContent(root), /没有对应文章/);
  }));
test("新建命令创建完整草稿、登记分类，并拒绝覆盖或路径穿越", () =>
  fixture((root) => {
    const script = resolve("scripts/new-post.mjs");
    const run = (...args) =>
      spawnSync(process.execPath, [script, ...args], {
        cwd: root,
        encoding: "utf8",
      });
    assert.equal(
      run("new-note", "--title", "新笔记", "--tags", "writing").status,
      0,
    );
    assert.match(
      readFileSync(resolve(root, "content/posts/new-note/index.md"), "utf8"),
      /draft: true/,
    );
    assert.ok(validateContent(root).posts["new-note"]);
    assert.equal(run("new-note").status, 1);
    assert.equal(run("../outside").status, 1);
    assert.equal(run("bad-note", "--category", "unknown").status, 1);
  }));
test("发布命令校验失败时恢复原始草稿，成功时保留正文", () =>
  fixture((root) => {
    const bin = resolve(root, "bin");
    mkdirSync(bin);
    const npm = resolve(bin, "npm");
    writeFileSync(npm, "#!/bin/sh\nexit 1\n");
    chmodSync(npm, 0o755);
    const path = resolve(root, "content/posts/test-note/index.md");
    const original = readFileSync(path, "utf8");
    const run = () =>
      spawnSync(
        process.execPath,
        [resolve("scripts/publish-post.mjs"), "test-note"],
        {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        },
      );
    assert.equal(run().status, 1);
    assert.equal(readFileSync(path, "utf8"), original);
    writeFileSync(npm, "#!/bin/sh\nexit 0\n");
    assert.equal(run().status, 0);
    const published = readFileSync(path, "utf8");
    assert.match(published, /draft: false/);
    assert.equal(published.split("\n---\n")[1], original.split("\n---\n")[1]);
    assert.equal(run().status, 1);
  }));
