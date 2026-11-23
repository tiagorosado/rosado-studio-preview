// rosado.studio — lightweight WebGL1 architectural light study.
// Progressive enhancement: CSS background and all navigation remain usable without WebGL.
(() => {
  const canvas = document.querySelector('#light-field');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha:true, antialias:false, depth:false, stencil:false, preserveDrawingBuffer:false, powerPreference:'low-power' });
  if (!gl) { document.documentElement.dataset.shader='fallback'; return; }
  const vert = 'attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const frag = String.raw`precision mediump float;
varying vec2 uv;
uniform vec2 resolution;
uniform float time;
uniform float scroll;
uniform float depth;
uniform float intensity;
uniform float motion;
uniform float seed;
uniform float variation;
uniform float beamWidth;
uniform int mode;
uniform vec3 paletteA;
uniform vec3 paletteB;
uniform vec3 paletteC;
float field(vec2 p, vec2 c, vec2 r){vec2 q=(p-c)/r;return exp(-dot(q,q)*1.4);}
float beam(vec2 p,float angle,float pos,float width){
  vec2 d=vec2(cos(angle),sin(angle));vec2 n=vec2(-d.y,d.x);
  float across=dot(p,n)-pos;
  float along=dot(p,d);
  return exp(-pow(across/width,2.))*smoothstep(-1.2,-.15,along)*(1.-smoothstep(.6,1.9,along));
}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*resolution.xy)/max(resolution.y,1.);
  float move=scroll*depth;
  p.y+=move;
  float t=time*motion;
  vec3 rgb=vec3(.968,.961,.945);
  if(mode==0){
    // Optical Theatre: physically inspired aperture beams and soft occlusions.
    float va=variation * sin(seed*3.1 + .7);
    float vb=variation * cos(seed*2.7 + 2.1);
    float vc=variation * sin(seed*4.8 + 1.3);
    float a=beam(p, .83+sin(t*.19)*.035+va*.26, .16+vb*.23, .33*beamWidth);
    float b=beam(p,-.62+cos(t*.15)*.045+vb*.24,-.25+vc*.21,.22*beamWidth);
    float c=beam(p,.16+vc*.28,-.12+va*.18+sin(t*.12)*.08,.46*beamWidth);
    float shadow=field(p,vec2(-.1+va*.16+sin(t*.1)*.07,.05+vb*.13),vec2(.42,.8));
    rgb+=vec3(.14,.133,.118)*(a+b*.88+c*.75);
    rgb-=vec3(.085,.089,.092)*shadow;
  } else if(mode==1){
    // Three-tone colour memory, with deliberately separated diffuse lobes.
    float a=field(p,vec2(-.65+sin(t*.18)*.13,.35),vec2(.8,.78));
    float b=field(p,vec2(.65+cos(t*.14)*.14,-.15),vec2(.8,.75));
    float c=field(p,vec2(-.2+sin(t*.11)*.16,-.72),vec2(.9,.75));
    rgb=mix(rgb,paletteA,a*.34*intensity);
    rgb=mix(rgb,paletteB,b*.30*intensity);
    rgb=mix(rgb,paletteC,c*.22*intensity);
  } else {
    // Prism light: irregular refracted-light fold, not a static ring texture.
    p.x+=.09*sin(p.y*(5.+variation)+t*.7+seed)+.04*sin(p.y*11.-t*.4+seed*.3);
    float f=sin(p.x*(9.+variation*1.7) + 2.4*sin(p.y*3.1+t*.3+seed*.15));
    float fold=pow(1.-abs(f),12.);
    float envelope=field(p,vec2(.1,.0),vec2(1.2,.95));
    float d=fold*envelope;
    rgb-=vec3(.029,.031,.032)*envelope;
    rgb+=vec3(.11,.07,.04)*d;
    rgb.r+=.05*pow(1.-abs(sin(p.x*9.+.23+2.4*sin(p.y*3.1+t*.3))),14.)*envelope;
    rgb.b+=.065*pow(1.-abs(sin(p.x*9.-.23+2.4*sin(p.y*3.1+t*.3))),14.)*envelope;
  }
  gl_FragColor=vec4(clamp(mix(vec3(.968,.961,.945),rgb,intensity),0.,1.),1.);
}`;
  function compile(type,source){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  let program;
  try {
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  } catch(error){
    console.warn('Ambient shader unavailable:',error);
    document.documentElement.dataset.shader='fallback';return;
  }
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.useProgram(program);
  const loc=(n)=>gl.getUniformLocation(program,n);
  const uniforms={resolution:loc('resolution'),time:loc('time'),scroll:loc('scroll'),depth:loc('depth'),intensity:loc('intensity'),motion:loc('motion'),mode:loc('mode'),seed:loc('seed'),variation:loc('variation'),beamWidth:loc('beamWidth'),
    paletteA:loc('paletteA'),paletteB:loc('paletteB'),paletteC:loc('paletteC')};
  const attr=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const state={mode:0,depth:.53,direction:1,intensity:1.05,motion:.35,seed:Math.random()*10+1,variation:.65,beamWidth:1.05,palette:[[.78,.82,.82],[.82,.74,.62],[.94,.91,.85]],targetPalette:[[.78,.82,.82],[.82,.74,.62],[.94,.91,.85]]};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let last=0, scroll=0, targetScroll=0, running=true;
  function resize(){
    const mobile=innerWidth<700;
    const scale=mobile?.55:.8;
    const w=Math.max(1,Math.round(innerWidth*scale)), h=Math.max(1,Math.round(innerHeight*scale));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);
  }
  addEventListener('resize',resize,{passive:true});
  addEventListener('scroll',()=>{targetScroll=scrollY/Math.max(innerHeight,1);},{passive:true});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();running=false;document.documentElement.dataset.shader='fallback';});
  function frame(now){
    if(!running) return;
    requestAnimationFrame(frame);
    if(document.hidden) return;
    const fps=innerWidth<700?24:40;
    if(now-last<1000/fps)return;
    last=now;
    resize();scroll+=(targetScroll-scroll)*.08;
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform1f(uniforms.time,reduce.matches?0:now/1000);
    gl.uniform1f(uniforms.scroll,reduce.matches?0:scroll*.07*state.direction);
    gl.uniform1f(uniforms.depth,reduce.matches?0:state.depth);
    gl.uniform1f(uniforms.intensity,state.intensity);
    gl.uniform1f(uniforms.motion,reduce.matches?0:state.motion);
    gl.uniform1i(uniforms.mode,state.mode);
    gl.uniform1f(uniforms.seed,state.seed);
    gl.uniform1f(uniforms.variation,state.variation);
    gl.uniform1f(uniforms.beamWidth,state.beamWidth);
    for(let i=0;i<3;i++){
      for(let j=0;j<3;j++)state.palette[i][j]+=(state.targetPalette[i][j]-state.palette[i][j])*.045;
      gl.uniform3fv(uniforms[['paletteA','paletteB','paletteC'][i]],state.palette[i]);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  window.rosadoLight={
    setMode:n=>{state.mode=Math.max(0,Math.min(2,Number(n)||0));},
    setDepth:n=>{state.depth=Math.max(0,Math.min(1,Number(n)||0));},
    setDirection:v=>{state.direction=v===-1||v==='-1'?-1:1;},
    setVariation:n=>{state.variation=Math.max(0,Math.min(1,Number(n)||0));},
    setBeamWidth:n=>{state.beamWidth=Math.max(.55,Math.min(2.0,Number(n)||1));},
    randomize:()=>{state.seed=Math.random()*20+1;},
    setPalette:colors=>{if(Array.isArray(colors)&&colors.length===3)state.targetPalette=colors.map(rgb=>rgb.map(c=>Math.min(1,Math.max(0,Number(c)||0))));}
  };
  document.documentElement.dataset.shader='live';
  resize();requestAnimationFrame(frame);
})();