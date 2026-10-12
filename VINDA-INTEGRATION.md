# Vinda Magic 阅读器适配

本分支以 df6df70 为正文基线，保留原书内容、证据、引用和自查。适配的是界面、同域路径、错误处理及部署方式。用户已在 2026-10-13 确认预览，正式发布由独立静态工具执行。

## 本机预览

原来的启动方式仍可查看书籍本身：

```powershell
Set-Location -LiteralPath 'E:\ai-project\HowToLiveBetter'
python -m http.server 8000 --bind 127.0.0.1
```

主站和书籍的完整同域预览使用隔离的主站副本：

```powershell
Set-Location -LiteralPath 'E:\ai-project\HowToLiveBetter'
node tools/vinda-build.mjs

Set-Location -LiteralPath 'C:\Users\韦达\Documents\Codex\2026-06-29\new-chat\work\ai-agent-life-integration'
npm run build
node scripts/preview-life.mjs --book 'E:\ai-project\HowToLiveBetter\dist\vinda-life\preview.json' --port 8120
```

访问 http://127.0.0.1:8120/，从顶部、手机菜单、页脚或搜索“人生”进入 /life/。预览服务只监听本机；必要的公开首页资讯接口为只读代理，不转发登录信息或写操作。第一次使用主站副本时需要本机对应的构建依赖，服务器不需要新增依赖。

## 快照

`node tools/vinda-build.mjs` 从 README 发现章节和长文，复制明确允许的文件，并生成 SHA256 清单。发布 ID 同时包含上游基线与适配内容摘要。同一 ID 已存在时拒绝覆盖，避免已打开页面读到变更的正文。

产物在 dist/vinda-life/releases/<release-id>/。页面内置的版本路径保证 README、章节、长文和资源来自同一快照。dist 和预览记录不提交源码仓库。

图标来自 Lucide，节点由 tools/vinda-icon-build.mjs 生成，保留 LUCIDE-LICENSE.txt。本地 Manrope 字体保留 MANROPE-LICENSE.txt。新版源码已取消原作者 GA 和原推广素材的加载；自查记录只使用 vinda-life 命名空间。

## 赞助配置

修改根目录 vinda-life.json 的 sponsor 字段，重新打包后生效。enabled 默认为 false；只有标题和合法 HTTPS 目标有效时才展示，标识为“赞助”。没有内容时隐藏整个区域。

图片只能使用自己有权使用的根目录本地文件，名称为 sponsor-<名称>.png、webp 或 jpg。不要复制原作者收款码或广告图，不添加第三方脚本。开始和结束时间使用带时区的 ISO 8601。原作者署名与正文许可始终独立保留。

## 检查

```powershell
node tools/sync-stats.mjs --check
node tools/check-refs.mjs --check
node tools/check-plain.mjs
node tools/check-split.mjs
node tools/offline/build.mjs
```

离线构建内联正文、长文、字体与界面脚本，不上传搜索或答案；自查入口仍链接线上版。原有 EPUB、PDF、Anki 工具不改写正文，其下载入口继续由上游维护。

正式服务器接入必须按已确认的 life-integration-architecture.md 执行独立静态目录、部署锁、配置预检、平滑重载及原子切换，不调用会重启业务后端的全量部署脚本。

在隔离主站仓库运行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/publish-life.ps1`，默认书籍源码路径就是本目录。先审查并提交两边源码；工具本机完成测试/构建/清单，再在服务器同一部署锁内同步主站源码与静态产物。`-PrepareOnly` 只打包，`-Rollback '<部署ID>'` 恢复上一入口。具体限制、目录、回滚与原有 7 点任务状态见主站 LIFE-DEPLOYMENT.md。`vinda-build.mjs --reuse` 可校验并复用已有同版本快照，不覆盖其公开文件。
