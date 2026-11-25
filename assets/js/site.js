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

async function loadData(file){try{const r=await fetch(file);if(!r.ok)throw new Error("data");return await r.json()}catch(e){return []}}
function cardTalent(t){return `<article class="card"><div class="talent-art">${t.emoji||"🐦"}</div><div class="card-body"><h3>${escapeHtml(t.name)}</h3><p>${escapeHtml(t.catchphrase||t.bio||"プロフィール準備中です。")}</p><p style="margin-top:14px"><a class="text-link" href="talent.html?id=${encodeURIComponent(t.id)}">プロフィールを見る →</a></p></div></article>`}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
