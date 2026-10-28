'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
// INDEX_UI_SCREENSHOTS is optional; prefer a directory outside the checkout.
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay } = require('./math_workspace_drag_regression_test.js');
async function run() {
  const server = await startServer();
  let session;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    session = await launchBrowser(origin+'/index.html?lang=en');
    const { client } = session;
    const read = source => evaluate(client, source);
    await waitFor(()=>read('!!window.SiteI18n && document.querySelector("[data-language-switch]").value === "en"'),10000,'homepage i18n');
    const switchLanguage = async locale => {
      await read(`(() => {const s=document.querySelector('[data-language-switch]');s.value=${JSON.stringify(locale)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await delay(80);
    };
    const linksBefore = await read('[...document.links].map(a=>a.getAttribute("href"))');
    const mathBefore = await read('[...document.querySelectorAll(".mock tspan[font-style=italic]")].map(n=>n.textContent)');
    for (const locale of ['zh-CN','en']) {
      await switchLanguage(locale);
      assert.equal(await read('document.documentElement.lang'),locale);
      assert.equal(await read('document.querySelector("h1").textContent'),locale==='en'?'Math Workspace':'数学工作区');
      assert.equal(await read('document.querySelector("meta[name=description]").content'),await read('SiteI18n.t("index.description")'));
      assert.deepStrictEqual(await read('[...document.links].map(a=>a.getAttribute("href"))'),linksBefore);
      assert.deepStrictEqual(await read('[...document.querySelectorAll(".mock tspan[font-style=italic]")].map(n=>n.textContent)'),mathBefore);
      for (const width of [1280,768,360]) {
        await client.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
        await delay(80);
        assert.equal(await read('document.documentElement.scrollWidth <= innerWidth'),true,`${locale} at ${width}: horizontal overflow`);
        const keysOkay = await read('[...document.querySelectorAll("[data-i18n]")].every(n=>n.textContent === SiteI18n.t(n.dataset.i18n))');
        assert(keysOkay,'every keyed label translated');
        if(process.env.INDEX_UI_SCREENSHOTS) {
          const output=path.resolve(process.env.INDEX_UI_SCREENSHOTS);fs.mkdirSync(output,{recursive:true});
          const {data}=await client.send('Page.captureScreenshot',{format:'png'});
          fs.writeFileSync(path.join(output,`index-${locale}-${width}.png`),Buffer.from(data,'base64'));
        }
      }
    }
    await switchLanguage('zh-CN');
    await client.send('Page.navigate',{url:origin+'/index.html'});
    await waitFor(()=>read('document.documentElement.lang === "zh-CN"'),10000,'remembered language');
    assert.equal(await read(`document.querySelectorAll('a[href="index_classic.html"]').length`),1);
    await client.send('Network.enable');
    await client.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
    await client.send('Page.reload',{ignoreCache:true});
    await waitFor(()=>read('document.readyState === "complete" && document.documentElement.lang === "zh-CN"'),10000,'font fallback');
    await client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
    assert.equal(await read('document.documentElement.scrollWidth <= innerWidth'),true,'Chinese fallback fonts at 360px');
    await read('document.querySelector("details").open=true');
    assert.equal(await read('document.querySelector("summary").textContent'),'致谢');
    assert(await read('document.querySelector("dl").textContent.includes("画布交互")'));
    assert.equal(await read('getComputedStyle(document.querySelector("dl")).gridTemplateColumns.split(" ").length'),1);
    console.log('index_i18n_ui_test: bilingual text/metadata/SVG, preserved links/math, 360/768/1280 layouts, stored language and dark/font fallback passed.');
  } finally {
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
