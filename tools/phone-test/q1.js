(function(){var h=document.documentElement;
var r=function(sel){var e=document.querySelector(sel);if(!e)return null;var b=e.getBoundingClientRect();return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height),getComputedStyle(e).display]};
return {skin:h.getAttribute("data-skin"),px:h.getAttribute("data-px"),vw:innerWidth,vh:innerHeight,dpr:devicePixelRatio,scrollY:scrollY,docH:document.documentElement.scrollHeight,
 main:r("#main"),mainColumn:r("#mainColumn"),evolution:r("#evolution"),mainTabs:r("#mainTabs"),tabsNav:r("#mainTabs > nav.tabs"),resources:r(".resources"),msgQueue:r(".msgQueue"),
 actions:document.querySelectorAll(".action").length, firstAction:r(".action"), avPanel:r("#av-panel")}})()
