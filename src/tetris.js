import './tetris.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="tetris-shell">
    <section class="brand"><span>STACK</span><strong>SHIFT</strong></section>
    <button class="tetris-back" type="button">← MINI ARCADE</button>
    <aside class="stats left-stats">
      <div class="stat"><span>SCORE</span><strong id="score">0</strong></div>
      <div class="stat"><span>LINES</span><strong id="lines">0</strong></div>
      <div class="stat"><span>LEVEL</span><strong id="level">1</strong></div>
    </aside>
    <section class="board-wrap">
      <canvas id="board" width="300" height="600" aria-label="Tetris board"></canvas>
      <div class="overlay visible" id="overlay"><small id="overlayKicker">CLASSIC MODE</small><h1 id="overlayTitle">READY?</h1><p id="overlayText">Arrange the blocks. Clear the lines.</p><button id="startButton">Start game</button></div>
    </section>
    <aside class="stats right-stats">
      <div class="next-panel"><span>NEXT</span><canvas id="next" width="112" height="112"></canvas></div>
      <div class="controls-help"><b>CONTROLS</b><span><kbd>←</kbd><kbd>→</kbd> Move</span><span><kbd>↑</kbd> Rotate</span><span><kbd>↓</kbd> Soft drop</span><span><kbd>SPACE</kbd> Hard drop</span><span><kbd>P</kbd> Pause</span></div>
    </aside>
  </main>`;

const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.querySelector('#next');
const nextCtx = nextCanvas.getContext('2d');
const COLS = 10;
const ROWS = 20;
const SIZE = 30;
const board = Array.from({length: ROWS}, () => Array(COLS).fill(null));

const PIECES = {
  I: {cells:[[0,1],[1,1],[2,1],[3,1]], color:'#38d9ff'},
  O: {cells:[[1,0],[2,0],[1,1],[2,1]], color:'#ffd447'},
  T: {cells:[[1,0],[0,1],[1,1],[2,1]], color:'#a875ff'},
  S: {cells:[[1,0],[2,0],[0,1],[1,1]], color:'#62e66b'},
  Z: {cells:[[0,0],[1,0],[1,1],[2,1]], color:'#ff637d'},
  J: {cells:[[0,0],[0,1],[1,1],[2,1]], color:'#5689ff'},
  L: {cells:[[2,0],[0,1],[1,1],[2,1]], color:'#ff9d4d'}
};
const bag = [];
let current, next, score = 0, lines = 0, level = 1;
let running = false, paused = false, gameOver = false;
let lastTime = 0, dropCounter = 0;

function newBagPiece(){
  if(!bag.length){bag.push(...Object.keys(PIECES));for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()* (i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}}
  const type=bag.pop();return {type,cells:PIECES[type].cells.map(cell=>[...cell]),x:3,y:-1};
}
function reset(){
  board.forEach(row=>row.fill(null));score=0;lines=0;level=1;running=true;paused=false;gameOver=false;
  dropCounter=0;current=newBagPiece();next=newBagPiece();
  document.querySelector('#overlay').classList.remove('visible');updateStats();
}
function updateStats(){document.querySelector('#score').textContent=score.toLocaleString();document.querySelector('#lines').textContent=lines;document.querySelector('#level').textContent=level}
function collides(piece= current, dx=0, dy=0, cells=piece.cells){return cells.some(([x,y])=>{const bx=piece.x+x+dx,by=piece.y+y+dy;return bx<0||bx>=COLS||by>=ROWS||(by>=0&&board[by][bx])})}
function merge(){current.cells.forEach(([x,y])=>{const by=current.y+y;if(by>=0)board[by][current.x+x]=current.type});clearLines();current=next;current.x=3;current.y=-1;next=newBagPiece();if(collides())endGame()}
function clearLines(){let cleared=0;for(let y=ROWS-1;y>=0;y--)if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(COLS).fill(null));cleared++;y++}
  if(cleared){const rewards=[0,100,300,500,800];lines+=cleared;score+=rewards[cleared]*level;level=1+Math.floor(lines/10);updateStats()}}
function hardDrop(){if(!running||paused)return;while(!collides(current,0,1))current.y++;score+=2*landingDistance();merge();updateStats()}
function landingDistance(){let distance=0;while(!collides(current,0,distance+1))distance++;return distance}
function endGame(){running=false;gameOver=true;document.querySelector('#overlayTitle').textContent='GAME OVER';document.querySelector('#overlayText').textContent=`Score ${score.toLocaleString()} · ${lines} lines`;document.querySelector('#overlayKicker').textContent='FINAL RESULT';document.querySelector('#startButton').textContent='Play again';document.querySelector('#overlay').classList.add('visible')}
function rotate(){if(!running||paused||current.type==='O')return;const rotated=current.cells.map(([x,y])=>[3-y,x]);for(const kick of [0,-1,1,-2,2]){current.x+=kick;if(!collides(current,0,0,rotated)){current.cells=rotated;return}current.x-=kick}}
function move(dx){if(running&&!paused&&!collides(current,dx,0))current.x+=dx}
function tick(){if(!running||paused)return;if(!collides(current,0,1))current.y++;else merge();dropCounter=0}

function drawCell(context,x,y,color,size=SIZE){context.fillStyle=color;context.fillRect(x*size+1,y*size+1,size-2,size-2);context.fillStyle='rgba(255,255,255,.22)';context.fillRect(x*size+2,y*size+2,size-4,3);context.fillStyle='rgba(0,0,0,.18)';context.fillRect(x*size+size-4,y*size+3,3,size-5)}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#090c14';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=1;for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*SIZE,0);ctx.lineTo(x*SIZE,canvas.height);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*SIZE);ctx.lineTo(canvas.width,y*SIZE);ctx.stroke()}
  board.forEach((row,y)=>row.forEach((type,x)=>type&&drawCell(ctx,x,y,PIECES[type].color)));
  if(current){let ghostY=current.y;while(!collides({...current,y:ghostY},0,1))ghostY++;current.cells.forEach(([x,y])=>{if(ghostY+y>=0){ctx.globalAlpha=.18;drawCell(ctx,current.x+x,ghostY+y,PIECES[current.type].color);ctx.globalAlpha=1}});current.cells.forEach(([x,y])=>{if(current.y+y>=0)drawCell(ctx,current.x+x,current.y+y,PIECES[current.type].color)})}
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);if(next){const ox=1,oy=1;next.cells.forEach(([x,y])=>drawCell(nextCtx, x-(next.type==='I'?1:0)+ox,y+oy,PIECES[next.type].color,25))}
}
function loop(time=0){const delta=time-lastTime;lastTime=time;if(running&&!paused){dropCounter+=delta;if(dropCounter>Math.max(90,850-(level-1)*72))tick()}draw();requestAnimationFrame(loop)}

app.querySelector('.tetris-back').addEventListener('click',()=>{location.hash=''});
document.querySelector('#startButton').addEventListener('click',()=>{
  if(paused&&running){paused=false;document.querySelector('#overlay').classList.remove('visible');return}
  reset();
});
addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(event.code))event.preventDefault();
  if(event.code==='KeyP'){if(running){paused=!paused;document.querySelector('#overlay').classList.toggle('visible',paused);if(paused){document.querySelector('#overlayTitle').textContent='PAUSED';document.querySelector('#overlayText').textContent='Press P to continue';document.querySelector('#overlayKicker').textContent='GAME PAUSED';document.querySelector('#startButton').textContent='Resume'}else document.querySelector('#overlay').classList.remove('visible')}return}
  if(!running||paused)return;
  if(event.code==='ArrowLeft')move(-1);else if(event.code==='ArrowRight')move(1);else if(event.code==='ArrowDown'){if(!collides(current,0,1)){current.y++;score++;updateStats()}}else if(event.code==='ArrowUp'||event.code==='KeyX')rotate();else if(event.code==='KeyZ')rotate();else if(event.code==='Space')hardDrop();draw();
});
draw();loop();
