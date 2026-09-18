export function buildOfflinePack(title, words) {
  const data = JSON.stringify({ title, words }).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpellBee offline practice</title>
<style>body{font:20px system-ui;max-width:700px;margin:30px auto;padding:20px;background:#0f172a;color:#f8fafc}button,input,select{font:inherit;padding:12px;margin:8px 0;border-radius:8px}button{cursor:pointer}button:disabled{cursor:default;opacity:.6}input{display:block;box-sizing:border-box;width:100%}button:focus-visible,input:focus-visible,select:focus-visible{outline:4px solid #fbbf24;outline-offset:3px}#feedback{min-height:2em}progress{width:100%}li{margin:8px 0}small{display:block;line-height:1.5}</style></head><body>
<h1 id="title"></h1><p>Practise anywhere, without internet.</p>
<small id="storage">This browser saves your place when local-file storage is available. Offline results do not sync to your SpellBee account. Export results to keep a copy.</small>
<p id="count" role="status"></p><progress id="progress" aria-label="Round progress" value="0" max="1"></progress>
<p id="clue"></p><label>Speech speed <select id="rate"><option value="0.65">Slow</option><option value="0.9" selected>Normal</option><option value="1.1">Fast</option></select></label>
<button id="hear">Hear word</button><form id="form"><label>Your spelling<input id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" required></label><button id="check">Check answer</button></form>
<p id="feedback" role="status"></p><button id="next" hidden>Next word</button>
<section id="results" hidden><h2>Round results</h2><p>Export this round before replaying if you want to keep its results.</p><ul id="review"></ul><button id="retry">Practise missed words</button><button id="replay">Play whole pack again</button></section>
<button id="export" disabled>Export results CSV</button><button id="reset">Start over</button>
<script>
const pack=${data};
const el=id=>document.getElementById(id);
const signature=JSON.stringify(pack.words.map(w=>w.word));
let hash=2166136261;for(const ch of signature){hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;}
const key='spellbee.offline.v2.'+hash;
let order=pack.words.map((_,i)=>i),rows=[],index=0,checked=false;
const validOrder=a=>Array.isArray(a)&&a.length>0&&a.length<=pack.words.length&&new Set(a).size===a.length&&a.every(i=>Number.isInteger(i)&&i>=0&&i<pack.words.length);
try{
 const saved=JSON.parse(localStorage.getItem(key)||'null');
 if(saved&&saved.signature===signature&&validOrder(saved.order)&&Array.isArray(saved.rows)&&saved.rows.length<=saved.order.length&&saved.rows.every((r,i)=>r&&r.word===pack.words[saved.order[i]].word&&typeof r.right==='boolean'&&typeof r.answer==='string')){order=saved.order;rows=saved.rows;index=rows.length;}
}catch{el('storage').textContent='Saving is unavailable here. Keep this tab open or export your results before closing it. Offline results do not sync to your account.';}
function persist(){try{localStorage.setItem(key,JSON.stringify({signature,order,rows}));}catch{el('storage').textContent='Saving is unavailable here. Export your results before closing this file. Offline results do not sync to your account.';}}
function cancel(){if(window.speechSynthesis)window.speechSynthesis.cancel();}
function show(){
 cancel();checked=false;el('feedback').textContent='';el('next').hidden=true;el('export').disabled=rows.length===0;
 el('progress').max=order.length;el('progress').value=rows.length;
 const complete=index>=order.length;el('results').hidden=!complete;el('form').hidden=complete;el('hear').hidden=complete;el('rate').disabled=complete;
 if(complete){
  const score=rows.filter(r=>r.right).length;el('count').textContent='Round complete: '+score+' / '+rows.length+' ('+Math.round(score/Math.max(1,rows.length)*100)+'%)';el('clue').textContent='Review your words or try another round.';
  el('review').replaceChildren();for(const row of rows){const li=document.createElement('li');li.textContent=row.word+' — '+(row.right?'correct':'you wrote: '+row.answer);el('review').append(li);}el('retry').disabled=score===rows.length;return;
 }
 const word=pack.words[order[index]];el('answer').value='';el('answer').disabled=false;el('check').disabled=false;
 el('count').textContent='Word '+(index+1)+' of '+order.length;
 let clue=word.definition||'Listen to the word.';let at=clue.toLowerCase().indexOf(word.word.toLowerCase());
 while(at!==-1&&word.word.length){clue=clue.slice(0,at)+'_____ '+clue.slice(at+word.word.length);at=clue.toLowerCase().indexOf(word.word.toLowerCase());}
 el('clue').textContent=clue;el('answer').focus();
}
el('title').textContent=pack.title;
el('hear').onclick=()=>{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){el('feedback').textContent='Speech is unavailable. Use the definition clue or ask someone to read the word.';return;}cancel();const utterance=new window.SpeechSynthesisUtterance(pack.words[order[index]].word);utterance.rate=Number(el('rate').value);window.speechSynthesis.speak(utterance);};
el('form').onsubmit=e=>{e.preventDefault();if(checked||index>=order.length||!el('answer').value.trim())return;checked=true;cancel();const word=pack.words[order[index]],answer=el('answer').value.trim(),right=answer.toLowerCase()===word.word.toLowerCase();rows.push({word:word.word,answer,right});persist();el('feedback').textContent=(right?'Correct! ':'Answer: '+word.word+'. ')+(word.spellingTip||'');el('answer').disabled=true;el('check').disabled=true;el('export').disabled=false;el('next').hidden=false;el('next').textContent=index+1===order.length?'See results':'Next word';el('progress').value=rows.length;};
el('next').onclick=()=>{index=rows.length;show();};
function restart(nextOrder){order=nextOrder;rows=[];index=0;persist();show();}
el('replay').onclick=()=>restart(pack.words.map((_,i)=>i));
el('retry').onclick=()=>{const missed=order.filter((_,i)=>!rows[i].right);if(missed.length)restart(missed);};
el('reset').onclick=()=>{if(window.confirm('Start a new round? Export your current results first if you want to keep them.'))restart(pack.words.map((_,i)=>i));};
el('export').onclick=()=>{
 const quote=value=>{let s=String(value);if(/^[=+\\-@\\t\\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const csv=[['Word','Your answer','Correct'],...rows.map(r=>[r.word,r.answer,r.right?'Yes':'No'])].map(row=>row.map(quote).join(',')).join('\\r\\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='spellbee-offline-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('pagehide',cancel);show();
</script></body></html>`;
}
