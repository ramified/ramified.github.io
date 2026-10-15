# Theorem Graph 云端保存与分享

现在可以直接在原来的 GitHub 页面登录、保存和分享：

<https://ramified.github.io/web/database/theorem_graph_calculator.html>

网页仍由 GitHub Pages 提供；登录、权限检查和保存由 `theorem-graph-personal.ramified.workers.dev` 的 Worker 处理。图的数据存在你 Cloudflare 账号下的 **D1 → theorem-graph-personal** 数据库中。每次保存只更新数据库记录，不修改 GitHub presets、不产生 Git 提交，也不重新部署网页。Worker 自带的 `/theorem_graph_calculator.html` 页面仍然可用。

## 已部署旧版：按这个顺序升级

在当前项目的 `web/database/cloudflare` 目录打开 PowerShell，执行：

```powershell
npx wrangler d1 execute theorem-graph-personal --remote --file theorem-graph-schema.sql --config theorem-graph.wrangler.toml
npx wrangler deploy --config theorem-graph.wrangler.toml
```

第一条命令创建新版需要的账号、归属、会话、分享链接和删除记录表。SQL 可以重复执行，会保留原有图和历史；旧版图仍归管理员 `ramified`。第二条命令构建静态资源并部署 Worker。**保留配置中现有的 database_id，无需重新创建数据库，也无需重设已配置好的 ADMIN_PASSWORD_HASH。** 如果 Wrangler 提示未登录，先执行 `npx wrangler login`。

然后按平时方式提交、推送 GitHub Pages 的网页和 JS/CSS 更新，等待 Pages 发布完成。只更新 Worker 不会更新 GitHub 页面上的界面；只更新网页则缺少新版后端接口。

这次配置已经包括：

- `theorem-graph.wrangler.toml`：`ALLOWED_ORIGINS = "https://ramified.github.io"`。
- `../js/theorem_graph_cloud_config.js`：API 地址是 `https://theorem-graph-personal.ramified.workers.dev/api/theorem`。
- HTML 中的相关资源版本号已更新，以便浏览器重新获取新代码。

以后使用自定义域名时，把完整 origin 加入 `ALLOWED_ORIGINS`，多个值用逗号分隔，例如 `https://ramified.github.io,https://example.com`；不要写页面路径或结尾斜线。更换 Worker 域名时还需要更新前端 API 地址并发布网页。

升级后首次需要重新登录。Theorem Graph 管理员密码由这个 Worker 的 `ADMIN_PASSWORD_HASH` 管理，与 `ramified-chess` 的 analytics 密码配置相互独立。如果之前只设置过 analytics 密码，还要在这里执行一次：

```powershell
node set-theorem-password.mjs --deploy
```

命令要求输入两次至少 14 个字符的密码，输入不回显；上传的是加盐 PBKDF2-SHA256 验证值，密码不会写进网页、Git 或命令行参数。以后重设管理员密码也用此命令。

## 登录、账号与 My graphs

1. 在原网页打开 **Import / Export → Import → Sign in to My graphs**。
2. 使用 `ramified` 和 Theorem Graph 管理员密码登录。
3. 右侧出现 **My graphs**。点击标题栏的 **wide** 展开为宽卡，**side** 返回侧栏。
4. **Saved graphs** 按行显示名称、日期及 Rename / Share / Delete。当前编辑的图用底色、左侧色条和 **Editing** 标记突出显示。
5. 管理员展开 **Manage accounts**，输入用户名、密码，点击 **Create account**。这里也可重设密码或停用账号。

用户名为 3–40 个字母、数字、下划线或连字符，首位必须是字母或数字；密码为 14–1024 个字符。把原网页地址及对应用户名、密码给其他人即可。他们拥有各自的私有图列表，不能访问你的图或管理账号，无需 Cloudflare、GitHub 或管理员密码。普通访客只在 Import 中看到一个小登录入口。

登录令牌存于当前标签页的 `sessionStorage`，刷新保留登录；关闭标签页后通常需要重新登录，服务端会话最长七天。重设密码、停用账号会使该账号已有会话失效。浏览器请求采用 Bearer token 和明确的跨域白名单，不依赖第三方 Cookie。

## 分享已有图

在该图行内点击 **Share**，选择权限后点击 **Create link**、**Copy link**。链接指向当前使用的网页，收到链接的人无需登录即可按权限访问这张图：

| 设置 | 收到链接的人可以做什么 |
| --- | --- |
| 两项均不勾选 | 只读查看 |
| Allow editing | 临时修改，不能写回原图 |
| Allow editing + Allow saving to original | 修改后点击 **Save to original**，写回你分享的同一张图 |

“可保存”指写回原图。共享图需要显式点击保存；你自己 My graphs 中的普通编辑继续自动保存。临时共享草稿保留在当前标签页，刷新可恢复，不会进入登录账号的私有图列表。链接共享图内容，不包含你的编辑表单草稿或私人历史。

拥有链接的人都拥有对应权限。每张图可创建多条不同权限的链接；点击 **Revoke** 撤销某条链接，删除图也会使它的链接失效。原始链接只在创建时显示，请当时复制保存；已有链接列表支持查看权限和撤销。只读限制原图操作，不阻止接收者复制已经看到的内容。

如果两个人修改同一版本，后保存的一方会收到冲突提示，服务器不会直接覆盖新版本。共享编辑者应先下载自己的修改，再重新加载原图。

## 自动保存、恢复和旧数据

- 编辑时及时保存本地草稿；云端保存等待停手约 4 秒，持续编辑时最长约 30 秒尝试一次同步。关闭页面不是唯一保存时机。
- 单图上限 1 MiB，每个账号最多 500 张图；超过限制时本地草稿仍可下载。
- 原始文本、未完成的数字输入及编辑位置可保留，保存不会强制整理正在输入的内容。
- 图在新的云端编辑会话、恢复操作或约五分钟的变化后留下检查点，最多保留最近 50 个。**Restore opening version** 恢复打开时版本，**History** 可预览和恢复历史。
- 离线编辑保留在 IndexedDB，重新联网后重试；只有服务器确认才显示 **Saved to cloud**。冲突不会覆盖新版本；加载云端版本时，未同步的本地修改会保留为恢复副本。
- 本地缓存按账号隔离。退出隐藏 My graphs 并清除编辑区里的私有图，但保留该账号的本地草稿供重新登录恢复。浏览器缓存不是操作系统级权限隔离，共用设备可使用不同浏览器配置。
- 旧版单用户本地缓存只迁移给管理员。GitHub 页面和 Worker 页面属于不同 origin，本地草稿不会自动跨域迁移；已同步的图可在任一页面登录读取。尚未同步的旧草稿可在旧地址登录同步，或通过 JSON 导出、导入转移。

独立备份可从 My graphs 下载 JSON；完整 D1 备份可执行：

```powershell
npx wrangler d1 export theorem-graph-personal --remote --output theorem-backup.sql --config theorem-graph.wrangler.toml
```

把数据库备份保存在公开 Git 仓库之外。备份包含账号验证值和私人图。

## 首次部署到另一个 Cloudflare 账号

需要 Node.js 22.13+（建议 Node.js 24）、Workers 和 D1。在 `cloudflare` 目录执行：

```powershell
npx wrangler login
npx wrangler d1 create theorem-graph-personal
```

用返回的 UUID 替换 `theorem-graph.wrangler.toml` 的 `database_id`，再执行前面的建表、部署和 `node set-theorem-password.mjs --deploy`。把自己的网页 origin 和 Worker API 地址写入配置，并发布前端。不要沿用另一个账号的数据库 UUID。构建脚本只包含网页所需资源，不上传部署脚本、数据库或凭据。

## 本地预览与验证

以下命令从 `web/database` 执行：

```powershell
node cloudflare/build-theorem-graph-assets.mjs
node cloudflare/set-theorem-password.mjs --local
node cloudflare/theorem-graph-local-server.mjs
```

打开 `http://127.0.0.1:8788/theorem_graph_calculator.html`。本地测试数据库和密码验证值放在 Git 忽略的 `cloudflare/.theorem-local/` 中。服务器只监听回环地址，使用真实 Worker 请求处理器和本地 SQLite D1 适配器。

```powershell
node js/theorem_graph_calculator_regression_test.js
node js/theorem_graph_storage_test.js
node cloudflare/theorem-graph.worker_test.mjs
node cloudflare/theorem-graph-sharing_test.mjs
node cloudflare/build-theorem-graph-assets.mjs
node js/theorem_graph_personal_ui_test.js
node js/theorem_graph_sharing_ui_test.js
node js/calculator_input_drafts_test.js
node js/calculator_input_drafts_ui_test.js
```

浏览器测试使用独立的无头 Edge 配置，包含两个 origin、多个账号和匿名分享访问。另可运行 `node cloudflare/theorem-graph.workerd_test.mjs`，需要安装 Miniflare，或将 Wrangler 缓存中的 `miniflare/dist/src/index.js` 路径作为参数传入；它会验证真实 workerd / D1 运行时。Theorem Graph 不在 native workspace 的打包计算器目录中。

发布后在 GitHub 实际页面检查登录、跨设备保存/刷新、账号隔离、分享与撤销；本地测试不等同于线上部署验证。可在 Cloudflare 查看 Worker 的错误与 CPU 使用情况。
