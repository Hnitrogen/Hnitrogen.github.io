# Hnitro Notes / Agentic Note

一座基于 **Astro 7 + TypeScript + Pagefind** 的个人技术知识库。采用「雾中目录」风景主题，雪山、晨雾与沿海公路融入目录留白，正文以 Markdown 和 Git 为基础。首页直接展示可展开的文件树，以文章标题和更新时间为主，不设文章卡片集合或分页，保留文章 URL 和搜索。

## 对话需求整理

根据「改造技术博客区域」中可读取的用户消息实现：

- 文档树导航、宽屏正文、现代黑白主题、全文搜索。
- 参考 Fuwari 的清爽体验，提高列表和导航的信息密度。
- 后续视觉调整：在中性底色上增加墨绿主强调色与暖橙点缀，浅色与深色模式分别适配。
- 每篇文章一个文件夹，Markdown 正文与图片子文件夹一起保存到 GitHub。
- JSON 集中管理分类、标签与文章映射。
- `AGENTS.md` 为 Codex 辅助写作、图片与维护提供约定。
- 发布后由 Git 推送触发静态部署，支持 Cloudflare Pages 免费子域名或 GitHub Pages。
- **正式部署：使用 `Hnitrogen/Hnitrogen.github.io` 仓库，发布到 `https://hnitrogen.github.io/`。** 用户已授权覆盖旧站，迁移保留原 Git 历史。

引用对话中的部分历史助手回复仅返回内容引用占位符；以上整理依据可读取的用户原文。

## 本地运行

推荐 Node.js 24（最低 22.23.4），使用 npm。

```bash
npm ci
npm run dev
```

打开终端打印的本地地址，默认是 `http://127.0.0.1:4321/`。开发模式也支持全文搜索。

查看完整的生产版本与 Pagefind 中文搜索：

```bash
npm run check
npm test
npm run build
npm run verify:build
npm run preview
```

## 已实现

- 首页就是目录，公开文章按「笔记」和「体验日志」显示在文件树中，支持逐项或全部展开/折叠，点击标题打开文章。右侧显示更新时间，悬停可查看源文件路径。
- 目录使用自动分配的本地风景小封面，无需逐篇填写；刷新目录换图，同一标签页内打开正文沿用该图。加载时显示三点等待动画，图片解码完成后淡入。
- 首页不显示头像与分类侧栏，不限制文章数量，不生成集合分页；旧 `/directory/` 地址跳转首页。
- 文章页、标签页、按年归档、关于页、404；旧分类 URL 跳转首页目录，分类元数据继续保留用于内容管理。
- 首页与体验页采用左景右文的「雾中目录」，手机上风景自然过渡到正文底色。支持三种风景切换、浅深主题和本地记忆；文章页使用安静的中性底色与宽屏正文。小米 HiUI 原始 SVG 随项目打包，无客户端图标框架依赖。
- 独立「体验日志」入口，记录 AI 辅助上手、实际操作、投入和复盘。
- `⌘K` / `Ctrl+K` 搜索；方向键选择、回车打开、Esc 关闭。
- 生产搜索使用 Pagefind Extended 的中文分词，并以精确子串匹配补充连续中文词组和标签；开发模式使用公开内容 JSON 索引。
- Markdown 排版、Shiki 代码高亮、代码复制、文章链接复制。
- 文章目录、滚动高亮、阅读进度、阅读时长、前后文章。
- 本地相对图片处理、RSS、站点地图、robots.txt、canonical、Open Graph。
- 草稿和未来日期文章不生成公开页、不进入导航、RSS 或搜索。
- slug、分类、标签、日期和本地图片校验；新建文章防覆盖。
- 自托管字体，无外部字体请求，无统计跟踪。
- GitHub Actions 自动检查并部署到 GitHub Pages，PR 只校验。

## 写作工作台

### 随机封面

封面从三种本地风景中自动分配。每次刷新目录，浏览器为文章重新随机分配图片；正常切换目录、体验页和正文时，通过 sessionStorage 沿用当前分配。无需账号、Key 或逐篇填写封面，不把随机图片写入文章正文，不依赖随机图片服务。

图库配置集中在 `src/lib/landscapes.mjs`，分配逻辑在 `src/lib/post-covers.mjs`；一页内尽量不重复，文章多于图库时循环使用。仅对接近可视区域的封面发起请求，等待期间显示三点动画，不预先显示另一张图片；图片解码完成后淡入。12 秒超时或加载失败时尝试本地雪山图；禁用 JavaScript 时也显示该图。浏览器禁用会话存储时仍可显示封面，但跨页面无法记住随机分配。

首页下方「换一段风景」切换雪山湖畔、林间晨雾和沿海公路。切换前先解码下一张图，成功后淡入；选择保存在 localStorage，返回目录时直接加载已选图片。主图、手机图与小缩略图分别压缩为 WebP。雪山与晨雾图为 AI 生成的视觉素材，海岸图由作者提供，不表示作者真实旅行经历。

### 体验日志

导航「体验」打开 `/experiences/`，文章仍放在 `content/posts/<slug>/index.md`，在 `content/meta.json` 中使用稳定分类 ID `experiences`。页面和首页、目录、RSS、搜索一样，通过 `getPosts()` 过滤草稿和未来日期。

```bash
npm run new -- my-first-experience --title "一次真实的体验" --category experiences
```

新文章默认为草稿。建议记录尝试的动机、AI 提供的帮助、实际操作、时间和费用、遇到的风险、结果与复盘。没有公开文章时显示空状态，不用虚构经历填充。

### 时间片工具

侧栏「时间片」打开 `/tools/time-slice/`。用缩进清单记录事项，在「清单」模式勾选处理状态，或在「纯文本」模式直接编辑、粘贴原有内容。普通 `- 事项` 和 Markdown 复选框都支持。

- 页面使用轻量 JavaScript 口令框；当前标签页通过 sessionStorage 记住解锁状态，右上角可随时锁定，锁定不清除清单和留档。口令的 SHA-256 摘要配置在 `src/scripts/time-slice-lock.ts`，修改后重新构建。此门槛用于避免随手访问，不提供服务端鉴权或数据加密。
- 「此刻在做」记录当前关注的事；「暂停之前」留下一步，再按「暂停并留档」保存完整快照。
- 载入旧时间片或导入文件前，当前内容会自动留档，已有历史保留。
- 编辑器支持 Tab / Shift+Tab 缩进、⌘/Ctrl+Enter 切换完成、Esc 返回清单、⌘/Ctrl+S 保存。
- 记录仅保存在当前浏览器的 localStorage，不上传、不跨设备同步。更换浏览器、域名或清理存储前，在「文件」里备份 JSON；JSON 包含清单、当前事项、接续笔记和全部留档。Markdown 导出只包含当前清单。
- 导入支持 JSON 备份和 Markdown / TXT 清单；存储不可用、配额不足或其他标签页修改记录时，会明确提示备份，避免静默覆盖。

### 文章目录

```text
content/
├── meta.json                   # 分类、标签、文章映射
└── posts/
    └── my-first-note/
        ├── index.md            # frontmatter + Markdown
        └── images/             # 图片与正文一起版本管理
```

新建文章：

```bash
npm run new -- my-first-note --title "我的第一篇笔记" --category notes --tags writing
```

命令会创建 `index.md`、`images/` 并登记 JSON 映射；新文章默认 `draft: true`。在编辑器中写作，草稿源文件留在本地，不提供公开预览路由。需要确认完整页面排版时可用发布命令本地构建，尚未提交推送时不会上传。

```yaml
---
slug: my-first-note
title: "我的第一篇笔记"
description: "用一句话概括文章解决的问题。"
pubDate: 2026-10-26
draft: true
---
```

图片引用：

```markdown
![描述图片展示的内容](./images/diagram.png)
```

`meta.json` 的结构：

```json
{
  "categories": {
    "notes": { "label": "思考随记", "description": "记录想法", "order": 1 }
  },
  "tags": {
    "writing": { "label": "写作" }
  },
  "posts": {
    "my-first-note": { "category": "notes", "tags": ["writing"], "featured": false }
  }
}
```

发布准备：

```bash
npm run publish -- my-first-note
```

该命令保留正文与格式，将草稿改为公开，并将首次发布日期设为当前上海日期；校验或构建失败则恢复原文件。它只修改本地内容，不上传。正式部署配置完成后：

```bash
git add content/
git commit -m "docs: publish my first note"
git push
```

`main` 的推送会触发检查和已启用的部署。已公开文章修改后可更新 `updatedDate`，不用再次运行首次发布命令。未来日期文章需要到期后重新构建；本项目没有定时自动发布任务。

示例文章保留 `example: true`，不代表作者真实经历；经作者确认的正式文章不需要该标记。删除文章需同时删除对应 JSON 映射；已发布 URL 如有迁移应设置重定向。

## 调整站点

- 名称、作者、简介、GitHub：`src/config.ts`。
- 首页目录：`src/pages/index.astro`。
- 关于页：`src/pages/about.astro`。
- 样式与响应式：`src/styles/global.css`。
- 内容与 AI 写作规范：`AGENTS.md`。
- 分类、标签和精选：`content/meta.json`。
- 文件树组件：`src/components/FileTree.astro`；体验目录：`src/pages/experiences.astro`。
- 当前风景原图与生成提示：`design/landscape/`；生产图在 `public/images/landscapes/`，页面不依赖外链图片。旧版人物插画和原图保留，便于回看。
- 风景配置：`src/lib/landscapes.mjs`；切换组件：`src/components/SceneryPicker.astro`；小米 HiUI 图标、MIT 许可证与来源：`src/assets/icons/hiui/`。

`SITE_URL` 控制 canonical、RSS 和 sitemap 的站点源地址；`BASE_PATH` 控制 GitHub 项目站点子路径。可复制 `.env.example` 为 `.env` 修改，本地配置会自动读取；命令行或托管平台的环境变量优先。修改后重启预览进程。

## 正式部署：GitHub Pages

- 网站：[https://hnitrogen.github.io/](https://hnitrogen.github.io/)
- 仓库：[Hnitrogen/Hnitrogen.github.io](https://github.com/Hnitrogen/Hnitrogen.github.io)
- 分支：`main`；发布源：GitHub Actions；根路径：`/`。
- 流水线：`.github/workflows/ci.yml`；无需配置额外令牌或 `DEPLOY_TARGET` 变量。

每次推送 `main` 都会安装锁定依赖、检查类型和内容、执行测试、生成站点与中文搜索索引、检查内部链接，再发布到 GitHub Pages。PR 只执行检查，不发布。Pages 的发布源需在仓库 Settings → Pages → Build and deployment → Source 中一次性选择 GitHub Actions。工作流令牌不能代替仓库管理员修改这个设置。

日常发布：

```bash
git add content/
git commit -m "docs: publish a note"
npm run deploy
```

`npm run deploy` 只推送已提交的 `main`，不自动暂存或提交。推送需要本机的 GitHub Git 写权限；也可以通过 GitHub 网页或已授权的连接提交。

旧站迁移以原 `main` 为父提交，不强制推送、不删除 Git 历史。迁移前的版本可从提交 `fbf692b65f611d9a7f437ee3426a5d02b03882eb` 找回。

后续若使用自定义域名，需同步修改 `SITE_URL`、流水线环境变量和 Pages 自定义域名配置。当前部署固定使用 `hnitrogen.github.io`。

Cloudflare 仍可作为后备方案。手动部署时使用 `SITE_URL=https://<实际项目>.pages.dev npm run deploy:cloudflare`，并自行配置对应 Pages 项目与授权；GitHub 的默认流水线不发布到 Cloudflare。

参考：[Astro 部署到 GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)。

## 验证范围

`npm test` 覆盖内容引用、草稿与未来日期过滤、新建文章防覆盖、文章顺序与错误输入。`npm run verify:build` 检查全部生成页面中的内部链接/资源、公开页与索引一致性、首页完整收录、体验归类、旧目录跳转、草稿隔离，以及生产搜索产物。自动部署需要真实仓库、平台设置和凭证，本地检查不能代替线上验证。
