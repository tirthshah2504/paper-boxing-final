const MAX_ROUNDS = 15;

/* 1. DEFINE PLAYER CLASS FIRST (Fixes the crash) */
class Player {
  constructor(isAI = false) {
    this.grid = Array(16).fill(null);
    this.visited = new Set([0]); // Top-left (index 0) is starting point
    this.path = [0];             // Path history
    this.pos = 0;                // Current position
    this.score = 0;
    this.stuck = false;
    this.isAI = isAI;
  }
}

/* 2. INITIALIZE VARIABLES */
let mode, phase = "fill";
let fillPlayer = 1;
let currentPlayer = 1;
let round = 0;

// Now it is safe to create players
let p1 = new Player();
let p2 = new Player();

let fillNumber = 1;
let fillHistory = [];

let roundP1 = null;
let roundP2 = null;

let nextPlayer = 1;
let nextPhase = "fill";

/* 3. GAME FUNCTIONS */
function startGame(m) {
  mode = m;
  phase = "fill";
  fillPlayer = 1;
  currentPlayer = 1;
  round = 0;
  fillNumber = 1;
  fillHistory = [];
  roundP1 = roundP2 = null;

  p1 = new Player(false);
  p2 = new Player(mode === "ai");

  if (mode === "ai") randomFill(p2);

  document.querySelector("#roundTable tbody").innerHTML = "";
  document.getElementById("turnOverlay").style.display = "none";
  document.getElementById("resultModal").style.display = "none";
  document.getElementById("rulesModal").style.display = "none";
  document.getElementById("svg1").innerHTML = "";
  document.getElementById("svg2").innerHTML = "";

  updateInfo("Player 1: Fill numbers 1–15");
  render();
}

function triggerSwitch(nP, nPh) {
  nextPlayer = nP;
  nextPhase = nPh;
  phase = "switching";
  
  const overlay = document.getElementById("turnOverlay");
  const text = document.getElementById("overlayText");
  text.innerText = `Player ${nextPlayer}'s Turn`;
  overlay.style.display = "flex";
  render(); 
}

function startNextTurn() {
  phase = nextPhase;
  if (phase === "fill") {
    fillPlayer = nextPlayer;
    updateInfo(`Player ${fillPlayer}: Fill numbers 1–15`);
  } else if (phase === "play") {
    currentPlayer = nextPlayer;
    updateTurnInfo();
  }
  document.getElementById("turnOverlay").style.display = "none";
  render();
  if (mode === "ai" && currentPlayer === 2 && !p2.stuck && phase === "play") {
     setTimeout(aiMove, 500);
  }
}

function placeNumber(player, pos) {
  if (phase !== "fill") return;
  player.grid[pos] = fillNumber;
  fillHistory.push({ player: fillPlayer, pos });
  fillNumber++;
  if (fillNumber > 15) {
    fillNumber = 1;
    fillHistory = [];
    if (mode === "2p") {
      if (fillPlayer === 1) triggerSwitch(2, "fill");
      else {
        p1.stuck = !hasMoves(p1);
        p2.stuck = !hasMoves(p2);
        triggerSwitch(1, "play");
      }
    } else {
      phase = "play";
      p1.stuck = !hasMoves(p1);
      p2.stuck = !hasMoves(p2);
      updateInfo("Player 1 turn");
      render();
    }
    return;
  }
  render();
}

function undoFill() {
  if (phase !== "fill" || fillHistory.length === 0) return;
  const last = fillHistory.pop();
  const p = last.player === 1 ? p1 : p2;
  p.grid[last.pos] = null;
  fillNumber--;
  render();
}

function randomFill(player) {
  const nums = [...Array(15).keys()].map(i => i + 1).sort(() => Math.random() - 0.5);
  let k = 0;
  for (let i = 1; i < 16; i++) player.grid[i] = nums[k++];
}

function neighbors(pos) {
  const x = pos % 4, y = Math.floor(pos / 4);
  let r = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < 4 && ny >= 0 && ny < 4) r.push(ny * 4 + nx);
    }
  return r;
}

function hasMoves(p) {
  return neighbors(p.pos).some(n => !p.visited.has(n));
}

function isValidMove(p, pos) {
  return !p.visited.has(pos) && neighbors(p.pos).includes(pos);
}

function makeMove(pos) {
  if (phase !== "play" || round >= MAX_ROUNDS) return;
  const p = currentPlayer === 1 ? p1 : p2;
  const opponent = currentPlayer === 1 ? p2 : p1;
  if (!isValidMove(p, pos)) return;
  p.visited.add(pos);
  p.path.push(pos);
  p.pos = pos;
  if (currentPlayer === 1) roundP1 = p.grid[pos];
  else roundP2 = p.grid[pos];
  p1.stuck = !hasMoves(p1);
  p2.stuck = !hasMoves(p2);
  if (opponent.stuck) {
    if (currentPlayer === 1 && roundP2 === null) roundP2 = 0;
    else if (currentPlayer === 2 && roundP1 === null) roundP1 = 0;
    resolveRound();
    if (p1.stuck && p2.stuck) { endGame(); return; }
    let name = currentPlayer === 1 ? "Player 1" : (mode === "ai" ? "AI" : "Player 2");
    updateInfo(`${name} moves again (Opponent stuck)`);
    render();
    if (mode === "ai" && currentPlayer === 2 && !p2.stuck) setTimeout(aiMove, 600);
  } else {
    let nextP = currentPlayer === 1 ? 2 : 1;
    if (roundP1 !== null && roundP2 !== null) resolveRound();
    if (mode === "2p") triggerSwitch(nextP, "play");
    else {
      currentPlayer = nextP;
      updateTurnInfo();
      render();
      if (currentPlayer === 2 && !p2.stuck) setTimeout(aiMove, 500);
    }
  }
}

function updateTurnInfo() {
  if (phase === "end") return;
  if (currentPlayer === 1) updateInfo("Player 1 turn");
  else updateInfo(mode === "ai" ? "AI turn" : "Player 2 turn");
}

function resolveRound() {
  let winner = "Draw";
  let v1 = roundP1, v2 = roundP2;
  if (v1 > v2) { p1.score++; winner = "Player 1"; } 
  else if (v2 > v1) { p2.score++; winner = mode === "ai" ? "AI" : "Player 2"; }
  round++;
  addRoundRow(round, v1, v2, winner);
  roundP1 = null;
  roundP2 = null;
  if (round >= MAX_ROUNDS || (p1.stuck && p2.stuck)) setTimeout(endGame, 100);
}

function getMaxPathLength(curr, visited, depth, depthLimit) {
  if (depth >= depthLimit) return depth;
  let maxDepth = depth;
  const nbs = neighbors(curr);
  nbs.sort((a, b) => {
    let na = neighbors(a).filter(x => !visited.has(x)).length;
    let nb = neighbors(b).filter(x => !visited.has(x)).length;
    return na - nb;
  });
  for (let n of nbs) {
    if (!visited.has(n)) {
      visited.add(n);
      let d = getMaxPathLength(n, visited, depth + 1, depthLimit);
      visited.delete(n); 
      if (d > maxDepth) maxDepth = d;
      if (maxDepth >= depthLimit) return maxDepth; 
    }
  }
  return maxDepth;
}

function aiMove() {
  const validMoves = neighbors(p2.pos).filter(n => !p2.visited.has(n));
  if (validMoves.length === 0) {
    p2.stuck = true;
    roundP2 = 0;
    if (roundP1 !== null) resolveRound();
    return;
  }
  const emptySquares = 16 - p2.visited.size;
  const searchDepth = emptySquares > 8 ? 6 : 12;
  let bestMove = validMoves[0];
  let bestScore = -Infinity;
  for (let m of validMoves) {
    p2.visited.add(m);
    let survivalChain = getMaxPathLength(m, p2.visited, 0, searchDepth);
    p2.visited.delete(m);
    let score = (survivalChain * 1000) + p2.grid[m];
    if (score > bestScore) { bestScore = score; bestMove = m; }
  }
  makeMove(bestMove);
}

function addRoundRow(r, v1, v2, w) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${r}</td><td>${v1}</td><td>${v2}</td><td>${w}</td>`;
  document.querySelector("#roundTable tbody").appendChild(tr);
  const table = document.querySelector("table");
  table.scrollIntoView({ behavior: "smooth", block: "end" });
}

function render() {
  drawGrid(p1, "grid1", showGrid(1));
  drawGrid(p2, "grid2", showGrid(2));
  document.getElementById("svg1").innerHTML = "";
  document.getElementById("svg2").innerHTML = "";
  if (phase === "play") {
    if (mode === "2p") {
      if (currentPlayer === 1) drawPaths(p1, "svg1", "#C95A2E");
      if (currentPlayer === 2) drawPaths(p2, "svg2", "#1A8ACB");
    } else drawPaths(p1, "svg1", "#C95A2E");
  } 
  else if (phase === "end") {
    drawPaths(p1, "svg1", "#C95A2E");
    drawPaths(p2, "svg2", "#1A8ACB");
  }
  document.getElementById("score1").innerText = p1.score;
  document.getElementById("score2").innerText = p2.score;
  document.getElementById("round").innerText = round;
}

function showGrid(num) {
  if (phase === "end") return true; 
  if (phase === "switching") return false; 
  if (mode === "ai" && num === 2) return false; 
  if (phase === "fill") return fillPlayer === num;
  return currentPlayer === num;
}

function drawGrid(p, id, visible) {
  const g = document.getElementById(id);
  g.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const c = document.createElement("div");
    c.className = "cell";
    if (!visible) c.classList.add("covered");
    else {
      if (p.visited.has(i)) c.classList.add("visited");
      if (phase === "play" && isValidMove(p, i)) c.classList.add("valid");
      c.innerText = p.grid[i] ?? "";
      if (phase === "fill" && fillPlayer === (p === p1 ? 1 : 2) && i && p.grid[i] === null)
        c.onclick = () => placeNumber(p, i);
      if (phase === "play" && isValidMove(p, i))
        c.onclick = () => makeMove(i);
    }
    g.appendChild(c);
  }
}

function drawPaths(player, svgId, color) {
  const svg = document.getElementById(svgId);
  const getCenter = (idx) => {
    const c = idx % 4, r = Math.floor(idx / 4);
    return { x: (c * 76) + 38, y: (r * 76) + 38 };
  };
  const path = player.path;
  for (let i = 0; i < path.length - 1; i++) {
    const start = getCenter(path[i]);
    const end = getCenter(path[i+1]);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("stroke", color);
    svg.appendChild(line);
  }
}

function updateInfo(msg) {
  document.getElementById("info").innerText = msg;
}

function endGame() {
  if (phase === "end") return;
  phase = "end";
  document.getElementById("turnOverlay").style.display = "none";
  render(); 
  updateInfo("Game Over!");
  let msg = "";
  if (p1.score > p2.score) msg = "🎉 Player 1 Wins! 🎉";
  else if (p2.score > p1.score) msg = mode === "ai" ? "🤖 AI Wins!" : "🎉 Player 2 Wins! 🎉";
  else msg = "🤝 It's a Draw!";
  document.getElementById("winnerMsg").innerText = msg;
  document.getElementById("finalP1").innerText = p1.score;
  document.getElementById("finalP2").innerText = p2.score;
  document.getElementById("resultModal").style.display = "flex";
}

function resetGame() {
  location.reload();
}

// 4. Initial Render Call (Ensures grid visible on load)
render();