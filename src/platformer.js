import './platformer.css';

const app=document.querySelector('#app');
app.innerHTML=`<main class="platform-shell">
  <header><button class="platform-back" data-home>MINI ARCADE</button><div class="platform-title">MEADOW <b>RUN</b></div><div class="platform-hud"><span>LEVEL <b id="platformLevel">1 / 100</b></span><span>SCORE <b id="platformScore">0000</b></span><span>COINS <b id="platformCoins">0</b></span><span>LIVES <b id="platformLives">3</b></span></div></header>
  <section class="platform-stage"><canvas id="platformCanvas" width="480" height="270" aria-label="Meadow Run platformer"></canvas><div class="platform-overlay visible" id="platformOverlay"><small id="platformKicker">100-LEVEL ADVENTURE</small><h1 id="platformTitle">MEADOW RUN</h1><p id="platformMessage">Choose a biome, then collect coins, dodge creatures, and reach the flag.</p><div class="biome-picker"><button data-biome="0">GREENWOOD<br><small>CLASSIC</small></button><button data-biome="1">SUNSET RIDGE<br><small>ADVANCED</small></button><button data-biome="2">FROST PEAK<br><small>EXPERT</small></button><button data-biome="3">MOON GARDEN<br><small>MASTER</small></button></div><button id="platformStart">Begin Greenwood</button></div></section>
  <footer><span><kbd>A</kbd><kbd>D</kbd> MOVE</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>P</kbd> PAUSE</span></footer>
</main>`;
app.querySelector('[data-home]').addEventListener('click',()=>location.hash='');
const canvas=document.querySelector('#platformCanvas'),ctx=canvas.getContext('2d'),keys={};
const TILE=24,W=480,H=270;
const seasonNames=['GREENWOOD','SUNSET RIDGE','FROST PEAK','MOON GARDEN'];
const seasonColors=[['#5c94fc','#4d9f38'],['#ef965e','#9b4e32'],['#a5d8e8','#edf5ff'],['#29205e','#7f72b7']];
const levelSignatures=new Set();
const levels=Array.from({length:100},(_,index)=>{
  const rows=Array.from({length:9},()=>Array(78).fill('.'));
  const seed=index*2654435761>>>0;
  const random=n=>{
    let value=(seed^(n*0x45d9f3b))>>>0;
    value=(value^(value>>>16))*0x45d9f3b>>>0;
    return ((value^(value>>>16))>>>0)%1000/1000;
  };
  const biome=Math.floor(index/25);
  const local=index%25;
  const difficulty=biome*0.9+local*0.12;
  for(let x=0;x<78;x++){
    const gapCount=biome+1+Math.floor(random(x+3)*3);
    const gapStart=16+Math.floor(random(x+11)*44);
    const gapEnd=gapStart+2+Math.floor(random(x+17)*(3+biome));
    const gap=x>gapStart&&x<gapEnd&&index!==0&&((x+Math.floor(difficulty))%Math.max(5,gapCount*2)<gapCount+Math.floor(difficulty));
    if(!gap){rows[6][x]='#';rows[8][x]=local===24?'G':'#'}
  }
  const platforms=5+Math.floor(random(50)*(5+biome))+Math.floor(local/6);
  for(let p=0;p<platforms;p++){
    const x=8+Math.floor(random(p+40)*68);
    const y=Math.max(2,5-biome-Math.floor(random(p+90)*3));
    const length=2+Math.floor(random(p+140)*(4+local%4));
    for(let i=0;i<length&&x+i<76;i++)rows[y][x+i]=(p*3+local+biome)%11===0?'L':'#';
  }
  const collectibles=6+Math.floor(random(201)*6+local/4);
  for(let n=0;n<collectibles;n++){
    const x=8+Math.floor(random(n+250)*(68));
    const y=3+Math.floor(random(n+320)*4);
    if(x<75&&rows[y][x]==='.')rows[y][x]=n%4===0&&index>0?'E':'C';
  }
  rows[4][15+Math.floor(random(401)*50)]='L';
  if(local%25===24||local===0)rows[5][68]='L';
  const floorVariant=(index*7)%9;
  if(floorVariant>0&&index!==0)rows[7][5+floorVariant]='C';
  const layout=rows.map(row=>row.join('')).join('/');
  if(levelSignatures.has(layout))rows[3][10+(index%58)]='C';
  levelSignatures.add(rows.map(row=>row.join('')).join('/'));
  return rows.map(row=>row.join(''));
});
let player,tiles,coins,enemies,powerUps,flag,levelIndex=0,score=0,totalCoins=0,lives=3,running=false,paused=true,last=0,cameraX=0,pendingLevel=false,runTime=0,selectedBiome=0;
function worldRows(level){return levels[level].map((row,rowIndex)=>Array.from(row.padEnd(78,'.')).map((ch,x)=>({ch,x,y:rowIndex})))}
function loadLevel(index){levelIndex=index;const rows=worldRows(index);tiles=[];coins=[];enemies=[];powerUps=[];
  rows.forEach(row=>row.forEach(({ch,x,y})=>{const px=x*TILE,py=y*TILE;if(ch==='.'||ch==='C'||ch==='E'||ch==='P'||ch==='S'||ch==='?'){}else if(ch==='G'||ch==='#'||ch==='?'||ch==='L')tiles.push({x:px,y:py,w:TILE,h:TILE,type:ch});if(ch==='C')coins.push({x:px+6,y:py+5,w:12,h:15,taken:false});if(ch==='E'){const biome=Math.floor(index/25),local=index%25;enemies.push({x:px,y:py,w:20,h:16,vx:34+(biome*18)+(local*2),alive:true});}if(ch==='P'||ch==='S')powerUps.push({x:px+12,y:py+7,w:24,h:30,type:ch,taken:false});}));
  flag={x:(78-4)*TILE,y:4*TILE,w:11,h:5*TILE};player={x:40,y:122,w:17,h:22,vx:0,vy:0,onGround:true,face:1,invulnerable:0,speedBoost:0,shield:0};cameraX=0;
  powerUps.push({x:(12+index*18)*TILE,y:4*TILE+3,w:12,h:15,type:index%2===0?'S':'P',taken:false});
}
function resetGame(startIndex=selectedBiome*25){score=0;totalCoins=0;lives=3;pendingLevel=false;loadLevel(startIndex);running=true;paused=false;document.querySelector('#platformOverlay').classList.remove('visible');updateHud()}
function updateHud(){document.querySelector('#platformLevel').textContent=`${levelIndex+1} / 100`;document.querySelector('#platformScore').textContent=String(score).padStart(4,'0');document.querySelector('#platformCoins').textContent=totalCoins;document.querySelector('#platformLives').textContent=lives}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function resolveAxis(entity,axis){for(const tile of tiles){if(!overlap(entity,tile))continue;if(axis==='x'){if(entity.vx>0)entity.x=tile.x-entity.w;else if(entity.vx<0)entity.x=tile.x+tile.w;entity.vx=0}else{if(entity.vy>0){entity.y=tile.y-entity.h;entity.vy=0;entity.onGround=true}else if(entity.vy<0){entity.y=tile.y+tile.h;entity.vy=0;if(tile.type==='L'){lives++;tile.type='X';updateHud()}}}}}
function hitPlayer(){if(player.invulnerable>0)return;if(player.shield>0){player.shield=0;player.invulnerable=1;score+=50;return}lives--;player.invulnerable=1.8;updateHud();if(lives<=0){endGame(false);return}player.x=40;player.y=122;player.vx=0;player.vy=0;player.onGround=true}
function endGame(won){running=false;paused=true;const overlay=document.querySelector('#platformOverlay');document.querySelector('#platformKicker').textContent=won?'ADVENTURE COMPLETE':'TRY AGAIN';document.querySelector('#platformTitle').textContent=won?'MEADOW SAVED':'OUT OF LIVES';document.querySelector('#platformMessage').textContent=`Score ${score} · Coins ${totalCoins}`;document.querySelector('#platformStart').textContent='Play again';overlay.classList.add('visible')}
function completeLevel(){
  if(levelIndex>=levels.length-1){endGame(true);return}
  const finishedBiome=levelIndex===24||levelIndex===49||levelIndex===74||levelIndex===99;
  levelIndex++;score+=1000;
  if(finishedBiome){showBiomePicker();return}
  lives=levelIndex===25||levelIndex===50||levelIndex===75?3:lives;
  loadLevel(levelIndex);
  paused=false;running=true;document.querySelector('#platformOverlay').classList.remove('visible');updateHud();
}
function showBiomePicker(){lives=3;running=false;paused=true;
  document.querySelector('#platformKicker').textContent='BIOME COMPLETE';
  document.querySelector('#platformTitle').textContent='CHOOSE YOUR NEXT BIOME';
  document.querySelector('#platformMessage').textContent='Your next adventure starts when you choose a biome.';
  document.querySelector('#platformStart').textContent='Select a biome';
  document.querySelector('.biome-picker').style.display='grid';
  document.querySelector('#platformOverlay').classList.add('visible');
}
function showLevelIntro(){paused=true;running=true;pendingLevel=true;const season=Math.floor(levelIndex/25);document.querySelector('#platformKicker').textContent=`${seasonNames[season]} · LEVEL ${levelIndex+1} / 100`;document.querySelector('#platformTitle').textContent=`${seasonNames[season]} ${levelIndex%25+1}`;document.querySelector('#platformMessage').textContent=levelIndex===0?'Move right, jump over obstacles, collect coins, and reach the flag.':levelIndex%25===0?'A new season begins. Your lives are restored.':'The trail continues.';document.querySelector('#platformStart').textContent='Continue';document.querySelector('#platformOverlay').classList.add('visible')}
function step(dt){if(!running||paused)return;player.invulnerable=Math.max(0,player.invulnerable-dt);runTime+=dt;const move=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);player.vx=move*(player.speedBoost>0?310:230);player.face=move||player.face;if(move===0)player.vx=0;if(player.onGround&&keys.Space){player.vy=-630;player.onGround=false}if(player.onGround&&!keys.Space){player.vy=0}else player.vy+=1500*dt;player.x+=player.vx*dt;resolveAxis(player,'x');const wasGrounded=player.onGround;player.onGround=false;player.y+=player.vy*dt;resolveAxis(player,'y');if(wasGrounded&&!player.onGround){const support=tiles.some(tile=>tile.x<player.x+player.w&&tile.x+tile.w>player.x&&tile.y-player.y-player.h<3&&tile.y-player.y-player.h>-2);if(support){player.y=tiles.find(tile=>tile.x<player.x+player.w&&tile.x+tile.w>player.x&&tile.y-player.y-player.h<3&&tile.y-player.y-player.h>-2).y-player.h;player.onGround=true}}player.x=Math.max(0,player.x);if(player.y>H+120)hitPlayer();cameraX=Math.max(0,Math.min(78*TILE-W,player.x-150));
  coins.forEach(c=>{if(!c.taken&&overlap(player,c)){c.taken=true;totalCoins++;score+=100;updateHud()}});
  powerUps.forEach(power=>{if(!power.taken&&overlap(player,power)){power.taken=true;if(power.type==='S'){player.shield=8}else{player.speedBoost=8}score+=250;updateHud()}});
  if(player.speedBoost>0)player.speedBoost-=dt;if(player.shield>0)player.shield-=dt;
  enemies.forEach(enemy=>{if(!enemy.alive)return;enemy.x+=enemy.vx*dt;const ahead={x:enemy.vx>0?enemy.x+enemy.w+3:enemy.x-3,y:enemy.y+enemy.h+2,w:2,h:2};if(!tiles.some(t=>overlap(ahead,t))){enemy.vx*=-1}if(overlap(player,enemy)){if(player.vy>80&&player.y+player.h<enemy.y+22){enemy.alive=false;player.vy=-380;score+=250}else hitPlayer()}});
  if(overlap(player,flag))completeLevel();updateHud();
}
function draw(){ctx.imageSmoothingEnabled=false;const seasonPalette=seasonColors[Math.floor(levelIndex/25)];ctx.fillStyle=seasonPalette[0];ctx.fillRect(0,0,W,H);ctx.fillStyle='#d8e8ff';for(let i=0;i<5;i++){const x=(65+i*90-cameraX*.12)%500;ctx.fillRect(x,42+(i%2)*18,48,10);ctx.fillRect(x+8,34+(i%2)*18,32,8)}ctx.save();ctx.translate(-cameraX,0);
  tiles.forEach(t=>{ctx.fillStyle=t.type==='G'?seasonColors[Math.floor(levelIndex/25)][1]:seasonColors[Math.floor(levelIndex/25)][1];ctx.fillRect(t.x,t.y,t.w,t.h);ctx.fillStyle=t.type==='L'?'#ffe04a':t.type==='G'?'#8ed17a':'#c68b5b';ctx.fillRect(t.x+2,t.y+2,t.w-4,t.w-4);ctx.fillRect(t.x,t.y,t.w,10);ctx.fillStyle='#dcae64';ctx.fillRect(t.x+12,t.y+10,3,t.h-10)});
  coins.forEach(c=>{if(c.taken)return;ctx.fillStyle='#fc9838';ctx.fillRect(c.x,c.y+2,c.w,c.h-4);ctx.fillStyle='#ffe38a';ctx.fillRect(c.x+3,c.y+4,4,c.h-8);ctx.fillStyle='#fff';ctx.fillRect(c.x+5,c.y+6,2,c.h-12)});
  powerUps.forEach(power=>{if(power.taken)return;ctx.fillStyle=power.type==='S'?'#6de6ff':'#a8ef5f';ctx.beginPath();ctx.arc(power.x+12,power.y+15,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(power.x+10,power.y+8,4,14)});
  enemies.forEach(e=>{if(!e.alive)return;ctx.fillStyle='#8a4a72';ctx.fillRect(e.x,e.y+4,e.w,e.h-4);ctx.fillRect(e.x+4,e.y,e.w-8,4);ctx.fillStyle='#fff1f8';ctx.fillRect(e.x+4,e.y+7,4,4);ctx.fillRect(e.x+12,e.y+7,4,4);ctx.fillStyle='#24111f';ctx.fillRect(e.x+6,e.y+8,2,2);ctx.fillRect(e.x+14,e.y+8,2,2)});
  ctx.fillStyle='#f4f0dc';ctx.fillRect(flag.x,flag.y-20,10,flag.h+20);ctx.fillStyle='#ff637d';ctx.beginPath();ctx.moveTo(flag.x+10,flag.y);ctx.lineTo(flag.x+85,flag.y+25);ctx.lineTo(flag.x+10,flag.y+50);ctx.fill();if(player.invulnerable<=0||Math.floor(player.invulnerable*10)%2===0){const moving=Math.abs(player.vx)>0&&player.onGround;const stepFrame=moving&&Math.floor(runTime*10)%2===0;const facingRight=player.face>=0;ctx.fillStyle='#f4c542';ctx.fillRect(player.x+4,player.y,9,6);ctx.fillStyle='#f0d2a8';ctx.fillRect(player.x+5,player.y+6,8,8);ctx.fillStyle='#4a302a';ctx.fillRect(player.x+(facingRight?10:5),player.y+8,2,2);ctx.fillStyle='#246eb9';ctx.fillRect(player.x+4,player.y+14,9,6);ctx.fillStyle='#ffd447';ctx.fillRect(player.x+5,player.y+14,7,2);ctx.fillStyle='#f0d2a8';ctx.fillRect(player.x+(facingRight?13:1),player.y+15,4,3);ctx.fillStyle='#246eb9';ctx.fillRect(player.x+2,player.y+15,4,3);ctx.fillStyle='#543c82';ctx.fillRect(player.x+(stepFrame?2:4),player.y+20,5,3);ctx.fillRect(player.x+(stepFrame?10:8),player.y+20,5,3);ctx.fillStyle='#d9e6ef';ctx.fillRect(player.x+(stepFrame?1:3),player.y+22,6,1);ctx.fillRect(player.x+(stepFrame?11:9),player.y+22,6,1)}ctx.restore();}
function loop(time=0){const dt=Math.min((time-last)/1000,.033);last=time;step(dt);draw();requestAnimationFrame(loop)}
document.querySelectorAll('[data-biome]').forEach(button=>button.addEventListener('click',()=>{selectedBiome=Number(button.dataset.biome);document.querySelectorAll('[data-biome]').forEach(item=>item.classList.toggle('selected',item===button));document.querySelector('#platformStart').textContent=`Begin ${seasonNames[selectedBiome]}`}));
document.querySelector('#platformStart').addEventListener('click',()=>{if(pendingLevel){pendingLevel=false;paused=false;document.querySelector('#platformOverlay').classList.remove('visible')}else if(running&&paused){paused=false;document.querySelector('#platformOverlay').classList.remove('visible')}else resetGame(selectedBiome*25)});
addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventEventDefault();if(e.code==='KeyP'&&!e.repeat&&running){paused=!paused;document.querySelector('#platformOverlay').classList.toggle('visible',paused);if(paused){document.querySelector('#platformKicker').textContent='ADVENTURE PAUSED';document.querySelector('#platformTitle').textContent='PAUSED';document.querySelector('#platformMessage').textContent='Press P to continue.';document.querySelector('#platformStart').textContent='Resume'}}});addEventListener('keyup',e=>keys[e.code]=false);
loadLevel(0);paused=true;loop();
