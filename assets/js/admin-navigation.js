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
const toggle=$("cms-sidebar-toggle"),sidebar=$("cms-sidebar"),shell=document.querySelector(".cms-shell"),mobile=matchMedia("(max-width:760px)"),key="poppoo-cms-sidebar-collapsed";
let collapsed=mobile.matches;
try{const saved=localStorage.getItem(key);if(saved!==null&&!mobile.matches)collapsed=saved==="true"}catch{}
function syncSidebar(){shell.classList.toggle("cms-sidebar-collapsed",collapsed);sidebar.hidden=collapsed;toggle.setAttribute("aria-expanded",String(!collapsed));toggle.setAttribute("aria-label",collapsed?"管理メニューを開く":"管理メニューを折りたたむ")}
toggle.addEventListener("click",()=>{collapsed=!collapsed;syncSidebar();if(!mobile.matches)try{localStorage.setItem(key,String(collapsed))}catch{}});
for(const b of buttons)b.addEventListener("click",()=>{if(mobile.matches){collapsed=true;syncSidebar()}});
mobile.addEventListener("change",e=>{collapsed=e.matches; if(!e.matches)try{collapsed=localStorage.getItem(key)==="true"}catch{}syncSidebar()});
syncSidebar();
show("dashboard");
})();