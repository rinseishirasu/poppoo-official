(()=>{"use strict";
const $=id=>document.getElementById(id);
const names=["dashboard","editor","preview","history","media","check"];
const views=Object.fromEntries(names.map(n=>[n,$("cms-"+n+(["dashboard","editor"].includes(n)?"-view":"-panel"))]));
const toolbar=document.querySelector(".admin-toolbar");
const buttons=[...document.querySelectorAll(".admin-tab"),...["dashboard","preview","history","media","check"].map(n=>$("cms-"+n+"-open"))];
let active="dashboard",previous="editor";
function show(name){if(!views[name])return;if(["dashboard","editor"].includes(active))previous=active;active=name;for(const n of names)views[n].hidden=n!==name;toolbar.hidden=name!=="editor";for(const b of buttons){const selected=name==="editor"?b.classList.contains("admin-tab")&&b.classList.contains("active"):b.id==="cms-"+name+"-open";b.classList.toggle("cms-current",selected);if(selected)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")}window.scrollTo({top:0,behavior:"instant"})}
for(const b of buttons)b.addEventListener("click",()=>show(b.classList.contains("admin-tab")?"editor":b.id.split("-")[1]));
for(const n of ["preview","history","media","check"])$("cms-"+n+"-close").addEventListener("click",()=>show(previous));
$("cms-media-apply").addEventListener("click",()=>{if($("cms-media-status").textContent.startsWith("編集フォームに設定しました"))show("editor")});
$("cms-history-restore").addEventListener("click",()=>{if(views.history.hidden)show("editor")});
show("dashboard");
})();