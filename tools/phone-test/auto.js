(function(){
 if(window.__auto){clearInterval(window.__auto);}
 window.__log=[]; var stages=["sentience","humanoid","mammals","bilateral_symmetry","multicellular","phagocytosis","sexual_reproduction"], parts=["eukaryotic_cell","nucleus","organelles","mitochondria","membrane"], rr=0;
 function click(k){var el=document.getElementById("evolution-"+k);if(el&&!el.classList.contains("cna")){var a=el.querySelector("a");if(a){a.click();window.__log.push(k);if(window.__log.length>400)window.__log.shift();return true}}return false}
 window.__auto=setInterval(function(){
   var G=window.evolve&&window.evolve.global; if(!G||!G.race||G.race.species!=="protoplasm")return;
   window.ankiCredit("RNA",1e6); window.ankiCredit("DNA",1e6);
   for(var i=0;i<stages.length;i++){if(click(stages[i]))return}
   var ev=G.evolution||{}; var order=parts.slice().sort(function(a,b){var ca=(ev[a]&&ev[a].count)||0,cb=(ev[b]&&ev[b].count)||0;return ca-cb});
   for(var j=0;j<order.length;j++){ if(order[j]==="membrane"&&((ev.membrane&&ev.membrane.count)||0)>30)continue; if(click(order[j]))return}
   click("dna");
 },200); return "auto on";})()
