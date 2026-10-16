(function(){var G=window.evolve.global; var c=G.city||{}; var b={}; Object.keys(c).forEach(function(k){if(c[k]&&c[k].count)b[k]=c[k].count});
var civ={}; Object.keys(G.civic||{}).forEach(function(k){var j=G.civic[k]; if(j&&j.workers)civ[k]=j.workers});
return {species:G.race.species,day:c.calendar&&c.calendar.day,season:c.calendar&&c.calendar.season,tech:G.tech,buildings:b,workers:civ,pop:G.resource[G.race.species]&&Math.floor(G.resource[G.race.species].amount),errs:(window.__errs||[]).slice(-3),last:(window.__log||[]).slice(-6)}})()
