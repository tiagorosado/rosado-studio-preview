/* Photograph-aware chromatic memory. Same-origin images only; placeholder studies use curated material palettes. */
(()=>{
  const tiles=[...document.querySelectorAll('.masonry .project')];
  if(!tiles.length)return;
  const presets=[
    ['#9cadb7','#d7c6a6','#e6e2d7'],
    ['#b7b2a2','#d6c2a8','#7d8b8c'],
    ['#8ea6b3','#d2dce1','#b5b7be'],
    ['#d1b5a5','#ddd5c5','#89958d'],
    ['#8fa6a6','#dfcda8','#b4b7a8'],
    ['#b3b9b5','#d7d9cf','#7d999d']
  ];
  const hex=val=>[1,3,5].map(i=>parseInt(val.slice(i,i+2),16)/255);
  const centerColors=img=>{
    try{
      const c=document.createElement('canvas');
      c.width=c.height=40;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0,40,40);
      const rgba=ctx.getImageData(0,0,40,40).data;
      const samples=[];
      for(let i=0;i<rgba.length;i+=20){
        if(rgba[i+3]<200)continue;
        const v=[rgba[i]/255,rgba[i+1]/255,rgba[i+2]/255];
        const saturation=Math.max(...v)-Math.min(...v);
        if(saturation>.75)continue;
        samples.push(v);
      }
      if(samples.length<12)return null;
      const seeds=[samples[0],samples[Math.floor(samples.length/2)],samples[samples.length-1]].map(v=>v.slice());
      for(let iter=0;iter<5;iter++){
        const sum=seeds.map(()=>[0,0,0]), counts=[0,0,0];
        for(const p of samples){
          let k=0,dist=Infinity;
          seeds.forEach((v,i)=>{const d=(v[0]-p[0])**2+(v[1]-p[1])**2+(v[2]-p[2])**2;if(d<dist){k=i;dist=d}});
          counts[k]++;
          p.forEach((v,j)=>sum[k][j]+=v);
        }
        seeds.forEach((v,i)=>{if(counts[i])v.forEach((_,j)=>v[j]=sum[i][j]/counts[i])});
      }
      return seeds.map(v=>v.map(c=>Math.min(.98,Math.max(.12,c*.62+.38))));
    }catch(e){return null}
  };
  let chosen=-1, dwellTimer=0, pending=-1;
  const active=new Map();
  const commit=index=>{
    const tile=tiles[index];
    if(!tile)return;
    const image=tile.querySelector('img');
    const colors=(image&&image.complete&&image.naturalWidth>0?centerColors(image):null) || presets[index%presets.length].map(hex);
    window.rosadoLight?.setPalette(colors);
    chosen=index;
    tiles.forEach((el,i)=>el.classList.toggle('palette-selected',i===index));
  };
  if(!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting)active.set(e.target,e.intersectionRatio);else active.delete(e.target)});
    const ranked=[...active.entries()].sort((a,b)=>b[1]-a[1]);
    if(!ranked.length)return;
    const [target,ratio]=ranked[0];
    if(ratio<.35)return;
    const i=tiles.indexOf(target);
    if(i===chosen||i===pending)return;
    pending=i;
    clearTimeout(dwellTimer);
    dwellTimer=setTimeout(()=>{
      if(active.has(target) && (active.get(target)||0)>=.35)commit(i);
      pending=-1;
    },1150);
  },{threshold:[0,.15,.35,.5,.7,.9]});
  tiles.forEach(tile=>observer.observe(tile));
})();