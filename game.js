/* Neon Circuit — host-side game, peer-to-peer via PeerJS */
const canvas=document.querySelector('#gameCanvas'),ctx=canvas.getContext('2d');
const roomCode='RACE-'+Math.floor(1000+Math.random()*9000);
document.querySelector('#room-code').textContent=roomCode;
const peer=new Peer(roomCode,{debug:1});
const players=new Map();let paused=false,startedAt=0,raceStarted=false,muted=true;
const keys={};let lastFrame=performance.now(),audioCtx=null;
const track={cx:0,cy:0,rx:Math.min(innerWidth,innerHeight)*.34,ry:Math.min(innerWidth,innerHeight)*.24};
function resize(){const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0);track.cx=innerWidth/2;track.cy=innerHeight/2;track.rx=Math.min(innerWidth,innerHeight)*.34;track.ry=Math.min(innerWidth,innerHeight)*.24}
addEventListener('resize',resize);resize();
function status(text,good=false){
 const hs=document.querySelector('#host-status'); if(hs) hs.textContent=text;
 const cp=document.querySelector('#connection-pill'); if(cp){cp.textContent=good?'● ONLINE':'● CONNECTING';cp.style.color=good?'#c8ff4d':'#ffcf65';}
}
peer.on('open',id=>{status('Room is live — waiting for drivers',true);const url=new URL('./controller.html',location.href);url.searchParams.set('room',id);const qrEl=document.querySelector('#qrcode');if(qrEl&&typeof QRCode!=='undefined')new QRCode(qrEl,{text:url.href,width:118,height:118});document.querySelector('#copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(url.href);status('Invite link copied!',true)}catch{prompt('Copy invite link:',url.href)}}});
peer.on('error',e=>status('Network error: '+e.type));
peer.on('connection',conn=>{if(players.size>=8){conn.on('open',()=>conn.send({type:'full'}));conn.close();return}
const colors=['#59f4ff','#ff4fc8','#c8ff4d','#ffb84d','#9b85ff','#ff647c','#4dffb8','#f3f4ff'];
const p={id:conn.peer,name:'DRIVER '+(players.size+1),color:colors[players.size%colors.length],x:track.cx+(Math.random()-.5)*70,y:track.cy+track.ry,angle:-Math.PI/2,speed:0,input:{},lap:0,checkpoint:0,finishTime:null,boost:100};
players.set(conn.peer,p);conn.on('open',()=>conn.send({type:'init',color:p.color,name:p.name}));conn.on('data',data=>{if(!data||typeof data!=='object')return;if(data.type==='input')p.input=data.input||{};if(data.type==='name'&&typeof data.name==='string')p.name=data.name.slice(0,14)});conn.on('close',()=>{players.delete(conn.peer);refreshList()});refreshList();});
function refreshList(){
  const list=document.querySelector('#players-list');
  if(list) list.innerHTML=[...players.values()].map(p=>`<span style="color:${p.color}">●</span> ${escapeHTML(p.name)}`).join('　');
  const hint=document.querySelector('#bottom-hint');
  if(hint) hint.textContent=players.size?`${players.size} DRIVER${players.size===1?'':'S'} CONNECTED • GET READY`:'WAITING FOR DRIVERS ✦ CONNECT A PHONE TO START';
}
function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function countdown(){raceStarted=true;document.querySelector('#race-hud').hidden=false;document.querySelector('#lobby').hidden=true;const el=document.querySelector('#race-message');let n=3;el.textContent=n;const t=setInterval(()=>{n--;if(n>0)el.textContent=n;else{clearInterval(t);el.textContent='GO!';startedAt=performance.now();setTimeout(()=>el.textContent='',1000)}},750)}
const startGameBtn=document.querySelector('#start-game-btn');
startGameBtn.addEventListener('click',()=>{
  if(raceStarted)return;
  raceStarted=true;
  document.querySelector('#lobby').hidden=true;
  document.querySelector('#race-hud').hidden=false;
  document.querySelector('#bottom-hint').style.display='none';
  const el=document.querySelector('#race-message');
  let n=3;el.textContent='3';
  const timer=setInterval(()=>{n--;if(n>0)el.textContent=n;else{clearInterval(timer);el.textContent='GO!';startedAt=performance.now();setTimeout(()=>el.textContent='',1000)}},750);
});
document.querySelector('#pause-btn').onclick=()=>{paused=!paused;document.querySelector('#pause-btn').textContent=paused?'▶':'Ⅱ';document.querySelector('#race-message').textContent=paused?'PAUSED':''};
document.querySelector('#sound-btn').onclick=()=>{muted=!muted;document.querySelector('#sound-btn').style.color=muted?'#fff':'#c8ff4d'};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawTrack(){const {cx,cy,rx,ry}=track;ctx.fillStyle='#090b16';ctx.fillRect(0,0,innerWidth,innerHeight);
ctx.fillStyle='#10182a';ctx.beginPath();ctx.ellipse(cx,cy,rx+45,ry+45,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#242b42';ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#0b1020';ctx.beginPath();ctx.ellipse(cx,cy,rx*.58,ry*.58,0,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#59f4ff55';ctx.lineWidth=2;ctx.setLineDash([18,14]);ctx.beginPath();ctx.ellipse(cx,cy,(rx+rx*.58)/2,(ry+ry*.58)/2,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
ctx.strokeStyle='#ffffff20';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(cx,cy,rx-5,ry-5,0,0,Math.PI*2);ctx.stroke();
const sx=cx,sy=cy+ry;ctx.save();ctx.translate(sx,sy);for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#fff':'#111';ctx.fillRect(-18+i*3,-7,3,14)}ctx.restore();
for(let i=0;i<45;i++){const a=i*2.399;const x=(i*97)%innerWidth,y=(i*53)%innerHeight;ctx.fillStyle=i%3?'#6b7ba022':'#59f4ff22';ctx.fillRect(x,y,2,2)}
}
function drawCar(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.shadowColor=p.color;ctx.shadowBlur=14;ctx.fillStyle=p.color;roundedRect(-17,-10,34,20,6);ctx.shadowBlur=0;ctx.fillStyle='#101426';roundedRect(-5,-7,13,14,3);ctx.fillStyle='#d8faff';roundedRect(8,-7,6,14,2);ctx.fillStyle='#0b0c13';ctx.fillRect(-12,-13,8,4);ctx.fillRect(5,-13,8,4);ctx.fillRect(-12,9,8,4);ctx.fillRect(5,9,8,4);ctx.restore();ctx.fillStyle='#ffffff';ctx.font='700 10px Inter';ctx.textAlign='center';ctx.fillText(p.name,p.x,p.y-22)}
function update(dt){if(!paused){for(const p of players.values()){const inp=p.input;const local=players.size===0;const accel=inp.accel||keys['w']||keys['arrowup'];const brake=inp.brake||keys['s']||keys['arrowdown'];const left=inp.left||keys['a']||keys['arrowleft'];const right=inp.right||keys['d']||keys['arrowright'];p.speed+=(accel?230:0)-(brake?330:0);p.speed*=Math.pow(.985,dt*60);p.speed=Math.max(-100,Math.min(350,p.speed));if(Math.abs(p.speed)>15)p.angle+=(right?1:left?-1:0)*2.8*dt*Math.sign(p.speed);p.x+=Math.cos(p.angle)*p.speed*dt;p.y+=Math.sin(p.angle)*p.speed*dt;
const dx=(p.x-track.cx)/track.rx,dy=(p.y-track.cy)/track.ry,r=Math.sqrt(dx*dx+dy*dy);if(r<.58||r>1.08){p.speed*=.91}
if(p.x<-25)p.x=innerWidth+25;if(p.x>innerWidth+25)p.x=-25;if(p.y<-25)p.y=innerHeight+25;if(p.y>innerHeight+25)p.y=-25;
}}
}
function render(){drawTrack();for(const p of players.values())drawCar(p)}
function loop(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;update(dt);render();if(raceStarted&&!paused){document.querySelector('#timer').textContent=((now-startedAt)/1000).toFixed(1)+'s';document.querySelector('#lap').textContent='1'}requestAnimationFrame(loop)}
requestAnimationFrame(loop);
