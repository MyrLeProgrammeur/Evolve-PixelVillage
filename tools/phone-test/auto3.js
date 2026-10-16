(function(){
 if(window.__auto)clearInterval(window.__auto); window.__log=[]; var res=["Food","Lumber","Stone","Knowledge","Furs","Copper","Iron","Coal","Cement","Money","Steel"]; var n=0;
 function tab(name){var t=[].slice.call(document.querySelectorAll("#mainTabs > nav.tabs a")).find(function(a){return a.textContent.trim().indexOf(name)===0}); if(t)t.click()}
 window.__auto=setInterval(function(){
   var G=window.evolve&&window.evolve.global; if(!G||!G.race||G.race.species==="protoplasm")return; n++;
   res.forEach(function(r){try{window.ankiCredit(r,200)}catch(e){}});
   if(n%12===1)tab("Civilization"); if(n%12===7)tab("Research");
   var list=[].slice.call(document.querySelectorAll(".action:not(.cna)")).filter(function(e){return e.id&&!/^evolution/.test(e.id)&&!e.classList.contains("cnam")});
   if(list.length){var e=list[Math.floor(Math.random()*list.length)]; var a=e.querySelector("a"); if(a){a.click(); window.__log.push(e.id); if(window.__log.length>300)window.__log.shift();}}
   // jobs: click first add button of each job
   if(n%4===0){var add=document.querySelector(".job .add, #civ .add"); if(add)add.click()}
 },350); return "auto3 on";})()
