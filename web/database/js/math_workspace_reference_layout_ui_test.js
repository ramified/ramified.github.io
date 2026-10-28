'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.samples=[];
      for(const kind of ['number','matrix','sphere','complex','field-extension','functor']){
        const asset=api.createObjectAsset(kind);samples.push(panels.open(kind+'-input',kind+':'+asset.id,'side'));
      }
      samples.push(panels.open('weight','','side'),panels.open('lr','','side'),panels.open('lie-view','','side'));
    });
    async function check(context){
      const rows=await read(()=>samples.flatMap(panel=>[...panel.node.querySelectorAll('.workspace-object-reference')].filter(row=>row.checkVisibility()&&row.querySelector(':scope > .btn')).map(row=>{
        const control=row.querySelector('.workspace-control'),c=control.getBoundingClientRect(),r=row.getBoundingClientRect();
        return {type:panel.definition.id,label:control.getAttribute('aria-label'),width:Math.round(r.width),overflow:row.scrollWidth-row.clientWidth,buttons:[...row.querySelectorAll(':scope > .btn')].map(button=>{const b=button.getBoundingClientRect();return {text:button.textContent,offset:Math.abs(b.top+b.height/2-c.top-c.height/2),fits:b.left>=r.left-1&&b.right<=r.right+1&&c.right<=b.left+1};})};
      })));
      assert(rows.length>=7,context+' exercises both reference and dimension actions');
      for(const row of rows){assert(row.overflow<=1,context+' no overflow: '+JSON.stringify(row));for(const button of row.buttons){assert(button.offset<1,context+' aligns control/action centers: '+JSON.stringify(row));assert(button.fits,context+' keeps actions beside the control: '+JSON.stringify(row));}}
    }
    await check('desktop sidebar');
    assert(await read(()=>{const panel=samples.find(p=>p.definition.id==='matrix-input'),row=panel.node.querySelector('[data-object-reference="field"]').closest('label'),label=row.querySelector('.input-label').getBoundingClientRect(),control=row.querySelector('select').getBoundingClientRect();return Math.abs(label.top-control.top)<12;}),'matrix retains its compact inline label');
    assert(await read(()=>{const panel=samples.find(p=>p.definition.id==='complex-input'),row=[...panel.node.querySelectorAll('.workspace-object-reference')].find(row=>row.querySelectorAll(':scope > label').length===2);return row&&getComputedStyle(row).display==='flex'&&row.querySelectorAll('.workspace-control').length===2;}),'complex symbol/link pairs retain their separate layout');
    await client.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:false});
    await check('narrow sidebar');
    await client.send('Emulation.clearDeviceMetricsOverride');
    await read(()=>panels.move(samples[0],'main'));
    assert(await read(()=>{const row=samples[0].node.querySelector('[data-object-reference="field"]').closest('.workspace-object-reference'),c=row.querySelector('select').getBoundingClientRect();return [...row.querySelectorAll(':scope > .btn')].every(button=>{const b=button.getBoundingClientRect();return Math.abs(b.top+b.height/2-c.top-c.height/2)<1;});}),'main-area references use the same aligned action row');
    console.log('PASS reference layout: aligned controls/actions across number, matrix, geometry, extension, functor and property panels; desktop/narrow/main; matrix and complex exceptions');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
