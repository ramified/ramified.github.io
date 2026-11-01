# Cleanup 自动化验收

所有命令在 cleanup 分支的 web/database 下执行。Node 24；复用仓库已有 headless Edge/CDP 方案。临时 profile 保留，不删除文件。

首次建立基线（已有 JSON 时拒绝覆盖）：

```powershell
node tests/cleanup_runner.cjs --record --label=step0
```

每步运行同一套验证：

```powershell
node tests/cleanup_runner.cjs --label=stepN
node tests/cleanup_databases.cjs --label=stepN_databases
```

24 个固定用例（12 注册项各 2 个）、真实 blob worker、真实键盘自动保存后刷新恢复、完整备份同页及刷新后导入、2.5 秒 MathJax 延迟及公式补排版。所有结构/数值输出逐项严格比较 cleanup_baseline.json；控制台不允许新增错误。production 是说明页，验证两个内容场景；category 验证正/反范畴定义的投影，不声称验证一般范畴公理或全部复合。

JSON 同时保存实际控制台错误、网络请求和传输字节、基础界面就绪时间。时间与网络不要求和基线相同（它们正是优化目标），计算和流程输出必须相同。

cleanup_paths.json 仅维护移动后的入口位置。cleanup_baseline.json 为整理前不可覆盖的输出；results/stepN.json 为各步实际结果。

## 发布／调试构建

```powershell
node js/build_math_workspace_native_editors.mjs
$env:MATH_WORKSPACE_MINIFY='0'; node js/build_math_workspace_native_editors.mjs
```

默认压缩主 runtime 并保留函数／类名称；0 关闭压缩。Worker payload 保持原脚本文本，不压缩。发布产物继续按原有做法提交。切换模式后运行同一套基线和数据库检查，最终发布构建使用默认模式。
