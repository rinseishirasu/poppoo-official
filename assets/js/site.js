const navItems = [
  ["TOP","index.html"],["ABOUT","about.html"],["MEMBERS","talents.html"],
  ["SCHEDULE","schedule.html"],["NEWS","news.html"],
  ["JOIN","audition.html"],["CONTACT","contact.html"]
];
const current = location.pathname.split("/").pop() || "index.html";
const navCurrent = ({ "talent.html":"talents.html", "news-detail.html":"news.html" })[current] || current;
const sharedStyle=document.createElement("link");sharedStyle.rel="stylesheet";sharedStyle.href="assets/css/shared-renewal.css";document.head.append(sharedStyle);
const header = document.querySelector("#site-header");
if (header) {
  header.innerHTML = `<div class="container header-inner pop-header"><a class="brand" href="index.html" aria-label="ぽっぽー トップページ"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-navigation" aria-label="メニューを開く">☰</button><nav class="nav" id="main-navigation" aria-label="メインナビゲーション">${navItems.map(([n,u])=>`<a href="${u}" ${navCurrent===u?'aria-current="page"':""}>${n}</a>`).join("")}</nav></div>`;
  const btn = header.querySelector(".menu-toggle"), nav = header.querySelector(".nav");
  const setMenu=(open)=>{nav.classList.toggle("open",open);btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰";btn.setAttribute("aria-label",open?"メニューを閉じる":"メニューを開く");};
  btn.addEventListener("click",()=>setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click",e=>{if(e.target.closest("a"))setMenu(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("open")){setMenu(false);btn.focus()}});
  window.addEventListener("resize",()=>{if(window.innerWidth>1100)setMenu(false)});
}
const footer = document.querySelector("#site-footer");
if (footer) footer.innerHTML = `<div class="container pop-footer"><div class="footer-grid"><div><a class="brand" href="index.html"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><p>「好き」を配信に。「個性」を輝きに。<br>一人ひとりの個性と、自分らしい配信活動を応援します。</p></div><div><strong>CONTENTS</strong><div class="footer-links"><a href="about.html">コミュニティについて</a><a href="talents.html">参加メンバー</a><a href="schedule.html">配信スケジュール</a><a href="news.html">お知らせ</a></div></div><div><strong>INFORMATION</strong><div class="footer-links"><a href="audition.html">コミュニティ参加について</a><a href="contact.html">お問い合わせ</a><a href="policy.html">プライバシー・サイトポリシー</a></div></div></div><div class="pop-footer-bottom"><a href="index.html">TOP ↑</a><div class="copyright">© ${new Date().getFullYear()} 架空事務所 ぽっぽー. All rights reserved.</div></div></div>`;

async function loadData(file){try{const r=await fetch(file,{cache:"no-cache"});if(!r.ok)throw new Error("data");const data=await r.json();return Array.isArray(data)?data:[]}catch(e){return []}}
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
 const url=key=>{try{const u=new URL(s[key]);return u.protocol==="https:"?u.href:""}catch{return ""}};
 const link=(el,href,label)=>{const a=document.createElement("a");a.className="pop-link";a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label;el.append(a)};
 if(current==="audition.html"){
 set(".audition-lead p","joinIntro");
 const list=document.querySelector(".audition-checklist");if(list&&s.requirements?.trim()){list.replaceChildren(...s.requirements.split(/\r?\n/).filter(v=>v.trim()).map(v=>{const li=document.createElement("li");li.textContent=v;return li}))}
 const href=url("applicationUrl"),box=document.querySelector(".audition-status");if(href&&box){const p=document.createElement("p");p.textContent="参加申込みは下記の外部窓口からご確認ください。";box.replaceChildren(p);link(box,href,"応募窓口へ");const faq=document.querySelector(".pop-faq details:last-child p");if(faq)faq.textContent="参加申込みの詳細は下記の応募窓口をご確認ください。";const intro=document.querySelector(".audition-application>p");if(intro)intro.textContent="募集の詳細・応募手順は応募窓口をご確認ください。"}
 }
 if(current==="contact.html"){const href=url("contactUrl"),box=document.querySelector(".contact-status");if(href&&box){const p=document.createElement("p");p.textContent="お問い合わせは下記の外部窓口をご利用ください。";box.replaceChildren(p);link(box,href,"お問い合わせ窓口へ");const intro=document.querySelector(".contact-intro p");if(intro)intro.textContent="コミュニティへのお問い合わせは、受付窓口をご利用ください。";const caution=document.querySelector(".contact-caution p");if(caution)caution.textContent="個人情報や非公開情報を公開投稿などに送らないようご注意ください。"}}
 set(".pop-footer .footer-grid>div:first-child p","footerText");
})();
