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
  // V2 character polish: layered techwear, backpack, shoulder armor and emissive accents.
  const armor = mat(0x344c91, .38, .35), armorDark = mat(0x111a35, .42, .28);
  const silver = mat(0x8aa8d6, .28, .72), glowBlue = new THREE.MeshStandardMaterial({color:0x7ceeff,emissive:0x19a9ff,emissiveIntensity:1.8,roughness:.25,metalness:.25});
  // Jacket seams and utility belt make the block avatar read clearly at smaller sizes.
  makeBox(avatar,'jacket-left-seam',[.045,1.15,.035],silver,[-.57,.05,.405]);
  makeBox(avatar,'jacket-right-seam',[.045,1.15,.035],silver,[.57,.05,.405]);
  makeBox(avatar,'utility-belt',[1.42,.14,.82],armorDark,[0,-.62,.015]);
  makeBox(avatar,'belt-buckle',[.22,.16,.07],glowBlue,[0,-.62,.45]);
  makeBox(avatar,'shoulder-armor-left',[.56,.25,.57],armor,[-.91,.98,0]);
  makeBox(avatar,'shoulder-armor-right',[.56,.25,.57],armor,[.91,.98,0]);
  makeBox(avatar,'shoulder-light-left',[.28,.055,.05],glowBlue,[-.91,1.12,.29]);
  makeBox(avatar,'shoulder-light-right',[.28,.055,.05],glowBlue,[.91,1.12,.29]);
  // Compact backpack silhouette with luminous power cell.
  const pack = new THREE.Group(); pack.position.set(0,.1,-.53); avatar.add(pack);
  makeBox(pack,'backpack-shell',[.92,1.08,.28],armorDark,[0,0,0]);
  makeBox(pack,'backpack-top',[.72,.18,.31],armor,[0,.55,0]);
  makeBox(pack,'backpack-power-cell',[.3,.58,.035],glowBlue,[0,.02,-.16]);
  makeBox(pack,'backpack-left-strap',[.12,.78,.07],silver,[-.29,.02,.16]);
  makeBox(pack,'backpack-right-strap',[.12,.78,.07],silver,[.29,.02,.16]);
  // Headset and visor details.
  makeBox(head,'headset-band',[1.34,.12,.16],armor, [0,.36,-.02]);
  makeBox(head,'headset-left',[.16,.32,.22],armor,[-.68,.02,.03]);
  makeBox(head,'headset-right',[.16,.32,.22],armor,[.68,.02,.03]);
  makeBox(head,'visor-edge',[.82,.19,.045],silver,[0,.07,.505]);
  makeBox(head,'visor-glow',[.68,.055,.025],glowBlue,[0,.07,.535]);
  makeBox(head,'cheek-mark-left',[.12,.055,.035],glowBlue,[-.48,-.2,.49]);
  makeBox(head,'cheek-mark-right',[.12,.055,.035],glowBlue,[.48,-.2,.49]);
  // Glove plates and boot trim.
  makeBox(armL,'left-glove-cuff',[.43,.12,.5],armor,[-.02,-.91,.02]);
  makeBox(armR,'right-glove-cuff',[.45,.12,.5],armor,[.02,-.83,.04]);
  makeBox(legL,'left-boot-trim',[.59,.07,.79],glowBlue,[0,-.91,.11]);
  makeBox(legR,'right-boot-trim',[.59,.07,.79],glowBlue,[0,-.91,.11]);
  // A small hovering hologram pair adds depth without heavy imported assets.
  const drones = new THREE.Group(); scene.add(drones);
  const droneMat = new THREE.MeshStandardMaterial({color:0x5cecff,emissive:0x168bff,emissiveIntensity:1.4,metalness:.35,roughness:.28});
  for (const side of [-1,1]) {
    const drone = new THREE.Group(); drone.position.set(side*1.85,.35,0); drones.add(drone);
    const core = new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),droneMat); drone.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.25,.018,5,24),silver); ring.rotation.x=Math.PI/2; drone.add(ring);
    const pin = new THREE.Mesh(new THREE.BoxGeometry(.06,.32,.06),glowBlue); pin.position.y=.24; drone.add(pin);
  }
  // Subtle circular holographic platform under the character.
  const platform = new THREE.Group(); platform.position.set(0,-2.1,-.05); scene.add(platform);
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.42,.018,5,64),glowBlue); ringA.rotation.x=Math.PI/2; platform.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.68,.009,4,64),silver); ringB.rotation.x=Math.PI/2; platform.add(ringB);
  const platformDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.18,.055,8),mat(0x141f46,.5,.35)); platformDisc.position.y=-.035; platform.add(platformDisc);
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
    drones.rotation.y=t*.28+pointer.x*.1;
    drones.position.y=.35+Math.sin(t*1.4)*.09;
    platform.rotation.y=-t*.12;
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
