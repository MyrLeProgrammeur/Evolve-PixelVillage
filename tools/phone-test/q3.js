(function(){var G=window.evolve&&window.evolve.global; if(!G)return "no global";
var ev=G.evolution||{}; var c={}; Object.keys(ev).forEach(function(k){c[k]=(ev[k]&&ev[k].count!==undefined)?ev[k].count:ev[k]});
return {species:G.race&&G.race.species,evo:G.tech&&G.tech.evo,final:ev.final,RNA:G.resource.RNA&&[Math.floor(G.resource.RNA.amount),G.resource.RNA.max],DNA:G.resource.DNA&&[Math.floor(G.resource.DNA.amount),G.resource.DNA.max],parts:c,last:(window.__log||[]).slice(-3),errors:(window.__errs||[]).slice(-3)}})()
