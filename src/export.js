(() => {
  'use strict';
  const WIDTH = 1920, HEIGHT = 1080;
  const C = {bg:'#101112',line:'#303133',white:'#e9e5dc',muted:'#a1a3a4',amber:'#e7ae57'};
  function loadImage(url) {
    return new Promise((resolve,reject) => {const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(new Error('Não foi possível compor a prancha.')); image.src=url;});
  }
  async function svgImage(svg,width,height) {
    const clone=svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg'); clone.setAttribute('width',width); clone.setAttribute('height',height);
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));
    try{return await loadImage(url);}finally{URL.revokeObjectURL(url);}
  }
  function text(ctx,content,x,y,size=12,color=C.muted,family='Consolas, monospace') {
    ctx.font=`${size}px ${family}`; ctx.fillStyle=color; ctx.fillText(content,x,y);
  }
  function wrap(ctx,content,x,y,width,size=12,lineHeight=18) {
    ctx.font=`${size}px Segoe UI, Arial, sans-serif`; ctx.fillStyle=C.muted;
    let current='';
    for(const word of content.split(/\s+/)) {
      if(ctx.measureText(current+word).width>width&&current){ctx.fillText(current.trim(),x,y);y+=lineHeight;current='';}
      current+=word+' ';
    }
    if(current)ctx.fillText(current.trim(),x,y);
    return y+lineHeight;
  }
  function rule(ctx,x1,y1,x2,y2) {ctx.strokeStyle=C.line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  async function createPlate() {
    if(!window.NexusScene)throw new Error('A cena 3D ainda não está disponível.');
    const sceneImage=await loadImage(window.NexusScene.exportImage());
    const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Exportação indisponível neste navegador.');
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle=C.line;ctx.strokeRect(20.5,20.5,WIDTH-41,HEIGHT-41);
    text(ctx,'ATLAS DE SISTEMAS / PRANCHA 01',50,55,11);
    text(ctx,'TAMESIS NEXUS',50,98,35,C.white,'Segoe UI, Arial, sans-serif');
    text(ctx,'THE ARCHITECTURE OF REALITY / REALITY MODELING SYSTEM',410,93,12);
    text(ctx,'RESEARCH STATUS: EXPLORATORY',1494,66,12,C.amber);
    text(ctx,'INSTALAÇÃO CONCEITUAL · SIMULATED DATA',1494,92,10);
    rule(ctx,40,122,1880,122);rule(ctx,265,145,265,930);rule(ctx,1500,145,1500,930);
    const area={x:285,y:157,width:1190,height:736};
    const scale=Math.min(area.width/sceneImage.width,area.height/sceneImage.height);
    const sw=sceneImage.width*scale,sh=sceneImage.height*scale;
    const sx=area.x+(area.width-sw)/2,sy=area.y+(area.height-sh)/2;
    ctx.drawImage(sceneImage,sx,sy,sw,sh);
    text(ctx,'02 / INSTALAÇÃO ORBITAL',290,148,10);text(ctx,'PERSPECTIVA 3/4 · UNIDADES VISUAIS',290,919,9);
    const viewport=document.getElementById('scene-wrap').getBoundingClientRect();
    if(document.getElementById('btn-toggle-labels').getAttribute('aria-pressed')==='true'&&viewport.width>0) {
      ctx.drawImage(await svgImage(document.getElementById('leader-svg'),viewport.width,viewport.height),sx,sy,sw,sh);
      const ox=sw/viewport.width,oy=sh/viewport.height;
      document.querySelectorAll('.callout-node').forEach(label=>{
        if(getComputedStyle(label).opacity==='0'||getComputedStyle(label).display==='none')return;
        const rect=label.getBoundingClientRect();
        if(rect.right<viewport.left||rect.left>viewport.right||rect.bottom<viewport.top||rect.top>viewport.bottom)return;
        const x=sx+(rect.left-viewport.left)*ox,y=sy+(rect.top-viewport.top)*oy;
        const title=label.querySelector('.callout-box strong')?.textContent||label.querySelector('.callout-box>div')?.textContent||label.textContent;
        ctx.font='10px Consolas, monospace';const lw=ctx.measureText(title).width+16;
        ctx.fillStyle='#151617ee';ctx.fillRect(x,y,lw,23);ctx.strokeStyle='#706757';ctx.strokeRect(x+.5,y+.5,lw,23);text(ctx,title,x+8,y+15,10,C.white);
      });
    }
    text(ctx,'01 / ESTRUTURA',50,163,11);let ly=205;
    document.querySelectorAll('.layer-btn').forEach(button=>{
      const level=button.querySelector('.layer-number'),active=button.getAttribute('aria-pressed')==='true';
      text(ctx,level.textContent,50,ly,20,active?getComputedStyle(level).color:'#5d5d5c');
      text(ctx,button.querySelector('strong').textContent,88,ly-2,13,active?C.white:'#737372','Segoe UI, Arial, sans-serif');
      text(ctx,button.querySelector('small').textContent,88,ly+16,9);rule(ctx,50,ly+31,242,ly+31);ly+=67;
    });
    text(ctx,'SEPARAÇÃO / '+document.getElementById('explosion-val').textContent,50,568,11,C.amber);text(ctx,'COMPONENTE EM INSPEÇÃO',50,612,9);
    let iy=wrap(ctx,document.getElementById('insp-title').textContent,50,637,190,13,19);
    iy=wrap(ctx,document.getElementById('insp-desc').textContent,50,iy+10,190,12,18);
    text(ctx,'ESTADO ILUSTRATIVO',50,iy+20,9);wrap(ctx,document.getElementById('insp-state').textContent,50,iy+41,190,11,17);
    text(ctx,'SIMULATED DATA',50,867,10,C.amber);wrap(ctx,'Geometria conceitual. Sem medições reais ou conclusões científicas.',50,894,190,11,16);
    text(ctx,'03 / CADERNO DE EVIDÊNCIAS',1524,148,10);
    for(const [id,title,y,height]of[['chart-comparison','MODEL VS. OBSERVATION',166,220],['chart-dependencies','HYPOTHESIS TESTING',448,198],['chart-uncertainty','UNCERTAINTY REGION',707,184]]) {
      text(ctx,title,1524,y+21,11,C.white);text(ctx,'SIMULATED DATA',1524,y+40,8);
      const svg=document.querySelector(`#${id} svg`);if(svg)ctx.drawImage(await svgImage(svg,350,height),1524,y+46,350,height);
      rule(ctx,1524,y+height+53,1873,y+height+53);
    }
    rule(ctx,40,950,1880,950);text(ctx,'OBSERVATION → THEORY → VALIDATION ⇢ FALSIFICATION',50,980,13,C.white);
    text(ctx,'ACORDO E INCOMPATIBILIDADE REPRESENTAM APENAS O EXEMPLO SIMULADO',50,1004,9);
    let lx=944;
    [['Estrutura','#8c939e'],['Mecânica','#b86b43'],['Dados','#e7ae57'],['Abstração','#aa8bd8'],['Acordo simulado','#58b897'],['Incompatibilidade','#db687b']].forEach(([label,color])=>{
      ctx.fillStyle=color;ctx.fillRect(lx,974,6,6);text(ctx,label,lx+13,981,10);lx+=ctx.measureText(label).width+36;
    });
    text(ctx,'TAMESIS NEXUS / EXPLORATORY ATLAS',50,1047,10);text(ctx,'1920 × 1080 / PRANCHA GERADA LOCALMENTE',1530,1047,9);
    return canvas;
  }
  async function downloadPlate() {
    const canvas=await createPlate();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('Não foi possível codificar o PNG.');
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='tamesis-nexus-prancha.png';
    document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  window.NexusExport=Object.freeze({createPlate,downloadPlate});
})();
