(function (root) {
  'use strict';
  const defaults = Object.freeze({fontSize:19,fontFamily:'Georgia, serif',rowSpacing:0,columnSpacing:0,linkSpacing:true,bracketStroke:2,zeroOpacity:0.2,highlightDiagonal:false,showIndices:false});
  let settings = {...defaults};
  const views = new Map();
  function element(tag, className, text) {
    const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node;
  }
  function bracket(right) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'), path = document.createElementNS(svg.namespaceURI,'path');
    svg.setAttribute('viewBox','0 0 12 100'); svg.setAttribute('preserveAspectRatio','none'); svg.setAttribute('aria-hidden','true');
    path.setAttribute('d',right?'M2 2 Q18 50 2 98':'M10 2 Q-6 50 10 98'); path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width',settings.bracketStroke);path.setAttribute('vector-effect','non-scaling-stroke');svg.append(path);return svg;
  }
  function paint(host, matrix, label) {
    host.className = 'workspace-cartan';host.dataset.diagonal = String(settings.highlightDiagonal);
    for (const [name,value] of Object.entries({size:settings.fontSize+'px',font:settings.fontFamily,rows:settings.rowSpacing+'px',columns:settings.columnSpacing+'px',zero:settings.zeroOpacity})) host.style.setProperty('--cartan-'+name,value);
    const heading = element('div','workspace-cartan-heading');heading.append(element('strong','',label),element('small','',matrix.length+' × '+matrix.length));
    if (!matrix.length) {host.replaceChildren(heading,element('p','workspace-card-context','The rank-zero Cartan matrix is empty.'));return;}
    const scroll = element('div','workspace-cartan-scroll'),shell = element('div','workspace-cartan-matrix'),table = element('table');
    scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',label+' · Cartan matrix');
    const caption=element('caption','sr-only',label+' · Cartan matrix');table.append(caption);
    if (settings.showIndices) {
      const head=element('thead'),row=element('tr');row.append(element('td'));
      matrix.forEach((_,c)=>{const cell=element('th','',c+1);cell.scope='col';row.append(cell);});head.append(row);table.append(head);
    }
    const body=element('tbody');matrix.forEach((values,r)=>{
      const row=element('tr');if(settings.showIndices){const index=element('th','',r+1);index.scope='row';row.append(index);}
      values.forEach((value,c)=>{const cell=element('td','',String(value));cell.dataset.zero=String(value===0);cell.dataset.diagonal=String(r===c);row.append(cell);});body.append(row);
    });table.append(body);shell.append(bracket(false),table,bracket(true));scroll.append(shell);host.replaceChildren(heading,scroll);
  }
  function renderInto(host,matrix,label='Cartan matrix') {for(const old of views.keys())if(!old.isConnected)views.delete(old);views.set(host,{matrix,label});paint(host,matrix,label);}
  function configure(next={}) {
    settings=Object.fromEntries(Object.keys(defaults).map(key=>[key,next[key]??defaults[key]]));
    if(settings.linkSpacing)settings.rowSpacing=settings.columnSpacing;
    for(const [host,{matrix,label}] of views) {if(!host.isConnected)views.delete(host);else paint(host,matrix,label);}
    return {...settings};
  }
  root.MathWorkspaceCartan = {defaults,settings:()=>({...settings}),configure,renderInto};
})(window);
