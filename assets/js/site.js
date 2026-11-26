const navItems = [
 ["メンバー","talents.html"],["配信予定","schedule.html"],["お知らせ","news.html"],["ぽっぽーについて","about.html"],["参加案内","audition.html"]
];
const pageFile=location.pathname.split("/").pop()||"index.html";
const shareRoute=pageFile.match(/^share-(member|news)-([A-Za-z0-9_-]+)\.html$/);
const current=shareRoute?(shareRoute[1]==="member"?"talent.html":"news-detail.html"):pageFile;
const publicDetailId=()=>shareRoute?shareRoute[2]:new URLSearchParams(location.search).get("id");
const navCurrent = ({ "talent.html":"talents.html", "news-detail.html":"news.html" })[current] || current;
const sharedStyle=document.createElement("link");sharedStyle.rel="stylesheet";sharedStyle.href="assets/css/shared-renewal.css";document.head.append(sharedStyle);
const mainContent=document.querySelector("main");
if(current!=="admin.html"){const theme=document.querySelector('meta[name="theme-color"]');if(theme)theme.content="#f6f6f6";}
if(mainContent){
 if(!mainContent.id)mainContent.id="main-content";
 mainContent.setAttribute("tabindex","-1");
 const skip=document.createElement("a");skip.className="pop-skip-link";skip.href="#"+mainContent.id;skip.textContent="本文へ移動";
 document.body.prepend(skip);
}
const header = document.querySelector("#site-header");
if (header) {
  header.innerHTML = `<div class="container header-inner pop-header"><a class="brand" href="index.html" aria-label="ぽっぽー トップページ"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><a class="pop-search-link" href="search.html" aria-label="サイト内検索" title="サイト内検索" ${current==="search.html"?'aria-current="page"':""}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>検索</span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-navigation" aria-label="メニューを開く">☰</button><nav class="nav" id="main-navigation" aria-label="メインナビゲーション">${navItems.map(([n,u])=>`<a href="${u}" ${navCurrent===u?'aria-current="page"':u==="talents.html"&&["anniversary.html","activity.html"].includes(current)?'aria-current="location"':""}>${n}</a>`).join("")}</nav></div>`;
  const btn = header.querySelector(".menu-toggle"), nav = header.querySelector(".nav");
  const setMenu=(open)=>{nav.classList.toggle("open",open);btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰";btn.setAttribute("aria-label",open?"メニューを閉じる":"メニューを開く");};
  btn.addEventListener("click",()=>setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click",e=>{if(e.target.closest("a"))setMenu(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("open")){setMenu(false);btn.focus()}});
  const desktop=matchMedia("(min-width:1001px)");
  desktop.addEventListener("change",()=>setMenu(false));
  const syncHeaderHeight=()=>document.documentElement.style.setProperty("--public-header-height",Math.ceil(header.getBoundingClientRect().height)+"px");
  syncHeaderHeight();if(typeof ResizeObserver==="function"){const observer=new ResizeObserver(syncHeaderHeight);observer.observe(header)}else window.addEventListener("resize",syncHeaderHeight,{passive:true});
  document.addEventListener("pointerdown",e=>{if(!header.contains(e.target)&&nav.classList.contains("open"))setMenu(false)});
  header.addEventListener("focusout",e=>{if(e.relatedTarget&&!header.contains(e.relatedTarget))setMenu(false)});
  const updateHeader=()=>header.classList.toggle("pop-header-scrolled",window.scrollY>12);
  window.addEventListener("scroll",updateHeader,{passive:true});updateHeader();
}
const footer = document.querySelector("#site-footer");
if (footer) footer.innerHTML = `<div class="container pop-footer"><div class="footer-grid"><div><a class="brand" href="index.html"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><p>「好き」を配信に。「個性」を輝きに。<br>一人ひとりの個性と、自分らしい配信活動を応援します。</p></div><div><strong>CONTENTS</strong><div class="footer-links"><a href="about.html">コミュニティについて</a><a href="talents.html">参加メンバー</a><a href="schedule.html">配信スケジュール</a><a href="anniversary.html">記念日カレンダー</a><a href="activity.html">メンバーの活動実績</a><a href="news.html">お知らせ</a></div></div><div><strong>INFORMATION</strong><div class="footer-links"><a href="audition.html">コミュニティ参加について</a><a href="contact.html">お問い合わせ</a><a href="search.html">サイト内検索</a><a href="policy.html">プライバシー・サイトポリシー</a></div></div></div><div class="pop-footer-bottom"><button type="button" class="pop-back-top">ページ上部へ <span aria-hidden="true">↑</span></button><div class="copyright">© ${new Date().getFullYear()} 架空事務所 ぽっぽー. All rights reserved.</div></div></div>`;

if(footer){footer.querySelector(".pop-back-top")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}));footer.querySelectorAll(".footer-links a").forEach(a=>{if(a.getAttribute("href")===navCurrent)a.setAttribute("aria-current","page")})}

const previewData=(()=>{try{if(window.parent===window||!new URLSearchParams(location.search).has("cmsPreview"))return null;const frame=window.frameElement;if(!frame||frame.id!=="cms-preview-frame"||!window.parent.location.pathname.endsWith("/admin.html"))return null;const snapshot=JSON.parse(sessionStorage.getItem("poppoo-cms-preview")||"null");return snapshot&&typeof snapshot==="object"?snapshot:null}catch{return null}})();
if(previewData){const note=document.createElement("div");note.textContent="公開前プレビュー（ブラウザー内の編集データ）";note.style.cssText="padding:10px;background:#282828;color:white;text-align:center;font-size:13px";document.body.prepend(note);document.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&!a.getAttribute("href")?.startsWith("#"))e.preventDefault()},true)}
// Static Open Graph detail pages. The CMS uses the same generator at publication.
const SHARE_BASE="https://rinseishirasu.github.io/poppoo-official/";
// Participation is independent of editing ownership. Legacy schedules remain readable.
function scheduleParticipantIds(s,members=[]){
 const ids=Array.isArray(s?.memberIds)?s.memberIds:s?.memberId?[s.memberId]:[];
 const valid=[...new Set(ids.filter(id=>typeof id==="string"&&/^[A-Za-z0-9_-]+$/.test(id)))];
 if(valid.length||Array.isArray(s?.memberIds)||s?.memberId)return valid;
 const matches=members.filter(t=>t?.id&&t.name===s?.talent);return matches.length===1?[matches[0].id]:[];
}
function scheduleGuestUrl(value){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:""}catch{return ""}}
function scheduleGuests(s){return (Array.isArray(s?.guests)?s.guests:[]).filter(g=>g&&typeof g.name==="string"&&g.name.trim()).map(g=>({name:g.name.trim(),url:scheduleGuestUrl(g.url)}))}
function scheduleFormat(s){return s?.format==="collab"||scheduleParticipantIds(s).length+scheduleGuests(s).length>1?"collab":"solo"}
function scheduleParticipants(s,members=[],publicOnly=true){
 const ids=scheduleParticipantIds(s,members),people=ids.map(id=>members.find(t=>t?.id===id)).filter(t=>t&&(!publicOnly||t.published===true)).map(t=>({id:t.id,name:t.name||t.id,url:""}));
 if(!ids.length&&!s?.memberId&&!Array.isArray(s?.memberIds)&&typeof s?.talent==="string"&&s.talent.trim()&&!members.some(t=>t?.name===s.talent))people.push({id:"",name:s.talent.trim(),url:""});
 return [...people,...scheduleGuests(s).map(g=>({...g,id:"",guest:true}))];
}
function scheduleIsPublic(s,members=[]){return s?.published===true&&scheduleParticipants(s,members).some(p=>!p.guest)}
function scheduleParticipantError(s,members){
 if(s.memberIds===undefined&&s.guests===undefined&&s.format===undefined)return "";
 if(!Array.isArray(s.memberIds)||!s.memberIds.length||s.memberIds.some(id=>typeof id!=="string"||!/^[A-Za-z0-9_-]+$/.test(id))||new Set(s.memberIds).size!==s.memberIds.length||s.memberId!==s.memberIds[0])return "参加メンバーを1名以上選択してください。";
 if(members&&s.memberIds.some(id=>!members.some(t=>t?.id===id)))return "登録済みの参加メンバーを選択してください。";
 if(!Array.isArray(s.guests)||s.guests.some(g=>!g||typeof g.name!=="string"||!g.name.trim()||typeof g.url!=="string"||g.url&&!scheduleGuestUrl(g.url)))return "外部コラボ相手の活動名・公式リンクを確認してください。";
 const total=s.memberIds.length+s.guests.length;
 if(!["solo","collab"].includes(s.format)||s.format==="solo"&&total!==1||s.format==="collab"&&total<2)return "ソロ配信は1名、コラボ配信は合計2名以上を登録してください。";
 if(s.scheduleSource==="member"&&s.format==="collab")return "コラボ配信は運営管理で登録してください。";
 return "";
}

// Read old profiles without rewriting their saved data or exposing hidden legacy fields.
function normalizedMemberProfile(t){
 if(!t||typeof t!=="object")return t;
 const hidden=new Set(Array.isArray(t.hiddenSections)?t.hiddenSections:[]);
 const value=v=>typeof v==="string"?v.trim():"";
 const combine=items=>{const seen=new Set();return items.filter(([v])=>{const s=value(v);if(!s||seen.has(s))return false;seen.add(s);return true}).map(([v,label])=>label?label+"："+value(v):value(v)).join("\n\n")};
 const images=(Array.isArray(t.avatarImages)?t.avatarImages:[t.avatarImages]).filter(v=>typeof v==="string"&&v.trim());
 const avatarImages=[...new Set(images.length||t.profileFormat===2?images:[value(t.avatarImage)].filter(Boolean))];
 if(t.profileFormat===2)return {...t,avatarImages};
 const bio=combine([[t.bio,""],[t.greeting,"配信の挨拶"],[hidden.has("message")?"":t.message,""],[hidden.has("activity")?"":t.activityGoal,"活動目標"],[hidden.has("personality")?"":t.skills,"特技"],[hidden.has("credit")?"":t.illustrator,"キャラクターデザイン"],[hidden.has("credit")?"":t.modeler,"Live2Dモデラー"]]);
 const likes=combine([[t.likes,""],[t.hobbies,"趣味"],[t.favoriteFood,"好きな食べ物"],[t.favoriteWorks,"好きな作品"]]);
 return {...t,bio,likes,avatarImages};
}

// Static search metadata. Only published detail pages enter the sitemap.
const SEO_PUBLIC_PAGES=["","about.html","talents.html","schedule.html","anniversary.html","activity.html","news.html","audition.html","contact.html","policy.html"];
function sitemapXml(talents,news){
 const paths=new Set(SEO_PUBLIC_PAGES);
 for(const [kind,items] of [["talents",talents],["news",news]])for(const item of Array.isArray(items)?items:[]){
 if(item?.published!==true||typeof (kind==="talents"?item.name:item.title)!=="string"||!(kind==="talents"?item.name:item.title).trim())continue;
 const path=shareDetailPath(kind,item.id);if(path)paths.add(path);
 }
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...paths].map(p=>"<url><loc>"+SHARE_BASE+p+"</loc></url>").join("\n")+"\n</urlset>\n";
}
function jsonLd(value){return JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")}
function organizationSchema(){return {"@type":"Organization","@id":SHARE_BASE+"#community",name:"架空事務所 ぽっぽー",url:SHARE_BASE,logo:SHARE_BASE+"assets/image/poppoo-icon.png",description:"REALITYを中心に活動する配信者コミュニティ"}}
function homepageSeo(html,settings){
 const s=(Array.isArray(settings)?settings:[]).find(x=>x?.published===true)||{};
 const text=(v,defaultValue,max)=>typeof v==="string"&&v.trim()?v.trim().replace(/\s+/g," ").slice(0,max):defaultValue;
 const title=text(s.seoTitle,"架空事務所 ぽっぽー | REALITY配信者コミュニティ公式サイト",100),desc=text(s.seoDescription,"架空事務所 ぽっぽーは、REALITYを中心に活動する配信者コミュニティです。参加メンバー、配信予定、活動実績、記念日、お知らせを掲載しています。",180);
 const image=typeof s.seoImage==="string"&&/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(s.seoImage)&&!s.seoImage.split("/").includes("..")?SHARE_BASE+s.seoImage:SHARE_BASE+"assets/image/poppoo-icon.png";
 const e=v=>String(v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 let out=html.replace(/<title>[\s\S]*?<\/title>/i,()=>"<title>"+e(title)+"</title>");
 for(const [key,value] of [["description",desc],["og:title",title],["og:description",desc],["og:image",image],["twitter:title",title],["twitter:description",desc],["twitter:image",image],["twitter:card",image===SHARE_BASE+"assets/image/poppoo-icon.png"?"summary":"summary_large_image"]]){
 const re=new RegExp('<meta\\s+(?:name|property)="'+key+'"\\s+content="[^"]*"\\s*/?>',"i");
 if(!re.test(out))throw Error("TOPのSEOタグが見つかりません: "+key);
 out=out.replace(re,()=>'<meta '+(key.startsWith("og:")?"property":"name")+'="'+key+'" content="'+e(value)+'">');
 }
 const schema='<script type="application/ld+json" id="pop-home-schema">'+jsonLd({"@context":"https://schema.org","@graph":[organizationSchema(),{"@type":"WebSite","@id":SHARE_BASE+"#website",name:"架空事務所 ぽっぽー",url:SHARE_BASE,publisher:{"@id":SHARE_BASE+"#community"},inLanguage:"ja"}]})+'</script>';
 return /<script type="application\/ld\+json" id="pop-home-schema">[\s\S]*?<\/script>/.test(out)?out.replace(/<script type="application\/ld\+json" id="pop-home-schema">[\s\S]*?<\/script>/,()=>schema):out.replace("</head>",()=>schema+"\n</head>");
}
function setDetailCanonical(kind,id){
 const path=shareDetailPath(kind,id);if(!path||previewData)return;
 let tag=document.querySelector('link[rel="canonical"]');if(!tag){tag=document.createElement("link");tag.rel="canonical";document.head.append(tag)}tag.href=SHARE_BASE+path;
}
function shareDetailPath(kind,id){
 if(!["talents","news"].includes(kind)||typeof id!=="string"||!/^[A-Za-z0-9_-]+$/.test(id))return "";
 return "share-"+(kind==="talents"?"member":"news")+"-"+id+".html";
}
function sharePageHtml(kind,item){
 const path=shareDetailPath(kind,item?.id);
 if(!path||item.published!==true)return null;
 const member=kind==="talents",name=String(member?item.name:item.title||"").trim();
 if(!name)return null;
 const title=name+" | 架空事務所 ぽっぽー",description=member?item.catchphrase:item.summary,defaultDesc=member?"架空事務所 ぽっぽーの参加メンバー、"+name+"のプロフィールです。":"架空事務所 ぽっぽーからのお知らせです。",desc=(typeof description==="string"&&description.trim()?description:defaultDesc).replace(/\s+/g," ").trim().slice(0,180);
 const hidden=Array.isArray(item.hiddenSections)&&item.hiddenSections.includes("gallery");
 const avatars=member?normalizedMemberProfile(item).avatarImages:[];
 const candidates=member?[...(!hidden?avatars:[]),item.iconImage]:[item.thumbnailImage];
 const imagePath=candidates.find(x=>typeof x==="string"&&/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(x)&&!x.split("/").includes(".."))||"assets/image/poppoo-icon.png";
 const url=SHARE_BASE+path,image=SHARE_BASE+imagePath;
 const e=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const meta=(key,value,property=false)=>'<meta '+(property?"property":"name")+'="'+key+'" content="'+e(value)+'">';
 const heading=member?"MEMBERS":"NEWS",list=member?"talents.html":"news.html",detail=member?"talent-profile":"news-detail",klass=member?"pop-profile":"pop-info pop-news-detail";
 const person={"@type":"Person",name,identifier:item.id,url,...(imagePath!=="assets/image/poppoo-icon.png"?{image}:{}),...(item.catchphrase?{description:String(item.catchphrase)}:{})};
 const schema=member?{"@context":"https://schema.org","@type":"ProfilePage",url,mainEntity:person,inLanguage:"ja"}:{"@context":"https://schema.org","@type":"Article",headline:name,description:desc,url,mainEntityOfPage:url,publisher:organizationSchema(),...(imagePath!=="assets/image/poppoo-icon.png"?{image}:{}),...(typeof item.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&Number.isFinite(Date.parse(item.date))&&new Date(item.date).toISOString().slice(0,10)===item.date?{datePublished:item.date}:{}),inLanguage:"ja"};
 const structured='<script type="application/ld+json">'+jsonLd(schema)+'</script>';
 const tags=[meta("description",desc),meta("og:title",title,true),meta("og:description",desc,true),meta("og:type",member?"website":"article",true),meta("og:url",url,true),meta("og:image",image,true),meta("og:image:alt",imagePath==="assets/image/poppoo-icon.png"?"ぽっぽー公式アイコン":name+"の掲載画像",true),meta("og:site_name","架空事務所 ぽっぽー",true),meta("og:locale","ja_JP",true),meta("twitter:card",member||imagePath==="assets/image/poppoo-icon.png"?"summary":"summary_large_image"),meta("twitter:title",title),meta("twitter:description",desc),meta("twitter:image",image),meta("twitter:image:alt",imagePath==="assets/image/poppoo-icon.png"?"ぽっぽー公式アイコン":name+"の掲載画像")].join("\n");
 return {path,content:'<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f6f6"><title>'+e(title)+'</title>\n'+tags+'\n'+structured+'\n<link rel="canonical" href="'+e(url)+'"><link rel="icon" href="assets/image/poppoo-icon.png"><link rel="stylesheet" href="assets/css/style.css"><link rel="stylesheet" href="assets/css/renewal.css"></head><body><header id="site-header"></header><main class="'+klass+'"><section class="page-hero detail-breadcrumb"><div class="container"><div class="breadcrumbs"><a href="index.html">TOP</a> / <a href="'+list+'">'+heading+'</a></div></div></section><section class="content"><div class="container"><div id="'+detail+'"><article class="detail-article"><h1>'+e(name)+'</h1><p>'+e(desc)+'</p><p class="small">詳細情報を読み込み中...</p><noscript><p>詳しい情報を表示するにはJavaScriptを有効にしてください。</p></noscript></article></div></div></section></main><footer id="site-footer" class="site-footer"></footer><script src="assets/js/site.js"></script><script src="assets/js/pages.js"></script></body></html>\n'};
}
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
 const allowed=["index.html","talents.html","talent.html","news.html","news-detail.html","schedule.html","anniversary.html","activity.html","about.html","audition.html"];
 if(!allowed.includes(page))return;
 const url=new URL(page,"https://rinseishirasu.github.io/poppoo-official/");
 if(page==="index.html")url.pathname="/poppoo-official/";
 if(id&&["talent.html","news-detail.html"].includes(page)){const path=shareDetailPath(page==="talent.html"?"talents":"news",id);if(path)url.pathname="/poppoo-official/"+path;else url.searchParams.set("id",id)}
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
// Consistent share controls on the main public landing and listing pages.
const sharePageTitles={"index.html":"架空事務所 ぽっぽー 公式サイト","talents.html":"参加メンバー | 架空事務所 ぽっぽー","news.html":"お知らせ | 架空事務所 ぽっぽー","schedule.html":"配信スケジュール | 架空事務所 ぽっぽー","anniversary.html":"記念日カレンダー | 架空事務所 ぽっぽー","activity.html":"メンバーの活動実績 | 架空事務所 ぽっぽー","about.html":"コミュニティについて | 架空事務所 ぽっぽー","audition.html":"参加案内 | 架空事務所 ぽっぽー"};
if(sharePageTitles[current]&&mainContent&&window.parent===window&&!new URLSearchParams(location.search).has("cmsPreview")){
 const section=document.createElement("section");section.className="container pop-page-share-wrap";
 const disclosure=document.createElement("details");disclosure.className="pop-page-share-disclosure";const summary=document.createElement("summary");summary.textContent="このページをシェア";const target=document.createElement("div");disclosure.append(summary,target);section.append(disclosure);mainContent.append(section);
 mountPublicShare(target,{page:current,title:sharePageTitles[current]});
}
// Annual dates from visible public profile fields and published site settings.
function anniversaryRecords(talents,settings){
 const records=[],seen=new Set();
 const add=(value,kind,label,name,id)=>{
 if(typeof value!=="string"||typeof label!=="string"||!label.trim())return;
 const m=value.trim().match(/^(?:(\d{4})(?:年|[-/]))?(\d{1,2})(?:月|[-/])(\d{1,2})日?$/);if(!m)return;
 const year=m[1]?Number(m[1]):null,month=Number(m[2]),day=Number(m[3]),check=new Date(Date.UTC(year||2000,month-1,day));
 if(month<1||month>12||day<1||check.getUTCMonth()!==month-1||check.getUTCDate()!==day||year!==null&&(year<1900||year>9998))return;
 const key=[id,kind,month,day,label].join("|");if(seen.has(key))return;seen.add(key);
 records.push({kind,label,name,id,month,day,year:kind==="birthday"?null:year,href:id?"talent.html?id="+encodeURIComponent(id):"about.html#about-overview"});
 };
 for(const t of Array.isArray(talents)?talents:[]){
 if(!t||t.published!==true||typeof t.id!=="string"||!/^[A-Za-z0-9_-]+$/.test(t.id)||typeof t.name!=="string"||!t.name.trim()||(Array.isArray(t.hiddenSections)&&t.hiddenSections.includes("facts")))continue;
 add(t.birthday,"birthday","誕生日",t.name,t.id);add(t.debutDate,"debut","デビュー周年",t.name,t.id);add(t.joinDate,"join","加入周年",t.name,t.id);
 const extra=Array.isArray(t.anniversaries)?t.anniversaries:[];for(const a of extra)if(a)add(a.date,"other",a.title,t.name,t.id);
 if(!extra.length)add(t.anniversary,"other","活動記念日",t.name,t.id);
 }
 const config=(Array.isArray(settings)?settings:[]).find(x=>x?.published===true);
 add(typeof config?.founded==="string"&&config.founded.trim()?config.founded:"2026年11月23日","community","設立記念日","ぽっぽー","");
 return records;
}
function anniversaryOccurrence(record,year){
 if(record.year!==null&&year<record.year+Number(["debut","join","community"].includes(record.kind)))return null;
 const d=new Date(Date.UTC(year,record.month-1,record.day));
 if(d.getUTCMonth()!==record.month-1||d.getUTCDate()!==record.day)return null;
 return {...record,date:d.toISOString().slice(0,10),title:record.name+"の"+(record.year!==null&&["debut","join","community"].includes(record.kind)?(record.kind==="debut"?"デビュー":record.kind==="join"?"加入":"設立")+(year-record.year)+"周年":record.label)};
}
function nextAnniversaryEvents(records,today){
 const start=Number(today.slice(0,4)),out=[];
 for(const record of records)for(let year=Math.max(start,record.year||start);year<=Math.max(start,record.year||start)+8&&year<10000;year++){const event=anniversaryOccurrence(record,year);if(event&&event.date>=today){out.push(event);break}}
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name,"ja"));
}
// Shared public activity records: preserve existing CMS fields and visibility.
function activityDateKey(value){
 const raw=typeof value==="string"?value.trim():"",m=raw.match(/^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?$/);
 if(!m)return "";
 const y=Number(m[1]),month=m[2]?Number(m[2]):1,day=m[3]?Number(m[3]):1;
 if(y<1900||y>9998||month<1||month>12||day<1)return "";
 const d=new Date(Date.UTC(y,month-1,day));if(d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return "";
 return m[1]+(m[2]?"-"+String(month).padStart(2,"0"):"-00")+(m[3]?"-"+String(day).padStart(2,"0"):"-00");
}
function publicActivityRecords(talents){
 const rows=[];
 for(const t of Array.isArray(talents)?talents:[]){
 if(!t||t.published!==true||typeof t.id!=="string"||!/^[A-Za-z0-9_-]+$/.test(t.id)||typeof t.name!=="string"||!t.name.trim()||t.hiddenSections?.includes?.("achievements"))continue;
 for(const a of Array.isArray(t.achievements)?t.achievements:[]){
 if(!a||typeof a.title!=="string"||!a.title.trim())continue;
 const date=typeof a.date==="string"?a.date.trim():"";
 rows.push({memberId:t.id,name:t.name,title:a.title.trim(),description:typeof a.description==="string"?a.description.trim():"",date,dateKey:activityDateKey(date),href:"talent.html?id="+encodeURIComponent(t.id)+"#activity-achievements"});
 }
 }
 return rows.sort((a,b)=>b.dateKey.localeCompare(a.dateKey)||a.name.localeCompare(b.name,"ja"));
}
// Default order follows the explicitly agreed initial management team.
const DEFAULT_MANAGEMENT_IDS=["itsumin","yu_zi_n_pecorino","dondoko","rinsei_shirasu"];
function managementMembers(talents,settings){
 const config=(Array.isArray(settings)?settings:[]).find(x=>x?.published===true);
 const ids=Array.isArray(config?.managementIds)?config.managementIds:DEFAULT_MANAGEMENT_IDS;
 const members=(Array.isArray(talents)?talents:[]).filter(t=>t?.published===true&&typeof t.id==="string"&&/^[A-Za-z0-9_-]+$/.test(t.id)&&typeof t.name==="string"&&t.name.trim());
 return [...new Set(ids)].map(id=>members.find(t=>t.id===id)).filter(Boolean);
}
// Member palette: retain the exact registered color for decoration; derive readable text.
function memberPalette(value){
 const base=typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():"#666666";
 const rgb=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16));
 const hex=v=>"#"+v.map(n=>Math.round(n).toString(16).padStart(2,"0")).join("");
 const mix=(target,f)=>rgb.map((n,i)=>Math.round(n*(1-f)+target[i]*f));
 const luminance=v=>v.map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
 const soft=mix([255,255,255],.88),surface=mix([255,255,255],.96),border=mix([255,255,255],.68);
 // Use the darkest required variant across white and the most saturated text background.
 const backgroundL=Math.min(luminance(soft),luminance(surface)),contrast=v=>(backgroundL+.05)/(luminance(v)+.05);
 let ink=rgb.slice();
 for(let i=1;contrast(ink)<4.5&&i<=20;i++)ink=mix([0,0,0],i/20);
 return {base,soft:hex(soft),surface:hex(surface),border:hex(border),ink:hex(ink),strong:hex(mix([0,0,0],.18))};
}
function applyMemberPalette(el,value){
 const p=memberPalette(value);
 for(const [key,color] of Object.entries(p))el.style.setProperty("--member-"+(key==="base"?"color":key),color);
 return p;
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
function cardTalent(t){return `<article class="card"><div class="talent-art">${escapeHtml(t.name?.slice(0,1)||"P")}</div><div class="card-body"><h3>${escapeHtml(t.name)}</h3><p>${escapeHtml(t.catchphrase||(!t.hiddenSections?.includes?.("bio")?normalizedMemberProfile(t).bio:"")||"プロフィール準備中です。")}</p><p style="margin-top:14px"><a class="text-link" href="talent.html?id=${encodeURIComponent(t.id)}">プロフィールを見る →</a></p></div></article>`}
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
