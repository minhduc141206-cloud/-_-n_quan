/* Updated game: Quan gốc preserved (quan-original), stones in quan are still 'dân'.
   Capture rules: if capturing from a quan pit and the quan-original still exists, it's counted as a Quan captured.
   AI 3 levels included.
*/

const CONFIG = { smallInitial:5, quanValue:5, aiDelay:{easy:700,medium:900,hard:1200} };
const ORDER = ['quan-left','c1','c2','c3','c4','c5','quan-right','c10','c9','c8','c7','c6'];

let board = {}; // number of Dân (stones) in each pit; quantOriginal flags tracked separately
let quanOriginal = { 'quan-left':1, 'quan-right':1 }; // 1 if original Quan still present, 0 if eaten
let captured = {1:{stone:0,quan:0},2:{stone:0,quan:0}};
let turn = 1;
let mode = 'pvp';
let aiLevel = 'medium';
let direction = 'cw';
let animating=false;

// DOM refs
const topRow = document.getElementById('topRow');
const bottomRow = document.getElementById('bottomRow');
const statusBar = document.getElementById('statusBar');
const log = document.getElementById('log');
const rulesModal = document.getElementById('rulesModal');
const resultModal = document.getElementById('resultModal');

// Build board DOM
function makePitEl(id){ const pit = document.createElement('div'); pit.className = id.startsWith('quan')? 'pit quan' : 'pit small'; pit.id = id; pit.innerHTML = '<div class="stones-wrap"></div>'; return pit; }
function buildBoardDOM(){ topRow.innerHTML=''; bottomRow.innerHTML=''; for(let i=1;i<=5;i++) topRow.appendChild(makePitEl('c'+i)); for(let i=10;i>=6;i--) bottomRow.appendChild(makePitEl('c'+i)); const left = document.getElementById('leftQuan'); const right = document.getElementById('rightQuan'); if(left) left.replaceWith(makePitEl('quan-left')); if(right) right.replaceWith(makePitEl('quan-right')); attachClickHandlers(); }

// Init / Reset logic
function resetAll(){ ORDER.forEach(k=> board[k]=0); ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'].forEach(c=> board[c]=CONFIG.smallInitial); // quan pit start with 0 dân, but have original Quan
  board['quan-left']=0; board['quan-right']=0; quanOriginal = {'quan-left':1,'quan-right':1}; captured = {1:{stone:0,quan:0},2:{stone:0,quan:0}}; turn = 1; animating=false; renderAll(); setStatus('Bắt đầu ván mới. Gieo xúc xắc để xác định người đi trước.'); }
function renderPit(id){ const el = document.getElementById(id); if(!el) return; const wrap = el.querySelector('.stones-wrap'); wrap.innerHTML=''; // render original quan if present
  if(id.startsWith('quan') && quanOriginal[id]){ const q = document.createElement('div'); q.className='quan-original'; wrap.appendChild(q); }
  const n = board[id]||0; // render stones (dân)
  const showN = Math.min(n,20); for(let i=0;i<showN;i++){ const s = document.createElement('div'); s.className='stone'; s.style.transform = `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*6}px)`; wrap.appendChild(s); }
  let badge = el.querySelector('.count-badge'); if(n>20){ if(!badge){ badge = document.createElement('div'); badge.className='count-badge'; el.appendChild(badge);} badge.textContent = n; } else if(badge){ badge.remove(); } }
function renderAll(){ ORDER.forEach(id=> renderPit(id)); updateCapturedUI(); updateStatus(); updateClickable(); }
function updateCapturedUI(){ document.getElementById('p1_captured_stone').textContent = captured[1].stone; document.getElementById('p1_captured_quan').textContent = captured[1].quan; document.getElementById('p2_captured_stone').textContent = captured[2].stone; document.getElementById('p2_captured_quan').textContent = captured[2].quan; document.getElementById('p1_score').textContent = captured[1].stone + captured[1].quan * CONFIG.quanValue; document.getElementById('p2_score').textContent = captured[2].stone + captured[2].quan * CONFIG.quanValue; }
function setStatus(msg){ statusBar.textContent = 'Trạng thái: ' + msg; log.textContent = msg; }
function updateStatus(){ setStatus((mode==='pve' && turn===2)? 'Đang chờ AI...' : ('Lượt: ' + (turn===1? 'Người 1 (dưới)':'Người 2 (trên)'))); }

// Helpers
function indexOf(id){ return ORDER.indexOf(id); }
function nextId(id){ const i = indexOf(id); if(i<0) return null; if(direction==='cw') return ORDER[(i+1)%ORDER.length]; return ORDER[(i-1+ORDER.length)%ORDER.length]; }
function isPlayerPit(id,player){ if(player===1) return ['c6','c7','c8','c9','c10'].includes(id); return ['c1','c2','c3','c4','c5'].includes(id); }
function sleep(ms){ return new Promise(r=> setTimeout(r,ms)); }
function who(){ return turn===1? 'Người 1':'Người 2'; }
function aiIsTurn(){ return mode==='pve' && turn===2; }

// UI controls binding
document.getElementById('modeSelect').addEventListener('change',(e)=>{ mode=e.target.value; document.getElementById('aiLabel').style.display = mode==='pve'? 'inline-block':'none'; });
document.getElementById('aiLevel').addEventListener('change',(e)=>{ aiLevel=e.target.value; });
document.getElementById('direction').addEventListener('change',(e)=>{ direction=e.target.value; });
document.getElementById('newBtn').addEventListener('click', ()=>{ if(confirm('Bắt đầu trò mới?')) resetAll(); });
document.getElementById('rulesBtn').addEventListener('click', ()=> rulesModal.classList.remove('hidden'));
document.getElementById('closeRules').addEventListener('click', ()=> rulesModal.classList.add('hidden'));
document.getElementById('closeResult').addEventListener('click', ()=> resultModal.classList.add('hidden'));

document.getElementById('diceBtn').addEventListener('click', async ()=>{ setStatus('Gieo xúc xắc...'); await sleep(300); const d1 = Math.floor(Math.random()*6)+1; const d2 = Math.floor(Math.random()*6)+1; setStatus(`Xúc xắc: Người 1 = ${d1} — Người 2 = ${d2}`); await sleep(600); if(d1===d2){ setStatus('Hòa, gieo lại.'); return; } turn = d1>d2? 1:2; updateStatus(); renderAll(); if(aiIsTurn()){ setStatus('AI đi trước'); await sleep(600); aiPlayTurn(); } });

// Attach handlers
function attachClickHandlers(){ ORDER.forEach(id=>{ const el = document.getElementById(id); if(!el) return; el.onclick = async ()=>{ if(animating) return; if(id.startsWith('quan')){ setStatus('Không thể bốc từ ô Quan.'); return; } if(mode==='pve' && turn===2){ setStatus('Đang chờ AI...'); return; } if(!isPlayerPit(id,turn)){ setStatus('Bạn chỉ được chọn ô bên mình.'); return; } if(board[id]===0){ setStatus('Ô trống — chọn ô khác.'); return; } await playerMove(id); }; }); updateClickable(); }
function updateClickable(){ ORDER.forEach(id=>{ const el = document.getElementById(id); if(!el) return; if(id.startsWith('quan')){ el.classList.remove('disabled'); return; } const allowed = !animating && isPlayerPit(id,turn) && board[id]>0 && !(mode==='pve' && aiIsTurn()); if(allowed) el.classList.remove('disabled'); else el.classList.add('disabled'); }); }

// Move logic similar to previous but Quan original handled separately
async function playerMove(startId){ animating=true; setStatus(`${who()} bốc ô ${startId}`); await sowSequence(startId); animating=false; renderAll(); if(checkEnd()) return; if(aiIsTurn()) await sleep(CONFIG.aiDelay[aiLevel]), aiPlayTurn(); }

async function sowSequence(startId){ let current = startId; let stones = board[current]; board[current]=0; renderPit(current); await sleep(160); let last=null; while(true){ while(stones>0){ current = nextId(current); board[current] = (board[current]||0) + 1; renderPit(current); last = current; await sleep(160); stones--; } if(last.startsWith('quan')){ setStatus(`${who()} rơi vào ô Quan — mất lượt.`); turn = 3-turn; updateStatus(); return; } if(board[last] > 1){ stones = board[last]; board[last]=0; renderPit(last); setStatus(`${who()} tiếp tục bốc ô ${last} vì có ${stones} hạt.`); await sleep(260); continue; } const after = nextId(last); const after2 = nextId(after); if(board[after] > 0 || (after.startsWith('quan') && quanOriginal[after])){ // capture either stones or quan original
      // capture stones in after
      if(board[after] > 0){
        const cap = board[after]; captured[turn].stone += cap; board[after]=0; board[last]=0; renderPit(after); renderPit(last); updateCapturedUI(); setStatus(`${who()} ăn ${cap} dân tại ${after}.`); return;
      }
      // if after is quan and quanOriginal exists -> capture the Quan original (counts as 1 Quan)
      if(after.startsWith('quan') && quanOriginal[after]){
        captured[turn].quan += 1; quanOriginal[after] = 0; // Quan original eaten
        // also capture any stones that were on the pit (if any)
        const stonesInQuan = board[after]||0; if(stonesInQuan>0){ captured[turn].stone += stonesInQuan; board[after]=0; }
        board[last]=0; renderPit(after); renderPit(last); updateCapturedUI(); setStatus(`${who()} ăn 1 Quan gốc tại ${after} (và ${stonesInQuan} dân nếu có).`); return;
      }
    } else {
      // after empty
      if((board[after]||0)===0 && (board[after2]||0)===0){ setStatus(`${who()} rơi vào ô trống và hai ô sau trống — mất lượt.`); turn = 3-turn; updateStatus(); return; }
      setStatus(`${who()} rơi vào ô trống — mất lượt.`); turn = 3-turn; updateStatus(); return;
    } } }

// End condition
function checkEnd(){ const smallSum = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'].reduce((s,k)=>s+(board[k]||0),0); const quansRemaining = (quanOriginal['quan-left']?1:0) + (quanOriginal['quan-right']?1:0); const stonesInQuans = (board['quan-left']||0) + (board['quan-right']||0); if(smallSum===0 && quansRemaining===0 && stonesInQuans===0){ const p1score = captured[1].stone + captured[1].quan*CONFIG.quanValue; const p2score = captured[2].stone + captured[2].quan*CONFIG.quanValue; let title, text; if(p1score>p2score){ title='Người 1 thắng!'; text = `Điểm: ${p1score} — ${p2score}`; } else if(p2score>p1score){ title='Người 2 thắng!'; text = `Điểm: ${p2score} — ${p1score}`; } else { title='Hòa!'; text = `Điểm: ${p1score} — ${p2score}`; } document.getElementById('resultTitle').textContent = title; document.getElementById('resultText').textContent = text; resultModal.classList.remove('hidden'); return true; } return false; }

// AI (easy/medium/hard)
async function aiPlayTurn(){ if(animating) return; setStatus('AI đang suy nghĩ...'); await sleep(CONFIG.aiDelay[aiLevel]); const legal = ORDER.filter(id=> id.startsWith('c') && isPlayerPit(id,2) && board[id]>0); if(legal.length===0){ setStatus('AI không có nước đi — chuyển lượt'); turn=1; updateStatus(); return; } let choice = legal[Math.floor(Math.random()*legal.length)]; if(aiLevel==='easy'){ choice = legal[Math.floor(Math.random()*legal.length)]; } else if(aiLevel==='medium'){ const caps=[]; for(const id of legal){ const s=simulateMove(id,2); if(s.capture>0) caps.push({id,cap:s.capture}); } if(caps.length>0){ caps.sort((a,b)=> b.cap-a.cap); choice=caps[0].id; } else { legal.sort((a,b)=> board[b]-board[a]); choice=legal[0]; } } else { let best=-Infinity; for(const id of legal){ const s=simulateMove(id,2); const val = s.capture*1 + s.scoreDiff; if(val>best){ best=val; choice=id; } } } setStatus(`AI chọn ô ${choice}`); await sleep(300); await playerMove(choice); }

function simulateMove(startId, player){ const b = JSON.parse(JSON.stringify(board)); const q = JSON.parse(JSON.stringify(quanOriginal)); const c = JSON.parse(JSON.stringify(captured)); let dir = direction; function nextLocal(id){ const i = ORDER.indexOf(id); if(dir==='cw') return ORDER[(i+1)%ORDER.length]; return ORDER[(i-1+ORDER.length)%ORDER.length]; } let stones = b[startId]; b[startId]=0; let cur=startId; let totalCap=0; while(true){ while(stones>0){ cur = nextLocal(cur); b[cur] = (b[cur]||0)+1; stones--; } if(cur.startsWith('quan')){ return {board:b,capture:0,scoreDiff: c[2].stone - c[1].stone}; } if(b[cur]>1){ stones = b[cur]; b[cur]=0; continue; } const after = nextLocal(cur); const after2 = nextLocal(after); if(b[after] > 0 || (after.startsWith('quan') && q[after])){ if(b[after]>0){ c[player].stone += b[after]; totalCap += b[after]; b[after]=0; b[cur]=0; return {board:b,capture:totalCap,scoreDiff: c[2].stone - c[1].stone}; } if(after.startsWith('quan') && q[after]){ c[player].quan += 1; q[after]=0; const stonesInQuan = b[after]||0; if(stonesInQuan>0){ c[player].stone += stonesInQuan; totalCap += stonesInQuan; b[after]=0; } return {board:b,capture:totalCap + 1*CONFIG.quanValue,scoreDiff: c[2].stone - c[1].stone}; } } else { if((b[after]||0)===0 && (b[after2]||0)===0){ return {board:b,capture:0,scoreDiff: c[2].stone - c[1].stone}; } return {board:b,capture:0,scoreDiff: c[2].stone - c[1].stone}; } } }

// initial setup
buildBoardDOM();
resetAll();

// expose for debug
window._board = board; window._captured = captured; window._quanOriginal = quanOriginal;
