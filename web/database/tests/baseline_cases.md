# Math Workspace 整理前现状基线

记录日期：2026-10-31，Europe/Berlin（本机取样约 15:08 +01:00）。本文件建立基线，不作功能修复或目录整理。

## 0. 范围和写入约束

- 本次仅新增本文件 `tests/baseline_cases.md`。未修改、移动、删除现有仓库文件；没有重建 bundle、更新缓存参数或改变计算逻辑。
- 对象是当前工作树的 `math_workspace.html` 和它实际引用的 `math_workspace_native_editors_v8.js?v=cd265011f055f4a7`，不是拿旧的历史测试报告替代本次执行。
- Node v24.15.0；浏览器为本机隔离的 headless Edge，本次产品版本为 `Edg/156.0.4314.50`。
- 测试服务器复用现有 `js/math_workspace_drag_regression_test.js`，仅从工作树读取文件。测试资产和图形只在隔离页内创建；不操作用户已有浏览器会话。
- 临时浏览器配置与已有 UI 测试截图留在系统 TEMP；未删除。已有测试的临时文件清理在 Node 测试包装中禁用。没有新建仓库测试脚本、JSON 结果或截图文件。
- “同步”在本文件中的范围：当前单页内 Assets、输入、显示、依赖性质及显式计算结果之间的传播。跨标签页、跨设备、云同步：**未验证**，没有在本页找到对应操作入口。本基线不据此推断存在这些能力。

## 1. 全部直接脚本／样式依赖

表按 HTML **声明顺序**排列。浏览器可以并行下载；该顺序不等于网络完成顺序。`classic` 为普通脚本、按解析顺序执行；MathJax 的 `defer` 在文档解析完成后执行，DOMContentLoaded 会等待它。CSS 样式表也按声明顺序参与层叠。

体积口径：本地文件以 `fs.statSync(...).size` 取得的原始字节数为准；KiB=字节/1024。查询参数完整保留。CDN 行是当次 HTTP 200 响应**解压后的 JS 内容长度**，不是压缩后的网络流量。以下只枚举 HTML 的直接引用，未把运行后按需创建的 blob worker 或 MathJax 可能请求的字体算成固定直接依赖。

| 顺序 | 类别 | 路径／URL（含版本参数） | 加载方式 | 字节 | KiB |
| ---: | --- | --- | --- | ---: | ---: |
| 1 | CSS | `css/site.css?v=20260903-1` | stylesheet | 35,385 | 34.56 |
| 2 | CSS | `css/import_export_panel.css?v=20260821-7` | stylesheet | 6,015 | 5.87 |
| 3 | CSS | `css/math_workspace.css?v=20261031-tensor-editor-1` | stylesheet | 56,312 | 54.99 |
| 4 | CSS | `css/ramified_theme.css` | stylesheet | 2,694 | 2.63 |
| 5 | CSS | `css/ramified_ui_refine.css?v=20261031-empty-assets-fit-4` | stylesheet | 15,058 | 14.71 |
| 6 | JS | `https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js` | defer | 1,160,989 | 1133.78 |
| 7 | JS | `js/calculator_cards.js?v=20260903-1` | classic | 27,130 | 26.49 |
| 8 | JS | `js/calculator_input_settings.js?v=20261019-workspace-settings-1` | classic | 45,595 | 44.53 |
| 9 | JS | `js/math_workspace_presentation.js?v=20261027-presentation-1` | classic | 3,155 | 3.08 |
| 10 | JS | `js/math_workspace_rings.js?v=20261027-repair-input-1` | classic | 1,954 | 1.91 |
| 11 | JS | `js/math_workspace_slicing.js?v=20261027-repair-input-1` | classic | 27,264 | 26.63 |
| 12 | JS | `js/math_workspace_mosaic.js?v=20261029-topology-1` | classic | 5,999 | 5.86 |
| 13 | JS | `js/mosaic_knot_data.js?v=20261029-topology-1` | classic | 1,434,954 | 1401.32 |
| 14 | JS | `js/mosaic_link_data.js?v=20261029-topology-1` | classic | 992,632 | 969.37 |
| 15 | JS | `js/math_workspace/sources/js/mosaic_knot_engine.js?v=20261029-topology-1` | classic | 48,740 | 47.60 |
| 16 | JS | `js/math_workspace_topology_preset_data.js?v=20261029-topology-presets-2` | classic | 2,425 | 2.37 |
| 17 | JS | `js/math_workspace_topology.js?v=20261029-topology-presets-3` | classic | 15,454 | 15.09 |
| 18 | JS | `js/math_workspace_knot_drawing.js?v=20261029-knot-editing-1` | classic | 9,891 | 9.66 |
| 19 | JS | `js/math_workspace_knot_operations.js?v=20261029-knot-english-halo-2` | classic | 6,958 | 6.79 |
| 20 | JS | `js/math_workspace_knot_editing.js?v=20261029-knot-english-halo-2` | classic | 11,197 | 10.93 |
| 21 | JS | `js/math_workspace_topology_ui.js?v=20261029-knot-editing-1` | classic | 9,183 | 8.97 |
| 22 | JS | `js/math_workspace_io.js?v=20261029-topology-1` | classic | 14,999 | 14.65 |
| 23 | JS | `js/math_workspace_defaults.js?v=20261030-input-parity-2` | classic | 6,335 | 6.19 |
| 24 | JS | `js/math_workspace_numbers.js?v=20261030-input-parity-2` | classic | 7,172 | 7.00 |
| 25 | JS | `js/math_workspace_structures.js?v=20261027-presentation-1` | classic | 7,490 | 7.31 |
| 26 | JS | `js/math_workspace_sheaf_model.js?v=20261031-sheaf-options-1` | classic | 15,425 | 15.06 |
| 27 | JS | `js/math_workspace_diagnostics.js?v=20261030-input-parity-2` | classic | 4,678 | 4.57 |
| 28 | JS | `js/math_workspace_panel_registry.js?v=20261030-shared-complex-display-1` | classic | 3,326 | 3.25 |
| 29 | JS | `js/math_workspace_objects.js?v=20261031-sheaf-options-1` | classic | 153,358 | 149.76 |
| 30 | JS | `js/math_workspace_panel_catalog.js?v=20261027-diagram-display-1` | classic | 10,421 | 10.18 |
| 31 | JS | `js/math_workspace_settings.js?v=20261027-ui-cleanup-1` | classic | 5,384 | 5.26 |
| 32 | JS | `js/math_workspace_native_editors_v8.js?v=cd265011f055f4a7` | classic | 15,944,252 | 15570.56 |
| 33 | JS | `js/strand_drawing.js?v=20261021-icon-braids-1` | classic | 25,543 | 24.94 |
| 34 | JS | `js/dynkin_diagram_geometry.js?v=20261021-dynkin-icons-1` | classic | 4,139 | 4.04 |
| 35 | JS | `js/math_workspace_asset_icons.js?v=20261030-ci-copy-names-1` | classic | 32,858 | 32.09 |
| 36 | JS | `js/math_workspace_creation.js?v=20261029-shortcut-close-alignment-1` | classic | 26,577 | 25.95 |
| 37 | JS | `js/math_workspace_design_lab.js?v=20261026-scalar-input-1` | classic | 6,708 | 6.55 |
| 38 | JS | `js/math_workspace_favorite_stars_lab.js?v=20261029-favorite-stars-4` | classic | 5,684 | 5.55 |
| 39 | JS | `js/math_workspace_empty_create_lab.js?v=20261031-empty-create-approved-3` | classic | 5,280 | 5.16 |
| 40 | JS | `js/math_workspace_topology_icons_lab.js?v=20261029-topology-approved-4` | classic | 2,356 | 2.30 |
| 41 | JS | `js/math_workspace_knot_smoothing_lab.js?v=20261029-knot-gaps-2` | classic | 3,528 | 3.45 |
| 42 | JS | `js/math_workspace_knot_hover_lab.js?v=20261029-knot-editing-1` | classic | 2,332 | 2.28 |
| 43 | JS | `js/math_workspace_design_lab_theme.js?v=20261030-connected-default-1` | classic | 1,312 | 1.28 |
| 44 | JS | `js/math_workspace_subject_assignments.js?v=20261022-compact-filters-2` | classic | 4,858 | 4.74 |
| 45 | JS | `js/math_workspace_cartan.js?v=20261021-approved-designs-1` | classic | 3,552 | 3.47 |
| 46 | JS | `js/math_workspace_principal_assets.js?v=20261021-principal-approved-1` | classic | 6,322 | 6.17 |
| 47 | JS | `js/math_workspace_pane_outline.js?v=20261030-connected-default-1` | classic | 1,014 | 0.99 |
| 48 | JS | `js/math_workspace.js?v=20261031-name-copy-1` | classic | 279,692 | 273.14 |
| 49 | JS | `js/math_workspace_touch.js?v=20261026-touch-1` | classic | 5,129 | 5.01 |

- CSS：5 个；JS：44 个（43 个本站脚本、1 个 CDN 脚本）；直接引用共 49 个。
- 本地依赖合计：**19,347,719 字节**；含当次 CDN JS 的解压内容合计：**20,508,708 字节**。
- CDN：当次 `x-jsd-version=3.2.2`，内容长度 1,160,989 字节；响应采用 `br` 压缩，表内记录解压后长度。`@3` 是主版本别名，将来可能变化。
- HTML 还含一个内联 MathJax 配置块，未引用外部文件，因此不计入上述 49 个；内容是 inlineMath、processEscapes 和 skipHtmlTags 配置。
- 线上站点的实际压缩传输量、缓存命中率、移动网络打开时间：**未验证**。

可复查本地表的命令（不写文件；CDN 原始内容另由本次内存 HTTP 读取测量）：

```powershell
@'
const fs=require('node:fs');
const html=fs.readFileSync('math_workspace.html','utf8');
const rows=[...html.matchAll(/<(script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)]
 .filter(m=>m[1]==='script'||/rel="stylesheet"/.test(m[0]))
 .map((m,i)=>({order:i+1,url:m[2],bytes:/^https?:/.test(m[2])?null:fs.statSync(m[2].split('?')[0]).size}));
console.table(rows);
'@ | node
```

## 2. 12 项最小输入与当前实际输出

“12 类”取自 `archive/math_workspace_version1/js/math_workspace/editors/catalog.mjs` 的 12 个注册项。`production` 是制作过程说明页，B04 是内容测试；B11 是范畴定义投影测试。它们不声称验证了不存在或未执行的数值算法。

预期结果先依据已知数学例子／已有 fixture 确定，再读取当前 bundle 的实际输出；表内实际输出是本次运行值。数值字符串沿用引擎的精确表示，不转为浮点数。

| ID | 当前注册项 | 已知输入 | 预期输出 | 当前实际输出 | 自动结果 |
| --- | --- | --- | --- | --- | --- |
| B01 | slice／高维切片 | 三维单位球；过原点、标准正交坐标架的前二维平面 | 圆，半径 1 | `{"kind":"circle","radius":1}` | 通过 |
| B02 | young／杨图 | 普通分拆 (3,2) | 格子数 5；标准杨表数 5；共轭分拆 (2,2,1) | `{"boxes":"5","standardTableaux":"5","conjugate":"(2, 2, 1)"}` | 通过 |
| B03 | double-young／双杨图 | plethysm：外分拆 (2)，内分拆 (2) | s_(4) + s_(2,2)，两个系数均为 1 | `[[[4],1],[[2,2],1]]` | 通过 |
| B04 | production／制作说明页 | 挂载当前注册的 production 页面 | 标题 How Young Diagram² Calculator was made；含 Mathematical and computational algorithms 章节 | `{"title":"How Young Diagram² Calculator was made","algorithms":true}` | 通过 |
| B05 | dynkin／Dynkin 图 | Lie 类型 A，秩 2 | Cartan 矩阵 [[2,-1],[-1,2]] | `[[2,-1],[-1,2]]` | 通过 |
| B06 | strand／线股 | 3 条线股；词 s1·s2·s1 | 置换一行记号 [3,2,1] | `[3,2,1]` | 通过 |
| B07 | matrix／矩阵 | 有理数矩阵 [[1,2],[3,4]] | 秩 2；迹 5；行列式 -2 | `{"rank":"2","trace":"5","determinant":"-2"}` | 通过 |
| B08 | sheaf／簇与层 | P¹ 上的 O(2) | (h⁰,h¹)=(3,0) | `["3","0"]` | 通过 |
| B09 | complex／层复形计算器 | P² 上 Ω¹，Schur 分拆 (1,1)，即 Ω² | (h⁰,h¹,h²)=(0,0,1) | `["0","0","1"]` | 通过 |
| B10 | mosaic／镶嵌 | 2×2 方格仅保留第 0 块；两对对边按既有 torus fixture 粘合 | H₁=Z²，自由秩 2 | `{"group":"Z^2","freeRank":2}` | 通过 |
| B11 | category／范畴 | 名称 C，对象符号 X，opposite=true | 原生输入投影保留 opposite=true、label=C | `{"opposite":true,"label":"C"}` | 通过 |
| B12 | ramification／素位分歧 | Q 上 x²−2，素数界 7，不含无穷位；检查 p=2 | ramified；分量 (e,f)=(2,1) | `{"behavior":"ramified","components":[[2,1]]}` | 通过 |

覆盖和来源：

- **B01**：切片实际几何结果；参考既有 exact sphere sections 用例。
- **B02**：读取原生 Statistics 面板三个输出；复用既有 hook formula fixture。
- **B03**：调用当前 bundle 内 __dbg.decomposePlethysm；复用既有 plethysm fixture。
- **B04**：内容加载检查；本注册项没有数值计算接口。
- **B05**：读取当前 lie-view 原生面板结果。
- **B06**：调用当前 bundle 内 StrandMath；复用 strand_math_test.js 的同一 fixture。
- **B07**：读取原生 Basic Invariants；复用当前矩阵 UI fixture。
- **B08**：通过该引擎现有会话快照输入；读取其实际 cohomology 结果。
- **B09**：用当前 complex 的 Assets 投影读取实际 cohomology；复用 Schur 外幂识别场景；未覆盖一般复形微分／超上同调。
- **B10**：调用当前 bundle 的公开 analyzeBackgroundHomology；复用 mosaic_calculator_homology_test.js 的同一输入。
- **B11**：结构投影检查；未验证范畴公理、一般复合、自然变换或一般函子运算。
- **B12**：当前 bundle 内浏览器本地引擎；复用 place_ramification_engine_test.js 同一输入；不调用远程数域服务。

### 2.1 可重复运行的最小用例脚本

为遵守“只新增一个文件”，脚本内嵌在此 Markdown 中，不另建 JS 文件。它复用现有测试服务器、浏览器启动和 CDP 读取接口；不替换计算函数。sheaf 使用已有会话恢复接口，complex 使用已有 Assets 投影接口。所有输入只作用于隔离页内存。

从 `web/database` 目录运行：

```powershell
@'
const fs=require('node:fs');
const text=fs.readFileSync('tests/baseline_cases.md','utf8');
const lines=text.split(/\r?\n/);
const start=lines.indexOf('<!-- BASELINE-RUNNER-START -->'),end=lines.indexOf('<!-- BASELINE-RUNNER-END -->');
if(start<0||end<=start||lines[start+1]!=='```js'||lines[end-1]!=='```')throw Error('Baseline runner fence not found');
const code=lines.slice(start+2,end-1).join('\n');
eval(code);
'@ | node
```

脚本逐项打印 expected、actual、PASS／FAIL；任一断言失败会使退出码为 1，仍继续记录其余用例。保留临时浏览器配置，不调用既有 stopBrowser 的文件删除逻辑。

<!-- BASELINE-RUNNER-START -->
```js
'use strict';
const assert=require('node:assert/strict');
const h=require('./js/math_workspace_drag_regression_test.js');
require('node:fs').rmSync=p=>console.log('Deletion suppressed: '+p);
const expected={
 slice:{kind:'circle',radius:1},
 young:{boxes:'5',standardTableaux:'5',conjugate:'(2, 2, 1)'},
 'double-young':[[[4],1],[[2,2],1]],
 production:{title:'How Young Diagram² Calculator was made',algorithms:true},
 dynkin:[[2,-1],[-1,2]],
 strand:[3,2,1],
 matrix:{rank:'2',trace:'5',determinant:'-2'},
 sheaf:['3','0'],
 complex:['0','0','1'],
 mosaic:{group:'Z^2',freeRank:2},
 category:{opposite:true,label:'C'},
 ramification:{behavior:'ramified',components:[[2,1]]}
};
async function browserCase(id){
 const api=MathWorkspaceAssetsTest,panels=MathWorkspaceObjectPanels,k=api.assetKey,temporary=[];
 function mount(family){
  const host=document.createElement('section'),inspectorHost=document.createElement('section');document.body.append(host,inspectorHost);
  const e=MathWorkspaceNativeEditors.factories[family].mount(host,{id:'baseline-'+family,inspectorHost});temporary.push({e,host,inspectorHost});return e;
 }
 const snapshot=e=>{const model=MathWorkspaceNativeEditors.decodeState(e.capture().model);return model.state||model;};
 const add=(kind,type,data,name)=>api.createObjectAsset(kind,{type,data,...(name?{name}:{})});
 try{
  if(id==='slice'){
   const frame=add('frame','frame',{ambientDimension:3,position:[0,0,0],basis:[[1,0,0],[0,1,0],[0,0,1]]});
   const sphere=add('sphere','sphere',{ambientDimension:3,center:[0,0,0],radius:1});
   const p=panels.open('slicing-scene',k(sphere),'side');p.computation.refs.frame=k(frame);panels.refresh();
   const s=p.propertyRenderer.editor.readObjectResult().objects.find(o=>o.asset===k(sphere)).slice;
   return {kind:s.kind,radius:s.radius};
  }
  if(id==='young'){
   const a=add('young','partition',{rows:[3,2]});const p=panels.open('statistics',k(a),'side'),d=p.propertyRenderer.editor.environment.document;
   return {boxes:d.getElementById('out-size').textContent,standardTableaux:d.getElementById('out-nstand').textContent,conjugate:d.getElementById('out-conj').textContent};
  }
  if(id==='double-young'){const e=mount(id);return e.environment.window.__dbg.decomposePlethysm([2],[2]).map(t=>[t.nu,t.coefficient]);}
  if(id==='production'){const e=mount(id);return {title:e.shadow.querySelector('h1').textContent.trim(),algorithms:[...e.shadow.querySelectorAll('h2')].some(n=>n.textContent.trim()==='Mathematical and computational algorithms')};}
  if(id==='dynkin'){const a=add('lie','simple',{family:'A',rank:2});return panels.open('lie-view',k(a),'side').propertyRenderer.editor.readObjectResult().cartan;}
  if(id==='strand'){const e=mount(id);return e.environment.window.StrandMath.permutationFromWord(3,[1,2,1]);}
  if(id==='matrix'){
   const a=add('matrix','matrix',{rows:2,cols:2,entries:[['1','2'],['3','4']],dataType:'rational'});
   const d=panels.open('matrix-invariants',k(a),'side').propertyRenderer.editor.environment.document;
   return {rank:d.getElementById('out-rank').textContent,trace:d.getElementById('out-trace').textContent,determinant:d.getElementById('out-det').textContent};
  }
  if(id==='sheaf'||id==='complex'){
   const p=add('variety','projective',{dimension:id==='sheaf'?'1':'2'});let target;
   if(id==='sheaf')target=add('sheaf','twist',{base:k(p),twist:'2'});
   else{const o=add('sheaf','cotangent',{base:k(p)});target=add('sheaf','schur',{parent:k(o),partition:'1,1'});}
   const e=mount(id);
   if(id==='complex')e.applyAssets(api.localAssetSnapshot(),{kind:target.kind,id:target.id});
   else{
    const saved=e.capture(),model=MathWorkspaceNativeEditors.decodeState(saved.model),state=model.state;
    state.varieties=[{id:'P1',type:'projective',dim:'1',name:'P',nameDirty:true}];
    state.sheaves=[{id:'L',type:'twist',twist:'2',rank:'1',basis:'chern',name:'L',baseVarietyId:'P1',nameDirty:true}];
    state.activeVarietyId='P1';state.activeSheafId='L';
    e.restore({...saved,model:MathWorkspaceNativeEditors.encodeState(model)});
   }
   e.setCardVisible('cohomology-card',true);e.focusAssetCard('cohomology-card');
   for(let i=0;i<30&&!snapshot(e).lastResult;i++)await new Promise(resolve=>setTimeout(resolve,100));
   const c=snapshot(e).lastResult.cohomology;return c.dimensions?.map(x=>x.plain)||{message:c.message};
  }
  if(id==='mosaic'){
   const e=mount(id),calculator=e.environment.window.MosaicCalculator;calculator.__test.setTestBoard({rows:2,cols:2,lattice:'square',boundary:'glued',removedTiles:[1,2,3],gluedEdges:[{first:{index:0,dir:0},second:{index:0,dir:2},reversed:false},{first:{index:0,dir:1},second:{index:0,dir:3},reversed:false}]});const r=calculator.analyzeBackgroundHomology();return {group:r.group,freeRank:r.freeRank};
  }
  if(id==='category'){
   const c=add('category','category',{objectSymbol:'X',opposite:true},'C');const e=mount(id);e.configureObjectPanel({mode:'input',operation:'category-input'});e.applyAssets(api.localAssetSnapshot(),{kind:c.kind,id:c.id});const r=snapshot(e).categories.find(a=>a.id===k(c));return {opposite:r.opposite,label:r.label};
  }
  if(id==='ramification'){
   const e=mount(id),r=e.environment.window.RamificationLocalEngine.compute({schemaVersion:1,base:{kind:'Q'},extension:{kind:'polynomial',generator:'alpha',polynomial:'x^2-2'},selection:{bound:7,includeInfinite:false}});
   const p=r.places.find(p=>p.id==='Q:2');return {behavior:p.behavior,components:p.components.map(c=>[c.e,c.f])};
  }
 }finally{for(const {e,host,inspectorHost}of temporary){e.dispose();host.remove();inspectorHost.remove();}}
}
(async()=>{
 const server=await h.startServer();let s;
 try{
  s=await h.launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
  await h.waitFor(()=>h.evaluate(s.client,'!!window.MathWorkspaceObjectPanels'),30000);
  console.log(JSON.stringify({environment:{node:process.version,browser:(await s.client.send('Browser.getVersion')).product}}));
  for(const id of Object.keys(expected)){
   let actual,status='PASS',error;
   try{actual=await h.evaluate(s.client,'('+browserCase.toString()+')('+JSON.stringify(id)+')');assert.deepEqual(actual,expected[id]);}
   catch(e){status='FAIL';error=e.message;process.exitCode=1;}
   console.log(JSON.stringify({id,expected:expected[id],actual,status,...(error?{error}:{})}));
  }
 }finally{
  if(s){s.client.close();s.browser.kill();console.log('Temporary browser profile retained: '+s.profile);}
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
```
<!-- BASELINE-RUNNER-END -->

### 2.2 本次执行结果与接入说明

- 当前 bundle 最小用例：**12/12 通过**（包括 B04 内容测试、B11 结构投影测试）。已从本文件实际提取脚本复跑，打印 12 条带 expected／actual 的 PASS，退出码 0；Node v24.15.0，Edg/156.0.4314.50。
- 接入探测时曾使用错误的 young 子类型、对无 Assets 适配器的 sheaf 调用 applyAssets、调用未公开的 Mosaic 私有函数；这些是探针接口错误，已改为上面列出的已有接口。没有修改生产代码或改动数学预期值。上表记录最终脚本输出。
- 单个最小用例通过不代表整个计算器所有输入、交互、渲染和输出格式都已验证。没有做全屏截图像素基线、性能验收或线上服务可用性验收。

## 3. 复用既有测试：命令、实际结果及范围

### 3.1 workspace 源码副本的既有 40 项测试

从当前目录运行：

```powershell
$env:MATH_WORKSPACE_SOURCE_ROOT = (Resolve-Path 'js/math_workspace/sources').Path
node --import ./archive/math_workspace_version1/js/math_workspace/test_source_root.mjs ./archive/math_workspace_version1/js/math_workspace/workspace_test.mjs
```

本次实际：**tests 40，pass 40，fail 0，skipped 0，退出码 0**。只读源文件，项目、撤销、删除资产等操作在测试内存中执行，不删除磁盘文件。

测试包括 hooks/LR/plethysm、精确矩阵、球和立方体切片、根系、对称函数、源码修改后的依赖失效、原子失败、编码恢复、引用与导入校验、符号范畴和本地分歧等。远程查询用 fixture，不验证公网数域服务。这组测试覆盖 archive 的 kernel/project 与配置的 workspace 源码副本；它不等同于当前 HTML 的全部 UI，当前实际 bundle 另由第 2 节测试覆盖。

### 3.2 当前页面的既有保存／恢复／同步回归

本次先检查了以下测试的写入：autosave 和 IO 本体无仓库文件写入；linear/category 只将两张 PNG 写到系统 TEMP。现有浏览器 helper 会清理临时 profile，为遵守不删除文件，本次用下列包装保留 profile，并禁用 rmSync。包装只作用于测试进程的清理，不改变计算器算法或断言。

下面命令将测试作为主入口执行，避免带 require.main 守卫的测试被 require 后实际未运行：

```powershell
node -e "const h=require('./js/math_workspace_drag_regression_test.js');require('node:fs').rmSync=p=>console.log('Deletion suppressed: '+p);h.stopBrowser=async(browser,profile)=>{browser.kill();console.log('Temporary browser profile retained: '+profile)};require('node:module')._load(require('node:path').resolve(process.argv[1]),null,true);" js/math_workspace_autosave_ui_test.js
node -e "const h=require('./js/math_workspace_drag_regression_test.js');require('node:fs').rmSync=p=>console.log('Deletion suppressed: '+p);h.stopBrowser=async(browser,profile)=>{browser.kill();console.log('Temporary browser profile retained: '+profile)};require('node:module')._load(require('node:path').resolve(process.argv[1]),null,true);" js/math_workspace_io_ui_test.js
node -e "const h=require('./js/math_workspace_drag_regression_test.js');require('node:fs').rmSync=p=>console.log('Deletion suppressed: '+p);h.stopBrowser=async(browser,profile)=>{browser.kill();console.log('Temporary browser profile retained: '+profile)};require('node:module')._load(require('node:path').resolve(process.argv[1]),null,true);" js/math_workspace_linear_category_ui_test.js
```

| 既有测试 | 本次结果 | 实际检查与限制 |
| --- | --- | --- |
| math_workspace_autosave_ui_test.js | 通过，退出码 0 | 真实键盘输入、无需 blur/Submit 的保存、焦点草稿／光标、无效输入恢复、不同资产草稿、无关修改、冲突和两种解决路径；不验证刷新后资产持久化 |
| math_workspace_io_ui_test.js | 通过，退出码 0 | 9 个测试资产的完整替换、引用、主副区／面板／隐藏会话、缩放、草稿、跨 Page.reload 后导入、错误回滚及 CAS 格式；不验证真实下载对话框／磁盘文件重开 |
| math_workspace_linear_category_ui_test.js | **失败，退出码 1** | 已打印 PASS Matrix assets, native computations, drafts, sizing, stale results and centralized IO；之后范畴场景的缺依赖状态断言失败，见下 |

已有失败的原始断言：

```text
js/math_workspace_linear_category_ui_test.js:137
actual:   'invalid'
expected: 'missing'
```

触发步骤：测试先构建范畴／函子和矩阵面板，再在隔离内存中移除被引用的 category 与 matrix 测试资产并重新应用快照。读取 `scene.computation.status` 时得到 invalid，测试要求 missing。本步骤没有删除任何磁盘文件。

**只记录，未修复。** 这是功能问题还是测试状态约定过时：**未验证**。该断言之后的另一个 missing 断言、输入区域隐藏和 760px 布局检查因中断未执行，均记为 **未验证**。B11 的最小投影用例通过，不覆盖这一失效场景。

## 4. 保存：手动步骤清单

以下均在独立测试浏览器配置／测试会话和单独的下载目录执行。不要用正在编辑的真实工作区做刷新／恢复试验。

本页的 Save now／autosave 是把有效定义提交到当前页 Assets。当前主控制器没有整工作区自动磁盘保存／自动加载入口；设置模块使用 localStorage 存储设置。完整工作区的持久副本使用 Import / Export 的 **Complete workspace backup (JSON)**。真实刷新／关闭浏览器后的行为本轮没有作为持久化功能验收，状态为 **未验证**。

- [ ] S1. 打开空白工作区，在 New object 创建 P¹，命名 P，保存。打开 Input 核对 Dimension=1。
- [ ] S2. 通过 Properties 打开相关显示／性质面板；在 Input 依次输入名称 P_test，不点 Save now，等待显示 Saved。预期 Assets 名称和绑定面板标题一致。
- [ ] S3. 把名称改为 P_manual，点 Save now，再切换到另一个资产、重新打开 P。预期仍是 P_manual，Dimension 仍为 1。
- [ ] S4. 清空 Dimension，保持焦点。预期空白留在草稿，最后有效资产维数仍为 1，状态不伪报 Saved；补回 1 后可正常保存。保留此项的操作前后截图。
- [ ] S5. Import / Export → Export → Complete workspace backup (JSON) → refresh → download。用单独文件名存入测试下载目录，记录文件大小；预期下载到非空 JSON。
- [ ] S6. 用文本查看器只读打开下载文件，核对 schema=ramified-math-workspace、资产名及维数；不改文件。下载点击、浏览器权限、真实磁盘文件内容需要人工确认，当前 **未验证**。

## 5. 恢复备份：手动步骤清单

- [ ] R1. 在 S5 的测试工作区加入矩阵 A=[[1,2],[3,4]]，打开 Basic Invariants，核对 det=-2、rank=2、trace=5。
- [ ] R2. 打开至少两个面板，启用 split view，移动一个面板位置、折叠一个面板。为一个资产保留未完成的输入草稿，记录最后有效值和草稿值。
- [ ] R3. 再导出 Complete workspace backup (JSON) 到新文件 B；记录资产数量、引用、面板布局和草稿。资产计数以 JSON 的 assets.length 为准，含可能隐藏的默认依赖。原先文件不覆盖、不删除。
- [ ] R4. 在另一个空白测试会话打开工作区，从 B 复制完整 JSON 到 Import / Export → Import → Complete workspace backup (JSON)，点击 import。
- [ ] R5. 核对资产数量、名称、输入值、矩阵 det/rank/trace；打开依赖对象确认引用指向恢复后的正确资产；核对主副区、折叠状态和可见面板。
- [ ] R6. 核对未完成草稿仍存在，最后有效模型值没有被空白／半成品替换；等待超过 autosave 延迟后再核对一次。
- [ ] R7. 不修改 B，在导入文本框内临时截断 JSON 后尝试导入。预期显示错误，已恢复的资产和布局保持；重新粘贴完整 B 可正常恢复。错误路径不会修改磁盘文件。
- [ ] R8. 在测试会话中刷新页面，然后再次从 B 导入并复查关键数值。用户浏览器的下载文件跨会话重开、布局视觉一致和实际磁盘流程均需人工验证；当前 **未验证**。

## 6. 同步：手动步骤清单

本项只检验单页资产和依赖传播；跨标签页／设备同步没有本次支持性结论。

- [ ] Y1. 创建有理数矩阵 A=[[1,2],[3,4]] 与独立矩阵 B=I₂。在主区显示 A，侧栏显示 A 的 Basic Invariants。预期 A：rank=2、trace=5、det=-2；B 保持单位矩阵。
- [ ] Y2. 打开 A 的 Computation，选择 inverse 并 compute。预期 A⁻¹=[[-2,1],[3/2,-1/2]]；保留结果。
- [ ] Y3. 在 A 的输入中把左上角 1 改成 2，完成有效提交。预期显示变为 [[2,2],[3,4]]；Basic Invariants 更新为 rank=2、trace=6、det=2。
- [ ] Y4. 核对旧 inverse 结果被标记过期／需要重算；重算后预期 [[2,-1],[-3/2,1]]，结果导出与新值一致。不得把旧结果作为新结果显示。
- [ ] Y5. 检查 B 的数据和结果仍为 I₂；在 A 保留空白或单个负号草稿，修改 B 的名称，再返回 A，预期草稿保持且最后有效矩阵值不变。
- [ ] Y6. 另创建底空间 P¹、同底空间的抽象局部自由层 E（rank=2）、F（rank=3），及张量积 E⊗F。预期张量积 rank=6。将 E 改为 rank=4 并保存后，重开／重算相关性质，预期张量积 rank=12，F 仍为 3。
- [ ] Y7. 导出以上会话完整备份，在另一个测试会话恢复，再重复 Y3–Y6。核对恢复后的引用关系和同步行为。
- [ ] Y8. 视觉更新延迟、焦点体验、屏幕适配以及层依赖传播组合本轮未逐项手动验收，均为 **未验证**。已有缺依赖的 invalid/missing 差异见 3.2，不在本轮修复。

## 7. 本轮结果与文件清单

- 已自动跑过：本文件 12 项当前 bundle 用例；源码副本既有 40 项测试；当前页面 autosave UI 和 IO UI；linear/category UI（部分通过，随后断言失败）。
- 需要用户手动验证：第 4–6 节复选项，特别是真实下载文件、另会话恢复、布局视觉、输入体验与依赖传播组合。
- 未验证：线上性能、全部计算能力、所有输出格式、完整视觉／移动端、跨设备／云同步及本节明确列出的中断后检查。
- 新增：`tests/baseline_cases.md`。
- 本次修改现有文件：无。移动文件：无。删除文件：无。`_to_delete`：未创建（没有需要移除的文件）。

### 7.1 起止文件核验及同期非本任务变化

本任务开始时对 Git 枚举的 1,434 个已有文件保存了内存 SHA-256 快照，结束时再次读取比较。唯一新增文件是本文件，没有原有文件缺失。`math_workspace.html` 和本文件枚举的本站直接依赖均未发生内容变化。

起止比较还观察到以下 6 个其他领域文件同期发生内容变化；本任务没有对它们执行写入，具体变化来源 **未验证**。因此“本任务未修改现有文件”不表示整个共享工作区在此期间完全静止。没有回滚或修复这些文件：

- `css/ramified_minigames_study.css`
- `js/ramified_minigames_online.js`
- `js/ramified_minigames_room_ui.js`
- `js/ramified_minigames_study_build.js`
- `js/ramified_minigames_study_locales.js`
- `ramified_minigames.html`

