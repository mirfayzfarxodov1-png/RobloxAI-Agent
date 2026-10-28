const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export async function mountAvatar3D(stage) {
  if (!stage || stage.dataset.avatar3dMounted === '1') return;
  if (!('WebGLRenderingContext' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  stage.dataset.avatar3dMounted = '1';
  let THREE;
  try { THREE = await import(THREE_CDN); } catch { return; }
  if (!stage.isConnected) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'avatar-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch { canvas.remove(); return; }
  const compact = matchMedia('(max-width: 760px)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.25);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.2, 8.7);
  const hemi = new THREE.HemisphereLight(0x9fcaff, 0x11162e, 2.2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xb9e4ff, 3.2); key.position.set(-3, 6, 5); scene.add(key);
  const rim = new THREE.PointLight(0x4c67ff, 24, 12); rim.position.set(3, 2, -2); scene.add(rim);
  const cyan = new THREE.PointLight(0x00d9ff, 12, 8); cyan.position.set(-3, 0, 3); scene.add(cyan);

  const avatar = new THREE.Group(); scene.add(avatar);
  const mat = (color, roughness=0.62, metalness=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const skin = mat(0xf0b184), skinShade = mat(0xd8896e), hoodie = mat(0x111b43, .48), hoodieLight = mat(0x273a83, .42);
  const hair = mat(0x080d1b, .36), hairBlue = mat(0x1757a7, .38), pants = mat(0x10172d), shoes = mat(0x080c18, .45);
  const eye = mat(0x10101a, .3), white = mat(0xf6fbff, .24), cyanMat = new THREE.MeshStandardMaterial({color:0x26dfff, emissive:0x087bff, emissiveIntensity:2, roughness:.3});
  const makeBox = (parent, name, size, material, position, bevel=0) => {
    const geometry = new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, material); mesh.name=name; mesh.position.set(...position); parent.add(mesh);
    mesh.castShadow=false; mesh.receiveShadow=false; return mesh;
  };
  // Roblox-inspired block proportions; all geometry is created in code.
  makeBox(avatar,'torso',[1.55,1.65,.78],hoodie,[0,.1,0]);
  makeBox(avatar,'hood',[1.05,.35,.5],hoodieLight,[0,.83,-.18]);
  makeBox(avatar,'hoodie-pocket',[.78,.22,.035],hoodieLight,[0,-.38,.405]);
  makeBox(avatar,'zipper',[.035,.95,.025],cyanMat,[0,.12,.405]);
  const emblem = new THREE.Group(); emblem.position.set(.34,.18,.43); avatar.add(emblem);
  makeBox(emblem,'Q-mark',[.25,.25,.055],cyanMat,[0,0,0]);
  makeBox(emblem,'Q-cutout',[.12,.12,.07],hoodie,[0,0,.025]);
  makeBox(avatar,'neck',[.43,.35,.42],skin,[0,1.02,.02]);
  const head = new THREE.Group(); head.position.set(0,1.72,.04); avatar.add(head);
  makeBox(head,'face',[1.22,1.18,.95],skin,[0,0,0]);
  makeBox(head,'ear-left',[.17,.3,.2],skinShade,[-.68,-.03,0]);
  makeBox(head,'ear-right',[.17,.3,.2],skin,[.68,-.03,0]);
  makeBox(head,'hair-cap',[1.32,.34,1.03],hair,[0,.58,-.03]);
  makeBox(head,'hair-fringe',[1.18,.26,.25],hairBlue,[.02,.36,.48]);
  for (const [i,x] of [-.48,-.2,.12,.42].entries()) {
    const spike=makeBox(head,'hair-spike-'+i,[.25,.42,.28],i%2?hair:hairBlue,[x,.72,.08]);
    spike.rotation.z=(i-1.5)*-.16; spike.rotation.x=-.14;
  }
  makeBox(head,'eyebrow-left',[.28,.07,.06],hair,[-.29,.18,.495]);
  makeBox(head,'eyebrow-right',[.28,.07,.06],hair,[.29,.18,.495]);
  makeBox(head,'eye-left',[.12,.15,.06],white,[-.29,.02,.5]);
  makeBox(head,'eye-right',[.12,.15,.06],white,[.29,.02,.5]);
  makeBox(head,'pupil-left',[.06,.09,.035],eye,[-.27,.015,.54]);
  makeBox(head,'pupil-right',[.06,.09,.035],eye,[.31,.015,.54]);
  makeBox(head,'mouth',[.28,.2,.06],mat(0x40162a),[0,-.28,.5]);
  makeBox(head,'teeth',[.2,.045,.025],white,[0,-.22,.54]);
  const armL=new THREE.Group(); armL.position.set(-.91,.65,0); avatar.add(armL);
  makeBox(armL,'left-sleeve',[.42,1.18,.48],hoodie,[-.02,-.38,0]); makeBox(armL,'left-hand',[.34,.32,.36],skin,[0,-1.08,.02]);
  const armR=new THREE.Group(); armR.position.set(.91,.65,.02); avatar.add(armR);
  makeBox(armR,'right-sleeve',[.42,1.18,.48],hoodieLight,[.02,-.32,0]);
  const hand=makeBox(armR,'right-hand',[.38,.35,.38],skin,[.02,-.98,.04]);
  armR.rotation.z=-.16;
  const legL=new THREE.Group(); legL.position.set(-.42,-.8,0); avatar.add(legL);
  makeBox(legL,'left-leg',[.52,1.05,.58],pants,[0,-.48,0]); makeBox(legL,'left-shoe',[.58,.25,.78],shoes,[0,-1.05,.09]);
  const legR=new THREE.Group(); legR.position.set(.42,-.8,0); avatar.add(legR);
  makeBox(legR,'right-leg',[.52,1.05,.58],pants,[0,-.48,0]); makeBox(legR,'right-shoe',[.58,.25,.78],shoes,[0,-1.05,.09]);
  // Raised, welcoming hand and subtle cyan wrist band.
  makeBox(armR,'wrist-band',[.44,.09,.5],cyanMat,[.02,-.78,.04]);
  avatar.position.y=-.05;
  avatar.rotation.y=-.12;

  const pointer={x:0,y:0,tx:0,ty:0};
  let raf=0,alive=true,last=0,disposed=false;
  const resize=()=>{
    const rect=stage.getBoundingClientRect(); if(!rect.width||!rect.height)return;
    renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);
    camera.aspect=rect.width/rect.height; camera.updateProjectionMatrix();
    const narrow=rect.width<520;
    camera.position.z=narrow?9.7:8.7;
  };
  const move=e=>{const r=stage.getBoundingClientRect();pointer.tx=((e.clientX-r.left)/r.width-.5)*2;pointer.ty=((e.clientY-r.top)/r.height-.5)*2;};
  const leave=()=>{pointer.tx=0;pointer.ty=0;};
  const tick=now=>{
    raf=0;if(disposed||!alive)return;
    if(now-last<32){raf=requestAnimationFrame(tick);return;} last=now;
    pointer.x+=(pointer.tx-pointer.x)*.055;pointer.y+=(pointer.ty-pointer.y)*.055;
    const t=now*.001;
    avatar.position.y=-.05+Math.sin(t*1.25)*.075;
    avatar.rotation.y=-.12+pointer.x*.32+Math.sin(t*.45)*.035;
    avatar.rotation.x=-pointer.y*.09;
    head.rotation.y=pointer.x*.2; head.rotation.x=-pointer.y*.12;
    armR.rotation.z=-.16+Math.sin(t*1.4)*.055-pointer.y*.08;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(tick);
  };
  const start=()=>{if(!disposed&&alive&&!raf)raf=requestAnimationFrame(tick);};
  const stop=()=>{if(raf){cancelAnimationFrame(raf);raf=0;}};
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{alive=entries[0].isIntersecting;if(alive)start();else stop();},{threshold:.01}):null;
  observer?.observe(stage);
  const ro='ResizeObserver' in window?new ResizeObserver(resize):null; ro?.observe(stage);
  stage.addEventListener('pointermove',move,{passive:true});stage.addEventListener('pointerleave',leave,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
  resize();start();
  stage.dataset.avatar3dReady='1';
}
