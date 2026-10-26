# Agentic Note 开发与写作约定

这是 Hnitrogen 的 Astro 静态技术博客。面向长期维护的个人知识库：文档树、宽屏正文、浅深双主题和全文搜索。以黑白中性色为底，墨绿作主强调色、暖橙作少量点缀。正式仓库为 `Hnitrogen/Hnitrogen.github.io`，部署到 `https://hnitrogen.github.io/`。用户已授权用新版覆盖旧站内容，保留 Git 历史。

## 内容是项目的核心

- 每篇文章放在 `content/posts/<slug>/index.md`，图片放在同目录 `images/`。
- slug 使用小写英文、数字和连字符，frontmatter `slug` 必须等于目录名。公开后的 slug 保持稳定；确需调整时添加重定向。
- `content/meta.json` 是分类、标签、文章分类映射和精选状态的唯一来源。不要在页面组件里硬编码文章目录。
- frontmatter 使用 `title`、`description`、`pubDate`、可选 `updatedDate`、`draft`。新文章默认为草稿。
- 日期采用 `YYYY-MM-DD`，以 Asia/Shanghai 为写作日期。公开内容过滤草稿和未来日期文章；未来日期不会自行部署，需日期到达后重新构建。
- 首页、目录树、分类、标签、归档、RSS、搜索都通过同一个 `getPosts()` 获取公开文章。

## 写作与图片

- 使用中文，保留必要的英文术语。先讲具体问题，再给推理、代码与可验证的结果。
- 不捏造作者经历、测试数据、引用或运行结果。技术外部引用优先官方文档与原始资料。
- 示例内容保留 `example: true`。替换成经作者确认的真实文章后可移除该标记。
- 用 `npm run new -- <slug> --title "标题" --category <id> --tags tag1,tag2` 创建文章。
- 不随意新增相近分类或重复标签，先检查 `meta.json`。修改显示名称时保留稳定 ID。
- 图片使用 `![有意义的中文说明](./images/name.png)`，不要使用本机绝对路径或临时远程链接。
- 用户要求 AI 生成位图时使用可用的 imagegen 技能；技术流程图适合直接用 SVG。生成资产和文章一同版本管理。
- 不移动、覆盖或删除用户已经写好的正文、图片和 Git 历史。

## 开发与校验

- Node.js 24，npm；提交 `package-lock.json`，安装使用 `npm ci`。
- 使用 Astro 内容集合和静态输出。简单交互用 TypeScript，不额外引入大型客户端框架。
- 保持中性底色、墨绿主强调色、暖橙点缀、紧凑列表和清楚的排版层级。颜色统一使用 `global.css` 的主题变量；检查手机、桌面和深色模式。
- 所有应用内链接和资源路径使用 `withBase()`，兼容 GitHub 项目站点子路径。
- 字体由本地依赖打包；不添加外部字体、分析或跟踪请求。
- 路由/元数据/发布逻辑变更后运行 `npm run check && npm test && npm run build && npm run verify:build`。
- 用户只要求局部文案或样式修正时使用适当范围的验证，不新增只复刻实现的测试。
- 不提交 `node_modules/`、`dist/`、`.astro/`、`.env` 或任何凭证。

## 发布

- `npm run publish -- <slug>` 将草稿设为公开，并运行检查与生产构建；失败恢复原文。该命令不提交 Git，也不上传。
- `.github/workflows/ci.yml` 在推送 `main` 后自动校验并部署到 GitHub Pages，PR 只校验。正式站点使用根路径 `/`，无需配置 `DEPLOY_TARGET`。
- 提交后可用 `npm run deploy` 推送 `main`，触发自动部署；该命令不自动暂存或提交工作区。
- 正式发布需确认 Actions 成功且线上首页、文章和搜索正常。不要重写 Git 历史。
