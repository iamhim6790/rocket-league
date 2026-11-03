import './style.css';
import * as THREE from 'three';

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="game"></div>
  <div class="hud">
    <div class="scoreboard"><div class="team blue"><span id="blueScore">0</span></div><div class="timer"><span id="clock">3:00</span><small>EXHIBITION</small></div><div class="team orange"><span id="orangeScore">0</span></div></div>
    <div class="boost-panel"><div class="boost-label"><span>BOOST</span><span id="boostNumber">100</span></div><div class="boost-track"><div class="boost-fill" id="boostFill"></div></div></div>
    <div class="controls"><div><kbd>WASD</kbd> DRIVE</div><div><kbd>SHIFT</kbd> BOOST</div><div><kbd>SPACE</kbd> JUMP</div><div><kbd>Q / E</kbd> AIR ROLL</div><div><kbd>I / K</kbd> PITCH</div></div>
  </div>
  <div class="overlay" id="menu">
    <div class="menu"><section class="menu-main">
      <div class="logo">League<br><b>Rocket</b></div>
      <p class="tagline">3v3 exhibition. Choose your match.</p>
      <div class="difficulty-label">Skill level</div>
      <div class="difficulties">
        <button class="level" data-level="rookie"><small>RELAXED</small>ROOKIE</button>
        <button class="level selected" data-level="pro"><small>BALANCED</small>PRO</button>
        <button class="level" data-level="allstar"><small>UNFORGIVING</small>ALL STAR</button>
      </div>
      <button class="play" id="playButton">Start match</button>
    </section><aside class="leaderboard"><h2>LOCAL LEADERBOARD</h2><div id="rankings"></div></aside></div>
  </div>
  <div class="result hidden" id="result"><h1 id="resultTitle">Victory</h1><p id="resultScore"></p><button id="rematch">Play again</button></div>`;

const container = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x89b8d2);
scene.fog = new THREE.Fog(0x89b8d2, 90, 180);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerWidth, .1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x07111f);
scene.fog = new THREE.FogExp2(0x07111f, .0034);
scene.add(new THREE.HemisphereLight(0x9ddcff, 0x172036, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 4.5);
sun.position.set(-38, 72, 28); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;scene.add(sun);

for(const x of [-50,-25,25,50]){const flood=new THREE.PointLight(0xc7eaff,180,150,1.5);flood.position.set(x,52,0);scene.add(flood)}

function box(w,h,d,color,x=0,y=0,z=0){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.7})); m.position.set(x,y,z); m.receiveShadow=true; m.castShadow=true; return m; }
const floor = new THREE.Mesh(new THREE.PlaneGeometry(160,110), new THREE.MeshStandardMaterial({color:0x174b83,roughness:.34,metalness:.08}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const centerGlow=new THREE.Mesh(new THREE.CircleGeometry(13,64),new THREE.MeshBasicMaterial({color:0x1dbff0,transparent:true,opacity:.045,depthWrite:false}));centerGlow.rotation.x=-Math.PI/2;centerGlow.position.y=.028;scene.add(centerGlow);
for(const z of [-47,47]){const strip=box(150,.035,.3,0x32d7ff,0,.035,z);strip.material.emissive=new THREE.Color(0x168ccf);strip.material.emissiveIntensity=1.2;scene.add(strip)}
for(const x of [-75,75]){const strip=box(.3,.035,102,0xff4b77,x,.035,0);strip.material.emissive=new THREE.Color(0xff2455);strip.material.emissiveIntensity=1.2;scene.add(strip)}
for(let i=-70;i<=70;i+=10){ const line=box(.25,.02,108,0xc7e6f3,i,.015,0); scene.add(line); }
for(let i=-50;i<=50;i+=10){ const line=box(158,.02,.25,0xc7e6f3,0,.015,i); scene.add(line); }
const center=new THREE.Mesh(new THREE.RingGeometry(12,12.35,64),new THREE.MeshBasicMaterial({color:0xeaf9ff,side:THREE.DoubleSide})); center.rotation.x=-Math.PI/2; center.position.y=.025; scene.add(center);
scene.add(box(160,18,2,0x091421,0,9,-56)); scene.add(box(160,18,2,0x091421,0,9,56));
scene.add(box(2,18,112,0x091421,-81,9,0)); scene.add(box(2,18,112,0x091421,81,9,0));
for(const side of [-1,1]){
  const rail=new THREE.Mesh(new THREE.BoxGeometry(158,.8,.45),new THREE.MeshPhysicalMaterial({color:0x8fdcff,transparent:true,opacity:.16,roughness:.08,metalness:.25}));rail.position.set(0,14,side*55);scene.add(rail);
  const crowd=new THREE.Mesh(new THREE.BoxGeometry(158,7,.55),new THREE.MeshStandardMaterial({color:0x10192b,roughness:.8}));crowd.position.set(0,23,side*58);scene.add(crowd);
}
for(let i=-70;i<=70;i+=4){for(const z of [-58,58]){const fan=new THREE.Mesh(new THREE.SphereGeometry(.32,6,4),new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL((i+70)/280,.8,.58)}));fan.position.set(i,20+(i%3)*1.3,z);scene.add(fan)}}

function goal(z){
  const glow=z<0?0x55cfff:0xff6c47;
  const back=new THREE.Mesh(new THREE.BoxGeometry(30,14,1.2),new THREE.MeshPhysicalMaterial({color:glow,transparent:true,opacity:.13,emissive:glow,emissiveIntensity:2,roughness:.12}));back.position.set(0,7,z);scene.add(back);
  for(const x of [-15,15]){const post=box(1.3,15,1.3,glow,x,7.5,z);post.material.emissive=new THREE.Color(glow);post.material.emissiveIntensity=3;scene.add(post)}
  const cross=box(31,1.3,1.3,glow,0,14.8,z);cross.material.emissive=new THREE.Color(glow);cross.material.emissiveIntensity=3;scene.add(cross);
}
goal(-56); goal(56);

function car(color, orange=false){ const group=new THREE.Group();
  const lower = box(6,1.05,8.2,color,0,.85,0); group.add(lower);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(5.25,.65,2.7), new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.15}));
  hood.position.set(0,1.18,-3.15); hood.rotation.x=-.12; hood.castShadow=true; group.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.25,1.65,3.35),new THREE.MeshStandardMaterial({color:0x192b3c,roughness:.25,metalness:.4}));
  cabin.position.set(0,1.75,-.2); cabin.geometry.translate(0,0,.15); cabin.castShadow=true; group.add(cabin);
  const windscreen = box(4,.95,.12,0x79d7ef,0,2.05,-1.72); group.add(windscreen);
  const spoiler = box(5.3,.18,.85,0x151b22,0,1.85,3.45); group.add(spoiler);
  group.add(box(.22,.22,1.3,0x151b22,-2.25,1.7,3.45)); group.add(box(.22,.22,1.3,0x151b22,2.25,1.7,3.45));
  const bumperColor = orange ? 0xff9d23 : 0x8de7ff;
  group.add(box(5.7,.42,.32,bumperColor,0,.78,-4.15));
  [[-2.75,.68,-2.45],[2.75,.68,-2.45],[-2.75,.68,2.55],[2.75,.68,2.55]].forEach(p=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.78,.78,.62,16),new THREE.MeshStandardMaterial({color:0x11151a,roughness:.75}));w.rotation.z=Math.PI/2;w.position.set(...p);w.castShadow=true;group.add(w)});
  group.userData.boost=100; group.userData.orange=orange; return group;
}
const player=car(0x18bde9); scene.add(player); player.position.set(0,0,-24);
const boostTrail=new THREE.Mesh(new THREE.CylinderGeometry(.32,.95,9,12,1,true),new THREE.MeshBasicMaterial({color:0x59eaff,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending}));boostTrail.rotation.x=Math.PI/2;boostTrail.position.set(0,.65,7.5);boostTrail.visible=false;player.add(boostTrail);
const bots=[]; [[-18,0,-18,false],[18,0,-18,false],[-18,0,22,true],[18,0,22,true]].forEach((p,i)=>{const c=car(i<2?0x1ba4df:0xf48b2a,i>=2);c.position.set(p[0],p[1],p[2]);scene.add(c);bots.push(c)});

const ball=new THREE.Mesh(new THREE.SphereGeometry(2,48,48),new THREE.MeshPhysicalMaterial({color:0xf3f7ff,roughness:.18,metalness:.05,clearcoat:.8,clearcoatRoughness:.12}));ball.position.set(0,2,0);ball.castShadow=true;scene.add(ball);
for(const [rx,ry] of [[0,0],[Math.PI/2,0],[0,Math.PI/2]]){const seam=new THREE.Mesh(new THREE.TorusGeometry(2.02,.025,6,64),new THREE.MeshBasicMaterial({color:0x8ac9e8}));seam.rotation.set(rx,ry,0);ball.add(seam)}
const ballLight=new THREE.PointLight(0x9eeaff,18,18,2);ball.add(ballLight);
const ballVelocity=new THREE.Vector3();

const padPositions=[[-62,-42],[62,-42],[-62,42],[62,42],[-72,0],[72,0],[-38,-24],[38,-24],[-38,24],[38,24]];
const pads=[];
padPositions.forEach(([x,z])=>{const ring=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2.2,.18,24),new THREE.MeshStandardMaterial({color:0xffd62c,emissive:0xffa500,emissiveIntensity:.7}));ring.position.set(x,.12,z);ring.userData.active=true;scene.add(ring);pads.push(ring)});

const keys={};
let jumpQueued=false;
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'&&!e.repeat)jumpQueued=true});
addEventListener('keyup',e=>keys[e.code]=false);
let difficulty='pro', playing=false, blueScore=0, orangeScore=0, matchSeconds=180, lastTime=performance.now(), playerHeading=0, countdown=0;
const levels={rookie:{speed:.7,react:.055},pro:{speed:.9,react:.09},allstar:{speed:1.15,react:.16}};

document.querySelectorAll('.level').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.level').forEach(b=>b.classList.remove('selected'));button.classList.add('selected');difficulty=button.dataset.level}));
document.querySelector('#playButton').onclick=()=>startMatch(); document.querySelector('#rematch').onclick=()=>startMatch();
function startMatch(){ document.querySelector('#menu').classList.add('hidden');document.querySelector('#result').classList.add('hidden');playing=true;blueScore=0;orangeScore=0;matchSeconds=180;ball.position.set(0,2,0);ballVelocity.set(0,0,0);player.position.set(0,0,-24);playerHeading=0;player.userData.verticalVelocity=0;player.userData.grounded=true;player.userData.airJumps=0;jumpQueued=false;countdown=2;updateScore() }
function updateScore(){document.querySelector('#blueScore').textContent=blueScore;document.querySelector('#orangeScore').textContent=orangeScore}
function saveResult(){const key='leagueRocketLeaderboard';const rows=JSON.parse(localStorage.getItem(key)||'[]');rows.push({name:'PLAYER',score:blueScore,difficulty});rows.sort((a,b)=>b.score-a.score||a.difficulty.localeCompare(b.difficulty));localStorage.setItem(key,JSON.stringify(rows.slice(0,5)));renderLeaderboard()}
function renderLeaderboard(){const rows=JSON.parse(localStorage.getItem('leagueRocketLeaderboard')||'[]');const el=document.querySelector('#rankings');el.innerHTML=(rows.length?rows:[{name:'ROOKIE',score:0},{name:'PRO',score:0},{name:'ALL STAR',score:0}]).slice(0,5).map((r,i)=>`<div class="rank"><span class="place">${i+1}</span><strong>${r.name}</strong><span>${r.score}</span></div>`).join('')}
renderLeaderboard();

function updatePlayer(dt){
  const turn=(keys.KeyA||keys.ArrowLeft?1:0)-(keys.KeyD||keys.ArrowRight?1:0);
  const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
  playerHeading+=turn*dt*2.05; player.rotation.y=playerHeading;
  const boosting=(keys.ShiftLeft||keys.ShiftRight)&&forward>0&&player.userData.boost>0;
  if(boosting){player.userData.boost=Math.max(0,player.userData.boost-dt*32)}
  else player.userData.boost=Math.min(100,player.userData.boost+dt*7);
  const targetSpeed=forward*(boosting?82:52);
  player.userData.velocity=THREE.MathUtils.lerp(player.userData.velocity||0,targetSpeed,1-Math.exp(-dt*(forward===0?5:7)));
  const speed=player.userData.velocity;
  player.userData.speed=speed;
  player.position.x+=Math.sin(playerHeading)*speed*dt;
  player.position.z+=Math.cos(playerHeading)*speed*dt;
  const nearSideWall=Math.abs(player.position.x)>72&&forward!==0;
  const nearBackWall=Math.abs(player.position.z)>47&&forward!==0;
  if(nearSideWall&&boosting){player.userData.verticalVelocity=Math.max(player.userData.verticalVelocity||0,5);player.position.y=Math.min(18,player.position.y+14*dt)}
  if(nearBackWall&&boosting){player.userData.verticalVelocity=Math.max(player.userData.verticalVelocity||0,5);player.position.y=Math.min(18,player.position.y+14*dt)}
  player.position.x=THREE.MathUtils.clamp(player.position.x,-78,78);
  player.position.z=THREE.MathUtils.clamp(player.position.z,-53,53);
  if(jumpQueued&&player.userData.grounded){player.userData.verticalVelocity=17;player.userData.grounded=false;player.userData.airJumps=0}
  else if(jumpQueued&&!player.userData.grounded&&player.userData.airJumps===0){player.userData.verticalVelocity=Math.max(player.userData.verticalVelocity,14);player.userData.airJumps=1}
  jumpQueued=false;
  if(!player.userData.grounded&&!nearSideWall&&!nearBackWall){player.userData.verticalVelocity-=27*dt;player.position.y+=player.userData.verticalVelocity*dt;if(player.position.y<=0){player.position.y=0;player.userData.verticalVelocity=0;player.userData.grounded=true}}
  else if(player.userData.grounded)player.position.y=0;
  if(!player.userData.grounded){
    if(keys.KeyQ)player.rotation.z+=3.1*dt;
    if(keys.KeyE)player.rotation.z-=3.1*dt;
    if(keys.KeyI)player.rotation.x-=1.5*dt;
    if(keys.KeyK)player.rotation.x+=1.5*dt;
  }else if(!nearSideWall&&!nearBackWall){
    player.rotation.x=THREE.MathUtils.lerp(player.rotation.x,0,.12);
    player.rotation.z=THREE.MathUtils.lerp(player.rotation.z,0,.12);
  }
  const boostAmount=Math.round(player.userData.boost);
  document.querySelector('#boostNumber').textContent=boostAmount;
  document.querySelector('#boostFill').style.width=boostAmount+'%';
}
function updateBots(dt){bots.forEach((bot,i)=>{const toBall=ball.position.clone().sub(bot.position).normalize();const targetAngle=Math.atan2(toBall.x,toBall.z);let delta=targetAngle-bot.rotation.y;while(delta>Math.PI)delta-=Math.PI*2;while(delta<Math.PI*-1)delta+=Math.PI*2;const cfg=levels[difficulty];bot.rotation.y+=THREE.MathUtils.clamp(delta,-cfg.react,cfg.react);const speed=cfg.speed*(i<2?72:80)*(difficulty==='allstar'&&i>=2?1.08:1);bot.userData.speed=speed;bot.position.add(new THREE.Vector3(Math.sin(bot.rotation.y)*speed*dt,0,Math.cos(bot.rotation.y)*speed*dt));bot.position.x=THREE.MathUtils.clamp(bot.position.x,-78,78);bot.position.z=THREE.MathUtils.clamp(bot.position.z,-53,53);});}
function updateBall(dt){
  ballVelocity.y-=18*dt;
  ball.position.addScaledVector(ballVelocity,dt);
  if(ball.position.y<2){ball.position.y=2;ballVelocity.y=Math.abs(ballVelocity.y)*.55;ballVelocity.multiplyScalar(.985)}
  ballVelocity.multiplyScalar(Math.max(0,1-dt*.045));
  ball.rotation.x+=ballVelocity.z*dt*.09;
  ball.rotation.z-=ballVelocity.x*dt*.09;
  [player,...bots].forEach(car=>{
    const impact=ball.position.clone().sub(car.position);
    const distance=impact.length();
    if(distance<6.2){
      const normal=distance>0.001?impact.normalize():new THREE.Vector3(0,.35,1).normalize();
      ball.position.addScaledVector(normal,6.2-distance);
      const heading=new THREE.Vector3(Math.sin(car.rotation.y),0,Math.cos(car.rotation.y));
      const carSpeed=Math.abs(car.userData.speed||0);
      const impulse=18+carSpeed*.72;
      ballVelocity.addScaledVector(normal,impulse*1.45);
      ballVelocity.addScaledVector(heading,10+carSpeed*.28);
      ballVelocity.y+=normal.y*13+(car===player&&car.position.y>1?12:0);
    }
  });
  if(ball.position.y>28){ball.position.y=28;ballVelocity.y=Math.min(0,ballVelocity.y)}
  if(Math.abs(ball.position.x)>78){ball.position.x=Math.sign(ball.position.x)*78;ballVelocity.x*=-.72}
  if(Math.abs(ball.position.z)>53){if(Math.abs(ball.position.x)<16&&ball.position.y<14){score(ball.position.z>0?0:1)}else{ball.position.z=Math.sign(ball.position.z)*53;ballVelocity.z*=-.72}}
  ballVelocity.x=THREE.MathUtils.clamp(ballVelocity.x,-42,42);
  ballVelocity.z=THREE.MathUtils.clamp(ballVelocity.z,-42,42);
  ballVelocity.y=THREE.MathUtils.clamp(ballVelocity.y,-35,35);
}
function score(team){ if(team===0){blueScore++}else{orangeScore++}updateScore();ball.position.set(0,2,0);ballVelocity.set(0,0,0);player.position.set(0,0,-24);bots[0].position.set(-18,0,-18);bots[1].position.set(18,0,-18);bots[2].position.set(-18,0,22);bots[3].position.set(18,0,22);countdown=2}
function updatePads(){pads.forEach(pad=>{if(pad.position.distanceTo(player.position)<5){pad.scale.setScalar(1+.08*Math.sin(performance.now()*0.01));player.userData.boost=Math.min(100,player.userData.boost+.12)}else pad.scale.lerp(new THREE.Vector3(1,1,1),.1)});
  const boosting=(keys.ShiftLeft||keys.ShiftRight)&&player.userData.boost>0;
  boostTrail.visible=boosting;
  if(boosting){boostTrail.scale.y=.75+Math.random()*1.1;boostTrail.material.opacity=.58+Math.random()*.25}
  camera.position.lerp(player.position.clone().add(new THREE.Vector3(-Math.sin(playerHeading)*26,16,-Math.cos(playerHeading)*26)),.09);camera.lookAt(player.position.clone().add(new THREE.Vector3(Math.sin(playerHeading)*8,2,Math.cos(playerHeading)*8)));
}
function endMatch(){playing=false;saveResult();const won=blueScore>=orangeScore;document.querySelector('#resultTitle').textContent=won?'Victory':'Defeat';document.querySelector('#resultScore').textContent=`${blueScore} — ${orangeScore}`;document.querySelector('#result').classList.remove('hidden')}
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-lastTime)/1000,.033);lastTime=now;if(playing){if(countdown>0){countdown-=dt}else{updatePlayer(dt);updateBots(dt);updateBall(dt)}updatePads();matchSeconds-=dt;if(matchSeconds<=0){matchSeconds=0;endMatch()}const mins=Math.floor(matchSeconds/60),secs=Math.floor(matchSeconds%60);document.querySelector('#clock').textContent=`${mins}:${String(secs).padStart(2,'0')}`; } else if(!document.querySelector('#menu').classList.contains('hidden')){camera.position.set(75*Math.cos(now*.0001),38,75*Math.sin(now*.0001));camera.lookAt(0,0,0)}renderer.render(scene,camera)}
camera.position.set(0,18,-48);animate(performance.now());
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
