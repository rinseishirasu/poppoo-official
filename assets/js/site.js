const navItems = [
  ["TOP","index.html"],["ABOUT","about.html"],["MEMBERS","talents.html"],
  ["SCHEDULE","schedule.html"],["NEWS","news.html"],
  ["JOIN","audition.html"],["CONTACT","contact.html"]
];
const current = location.pathname.split("/").pop() || "index.html";
const navCurrent = ({ "talent.html":"talents.html", "news-detail.html":"news.html" })[current] || current;
const sharedStyle=document.createElement("link");sharedStyle.rel="stylesheet";sharedStyle.href="assets/css/shared-renewal.css";document.head.append(sharedStyle);
const mainContent=document.querySelector("main");
if(mainContent){
 if(!mainContent.id)mainContent.id="main-content";
 mainContent.setAttribute("tabindex","-1");
 const skip=document.createElement("a");skip.className="pop-skip-link";skip.href="#"+mainContent.id;skip.textContent="本文へ移動";
 document.body.prepend(skip);
}
const header = document.querySelector("#site-header");
if (header) {
  header.innerHTML = `<div class="container header-inner pop-header"><a class="brand" href="index.html" aria-label="ぽっぽー トップページ"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-navigation" aria-label="メニューを開く">☰</button><nav class="nav" id="main-navigation" aria-label="メインナビゲーション">${navItems.map(([n,u])=>`<a href="${u}" ${navCurrent===u?'aria-current="page"':""}>${n}</a>`).join("")}</nav></div>`;
  const btn = header.querySelector(".menu-toggle"), nav = header.querySelector(".nav");
  const setMenu=(open)=>{nav.classList.toggle("open",open);btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰";btn.setAttribute("aria-label",open?"メニューを閉じる":"メニューを開く");};
  btn.addEventListener("click",()=>setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click",e=>{if(e.target.closest("a"))setMenu(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("open")){setMenu(false);btn.focus()}});
  const desktop=matchMedia("(min-width:1101px)");
  desktop.addEventListener("change",e=>{if(e.matches)setMenu(false)});
  document.addEventListener("pointerdown",e=>{if(!header.contains(e.target)&&nav.classList.contains("open"))setMenu(false)});
  header.addEventListener("focusout",e=>{if(e.relatedTarget&&!header.contains(e.relatedTarget))setMenu(false)});
  const updateHeader=()=>header.classList.toggle("pop-header-scrolled",window.scrollY>12);
  window.addEventListener("scroll",updateHeader,{passive:true});updateHeader();
}
const footer = document.querySelector("#site-footer");
if (footer) footer.innerHTML = `<div class="container pop-footer"><div class="footer-grid"><div><a class="brand" href="index.html"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><p>「好き」を配信に。「個性」を輝きに。<br>一人ひとりの個性と、自分らしい配信活動を応援します。</p></div><div><strong>CONTENTS</strong><div class="footer-links"><a href="about.html">コミュニティについて</a><a href="talents.html">参加メンバー</a><a href="schedule.html">配信スケジュール</a><a href="news.html">お知らせ</a></div></div><div><strong>INFORMATION</strong><div class="footer-links"><a href="audition.html">コミュニティ参加について</a><a href="contact.html">お問い合わせ</a><a href="policy.html">プライバシー・サイトポリシー</a></div></div></div><div class="pop-footer-bottom"><button type="button" class="pop-back-top">ページ上部へ <span aria-hidden="true">↑</span></button><div class="copyright">© ${new Date().getFullYear()} 架空事務所 ぽっぽー. All rights reserved.</div></div></div>`;

if(footer){footer.querySelector(".pop-back-top")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}));footer.querySelectorAll(".footer-links a").forEach(a=>{if(a.getAttribute("href")===navCurrent)a.setAttribute("aria-current","page")})}

const previewData=(()=>{try{if(window.parent===window||!new URLSearchParams(location.search).has("cmsPreview"))return null;const frame=window.frameElement;if(!frame||frame.id!=="cms-preview-frame"||!window.parent.location.pathname.endsWith("/admin.html"))return null;const snapshot=JSON.parse(sessionStorage.getItem("poppoo-cms-preview")||"null");return snapshot&&typeof snapshot==="object"?snapshot:null}catch{return null}})();
if(previewData){const note=document.createElement("div");note.textContent="公開前プレビュー（ブラウザー内の編集データ）";note.style.cssText="padding:10px;background:#142f56;color:white;text-align:center;font-size:13px";document.body.prepend(note);document.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&!a.getAttribute("href")?.startsWith("#"))e.preventDefault()},true)}
// Share public URLs only; no third-party widgets or tracking scripts.
function publicShareLinks(url,title){
 const q=encodeURIComponent, text=title+"\n"+url;
 return [
 ["X","x","https://twitter.com/intent/tweet?text="+q(title)+"&url="+q(url)],
 ["LINE","line","https://social-plugins.line.me/lineit/share?url="+q(url)+"&text="+q(title)],
 ["Threads","threads","https://www.threads.com/intent/post?text="+q(text)],
 ["Facebook","facebook","https://www.facebook.com/sharer/sharer.php?u="+q(url)],
 ["Bluesky","bluesky","https://bsky.app/intent/compose?text="+q(text)],
 ["WhatsApp","whatsapp","https://wa.me/?text="+q(text)],
 ["Telegram","telegram","https://t.me/share/url?url="+q(url)+"&text="+q(title)]
 ];
}
function mountPublicShare(target,{page,id,member,title,label="このページをシェア"}){
 if(!target)return;
 // Do not expose draft titles or activate copy/share in preview or embedded pages.
 if(window.parent!==window||new URLSearchParams(location.search).has("cmsPreview")){target.hidden=true;return}
 const allowed=["index.html","talents.html","talent.html","news.html","news-detail.html","schedule.html","about.html","audition.html"];
 if(!allowed.includes(page))return;
 const url=new URL(page,"https://rinseishirasu.github.io/poppoo-official/");
 if(page==="index.html")url.pathname="/poppoo-official/";
 if(id&&["talent.html","news-detail.html"].includes(page))url.searchParams.set("id",id);
 if(member&&["news.html","schedule.html"].includes(page))url.searchParams.set("member",member);
 const href=url.href,heading=String(title||"架空事務所 ぽっぽー").trim();
 target.classList.add("pop-share-panel");target.setAttribute("role","group");target.setAttribute("aria-label",label);
 const titleEl=document.createElement("strong");titleEl.className="pop-share-heading";titleEl.textContent=label;
 const buttons=document.createElement("div");buttons.className="pop-share-buttons";
 for(const [name,kind,link] of publicShareLinks(href,heading)){
  const a=document.createElement("a");a.className="pop-share-button pop-share-"+kind;a.href=link;a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="no-referrer";a.textContent=name;a.setAttribute("aria-label",name+"で共有（新しい画面）");buttons.append(a);
 }
 const status=document.createElement("p");status.className="pop-share-status";status.setAttribute("role","status");
 const fallback=document.createElement("input");fallback.className="pop-share-url";fallback.type="text";fallback.readOnly=true;fallback.value=href;fallback.hidden=true;fallback.setAttribute("aria-label","共有用URL");
 const showFallback=()=>{fallback.hidden=false;fallback.focus();fallback.select();status.textContent="表示されたURLをコピーしてください。"};
 const copy=document.createElement("button");copy.type="button";copy.className="pop-share-button pop-share-copy";copy.textContent="URLコピー";
 copy.addEventListener("click",async()=>{try{if(!navigator.clipboard?.writeText){showFallback();return}await navigator.clipboard.writeText(href);status.textContent="URLをコピーしました。"}catch{showFallback()}});
 buttons.append(copy);
 if(typeof navigator.share==="function"){const native=document.createElement("button");native.type="button";native.className="pop-share-button pop-share-native";native.textContent="その他の共有";native.addEventListener("click",async()=>{try{await navigator.share({title:heading,url:href});status.textContent="共有操作が完了しました。"}catch(e){if(e.name!=="AbortError"){status.textContent="共有できませんでした。URLコピーをご利用ください。"}}});buttons.append(native)}
 target.replaceChildren(titleEl,buttons,status,fallback);
}
// Keep the array return contract for static defaults and CMS preview.
const failedDatasets=new Set();
async function loadData(file){
 if(previewData&&Object.prototype.hasOwnProperty.call(previewData,file)&&Array.isArray(previewData[file])){failedDatasets.delete(file);return previewData[file]}
 try{
  const r=await fetch(file,{cache:"no-cache"});if(!r.ok)throw new Error("data");
  const data=await r.json();if(!Array.isArray(data))throw new Error("Invalid dataset");
  failedDatasets.delete(file);return data;
 }catch{failedDatasets.add(file);return []}
}
function datasetFailed(file){return failedDatasets.has(file)}
function cardTalent(t){return `<article class="card"><div class="talent-art">${t.emoji||"🐦"}</div><div class="card-body"><h3>${escapeHtml(t.name)}</h3><p>${escapeHtml(t.catchphrase||t.bio||"プロフィール準備中です。")}</p><p style="margin-top:14px"><a class="text-link" href="talent.html?id=${encodeURIComponent(t.id)}">プロフィールを見る →</a></p></div></article>`}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

/* Reveal only once, when a section enters the viewport. Never hide content. */
(()=>{
 const main=document.querySelector("main");
 if(!main||current==="admin.html"||!window.IntersectionObserver||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const selector=".pop-section,.pop-brand-panel,.pop-brand-intro,.audition-section,.contact-section,.profile-section,.pop-day-group,.news-card,.pop-member-card";
 const seen=new WeakSet();
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);entry.target.classList.add("pop-reveal-active");entry.target.addEventListener("animationend",()=>entry.target.classList.remove("pop-reveal-active"),{once:true})}},{threshold:0,rootMargin:"0px 0px -24px 0px"});
 const scan=root=>{if(root.nodeType!==1)return;const nodes=[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];for(const node of nodes){if(seen.has(node))continue;seen.add(node);if(node.closest(".pop-section")&& !node.matches(".pop-section"))continue;observer.observe(node)}};
 scan(main);
 if(window.MutationObserver)new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)scan(node)}).observe(main,{childList:true,subtree:true});
})();

/* Optional public site settings; static content remains the default. */
(async()=>{
 if(current==="admin.html")return;
 const s=(await loadData("data/settings.json")).find(x=>x?.published===true);if(!s)return;
 const set=(selector,key)=>{const el=document.querySelector(selector);if(el&&typeof s[key]==="string"&&s[key].trim()){el.textContent=s[key];el.style.whiteSpace="pre-line"}};
 if(current==="about.html"){
 const fields={"運営者名":"operator","代表者":"representative","盛り上げ会長":"chair","設立・活動開始":"founded","活動拠点":"base"};
 document.querySelectorAll(".about-overview .info-box").forEach(el=>{const label=el.querySelector("strong"),key=fields[label?.textContent];if(key&&typeof s[key]==="string"&&s[key].trim())el.replaceChildren(label,document.createTextNode(s[key]))});
 set(".about-lead","aboutLead");
 document.querySelectorAll(".pop-brand-panel").forEach(el=>{if(el.querySelector(".pop-kicker")?.textContent==="COMMUNITY"&&s.communityPolicy?.trim()){const p=el.querySelector("p");if(p){p.textContent=s.communityPolicy;p.style.whiteSpace="pre-line"}}});
 }
 const url=key=>{try{const u=new URL(s[key]);return u.protocol==="https:"&&!u.username&&!u.password?u.href:""}catch{return ""}};
 const link=(el,href,label)=>{const a=document.createElement("a");a.className="pop-link";a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label;el.append(a)};
 if(current==="audition.html"){
 set(".audition-lead p","joinIntro");
 const list=document.querySelector(".audition-checklist");if(list&&s.requirements?.trim()){list.replaceChildren(...s.requirements.split(/\r?\n/).filter(v=>v.trim()).map(v=>{const li=document.createElement("li");li.textContent=v;return li}))}
 const href=url("applicationUrl"),box=document.querySelector(".audition-status");if(href&&box){const p=document.createElement("p");p.textContent="参加申込みは下記の外部窓口からご確認ください。";box.replaceChildren(p);link(box,href,"応募窓口へ");const faq=document.querySelector("#join-application-faq p");if(faq)faq.textContent="参加申込みの詳細は下記の応募窓口をご確認ください。";const intro=document.querySelector(".audition-application>p");if(intro)intro.textContent="募集の詳細・応募手順は応募窓口をご確認ください。"}
 }
 if(current==="contact.html"){const href=url("contactUrl"),box=document.querySelector(".contact-status");if(href&&box){const p=document.createElement("p");p.textContent="お問い合わせは下記の外部窓口をご利用ください。";box.replaceChildren(p);link(box,href,"お問い合わせ窓口へ");const intro=document.querySelector(".contact-intro p");if(intro)intro.textContent="コミュニティへのお問い合わせは、受付窓口をご利用ください。";const caution=document.querySelector(".contact-caution p");if(caution)caution.textContent="個人情報や非公開情報を公開投稿などに送らないようご注意ください。"}}
 set(".pop-footer .footer-grid>div:first-child p","footerText");
})();
