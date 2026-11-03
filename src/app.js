import './arcade.css';

const app = document.querySelector('#app');

function renderHome(){
  app.innerHTML = `
    <main class="arcade-home">
      <header><span>MINI ARCADE</span><strong>SELECT A GAME</strong></header>
      <section class="game-grid">
        <button class="game-card tetris-card" data-route="tetris">
          <span class="game-art tetris-art"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="game-copy"><small>01 · BLOCKS</small><strong>Stack Shift</strong><em>Play Tetris</em></span>
        </button>
        <button class="game-card invaders-card" data-route="invaders">
          <span class="game-art invaders-art"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="game-copy"><small>02 · DEFENSE</small><strong>Void Patrol</strong><em>Play Invaders</em></span>
        </button>
        <button class="game-card platform-card" data-route="platformer">
          <span class="game-art platform-art"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="game-copy"><small>03 · ADVENTURE</small><strong>Meadow Run</strong><em>Play platformer</em></span>
        </button>
        <button class="game-card meadowvale-card" data-route="meadowvale">
          <span class="game-art meadowvale-art"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="game-copy"><small>04 · FARM LIFE</small><strong>Meadowvale</strong><em>Begin your farm</em></span>
        </button>
      </section>
    </main>`;
  app.querySelectorAll('[data-route]').forEach(card=>card.addEventListener('click',()=>location.hash=card.dataset.route));
}

async function renderRoute(){
  if(location.hash === '#meadowvale'){
    app.innerHTML=`<main class="meadowvale-shell"><button class="meadowvale-back" type="button">← MINI ARCADE</button><iframe src="${import.meta.env.BASE_URL}meadowvale/index.html" title="Meadowvale"></iframe></main>`;
    app.querySelector('.meadowvale-back').addEventListener('click',()=>location.hash='');
  }else if(location.hash === '#invaders'){
    await import('./invaders.js');
  }else if(location.hash === '#platformer'){
    await import('./platformer.js');
  }else if(location.hash === '#tetris'){
    await import('./tetris.js');
  }else{
    renderHome();
  }
}

addEventListener('hashchange',()=>{location.reload()});
renderRoute();
