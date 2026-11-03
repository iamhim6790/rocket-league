import './invaders.css';

const app=document.querySelector('#app');
app.innerHTML=`<main class="invaders-shell">
  <header class="invaders-header"><button class="back-game" data-home>MINI ARCADE</button><div><span>VOID PATROL</span><strong id="invScore">000000</strong></div></header>
  <section class="invaders-stage">
    <canvas id="invadersCanvas" width="960" height="620" aria-label="Space Invaders game"></canvas>
    <div class="invaders-overlay visible" id="invOverlay"><small>SECTOR 07</small><h1 id="invTitle">VOID PATROL</h1><p id="invMessage">Hold the line against the incoming fleet.</p><button id="invStart">Launch mission</button></div>
  </section>
  <footer><span><kbd>A</kbd><kbd>D</kbd> MOVE</span><span><kbd>SPACE</kbd> FIRE</span><span><kbd>P</kbd> PAUSE</span><div>LIVES <b id="invLives">◆ ◆ ◆</b></div><div>WAVE <b id="invWave">1</b></div></footer>
</main>`;
app.querySelector('[data-home]').addEventListener('click',()=>location.hash='');

const canvas=document.querySelector('#invadersCanvas');const ctx=canvas.getContext('2d');
const keys={};let player,shots,enemyShots,aliens,shields,particles,score,lives,wave,running,paused,last=0,enemyDirection=1,enemyStep=0;
function reset(){player={x:480,y:560,w:54,h:22,cd:0,invulnerable:0};shots=[];enemyShots=[];aliens=[];particles=[];shields=[];score=0;lives=3;wave=1;running=true;paused=false;enemyDirection=1;spawnAliens();spawnShields();updateHud();document.querySelector('#invOverlay').classList.remove('visible')}
function spawnAliens(){aliens=[];for(let row=0;row<5;row++)for(let col=0;col<11;col++){const hp=(wave>1&&row<1?Math.min(3,1+Math.floor((wave-1)/2)):wave>3&&row===1?2:1);aliens.push({x:180+col*52,y:70+row*44,w:32,h:22,row,hp,maxHp:hp,alive:true})}}
function spawnShields(){shields=[];for(const cx of [190,380,570,760])for(let row=0;row<3;row++)for(let col=0;col<5;col++){if(row===2&&(col===1||col===3))continue;shields.push({x:cx+(col-2)*13,y:470+row*11,w:13,h:11,hp:2})}}
function updateHud(){document.querySelector('#invScore').textContent=String(score).padStart(6,'0');document.querySelector('#invLives').textContent=Array.from({length:lives},()=> '◆').join(' ');document.querySelector('#invWave').textContent=wave}
function fire(){if(player.cd<=0){shots.push({x:player.x+25,y:player.y-12,w:4,h:15,vy:-620});player.cd=.22}}
function overlap(a,b){const aw=a.w ?? 0,ah=a.h ?? 0;return a.x < b.x+b.w && a.x+aw > b.x && a.y < b.y+b.h && a.y+ah > b.y}
function burst(x,y,color,count=10){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:.4+Math.random()*.5,color,size:1+Math.random()*3})}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function drawAlien(a){if(!a.alive)return;const pulse=Math.floor(enemyStep)%2;const color=a.hp>1&&(a.maxHp>1)?'#ff9eea':a.row===0?'#ff657e':a.row<3?'#ffd447':'#69e9e0';ctx.fillStyle=color;ctx.fillRect(a.x+8,a.y,a.w-16,4);ctx.fillRect(a.x+4,a.y+4,a.w-8,14);ctx.fillRect(a.x,a.y+8,4,8);ctx.fillRect(a.x+a.w-4,a.y+8,4,8);ctx.fillStyle='#080a12';ctx.fillRect(a.x+9,a.y+8,4,4);ctx.fillRect(a.x+a.w-13,a.y+8,4,4);ctx.fillRect(a.x+(pulse?7:12),a.y+18,6,4);if(a.maxHp>1){ctx.fillStyle='#ffffff';ctx.fillRect(a.x+10,a.y-7,12*(a.hp/a.maxHp),3)}}
function draw(){ctx.fillStyle='#070913';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='rgba(103,220,255,.055)';for(let y=0;y<620;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke()}for(let x=0;x<960;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,620);ctx.stroke()}
  aliens.forEach(drawAlien);shields.forEach(s=>{if(s.hp>0){ctx.globalAlpha=s.hp===1?.55:1;rect(s.x,s.y,s.w,s.h,s.hp===1?'#62d0a0':'#7fe3b5');ctx.globalAlpha=1}});
  shots.forEach(s=>{ctx.shadowColor='#68eaff';ctx.shadowBlur=12;rect(s.x-2,s.y,4,15,'#dffaff');ctx.shadowBlur=0});enemyShots.forEach(s=>{rect(s.x-3,s.y,6,14,'#ff637d')});
  if(player.invulnerable<=0||Math.floor(player.invulnerable*10)%2===0){ctx.shadowColor='#65e6ff';ctx.shadowBlur=18;rect(player.x+23,player.y-10,8,10,'#b9f6ff');rect(player.x+8,player.y,38,14,'#55bde0');rect(player.x,player.y+12,54,8,'#2a7096');ctx.shadowBlur=0}
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);rect(p.x,p.y,p.size,p.size,p.color)});ctx.globalAlpha=1
}
function step(dt){if(!running||paused)return;player.cd-=dt;player.invulnerable=Math.max(0,player.invulnerable-dt);if(keys.KeyA||keys.ArrowLeft)player.x-=310*dt;if(keys.KeyD||keys.ArrowRight)player.x+=310*dt;player.x=Math.max(18,Math.min(888,player.x));if(keys.Space)fire();shots.forEach(s=>s.y+=s.vy*dt);enemyShots.forEach(s=>s.y+=220*dt+wave*12);
  let minX=960,maxX=0,minY=620;aliens.forEach(a=>{if(!a.alive)return;minX=Math.min(minX,a.x);maxX=Math.max(maxX,a.x+a.w);minY=Math.min(minY,a.y)});if((enemyDirection>0&&maxX>910)||(enemyDirection<0&&minX<50)){enemyDirection*=-1;aliens.forEach(a=>a.y+=18);enemyStep++}aliens.forEach(a=>{if(a.alive){a.x+=enemyDirection*(18+wave*4)*dt;if(Math.random()<.00045*wave)enemyShots.push({x:a.x+a.w/2,y:a.y+a.h,w:6,h:14,vy:0})}});
  shots.forEach(s=>{if(s.dead)return;const hitShield=shields.find(sh=>sh.hp>0&&overlap(s,sh));if(hitShield){hitShield.hp--;s.dead=true;burst(s.x,s.y,'#7fe3b5',5);return}aliens.forEach(a=>{if(a.alive&&!s.dead&&overlap(s,{...a,w:a.w,h:a.h})) {a.hp--;s.dead=true;if(a.hp<=0){a.alive=false;score+=(6-a.row)*10*(1+(a.maxHp-1))}burst(a.x+a.w/2,a.y+a.h/2,a.row===0?'#ff657e':'#ffd447',14)}});});
  enemyShots.forEach(s=>{if(s.dead)return;const hitShield=shields.find(sh=>sh.hp>0&&overlap(s,sh));if(hitShield){hitShield.hp--;s.dead=true;burst(s.x,s.y,'#ff637d',5);return}if(player.invulnerable<=0&&overlap(s,{x:player.x,y:player.y,w:player.w,h:player.h})){s.dead=true;lives--;player.invulnerable=1.5;player.x=480;burst(player.x+27,player.y,'#65e6ff',22);updateHud();if(lives<=0)return endGame()}});
  shots=shots.filter(s=>!s.dead&&s.y>-20);enemyShots=enemyShots.filter(s=>!s.dead&&s.y<620);particles=particles.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0});if(aliens.every(a=>!a.alive)){wave++;spawnAliens();spawnShields();score+=250;document.querySelector('#invWave').textContent=wave}if(aliens.some(a=>a.alive&&a.y+a.h>=player.y)){endGame()}updateHud();
}
function endGame(){running=false;document.querySelector('#invTitle').textContent='MISSION LOST';document.querySelector('#invMessage').textContent=`Final score ${score.toLocaleString()} · Wave ${wave}`;document.querySelector('#invStart').textContent='Play again';document.querySelector('#invOverlay').classList.add('visible')}
function loop(time=0){const dt=Math.min((time-last)/1000,.033);last=time;step(dt);draw();requestAnimationFrame(loop)}
document.querySelector('#invStart').addEventListener('click',()=>{if(running&&paused){paused=false;document.querySelector('#invOverlay').classList.remove('visible')}else{reset();document.querySelector('#invStart').textContent='Resume';document.querySelector('#invOverlay').classList.remove('visible')}});addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyP'&&!e.repeat&&running){paused=!paused;const overlay=document.querySelector('#invOverlay');overlay.classList.toggle('visible',paused);if(paused){document.querySelector('#invTitle').textContent='PAUSED';document.querySelector('#invMessage').textContent='Press P or continue the mission.';document.querySelector('#invStart').textContent='Resume'}}});addEventListener('keyup',e=>keys[e.code]=false);reset();paused=true;running=false;document.querySelector('#invOverlay').classList.add('visible');loop();