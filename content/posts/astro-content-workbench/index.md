---
slug: astro-content-workbench
title: 用 Astro 搭一座可以长期维护的知识库
description: Markdown 保存内容，JSON 管理索引，静态构建负责交付。给写作留出一个简单、开放的工作台。
pubDate: 2026-10-22
draft: false
example: true
---

> 示例文章。具体维护步骤见项目根目录 README。

个人博客最值得长期保留的部分是内容。框架可以更换，界面可以重做，文章和图片应该能够独立存在。

## 先确定内容的归属

每篇文章使用一个独立文件夹，把正文和图片一起保存到 Git：

```text
content/
├── meta.json
└── posts/
    └── my-first-note/
        ├── index.md
        └── images/
            └── diagram.png
```

这样迁移文章时，不容易遗漏图片；修改历史也能跟着内容一起保留。

## 把显示信息放进文章

标题、摘要、日期和草稿状态描述的是文章本身，适合使用 frontmatter：

```yaml
---
slug: my-first-note
title: 我的第一篇笔记
description: 用一句话说明这篇文章讨论什么。
pubDate: 2026-10-26
draft: true
---
```

正文里的本地图片使用相对路径：`./images/diagram.png`。Astro 会在构建时处理被引用的图片。

## 把分类放进统一的索引

分类名称和标签名称可能随着知识库增长而调整。如果它们在几十篇文章中反复出现，维护起来会比较麻烦。

这个项目把文章与分类、标签的映射集中到 `content/meta.json`：

```json
{
  "my-first-note": {
    "category": "frontend",
    "tags": ["astro", "writing"]
  }
}
```

上面是 `posts` 字段中的单个条目。分类和标签的完整定义也在同一文件里。

## 在构建时发现问题

构建之前检查 slug、分类映射和本地图片。正文发布之前还有最后一层约束：草稿不会生成公开文章页面，也不会进入搜索和 RSS。

```bash
npm run check
npm test
npm run build
npm run preview
```

## 给未来的自己留一份说明

把新增文章、维护标签、预览和部署的方法写进 README。它不需要很长，但应该让几个月后的自己能从第一条命令重新开始。
