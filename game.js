/* STREET RACING 41000 — 3D city racer, multiplayer host */
(() => {
'use strict';
if (!window.THREE) {
  console.error('Three.js failed to load. Check the CDN connection and reload index.html.');
  const warning = document.createElement('div');
  warning.textContent = 'تعذر تحميل مكتبة 3D. تحقق من الإنترنت ثم أعد تحميل الصفحة.';
  warning.style.cssText = 'position:fixed;z-index:99999;top:20px;left:20px;right:20px;padding:16px;background:#8b1e1e;color:white;border-radius:12px;font:16px system-ui;text-align:center';
  document.body.appendChild(warning);
  return;
}
const canvas = document.querySelector('#gameCanvas');
const roomCode = 'RACE-' + Math.floor(1000 + Math.random() * 9000);
document.querySelector('#room-code').textContent = roomCode;

const statusEl = document.querySelector('#host-status');
const pill = document.querySelector('#connection-pill');
const setStatus = (msg, online = false) => {
  if (statusEl) statusEl.textContent = msg;
  if (pill) { pill.textContent = online ? '● ONLINE' : '● CONNECTING'; pill.style.color = online ? '#c8ff4d' : '#ffcf65'; }
};

const peer = new Peer(roomCode, { debug: 1, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });
const players = new Map();
const keys = Object.create(null);
let paused = false, raceStarted = false, startedAt = 0, lastFrame = performance.now();
let audioCtx = null, muted = true;
const MAX_PLAYERS = 8;
const TRACK = { rx: 27, rz: 17, width: 11.5 };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc9e7);
scene.fog = new THREE.Fog(0x9bc9e7, 65, 145);

const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 52, 48);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xdff3ff, 0x52664c, 2.0));
const sun = new THREE.DirectionalLight(0xfff1d5, 3.1);
sun.position.set(-28, 55, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -65; sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65; sun.shadow.camera.bottom = -65;
sun.shadow.bias = -0.00025;
scene.add(sun);

const mat = (color, roughness = 0.88, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const materials = {
  grass: mat(0x6e9b59), grassDark: mat(0x557e49), road: mat(0x303943, 0.96),
  curb: mat(0xc9c9bd), sidewalk: mat(0xb7b7a8), line: mat(0xf4e9bf),
  white: mat(0xf5f3e8), trunk: mat(0x735039), leaf: mat(0x347d48),
  leaf2: mat(0x579c55), window: new THREE.MeshStandardMaterial({color:0x9dd8e8, roughness:0.24, metalness:0.18}),
  glassDark: new THREE.MeshStandardMaterial({color:0x263c4d, roughness:0.22, metalness:0.15}),
  tire: mat(0x171a1d), rim: new THREE.MeshStandardMaterial({color:0xb9c6ca, metalness:0.75, roughness:0.28}),
  lamp: new THREE.MeshStandardMaterial({color:0xfff2bd, emissive:0xffd77a, emissiveIntensity:1.4})
};

function addMesh(geometry, material, x, y, z, parent = scene, cast = true, receive = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  parent.add(mesh); return mesh;
}
function box(w,h,d,material,x,y,z,parent=scene) {
  return addMesh(new THREE.BoxGeometry(w,h,d), material, x,y,z,parent);
}
function cylinder(rt, rb, h, material, x,y,z,parent=scene, seg=10) {
  return addMesh(new THREE.CylinderGeometry(rt,rb,h,seg),material,x,y,z,parent);
}
function ellipseRing(rxOuter, rzOuter, rxInner, rzInner, material, y) {
  const verts=[], inds=[], steps=300;
  for(let i=0;i<=steps;i++){
    const a=i/steps*Math.PI*2, c=Math.cos(a), s=Math.sin(a);
    verts.push(c*rxOuter,y,s*rzOuter, c*rxInner,y,s*rzInner);
    if(i<steps){const n=i*2; inds.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(inds);g.computeVertexNormals();
  const m=addMesh(g,material,0,0,0,scene,false,true);return m;
}
function makeGround() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240,240), materials.grass);
  ground.rotation.x = -Math.PI/2; ground.position.y=-0.18; ground.receiveShadow=true; scene.add(ground);
  // subtle park patches around the city
  for(let i=0;i<26;i++){
    const a=i/26*Math.PI*2, r=43+(i%3)*5;
    const patch=addMesh(new THREE.CircleGeometry(4+(i%4),24), materials.grassDark, Math.cos(a)*r,-0.12,Math.sin(a)*r,scene,false,true);
    patch.rotation.x=-Math.PI/2;
  }
  // distant city blocks create a fuller skyline
  for(let i=0;i<44;i++){
    const a=i/44*Math.PI*2, r=82+(i%4)*7;
    const h=8+(i*7%17), w=5+(i%4)*1.7;
    const b=box(w,h,w,mat([0x9babb3,0x8799a5,0xb0b8b6,0x7f929e][i%4]),Math.cos(a)*r,h/2-0.15,Math.sin(a)*r);
    b.rotation.y=a;
  }
}
function makeRoad() {
  // outer and inner concrete curbs
  ellipseRing(TRACK.rx+TRACK.width/2+0.85, TRACK.rz+TRACK.width/2+0.85,
              TRACK.rx+TRACK.width/2-0.2, TRACK.rz+TRACK.width/2-0.2, materials.curb, 0.015);
  ellipseRing(TRACK.rx-TRACK.width/2+0.2, TRACK.rz-TRACK.width/2+0.2,
              TRACK.rx-TRACK.width/2-0.85, TRACK.rz-TRACK.width/2-0.85, materials.curb, 0.02);
  ellipseRing(TRACK.rx+TRACK.width/2, TRACK.rz+TRACK.width/2,
              TRACK.rx-TRACK.width/2, TRACK.rz-TRACK.width/2, materials.road, 0.035);
  // road edge stripes and dashed centre line
  ellipseRing(TRACK.rx+TRACK.width/2-0.48, TRACK.rz+TRACK.width/2-0.48,
              TRACK.rx+TRACK.width/2-0.64, TRACK.rz+TRACK.width/2-0.64, materials.line, 0.055);
  ellipseRing(TRACK.rx-TRACK.width/2+0.48, TRACK.rz-TRACK.width/2+0.48,
              TRACK.rx-TRACK.width/2+0.32, TRACK.rz-TRACK.width/2+0.32, materials.line, 0.055);
  for(let i=0;i<100;i++){
    const a=i/100*Math.PI*2;
    const x=Math.cos(a)*TRACK.rx, z=Math.sin(a)*TRACK.rz;
    const tangent=new THREE.Vector3(-Math.sin(a)*TRACK.rx,0,Math.cos(a)*TRACK.rz).normalize();
    const dash=box(0.22,0.025,1.15,materials.line,x,0.065,z);
    dash.rotation.y=Math.atan2(tangent.x,tangent.z);
    dash.scale.set(1,1, i%2===0?1:0.15);
    if(i%2) dash.visible=false;
  }
  // start/finish checker strip
  for(let i=0;i<16;i++){
    const tile=box(0.72,0.045,0.72,mat(i%2?0xf5f5f0:0x20242b),-5.4+i*0.72,0.075,TRACK.rz);
  }
}
const buildingMats=[0xe7d7bd,0xd6c7ad,0xc6d3d2,0xd9b8a0,0xbfcbd0,0xe8e1d0].map(c=>mat(c));
const roofMats=[0x76534a,0x4e5964,0x9b6250,0x596b75].map(c=>mat(c));
function makeHouse(x,z,rot,variant=0) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  const w=5.4+(variant%3)*0.8,d=4.8+(variant%2)*0.8,h=3.1+(variant%4)*0.48;
  box(w,0.28,d,mat(0x8a887e),0,0.14,0,g);
  box(w-0.28,h,d-0.28,buildingMats[variant%buildingMats.length],0,h/2+0.28,0,g);
  // pitched roof made from two sloped roof panels
  const roof=addMesh(new THREE.ConeGeometry(w*0.78,2.25,4),roofMats[variant%roofMats.length],0,h+1.25,0,g);
  roof.rotation.y=Math.PI/4;roof.scale.z=d/w;
  // front windows and door
  for(const side of [-1,1]){
    const win=box(0.95,1.05,0.10,materials.window,side*1.35,h*0.62,d/2+0.02,g);
    box(1.12,0.12,0.14,mat(0xf1eee2),side*1.35,h*0.62+0.58,d/2+0.03,g);
    box(0.12,1.12,0.14,mat(0xf1eee2),side*1.35-0.55,h*0.62,d/2+0.03,g);
    box(0.12,1.12,0.14,mat(0xf1eee2),side*1.35+0.55,h*0.62,d/2+0.03,g);
  }
  box(0.82,1.65,0.12,mat(0x684b38),0,0.96,d/2+0.05,g);
  // chimney
  if(variant%2===0) box(0.55,1.15,0.55,mat(0x9a7564),-w*0.27,h+1.5,-d*0.18,g);
  // small front steps
  box(1.2,0.16,0.65,materials.curb,0,0.12,d/2+0.38,g);
  return g;
}
function makeTree(x,z,scale=1) {
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);
  cylinder(0.22,0.32,2.2,materials.trunk,0,1.1,0,g,8);
  const crown=addMesh(new THREE.IcosahedronGeometry(1.35,1),materials.leaf,0,2.75,0,g);
  crown.scale.set(1,1.18,1);
  const crown2=addMesh(new THREE.IcosahedronGeometry(0.86,1),materials.leaf2,0.55,3.05,0.12,g);
  return g;
}
function makeStreetLamp(x,z,rot=0) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  cylinder(0.09,0.13,5.4,mat(0x39434a),0,2.7,0,g,8);
  const arm=box(0.12,0.12,1.35,mat(0x39434a),0,5.25,-0.55,g);
  const head=box(0.48,0.2,0.72,materials.lamp,0,5.15,-1.08,g);
  const glow=new THREE.PointLight(0xffdf9a,0.45,9);glow.position.set(0,4.9,-1.1);g.add(glow);
}
function makeCity() {
  // houses and landscaped gardens around the circuit
  const rows=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
  rows.forEach((i)=>{
    const a=i/24*Math.PI*2;
    const r=TRACK.rx+TRACK.width/2+9+(i%3)*2;
    const x=Math.cos(a)*r,z=Math.sin(a)*(TRACK.rz+TRACK.width/2+8+(i%3)*2);
    makeHouse(x,z,a+Math.PI/2,i);
    const tx=x+Math.cos(a+0.8)*5.2,tz=z+Math.sin(a+0.8)*4.2;
    makeTree(tx,tz,0.85+(i%3)*0.12);
    if(i%2===0) makeTree(x- Math.sin(a)*5,z+Math.cos(a)*4,0.8);
    if(i%3===0) makeStreetLamp(Math.cos(a)*(TRACK.rx+TRACK.width/2+1.5),Math.sin(a)*(TRACK.rz+TRACK.width/2+1.5),a);
  });
  // inner park: paths, flower beds, trees and benches
  const park=addMesh(new THREE.CircleGeometry(10.4,64),mat(0x79a66a),0,-0.04,0,scene,false,true);
  park.rotation.x=-Math.PI/2;
  const path=addMesh(new THREE.RingGeometry(6.2,7.1,64),materials.sidewalk,0,0.015,0,scene,false,true);
  path.rotation.x=-Math.PI/2;
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    makeTree(Math.cos(a)*8.6,Math.sin(a)*8.6,0.78);
    const bench=new THREE.Group();bench.position.set(Math.cos(a)*5.2,0,Math.sin(a)*5.2);bench.rotation.y=-a;scene.add(bench);
    box(1.4,0.14,0.48,mat(0x805a3e),0,0.55,0,bench);
    box(1.4,0.55,0.12,mat(0x805a3e),0,0.83,-0.18,bench);
  }
  // sidewalks and small garden fences around homes
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,r=TRACK.rx+TRACK.width/2+5;
    const x=Math.cos(a)*r,z=Math.sin(a)*(TRACK.rz+TRACK.width/2+4);
    box(4.5,0.18,0.22,mat(0xd9d2bf),x,0.18,z);
  }
}
makeGround(); makeRoad(); makeCity();

function makeCar(color) {
  const root=new THREE.Group();
  const paint=new THREE.MeshStandardMaterial({color,metalness:0.58,roughness:0.27});
  const dark=mat(0x18232c,0.25,0.2);
  // lower chassis, sculpted body and cabin
  box(1.9,0.42,3.8,paint,0,0.68,0,root);
  box(1.78,0.28,1.05,paint,0,0.86,1.15,root);
  const cabin=box(1.48,0.78,1.85,dark,0,1.17,-0.18,root);
  const windshield=box(1.42,0.57,0.08,materials.window,0,1.2,0.79,root);
  windshield.rotation.x=-0.22;
  const rearGlass=box(1.36,0.52,0.08,materials.window,0,1.2,-1.13,root);
  rearGlass.rotation.x=0.22;
  // bumpers
  box(1.95,0.22,0.22,mat(0x242a30),0,0.52,1.91,root);
  box(1.95,0.22,0.22,mat(0x242a30),0,0.52,-1.91,root);
  // wheels with rims
  const wheels=[];
  for(const x of [-1,1]) for(const z of [-1.25,1.25]){
    const wheel=new THREE.Group();wheel.position.set(x,0.48,z);root.add(wheel);
    const tire=cylinder(0.48,0.48,0.28,materials.tire,0,0,0,wheel,16);tire.rotation.z=Math.PI/2;
    const rim=cylinder(0.28,0.28,0.30,materials.rim,0,0,0,wheel,12);rim.rotation.z=Math.PI/2;
    wheels.push(wheel);
  }
  // headlights and tail lamps
  for(const x of [-0.62,0.62]){
    box(0.42,0.16,0.12,materials.lamp,x,0.82,1.94,root);
    box(0.42,0.16,0.12,mat(0xff302e),x,0.82,-1.94,root);
  }
  const shadow=addMesh(new THREE.PlaneGeometry(3.2,5.2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.2,depthWrite:false}),0,0.15,0,root,false,false);
  shadow.rotation.x=-Math.PI/2;
  root.userData.wheels=wheels;
  root.userData.paint=paint;
  return root;
}
const colors=['#59f4ff','#ff4fc8','#c8ff4d','#ffb84d','#9b85ff','#ff647c','#4dffb8','#f3f4ff'];
function spawnPlayer(id,name,color,index) {
  const car=makeCar(color);
  const a=Math.PI/2+(index*0.045);
  car.position.set(Math.cos(a)*TRACK.rx,0,Math.sin(a)*TRACK.rz+index*1.2);
  car.rotation.y=-Math.PI/2;
  scene.add(car);
  const p={id,name,color,car,x:car.position.x,z:car.position.z,angle:-Math.PI/2,speed:0,input:{},distance:0,lap:0,boost:100};
  players.set(id,p); refreshList(); return p;
}
function refreshList() {
  const list=document.querySelector('#players-list');
  if(list) list.innerHTML=[...players.values()].map(p=>`<span style="color:${p.color}">●</span> ${escapeHTML(p.name)}`).join('　');
  const hint=document.querySelector('#bottom-hint');
  if(hint) hint.textContent=players.size?`${players.size} DRIVER${players.size===1?'':'S'} CONNECTED • GET READY`:'WAITING FOR DRIVERS ✦ CONNECT A PHONE TO START';
  const board=document.querySelector('#leaderboard');
  if(board) board.innerHTML=[...players.values()].sort((a,b)=>b.distance-a.distance).map((p,i)=>`<div class="leader-row"><span class="place">${i+1}</span><span class="dot" style="background:${p.color}"></span><span class="name">${escapeHTML(p.name)}</span><span class="score">${p.lap}/3</span></div>`).join('');
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

peer.on('open', id => {
  setStatus('Room is live — waiting for drivers', true);
  const url=new URL('./controller.html',location.href);url.searchParams.set('room',id);
  const qr=document.querySelector('#qrcode');
  if(qr && typeof QRCode!=='undefined') new QRCode(qr,{text:url.href,width:132,height:132});
  document.querySelector('#copy-link').onclick=async()=>{
    try{await navigator.clipboard.writeText(url.href);setStatus('Invite link copied!',true);}
    catch{prompt('Copy invite link:',url.href);}
  };
});
peer.on('error',e=>setStatus('Network error: '+e.type));
peer.on('connection',conn=>{
  if(players.size>=MAX_PLAYERS){conn.on('open',()=>conn.send({type:'full'}));setTimeout(()=>conn.close(),300);return;}
  const p=spawnPlayer(conn.peer,'DRIVER '+(players.size+1),colors[players.size%colors.length],players.size);
  conn.on('open',()=>conn.send({type:'init',color:p.color,name:p.name}));
  conn.on('data',data=>{
    if(!data||typeof data!=='object')return;
    if(data.type==='input')p.input=data.input||{};
    if(data.type==='name'&&typeof data.name==='string')p.name=data.name.slice(0,14);
  });
  conn.on('close',()=>{scene.remove(p.car);players.delete(conn.peer);refreshList();});
});

const startBtn=document.querySelector('#start-game-btn');
startBtn.addEventListener('click',()=>{
  if(raceStarted)return;
  raceStarted=true;
  document.querySelector('#lobby').hidden=true;
  document.querySelector('#race-hud').hidden=false;
  document.querySelector('#bottom-hint').style.display='none';
  const el=document.querySelector('#race-message');
  let n=3;el.textContent='3';
  const timer=setInterval(()=>{n--;if(n>0)el.textContent=n;else{clearInterval(timer);el.textContent='GO!';startedAt=performance.now();setTimeout(()=>el.textContent='',1100);}},750);
});
document.querySelector('#pause-btn').onclick=()=>{
  paused=!paused;document.querySelector('#pause-btn').textContent=paused?'▶':'Ⅱ';
  document.querySelector('#race-message').textContent=paused?'PAUSED':'';
};
document.querySelector('#sound-btn').onclick=()=>{
  muted=!muted;document.querySelector('#sound-btn').style.color=muted?'#fff':'#c8ff4d';
  if(!muted && !audioCtx){try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();}catch{}}
};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function update(dt) {
  if(paused)return;
  for(const p of players.values()){
    const inp=p.input||{};
    // Keyboard belongs to the first connected driver; phone inputs stay independent.
    const hostKeys = p.id === players.keys().next().value;
    const accel=!!(inp.accel||(hostKeys&&(keys.w||keys.arrowup)));
    const brake=!!(inp.brake||(hostKeys&&(keys.s||keys.arrowdown)));
    const left=!!(inp.left||(hostKeys&&(keys.a||keys.arrowleft)));
    const right=!!(inp.right||(hostKeys&&(keys.d||keys.arrowright)));
    p.speed+=(accel?25:0)-(brake?37:0);
    p.speed*=Math.pow(0.986,dt*60);
    p.speed=THREE.MathUtils.clamp(p.speed,-10,48);
    if(Math.abs(p.speed)>0.7)p.angle+=(right?1:left?-1:0)*1.65*dt*Math.sign(p.speed)*Math.min(1,Math.abs(p.speed)/9);
    p.x+=Math.sin(p.angle)*p.speed*dt;
    p.z-=Math.cos(p.angle)*p.speed*dt;
    // gently slow cars when they leave the asphalt
    const nx=p.x/TRACK.rx,nz=p.z/TRACK.rz;
    const radial=Math.sqrt(nx*nx+nz*nz);
    const roadRadius=(TRACK.rx+TRACK.rz)/2;
    const roadRatio=radial; // oval-normalized distance
    if(roadRatio<0.70||roadRatio>1.34)p.speed*=0.94;
    p.car.position.set(p.x,0,p.z);
    p.car.rotation.y=p.angle;
    p.car.userData.wheels.forEach(w=>{w.rotation.x-=p.speed*dt*1.9;});
    p.distance+=Math.abs(p.speed)*dt*0.025;
    // simple lap counter when crossing the start sector in the right direction
    const nearStart=Math.abs(p.x)<3.5 && p.z>TRACK.rz-2 && p.z<TRACK.rz+5;
    if(nearStart && p.speed>3 && !p._startLock){p.lap=Math.min(3,p.lap+1);p._startLock=true;refreshList();}
    if(!nearStart)p._startLock=false;
  }
}
function render(now) {
  const dt=Math.min((now-lastFrame)/1000,0.04);lastFrame=now;
  update(dt);
  renderer.render(scene,camera);
  if(raceStarted&&!paused){
    document.querySelector('#timer').textContent=((now-startedAt)/1000).toFixed(1)+'s';
    const best=[...players.values()].sort((a,b)=>b.distance-a.distance)[0];
    document.querySelector('#lap').textContent=best?String(Math.min(3,best.lap+1)):'1';
    refreshList();
  }
  requestAnimationFrame(render);
}
function resize(){
  const w=innerWidth,h=innerHeight;
  camera.aspect=w/h;camera.fov=w<700?51:43;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(w,h);
}
addEventListener('resize',resize);
requestAnimationFrame(render);
})();
