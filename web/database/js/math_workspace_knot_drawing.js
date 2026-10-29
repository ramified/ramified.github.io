(function(root){
  'use strict';
  const model=root.MathWorkspaceTopology||(typeof require==='function'?require('./math_workspace_topology.js'):null);
  const styles=[
    {id:'polyline',label:'原折线',description:'保留当前布局与折线，作为比较基准。'},
    {id:'quadratic',label:'A · 二次 Bézier 小圆角',description:'只在转角附近用二次曲线过渡，最接近原图。'},
    {id:'cubic',label:'B · 三次 Bézier 宽圆角',description:'扩大转角过渡范围，以三次曲线连接两端切线，整体更圆润。'},
    {id:'circular',label:'C · 圆弧倒角',description:'用与两边相切的圆弧替换转角，弯曲处曲率恒定。'}
  ];
  const defaults=Object.freeze({smoothing:'cubic',gapSize:24});
  let activeStyle=defaults.smoothing,activeGapSize=defaults.gapSize;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;return distance(p,lerp(a,b,l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0));}
  function intersection(a,b,c,d){
    const x=b.x-a.x,y=b.y-a.y,u=d.x-c.x,v=d.y-c.y,den=x*v-y*u;
    if(Math.abs(den)<1e-12)return null;
    const t=((c.x-a.x)*v-(c.y-a.y)*u)/den,s=((c.x-a.x)*y-(c.y-a.y)*x)/den;
    return t>0&&t<1&&s>0&&s<1?lerp(a,b,t):null;
  }
  // Expand the PD rotation system into port rings and triangulated regions.
  // Every smooth option uses the same planar layout; only local corners change.
  function layout(data,aligned=true){
    const info=model.knotInfo(data),groups=info.crossingGroups.length+data.circles,columns=Math.max(1,Math.ceil(Math.sqrt(groups))),rows=Math.max(1,Math.ceil(groups/columns)),cellW=640/columns,cellH=400/rows;
    const result=[];
    info.crossingGroups.forEach((crossings,group)=>{
      const ids=new Set(crossings.flatMap(c=>[4*c,4*c+1,4*c+2,4*c+3])),adj=new Map([...ids].map(i=>[i,new Set()])),points=new Map(),fixed=new Set();let next=4*data.pd.length;
      const connect=(a,b)=>{if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a);};
      const mids=new Map(),arcs=[];
      for(const pair of info.ports.values())if(ids.has(pair[0])){const mid=next++;mids.set(pair[0],mid);mids.set(pair[1],mid);connect(pair[0],mid);connect(mid,pair[1]);arcs.push([pair[0],mid,pair[1]]);}
      for(const c of crossings)for(let i=0;i<4;i++)connect(4*c+i,4*c+(i+1)%4);
      const faces=info.faces.filter(face=>ids.has(face[0])).map(face=>face.flatMap(d=>[d,mids.get(d),info.alpha[d]])),outer=faces.reduce((a,b)=>b.length>a.length?b:a,[]);
      for(const face of faces)if(face!==outer){const center=next++;for(const p of face)connect(center,p);}
      const centers=new Map();for(const c of crossings){const center=next++;centers.set(c,center);for(let i=0;i<4;i++)connect(center,4*c+i);}
      outer.forEach((p,i)=>{fixed.add(p);const angle=2*Math.PI*i/outer.length;points.set(p,{x:Math.cos(angle),y:Math.sin(angle)});});for(const p of adj.keys())if(!points.has(p))points.set(p,{x:0,y:0});
      for(let step=0;step<1600;step++){let delta=0;const updates=[];for(const [p,neighbors]of adj)if(!fixed.has(p)){let x=0,y=0;for(const q of neighbors){x+=points.get(q).x;y+=points.get(q).y;}x/=neighbors.size;y/=neighbors.size;delta=Math.max(delta,Math.abs(points.get(p).x-x)+Math.abs(points.get(p).y-y));updates.push([p,{x,y}]);}for(const [p,point]of updates)points.set(p,point);if(delta<1e-7)break;}
      if(aligned)for(const c of crossings){const center=intersection(points.get(4*c),points.get(4*c+2),points.get(4*c+1),points.get(4*c+3));if(center)points.set(centers.get(c),center);}
      const scale=Math.min(cellW,cellH)*.39,cx=(group%columns+.5)*cellW,cy=(Math.floor(group/columns)+.5)*cellH;
      for(const [id,p]of points)points.set(id,{x:cx+p.x*scale,y:cy+p.y*scale});
      const routes=info.components.filter(component=>ids.has(component.occurrences[0].from)).map(component=>component.occurrences.flatMap(o=>[centers.get(o.crossing),o.to,mids.get(o.to),info.alpha[o.to]]));
      const segments=routes.flatMap(route=>route.map((id,i)=>[id,route[(i+1)%route.length]]));
      result.push({points,centers,crossings,arcs,routes,segments});
    });
    const circles=Array.from({length:data.circles},(_,i)=>{const group=info.crossingGroups.length+i;return {cx:(group%columns+.5)*cellW,cy:(Math.floor(group/columns)+.5)*cellH,rx:cellW*.3,ry:cellH*.3};});
    return {groups:result,circles,info};
  }
  function corners(group,route,style){
    const {points,segments}=group,protectedIds=new Set(group.centers.values()),fraction={quadratic:.2,cubic:.46,circular:.35}[style];
    return route.map((id,i)=>{
      const p=points.get(id),prev=points.get(route[(i+route.length-1)%route.length]),next=points.get(route[(i+1)%route.length]),a=distance(prev,p),b=distance(p,next);
      const plain={p,before:p,after:p,command:'',cut:0,clearance:Infinity};
      if(style==='polyline'||protectedIds.has(id)||a<1e-8||b<1e-8)return plain;
      const u={x:(p.x-prev.x)/a,y:(p.y-prev.y)/a},v={x:(next.x-p.x)/b,y:(next.y-p.y)/b},dot=Math.max(-1,Math.min(1,u.x*v.x+u.y*v.y)),angle=Math.acos(dot);
      if(angle<1e-5||Math.PI-angle<1e-5)return plain;
      let clearance=Infinity;
      for(const [s,t]of segments)if(s!==id&&t!==id)clearance=Math.min(clearance,segmentDistance(p,points.get(s),points.get(t)));
      // Corner changes stay in disjoint disks, away from every nonincident
      // segment. Adjacent disks occupy less than half of their shared edge.
      const cut=Math.min(a*fraction,b*fraction,clearance*.3);
      if(cut<1e-6)return plain;
      const before={x:p.x-u.x*cut,y:p.y-u.y*cut},after={x:p.x+v.x*cut,y:p.y+v.y*cut},end=after.x+','+after.y;
      let command;
      if(style==='quadratic')command='Q'+p.x+','+p.y+' '+end;
      else{
        const radius=cut/Math.tan(angle/2);
        if(style==='circular')command='A'+radius+','+radius+' 0 0 '+(u.x*v.y-u.y*v.x>0?1:0)+' '+end;
        else{const handle=4/3*radius*Math.tan(angle/4);command='C'+(before.x+u.x*handle)+','+(before.y+u.y*handle)+' '+(after.x-v.x*handle)+','+(after.y-v.y*handle)+' '+end;}
      }
      return {p,before,after,command,cut,clearance};
    });
  }
  function crossingGap(group,crossing,gapSize){
    const center=group.points.get(group.centers.get(crossing)),a=group.points.get(4*crossing),b=group.points.get(4*crossing+2),da=distance(center,a),db=distance(center,b);
    const half=Math.min(gapSize/2,da*.4,db*.4);
    return {center,a,b,half,start:lerp(center,a,da?half/da:0),end:lerp(center,b,db?half/db:0)};
  }
  function routePath(group,route,style,gapSize=0){
    const rounded=corners(group,route,style),crossingByCenter=new Map([...group.centers].map(([c,id])=>[id,c]));
    let cut=false;
    if(gapSize>0)route.forEach((id,i)=>{
      const crossing=crossingByCenter.get(id),next=route[(i+1)%route.length];
      if(crossing===undefined||next%2!==0)return;
      const gap=crossingGap(group,crossing,gapSize);
      if(gap.half<1e-8)return;
      const forward=next===4*crossing+2,before=forward?gap.start:gap.end,after=forward?gap.end:gap.start;
      rounded[i]={...rounded[i],before,after,command:'M'+after.x+','+after.y};cut=true;
    });
    let d='M'+rounded[0].after.x+','+rounded[0].after.y;
    for(let i=1;i<=rounded.length;i++){const c=rounded[i%rounded.length];d+=' L'+c.before.x+','+c.before.y+' '+c.command;}
    // Z would close the last cut subpath with a spurious chord. The explicit
    // wrap already meets the initial point; only uncut loops need Z.
    return d+(cut?'':' Z');
  }
  function render(data,style=activeStyle,{gapSize=activeGapSize}={}){
    if(!styles.some(s=>s.id===style))throw new Error('Unknown knot drawing style.');
    validateGap(gapSize);
    const geometry=layout(data,style!=='polyline'),svgNode=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));return n;};
    const svg=svgNode('svg',{viewBox:'0 0 640 400',role:'img','aria-label':'Planar knot / link diagram','data-knot-drawing':'','data-knot-style':style,'data-knot-gap-size':gapSize,'data-crossing-count':geometry.info.crossingCount,'data-component-count':geometry.info.componentCount}),stroke='#29616b';
    const draw=(d,color=stroke,width=3,attributes={})=>svg.append(svgNode('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linejoin':'round','stroke-linecap':'round',...attributes}));
    for(const group of geometry.groups){
      group.routes.forEach(route=>draw(routePath(group,route,style,gapSize),stroke,3,{'data-knot-strand':''}));
      // Only the underpass contains a move across the gap. Nothing is painted
      // over the continuous upper strand, so no floating overpass patches arise.
      for(const c of group.crossings){const gap=crossingGap(group,c,gapSize);svg.append(svgNode('g',{'data-knot-crossing':c,'data-underpass-gap':2*gap.half}));}
    }
    for(const circle of geometry.circles)svg.append(svgNode('ellipse',{...circle,fill:'none',stroke,'stroke-width':3}));
    return svg;
  }
  function validateGap(value){if(!Number.isFinite(value)||value<0||value>24)throw new Error('Knot gap size must be from 0 to 24.');}
  const api={styles,defaults,layout,corners,routePath,crossingGap,render,style:()=>activeStyle,settings:()=>({smoothing:activeStyle,gapSize:activeGapSize}),setStyle(style){if(!styles.some(s=>s.id===style))throw new Error('Unknown knot drawing style.');activeStyle=style;},setGapSize(value){validateGap(value);activeGapSize=value;}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceKnotDrawing=api;
})(typeof window!=='undefined'?window:globalThis);
