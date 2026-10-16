(function(){
 if(window.__auto)clearInterval(window.__auto); window.__log=[]; var res=["Food","Lumber","Stone","Knowledge","Furs","Copper","Iron","Coal","Cement","Money"];
 window.__auto=setInterval(function(){
   var G=window.evolve&&window.evolve.global; if(!G||!G.race||G.race.species==="protoplasm")return;
   res.forEach(function(r){try{window.ankiCredit(r,50)}catch(e){}});
   var list=[].slice.call(document.querySelectorAll(".action:not(.cna)")).filter(function(e){return e.id&&!/^evolution|^city-(food|lumber|stone)$/.test(e.id)&&!e.classList.contains("cnam")});
   if(list.length){var e=list[Math.floor(Math.random()*list.length)]; var a=e.querySelector("a"); if(a){a.click(); window.__log.push(e.id); if(window.__log.length>300)window.__log.shift();}}
 },300); return "auto2 on";})()
