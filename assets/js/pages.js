(async()=>{
 const [talents,news,schedule]=await Promise.all([
  loadData("data/talents.json"),loadData("data/news.json"),loadData("data/schedule.json")
 ]);
 const unavailable=(el,label,back="")=>{
 if(!el)return;el.replaceChildren();
 const box=document.createElement("div");box.className="empty-state";box.setAttribute("role","status");
 const title=document.createElement("strong");title.textContent=label+"を取得できませんでした。";
 const message=document.createElement("p");message.textContent="通信状況をご確認のうえ、もう一度お試しください。";
 const retry=document.createElement("button");retry.type="button";retry.className="btn secondary";retry.textContent="再読み込み";retry.addEventListener("click",()=>location.reload());
 box.append(title,message,retry);
 if(back){const link=document.createElement("a");link.className="text-link";link.href=back;link.textContent="一覧へ戻る →";const p=document.createElement("p");p.append(link);box.append(p)}
 el.append(box);
 };
 const markUnavailable=(target,kind,label,back="")=>{
 if(!target||!datasetFailed("data/"+kind+".json"))return false;
 unavailable(target,label,back);
 return true;
 };
 const published=a=>(Array.isArray(a)?a:[]).filter(x=>x&&x.published===true);
 const dateLabel=d=>d?escapeHtml(d.replaceAll("-","/")):"";
 const todayJST=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 const validDay=d=>{if(typeof d!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const parsed=new Date(d+"T00:00:00Z");return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===d};
 const updateSummary=(id,kind,value)=>{
  const el=document.getElementById(id);if(!el)return;
  el.textContent=datasetFailed("data/"+kind+".json")?"取得できません":value;
 };
 updateSummary("home-summary-members","talents",published(talents).length+"名");
 updateSummary("home-summary-today","schedule",published(schedule).filter(s=>validDay(s.date)&&s.date===todayJST).length+"件");
 updateSummary("home-summary-news","news",published(news).length+"件");

 const safeExternalLink=value=>{try{if(!value)return "";const u=new URL(value,location.href);return ["http:","https:"].includes(u.protocol)?u.href:""}catch{return ""}};
 const cohortBadges=t=>{const values=Array.isArray(t.cohort)?t.cohort:(t.cohort?[t.cohort]:[]);return values.filter(Boolean).map(v=>`<span class="pill cohort-pill">${escapeHtml(v)}</span>`).join("")};
 const roleBadges=t=>{const values=Array.isArray(t.roles)?t.roles:(t.roles?[t.roles]:[]);return values.filter(Boolean).map(v=>`<span class="pill role-pill">${escapeHtml(v)}</span>`).join("")};
 const cohorts=t=>Array.isArray(t.cohort)?t.cohort:t.cohort?[t.cohort]:[];
 const roles=t=>(Array.isArray(t.roles)?t.roles:t.roles?[t.roles]:[]).filter(v=>typeof v==="string"&&v.trim());
 const sectionVisible=(t,key)=>!Array.isArray(t.hiddenSections)||!t.hiddenSections.includes(key);
 const publicStatus=t=>sectionVisible(t,"activity")&&typeof t.activityStatus==="string"?t.activityStatus.trim():"";
 const searchText=v=>String(v??"").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-96)).trim();
 const memberSearch=t=>searchText([t.name,t.catchphrase,...cohorts(t),...roles(t),...(Array.isArray(t.tags)?t.tags:[]),sectionVisible(t,"bio")?t.bio:"",sectionVisible(t,"facts")?t.affiliationAgency:"",sectionVisible(t,"personality")?[t.hobbies,t.skills,t.likes,t.favoriteFood,t.favoriteWorks].join(" "):"",publicStatus(t)].join(" "));
 const attachMemberFallback=container=>container.querySelectorAll(".pop-member-art img").forEach(img=>{
 const fallback=()=>{if(!img.isConnected)return;const node=document.createElement("span");node.className="pop-member-placeholder";node.setAttribute("aria-hidden","true");node.textContent=img.alt?.slice(0,1)||"P";img.replaceWith(node)};
 img.addEventListener("error",fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback();
 });
 const memberVisual=t=>{const candidates=sectionVisible(t,"gallery")?[...(Array.isArray(t.avatarImages)?t.avatarImages:[t.avatarImages]),t.avatarImage,t.iconImage]:[t.iconImage];return candidates.map(safeExternalLink).find(Boolean)||""};
 const memberColor=t=>/^#[0-9a-f]{6}$/i.test(t.imageColor||"")?t.imageColor:"#666666";
 const talentCard=t=>{const src=memberVisual(t),badges=cohortBadges(t)+roleBadges(t),status=publicStatus(t);return `<article class="card talent-card pop-member-card" style="--member-color:${memberColor(t)}"><a class="pop-member-link" href="talent.html?id=${encodeURIComponent(t.id)}"><div class="talent-art pop-member-art">${src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(t.name)}" loading="lazy">`:`<span class="pop-member-placeholder" aria-hidden="true">${escapeHtml(t.emoji||t.name?.slice(0,1)||"P")}</span>`}<span class="pop-member-arrow" aria-hidden="true">↗</span></div><div class="card-body">${badges?`<div class="talent-badges">${badges}</div>`:""}<h3>${escapeHtml(t.name)}</h3>${status?`<span class="pop-member-status">${escapeHtml(status)}</span>`:""}${t.catchphrase?`<p>${escapeHtml(t.catchphrase)}</p>`:""}<span class="pop-member-more">VIEW PROFILE →</span></div></a></article>`};
 const newsMemberIds=n=>Array.isArray(n.memberIds)?n.memberIds.filter(id=>typeof id==="string"&&id):[];
 const relatedNews=(items,id)=>published(items).filter(n=>newsMemberIds(n).includes(id)).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
 const newsImage=n=>/^assets\/images\/news\/[A-Za-z0-9_-]+\.(png|jpg|webp|gif)$/.test(n.thumbnailImage||"")?n.thumbnailImage:"";
 const newsCard=n=>`<article class="card article-card news-card">${newsImage(n)?`<a class="pop-news-image" href="news-detail.html?id=${encodeURIComponent(n.id)}" aria-label="${escapeHtml(n.title)}"><img src="${escapeHtml(newsImage(n))}" alt="" loading="lazy"></a>`:""}<div class="card-body"><div class="news-meta"><time class="small" datetime="${escapeHtml(n.date||"")}">${dateLabel(n.date)}</time><span class="pill">${escapeHtml(n.category||"INFORMATION")}</span></div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.summary||"")}</p><p class="card-action"><a class="text-link" href="news-detail.html?id=${encodeURIComponent(n.id)}">記事を読む →</a></p></div></article>`;
 const heroColors=document.querySelector("#home-member-colors");
 if(heroColors){const colors=[...new Set(published(talents).map(t=>typeof t.imageColor==="string"&&/^#[0-9a-f]{6}$/i.test(t.imageColor)?t.imageColor.toLowerCase():"").filter(Boolean))];heroColors.replaceChildren(...colors.map(color=>{const span=document.createElement("span");span.style.setProperty("--identity-color",color);return span}));heroColors.hidden=!colors.length;}
 const featured=document.querySelector("#home-featured");
 const home=featured?(await loadData("data/home.json")).find(x=>x?.published===true):null;
 if(home){const set=(selector,value)=>{const el=document.querySelector(selector);if(el&&typeof value==="string"&&value.trim())el.textContent=value};const h=document.querySelector(".pop-hero-copy h1");if(h&&(home.headline1||home.headline2)){const span=h.querySelector("span");if(home.headline1&&h.firstChild?.nodeType===3)h.firstChild.textContent=home.headline1;if(span&&home.headline2)span.textContent=home.headline2}set(".pop-hero-copy p",home.lead);set(".pop-about-grid p",home.aboutText);set(".pop-join h2",home.joinText);for(const key of ["News","Schedule","Members","About","Join"])if(home["hide"+key]===true){const el=document.querySelector(".pop-"+key.toLowerCase());if(el)el.style.display="none"}if(home.notice?.trim()){const p=document.createElement("p");p.className="container pop-home-notice";p.textContent=home.notice;document.querySelector(".pop-hero").after(p)}}
 const heroImage=home&&/^assets\/images\/home\/[A-Za-z0-9_-]+\.(png|jpg|webp|gif)$/.test(home.heroImage||"")?home.heroImage:"";
 if(featured&&heroImage){const label=document.querySelector(".pop-stage-label");if(label)label.textContent="POPPŌ / MAIN VISUAL";const img=document.createElement("img");img.src=heroImage;img.alt="ぽっぽー メインビジュアル";img.className="pop-custom-hero";img.addEventListener("error",()=>{img.src="assets/image/poppoo-icon.png";img.alt="ぽっぽー公式アイコン";img.classList.remove("pop-custom-hero");if(label)label.textContent="POPPŌ / COMMUNITY"},{once:true});featured.replaceChildren(img)}
 if(featured&&!heroImage){const ids=Array.isArray(home?.featuredIds)?home.featuredIds:[];const list=published(talents).filter(t=>!ids.length||ids.includes(t.id));if(!list.length){const label=document.querySelector(".pop-stage-label");if(label)label.textContent="POPPŌ / COMMUNITY"}if(list.length){let index=0;featured.classList.add("pop-spotlight");featured.innerHTML='<div class="pop-spotlight-visual"></div><div class="pop-spotlight-controls"><button type="button" aria-label="前のメンバー">←</button><span aria-live="polite"></span><button type="button" aria-label="次のメンバー">→</button></div>';const visual=featured.querySelector(".pop-spotlight-visual"),counter=featured.querySelector(".pop-spotlight-controls span"),buttons=featured.querySelectorAll("button");const render=()=>{const t=list[index];visual.style.setProperty("--member-color",memberColor(t));const src=memberVisual(t);visual.innerHTML='<a href="talent.html?id='+encodeURIComponent(t.id)+'">'+(src?'<img src="'+escapeHtml(src)+'" alt="'+escapeHtml(t.name)+'">':'<span class="pop-spotlight-fallback" aria-hidden="true">'+escapeHtml(t.emoji||t.name?.slice(0,1)||"P")+'</span>')+'<div class="pop-spotlight-name">'+cohortBadges(t)+roleBadges(t)+'<strong>'+escapeHtml(t.name)+'</strong><span>VIEW PROFILE →</span></div></a>';counter.textContent=(index+1)+" / "+list.length+" ・ "+(t.name||"");visual.querySelector("img")?.addEventListener("error",e=>{const replacement=document.createElement("span");replacement.className="pop-spotlight-fallback";replacement.textContent=t.name?.slice(0,1)||"P";e.target.replaceWith(replacement)})};buttons[0].onclick=()=>{index=(index+list.length-1)%list.length;render()};buttons[1].onclick=()=>{index=(index+1)%list.length;render()};buttons.forEach(b=>b.disabled=list.length<2);render()}}
 if(datasetFailed("data/talents.json")){const controls=document.querySelector("#home-member-controls");if(controls)controls.hidden=true;}
 const tg=document.querySelector("#talent-grid");
 if(tg&&!markUnavailable(tg,"talents","参加メンバー情報")){
 const q=document.querySelector("#talent-search"),filter=document.querySelector("#cohort-filter"),role=document.querySelector("#role-filter"),activity=document.querySelector("#activity-filter"),genre=document.querySelector("#genre-filter"),sort=document.querySelector("#member-sort"),reset=document.querySelector("#member-reset"),count=document.querySelector("#member-count"),active=document.querySelector("#member-active-filters"),viewButtons=[...document.querySelectorAll("[data-member-view]")],all=published(talents);
 const memberTags=t=>(Array.isArray(t.tags)?t.tags:[]).filter(v=>typeof v==="string"&&v.trim());
 const options=(el,values)=>{if(el)[...new Set(values.filter(v=>typeof v==="string"&&v.trim()))].sort((a,b)=>a.localeCompare(b,"ja",{numeric:true})).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.append(o)})};
 options(filter,all.flatMap(cohorts));options(role,all.flatMap(roles));options(activity,all.map(publicStatus));options(genre,all.flatMap(memberTags));
 const fields=[["q",q,"検索"],["cohort",filter,"期生"],["role",role,"役職"],["status",activity,"活動状況"],["genre",genre,"ジャンル"],["sort",sort,"表示順"]];
 const params=new URLSearchParams(location.search);let view=params.get("view")==="list"?"list":"grid";
 for(const [key,el] of fields){const value=params.get(key);if(!el||value===null)continue;if(el.tagName==="SELECT"){if([...el.options].some(o=>o.value===value))el.value=value}else el.value=value}
 const updateUrl=()=>{try{const url=new URL(location.href);for(const [key,el] of fields){if(!el)continue;const value=el.value.trim();if(value&&value!=="default")url.searchParams.set(key,value);else url.searchParams.delete(key)}if(view==="list")url.searchParams.set("view","list");else url.searchParams.delete("view");if(url.href!==location.href)history.replaceState(history.state,"",url.href)}catch{}};
 const rank=t=>Math.min(Infinity,...cohorts(t).map(v=>{const m=String(v).match(/^(\d+)期生$/);return m?Number(m[1]):Infinity}));
 const directoryCard=t=>{const tags=memberTags(t).slice(0,3);const card=talentCard(t);return tags.length?card.replace('<span class="pop-member-more">','<div class="member-card-genres">'+tags.map(tag=>'<span>'+escapeHtml(tag)+'</span>').join("")+'</div><span class="pop-member-more">'):card};
 const render=()=>{
 const terms=searchText(q?.value||"").split(/\s+/).filter(Boolean),group=filter?.value||"",job=role?.value||"",state=activity?.value||"",tag=genre?.value||"";
 const list=all.filter(t=>(!group||cohorts(t).includes(group))&&(!job||roles(t).includes(job))&&(!state||publicStatus(t)===state)&&(!tag||memberTags(t).includes(tag))&&terms.every(v=>memberSearch(t).includes(v)));
 if(sort?.value==="name")list.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"ja"));
 if(sort?.value==="cohort")list.sort((a,b)=>rank(a)-rank(b)||0);
 if(sort?.value==="joined")list.sort((a,b)=>(validDay(b.joinDate)?b.joinDate:"").localeCompare(validDay(a.joinDate)?a.joinDate:""));
 if(count)count.textContent=list.length+"名 / 公開メンバー "+all.length+"名";
 tg.classList.toggle("member-list-view",view==="list");
 viewButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.memberView===view)));
 if(active){active.replaceChildren();for(const [key,el,label] of fields){if(!el||!el.value.trim()||el.value==="default")continue;const b=document.createElement("button");b.type="button";b.className="member-filter-chip";const value=el.tagName==="SELECT"?el.selectedOptions[0]?.textContent:el.value;b.textContent=label+"："+value+" ×";b.setAttribute("aria-label",label+"の条件を解除");b.onclick=()=>{el.value=key==="sort"?"default":"";render();el.focus()};active.append(b)}active.hidden=!active.childElementCount}
 tg.innerHTML=list.length?list.map(directoryCard).join(""):'<div class="empty-state">'+(all.length?"条件に一致するメンバーはいません。検索条件を変更してください。":"参加メンバーの紹介は準備中です。")+'</div>';
 attachMemberFallback(tg);updateUrl();
 };
 q?.addEventListener("input",render);[filter,role,activity,genre,sort].forEach(el=>el?.addEventListener("change",render));
 viewButtons.forEach(b=>b.addEventListener("click",()=>{view=b.dataset.memberView==="list"?"list":"grid";render()}));
 reset?.addEventListener("click",()=>{if(q)q.value="";[filter,role,activity,genre].forEach(el=>{if(el)el.value=""});if(sort)sort.value="default";render();q?.focus()});
 render();
 }
 const homeT=document.querySelector("#home-talents");if(homeT&&!markUnavailable(homeT,"talents","参加メンバー情報")){const list=published(talents),limit=8;homeT.innerHTML=list.length?list.slice(0,limit).map(talentCard).join(""):'<div class="empty-state">参加メンバー情報は準備中です。公開準備が整い次第、こちらでご紹介します。</div>';const count=document.querySelector("#home-member-preview-count"),more=document.querySelector("#home-members-more");if(count&&list.length){count.textContent=Math.min(list.length,limit)+"名 / 公開メンバー "+list.length+"名";count.hidden=false}if(more)more.hidden=list.length<=limit}
 if(homeT)homeT.querySelectorAll(".pop-member-art img").forEach(img=>{const fallback=()=>{const node=document.createElement("span");node.className="pop-member-placeholder";node.setAttribute("aria-hidden","true");node.textContent=img.alt?.slice(0,1)||"P";img.replaceWith(node)};img.addEventListener("error",fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback()});
 const rail=document.querySelector("#home-talents");if(rail&&!datasetFailed("data/talents.json")){const controls=document.querySelector("#home-member-controls");if(controls){const buttons=controls.querySelectorAll("button");const move=dir=>rail.scrollBy({left:dir*rail.clientWidth*.8,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});buttons[0].onclick=()=>move(-1);buttons[1].onclick=()=>move(1);const update=()=>{buttons[0].disabled=rail.scrollLeft<2;buttons[1].disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2};rail.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);update()}}
 const fillOptions=(el,values)=>{if(el)[...new Set(values.filter(v=>typeof v==="string"&&v.trim()))].sort((a,b)=>a.localeCompare(b,"ja")).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.append(o)})};
 const nl=document.querySelector("#news-list");
 if(nl&&!markUnavailable(nl,"news","お知らせ")){
 const all=published(news).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))),cat=document.querySelector("#news-category"),q=document.querySelector("#news-search"),year=document.querySelector("#news-year"),sort=document.querySelector("#news-sort"),count=document.querySelector("#news-count"),more=document.querySelector("#news-more"),pagination=document.querySelector("#news-pagination"),reset=document.querySelector("#news-reset");
 const isHome=Boolean(document.querySelector(".renewal-home")),pageSize=9;let limit=isHome?3:pageSize;
 const memberFilter=document.querySelector("#news-member"),params=new URLSearchParams(location.search),requested=params.get("member");
 const linkedMembers=published(talents).filter(t=>all.some(n=>newsMemberIds(n).includes(t.id))||t.id===requested);
 if(memberFilter){for(const t of linkedMembers){const o=document.createElement("option");o.value=t.id;o.textContent=t.name;memberFilter.append(o)}if(linkedMembers.some(t=>t.id===requested))memberFilter.value=requested;}
 const yearOf=n=>/^\d{4}-\d{2}-\d{2}$/.test(n.date||"")?n.date.slice(0,4):"";
 fillOptions(cat,all.map(n=>n.category||"INFORMATION"));fillOptions(year,all.map(yearOf));
 const render=()=>{
 const terms=searchText(q?.value||"").split(/\s+/).filter(Boolean);
 const list=all.filter(n=>(!memberFilter?.value||newsMemberIds(n).includes(memberFilter.value))&&(!cat?.value||(n.category||"INFORMATION")===cat.value)&&(!year?.value||yearOf(n)===year.value)&&terms.every(term=>searchText([n.title,n.summary,n.body,n.category].join(" ")).includes(term)));
 if(sort?.value==="old")list.reverse();
 if(count)count.textContent=list.length+"件中 "+Math.min(limit,list.length)+"件を表示";
 nl.innerHTML=list.length?list.slice(0,limit).map((n,i)=>isHome&&i===0?newsCard(n).replace('class="card article-card news-card"','class="card article-card news-card home-news-latest"'):newsCard(n)).join(""):'<div class="empty-state">'+(all.length?"条件に一致するお知らせはありません。":"現在、お知らせはありません。")+'</div>';
 if(pagination)pagination.hidden=list.length<=limit;
 };
 const changed=()=>{limit=isHome?3:pageSize;render()};
 [cat,year,sort,memberFilter].forEach(el=>el?.addEventListener("change",changed));q?.addEventListener("input",changed);
 reset?.addEventListener("click",()=>{[cat,q,year,memberFilter].forEach(el=>{if(el)el.value=""});if(sort)sort.value="new";changed();q?.focus()});
 more?.addEventListener("click",()=>{limit+=pageSize;render()});render();
 }
 const sl=document.querySelector("#schedule-list");
 const scheduleMember=s=>{
 const all=published(talents);
 if(s.memberId)return all.find(t=>t.id===s.memberId)||null;
 const matches=all.filter(t=>t.name===s.talent);return matches.length===1?matches[0]:null;
 };
 if(sl&&!markUnavailable(sl,"schedule","配信予定")){
 const all=published(schedule).filter(s=>validDay(s.date)&&s.date>=todayJST).sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||"").localeCompare(String(b.time||"")));
 const member=document.querySelector("#schedule-member"),day=document.querySelector("#schedule-day"),platform=document.querySelector("#schedule-platform"),q=document.querySelector("#schedule-search"),count=document.querySelector("#schedule-count"),reset=document.querySelector("#schedule-reset"),buttons=[...document.querySelectorAll(".schedule-period [data-period]")],weekStrip=document.querySelector("#schedule-week-strip"),active=document.querySelector("#schedule-active-filters");
 const name=s=>scheduleMember(s)?.name||s.talent||"参加メンバー";
 const memberKey=s=>s.memberId?"id:"+s.memberId:(scheduleMember(s)?"id:"+scheduleMember(s).id:"name:"+name(s));
 const media=s=>s.platform||"REALITY";
 const options=new Map(all.map(s=>[memberKey(s),name(s)]));
 for(const t of published(talents))if(t.id&&!options.has("id:"+t.id))options.set("id:"+t.id,t.name||t.id);
 if(member){[...options.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"ja")).forEach(([key,label])=>{const o=document.createElement("option");o.value=key;o.textContent=label;member.append(o)});}
 const dateOffset=n=>new Date(Date.parse(todayJST+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
 const tomorrow=dateOffset(1),endDay=dateOffset(6),weekDays=Array.from({length:7},(_,i)=>dateOffset(i));
 fillOptions(day,[...weekDays,...all.map(s=>s.date)]);fillOptions(platform,all.map(media));
 const params=new URLSearchParams(location.search);
 let period=day&&["all","today","tomorrow","week"].includes(params.get("period"))?params.get("period"):"all";
 const selected=params.get("member"),memberValue=selected?(selected.startsWith("name:")||selected.startsWith("id:")?selected:"id:"+selected):"";
 if(member&&options.has(memberValue))member.value=memberValue;
 if(day&&[...day.options].some(o=>o.value===params.get("day"))&&params.get("day")){day.value=params.get("day");period="all"}
 if(platform&&[...platform.options].some(o=>o.value===params.get("platform")))platform.value=params.get("platform");
 if(q)q.value=params.get("q")||"";
 const updateUrl=()=>{if(!day)return;try{const u=new URL(location.href),m=member?.value||"",values={member:m.startsWith("id:")?m.slice(3):m,day:day.value,platform:platform?.value||"",q:q?.value.trim()||"",period:period==="all"?"":period};for(const [key,value] of Object.entries(values)){if(value)u.searchParams.set(key,value);else u.searchParams.delete(key)}if(u.href!==location.href)history.replaceState(history.state,"",u.href)}catch{}};
 const dayTitle=d=>dateLabel(d)+"（"+"日月火水木金土"[new Date(d+"T00:00:00Z").getUTCDay()]+"）";
 const row=s=>{const url=safeExternalLink(s.url||""),t=scheduleMember(s),color=t?memberColor(t):"#666666",time=String(s.time||"");return '<article class="schedule-item" style="--schedule-member-color:'+color+'"><div class="schedule-date">'+""+'<span class="schedule-time">'+escapeHtml(time||"時間未定")+'</span></div><div class="schedule-program"><div class="schedule-title">'+escapeHtml(s.title||"配信")+'</div><div class="schedule-meta">'+(t?'<a href="talent.html?id='+encodeURIComponent(t.id)+'">'+escapeHtml(name(s))+'</a>':escapeHtml(name(s)))+' <span class="schedule-platform-label">'+escapeHtml(media(s))+'</span></div></div>'+(url?'<a class="schedule-link" href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">配信ページを見る ↗</a>':'<span class="schedule-link-pending">配信先リンク未登録</span>')+'</article>'};
 const render=()=>{
 const terms=searchText(q?.value||"").split(/\s+/).filter(Boolean);
 const matching=all.filter(s=>(!member?.value||memberKey(s)===member.value)&&(!platform?.value||media(s)===platform.value)&&terms.every(term=>searchText([s.title,name(s),media(s)].join(" ")).includes(term)));
 const list=matching.filter(s=>(period==="all"||period==="today"&&s.date===todayJST||period==="tomorrow"&&s.date===tomorrow||period==="week"&&s.date<=endDay)&&(!day?.value||s.date===day.value));
 if(count)count.textContent=list.length+"件 / 今後の公開予定 "+all.length+"件";
 buttons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.period===period&&!day?.value)));
 if(weekStrip){weekStrip.replaceChildren();weekStrip.hidden=false;for(const d of weekDays){const b=document.createElement("button");b.type="button";b.className="schedule-week-day";const n=matching.filter(s=>s.date===d).length;const label=d===todayJST?"今日":d===tomorrow?"明日":"日月火水木金土"[new Date(d+"T00:00:00Z").getUTCDay()]+"曜";const small=document.createElement("span");small.textContent=label;const date=document.createElement("strong");date.textContent=Number(d.slice(5,7))+"/"+Number(d.slice(8));const total=document.createElement("span");total.textContent=n+"件";b.append(small,date,total);b.setAttribute("aria-label",dayTitle(d)+" "+n+"件");b.setAttribute("aria-pressed",String(day?.value===d||!day?.value&&(period==="today"&&d===todayJST||period==="tomorrow"&&d===tomorrow)));b.onclick=()=>{period="all";if(day)day.value=d;render();weekStrip.children[weekDays.indexOf(d)]?.focus()};weekStrip.append(b)}}
 if(active){active.replaceChildren();for(const [el,label] of [[member,"メンバー"],[day,"日付"],[platform,"媒体"],[q,"検索"]]){if(!el?.value.trim())continue;const b=document.createElement("button");b.type="button";b.className="schedule-filter-chip";b.textContent=label+"："+(el.tagName==="SELECT"?el.selectedOptions[0]?.textContent:el.value)+" ×";b.setAttribute("aria-label",label+"の条件を解除");b.onclick=()=>{el.value="";render();el.focus()};active.append(b)}active.hidden=!active.childElementCount}
 updateUrl();
 if(!list.length){sl.innerHTML='<div class="empty-state">'+(all.length?"条件に一致する配信予定はありません。":"現在、掲載中の配信予定はありません。")+'</div>';return}
 if(!day){const upcoming=list.slice(0,5);sl.innerHTML=[...new Set(upcoming.map(s=>s.date))].map(d=>{const items=upcoming.filter(s=>s.date===d);return '<section class="home-schedule-day"><h3><time datetime="'+escapeHtml(d)+'">'+dayTitle(d)+'</time>'+(d===todayJST?' <span>本日</span>':d===tomorrow?' <span>明日</span>':"")+'</h3>'+items.map(row).join("")+'</section>'}).join("");return}
 sl.innerHTML=[...new Set(list.map(s=>s.date))].map(d=>{const items=list.filter(s=>s.date===d);return '<section class="pop-day-group"><h3><time datetime="'+escapeHtml(d)+'">'+dayTitle(d)+'</time>'+(d===todayJST?' <span>本日</span>':d===tomorrow?' <span>明日</span>':"")+'<small class="schedule-group-count">'+items.length+'件</small></h3>'+items.map(row).join("")+'</section>'}).join("");
 };
 buttons.forEach(b=>b.addEventListener("click",()=>{period=b.dataset.period;if(day)day.value="";render()}));
 [member,day,platform].forEach(el=>el?.addEventListener("change",()=>{if(el===day&&day.value)period="all";render()}));q?.addEventListener("input",render);
 reset?.addEventListener("click",()=>{period="all";[member,day,platform,q].forEach(el=>{if(el)el.value=""});render();q?.focus()});render();
 }
 const profile=document.querySelector("#talent-profile");
 if(profile&&!markUnavailable(profile,"talents","プロフィール","talents.html")){
  const id=publicDetailId();
  const t=published(talents).find(x=>x.id===id);
  if(t){
   setDetailCanonical("talents",t.id);
   const palette=applyMemberPalette(profile,t.imageColor);profile.classList.add("member-themed");document.title=t.name+" | MEMBERS | 架空事務所 ぽっぽー";
   const hidden=new Set(Array.isArray(t.hiddenSections)?t.hiddenSections:[]);
   const visible=(key,html)=>hidden.has(key)?"":html;
   const hasProfileValue=value=>typeof value==="string"?value.trim().length>0:Boolean(value);
   const tags=(Array.isArray(t.tags)?t.tags:[]).filter(hasProfileValue);
   const links=(Array.isArray(t.links)?t.links:[]).filter(l=>l&&typeof l==="object").map(l=>({label:hasProfileValue(l.label)?l.label:"公式リンク",url:safeExternalLink(l.url)})).filter(l=>l.url);
   const avatarList=[...new Set((Array.isArray(t.avatarImages)?t.avatarImages:t.avatarImages?[t.avatarImages]:[]).map(safeExternalLink).filter(Boolean))];
   if(!avatarList.length&&t.avatarImage){const legacy=safeExternalLink(t.avatarImage);if(legacy)avatarList.push(legacy)}
   const avatar=sectionVisible(t,"gallery")?avatarList[0]||"":"",icon=safeExternalLink(t.iconImage||"");
   
   const facts=[["所属事務所・所属先",t.affiliationAgency],["誕生日",t.birthday],["REALITYデビュー日",t.debutDate?dateLabel(t.debutDate):""],["ぽっぽー加入日",t.joinDate?dateLabel(t.joinDate):""],...(Array.isArray(t.anniversaries)?t.anniversaries:t.anniversary?[{date:t.anniversary,title:"活動記念日"}]:[]).filter(x=>x&&x.title&&x.date).map(x=>[x.title,x.date]),["身長",t.height],["血液型",t.bloodType]].filter(x=>hasProfileValue(x[1]));
   const anniversarySection=nextAnniversaryEvents(anniversaryRecords([t],[]).filter(e=>e.id===t.id),todayJST).map(e=>{const remaining=Math.round((Date.parse(e.date)-Date.parse(todayJST))/86400000);return '<section class="profile-section profile-anniversary"><span class="eyebrow">ANNIVERSARY</span><h2>次の'+escapeHtml(e.label)+'</h2><div class="anniversary-countdown"><strong>'+remaining+'</strong><span>日後</span><p>'+escapeHtml(e.title)+' ・ '+escapeHtml(e.date.replaceAll("-","/"))+'</p></div><a class="text-link" href="anniversary.html?member='+encodeURIComponent(t.id)+'&amp;month='+e.date.slice(0,7)+'">記念日カレンダーへ →</a></section>'}).join("");
   const personality=[["趣味",t.hobbies],["特技",t.skills],["好きなもの",t.likes],["苦手なもの",t.dislikes],["好きな食べ物",t.favoriteFood],["好きな作品・ジャンル",t.favoriteWorks]].filter(x=>hasProfileValue(x[1]));
   const fan=[["ファンネーム",t.fanName],["推しマーク",t.oshiMark],["配信タグ",t.streamTag],["ファンアートタグ",t.fanArtTag]].filter(x=>hasProfileValue(x[1]));
   const factSection=(eyebrow,title,items,klass="")=>items.length?'<section class="profile-section '+klass+'"><span class="eyebrow">'+eyebrow+'</span><h2>'+title+'</h2><dl class="talent-facts">'+items.map(([label,value])=>'<div class="talent-fact"><dt>'+escapeHtml(label)+'</dt><dd>'+escapeHtml(value).replace(/\r?\n/g,"<br>")+'</dd></div>').join("")+'</dl></section>':"";
   const textSection=(eyebrow,title,value,klass="")=>hasProfileValue(value)?'<section class="profile-section '+klass+'"><span class="eyebrow">'+eyebrow+'</span><h2>'+title+'</h2><p>'+escapeHtml(value).replace(/\r?\n/g,"<br>")+'</p></section>':"";
   const activity=[["活動状況",t.activityStatus],["定期配信",t.regularSchedule],["活動目標",t.activityGoal]].filter(x=>hasProfileValue(x[1]));
   const achievements=publicActivityRecords([t]);
   const achievementSection=achievements.length?'<section class="profile-section" id="activity-achievements"><span class="eyebrow">ACHIEVEMENTS</span><h2>活動実績</h2><div class="profile-achievements">'+achievements.map(x=>'<article class="profile-achievement">'+(x.date?'<time>'+escapeHtml(x.date)+'</time>':"")+'<h3>'+escapeHtml(x.title)+'</h3>'+(x.description?'<p>'+escapeHtml(x.description)+'</p>':"")+'</article>').join("")+'</div><a class="text-link" href="activity.html?member='+encodeURIComponent(t.id)+'">このメンバーの活動実績を見る →</a></section>':"";
   const uniqueName=published(talents).filter(m=>m.name===t.name).length===1;
   const talentSchedule=published(schedule).filter(s=>(s.memberId?s.memberId===t.id:uniqueName&&s.talent===t.name)&&validDay(s.date)&&s.date>=todayJST).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")).slice(0,6);
   const scheduleHref="schedule.html?member="+encodeURIComponent(t.id),newsHref="news.html?member="+encodeURIComponent(t.id);
   const scheduleSection='<section class="profile-section profile-schedule"><span class="eyebrow">SCHEDULE</span><h2>配信スケジュール</h2>'+(datasetFailed("data/schedule.json")?'<p>配信予定を取得できませんでした。</p>':talentSchedule.length?'<div class="profile-schedule-list">'+talentSchedule.map(s=>{const url=safeExternalLink(s.url||"");return '<article class="profile-schedule-item"><time datetime="'+escapeHtml(s.date)+'">'+dateLabel(s.date)+'</time><strong>'+escapeHtml(s.time||"時間未定")+'</strong><div>'+escapeHtml(s.title||"配信")+'<small class="profile-schedule-platform">'+escapeHtml(s.platform||"REALITY")+'</small></div>'+(url?'<a href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">配信を見る ↗</a>':"")+'</article>'}).join("")+'</div>':'<p class="profile-related-empty">現在、掲載中の配信予定はありません。</p>')+'<a class="text-link" href="'+scheduleHref+'">このメンバーの配信予定をすべて見る →</a></section>';
   const memberNews=relatedNews(news,t.id);
   const newsSection='<section class="profile-section profile-news"><span class="eyebrow">NEWS</span><h2>関連ニュース</h2>'+(datasetFailed("data/news.json")?'<p>関連ニュースを取得できませんでした。</p>':memberNews.length?'<div class="profile-related-news-grid">'+memberNews.slice(0,3).map(newsCard).join("")+'</div>':'<p class="profile-related-empty">現在、関連ニュースはありません。</p>')+'<a class="text-link" href="'+newsHref+'">このメンバーのお知らせをすべて見る →</a></section>';
   const credit=[["キャラクターデザイン",t.illustrator],["Live2Dモデラー",t.modeler]].filter(x=>hasProfileValue(x[1]));
   const lookbook=avatarList.length>0?'<section class="profile-section avatar-lookbook"><span class="eyebrow">AVATAR LOOKBOOK</span><h2>アバターギャラリー</h2><p class="lookbook-intro">衣装やビジュアルのバリエーションをご紹介します。</p><div class="avatar-lookbook-grid">'+avatarList.map((src,i)=>'<a class="avatar-lookbook-item" href="'+escapeHtml(src)+'" target="_blank" rel="noopener noreferrer" aria-label="'+escapeHtml(t.name)+'のアバター画像 '+(i+1)+' を大きく表示"><img src="'+escapeHtml(src)+'" alt="'+escapeHtml(t.name)+' アバター '+(i+1)+'" loading="lazy"><span>LOOK '+String(i+1).padStart(2,"0")+'</span></a>').join("")+'</div></section>':"";
   const publishedMembers=published(talents),memberIndex=publishedMembers.findIndex(x=>x.id===t.id);
   const previousMember=memberIndex>0?publishedMembers[memberIndex-1]:null;
   const nextMember=memberIndex>=0&&memberIndex<publishedMembers.length-1?publishedMembers[memberIndex+1]:null;
   const memberNavigation=previousMember||nextMember?'<nav class="profile-member-nav" aria-label="メンバー切り替え">'+(previousMember?'<a class="profile-member-link previous" href="talent.html?id='+encodeURIComponent(previousMember.id)+'"><span>← PREVIOUS</span><strong>'+escapeHtml(previousMember.name)+'</strong></a>':'<span></span>')+(nextMember?'<a class="profile-member-link next" href="talent.html?id='+encodeURIComponent(nextMember.id)+'"><span>NEXT →</span><strong>'+escapeHtml(nextMember.name)+'</strong></a>':'<span></span>')+'</nav>':"";
   profile.innerHTML='<article class="talent-profile-card"><div class="profile-top"><div class="profile-avatar">'+(avatar?'<button class="profile-image-open" type="button" data-lightbox-src="'+escapeHtml(avatar)+'" aria-label="アバター画像を拡大"><img class="talent-avatar-image" src="'+escapeHtml(avatar)+'" alt="'+escapeHtml(t.name)+'のアバター" loading="lazy"><span>画像を拡大</span></button>':icon?'<button class="profile-image-open" type="button" data-lightbox-src="'+escapeHtml(icon)+'" aria-label="プロフィール画像を拡大"><img class="talent-avatar-image" src="'+escapeHtml(icon)+'" alt="'+escapeHtml(t.name)+'のプロフィールアイコン" loading="lazy"><span>画像を拡大</span></button>':'<span class="pop-member-placeholder" aria-hidden="true">'+escapeHtml(t.emoji||t.name?.slice(0,1)||"P")+'</span>')+'</div><div class="profile-intro">'+(cohortBadges(t)+roleBadges(t)?'<div class="talent-badges">'+cohortBadges(t)+roleBadges(t)+'</div>':"")+'<div class="profile-identity-label"><span class="profile-identity-dot" aria-hidden="true"></span>MEMBER PROFILE</div><h1>'+escapeHtml(t.name)+'</h1>'+(publicStatus(t)?'<span class="pop-member-status">'+escapeHtml(publicStatus(t))+'</span>':"")+(hasProfileValue(t.catchphrase)?'<p class="lead">'+escapeHtml(t.catchphrase)+'</p>':"")+(hasProfileValue(t.greeting)?'<p class="talent-greeting">'+escapeHtml(t.greeting).replace(/\r?\n/g,"<br>")+'</p>':"")+(typeof t.imageColor==="string"&&/^#[0-9a-f]{6}$/i.test(t.imageColor)?'<div class="profile-color-label"><span class="profile-color-swatch" aria-hidden="true"></span><span>イメージカラー <strong>'+escapeHtml(palette.base.toUpperCase())+'</strong></span></div>':"")+''+visible("links",links.length?'<div class="actions profile-quick-links" aria-label="公式リンク">'+links.slice(0,3).map(l=>'<a class="btn secondary" href="'+escapeHtml(l.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(l.label)+' ↗</a>').join("")+'</div>':"")+'<div class="profile-utility" id="profile-share"></div></div></div><div class="profile-details">'+visible("bio",textSection("ABOUT","自己紹介",t.bio))+visible("facts",factSection("PROFILE","プロフィール",facts)+anniversarySection)+visible("personality",factSection("PERSONALITY","好きなもの・趣味",personality))+visible("fan",factSection("FAN INFORMATION","ファン情報",fan,"fan-information"))+visible("gallery",lookbook)+visible("activity",textSection("ACTIVITY","活動情報",activity.map(x=>x[0]+"："+x[1]).join("\n"),"activity-information"))+visible("achievements",achievementSection)+(tags.length?'<section class="profile-section"><span class="eyebrow">ACTIVITY GENRE</span><h2>活動ジャンル</h2><div class="tag-row">'+tags.map(x=>'<span class="pill">'+escapeHtml(x)+'</span>').join("")+'</div></section>':"")+visible("schedule",scheduleSection)+visible("news",newsSection)+visible("message",textSection("MESSAGE","本人からのメッセージ",t.message,"talent-message"))+visible("credit",factSection("CREDIT","クリエイター",credit))+ visible("links",(links.length?'<section class="profile-section profile-links"><span class="eyebrow">OFFICIAL LINKS</span><h2>公式リンク</h2><div class="actions">'+links.map(l=>'<a class="btn secondary" href="'+escapeHtml(l.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(l.label)+' ↗</a>').join("")+'</div></section>':""))+'</div>'+memberNavigation+'<a class="text-link profile-back" href="talents.html">← 参加メンバー一覧へ戻る</a></article><div class="profile-lightbox" id="profile-lightbox" hidden role="dialog" aria-modal="true" aria-label="画像プレビュー"><button type="button" class="profile-lightbox-close" aria-label="閉じる">×</button><img src="" alt=""></div>';
   const sections=[...profile.querySelectorAll(".profile-details > .profile-section")];
   const sectionIds=new Map();
   sections.forEach(section=>{if(section.id)return;const key=(section.querySelector(".eyebrow")?.textContent||"section").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"section";const count=(sectionIds.get(key)||0)+1;sectionIds.set(key,count);section.id="profile-"+key+(count>1?"-"+count:"")});
   if(sections.length>1){const nav=document.createElement("nav");nav.className="profile-index";nav.setAttribute("aria-label","プロフィール内メニュー");nav.innerHTML='<span>CONTENTS</span>'+sections.map((section,i)=>'<a href="#'+section.id+'">'+escapeHtml(section.querySelector("h2")?.textContent||"項目"+(i+1))+'</a>').join("");profile.querySelector(".profile-top").after(nav)}
   const lightbox=profile.querySelector("#profile-lightbox"),lightboxImage=lightbox.querySelector("img");
   let lastFocus=null;const openLightbox=src=>{lastFocus=document.activeElement;lightboxImage.src=src;lightboxImage.alt=t.name+"の画像";lightbox.hidden=false;document.body.classList.add("lightbox-open");lightbox.querySelector("button").focus()};
   const closeLightbox=()=>{lightbox.hidden=true;lightboxImage.removeAttribute("src");document.body.classList.remove("lightbox-open");lastFocus?.focus();lastFocus=null};
   profile.addEventListener("click",e=>{const trigger=e.target.closest("[data-lightbox-src]");if(trigger)openLightbox(trigger.dataset.lightboxSrc);const gallery=e.target.closest(".avatar-lookbook-item");if(gallery){e.preventDefault();openLightbox(gallery.href)}if(e.target.closest(".profile-lightbox-close")||e.target===lightbox)closeLightbox()});
   document.addEventListener("keydown",e=>{if(lightbox.hidden)return;if(e.key==="Escape"){e.preventDefault();closeLightbox()}else if(e.key==="Tab"){e.preventDefault();lightbox.querySelector("button").focus()}});
   if(location.hash){const key=location.hash.slice(1),legacy=/^profile-section-(\d+)$/.exec(key);const target=legacy?sections[Number(legacy[1])-1]:sections.find(section=>section.id===key);if(target)requestAnimationFrame(()=>target.scrollIntoView({block:"start",behavior:"instant"}));}
   mountPublicShare(profile.querySelector("#profile-share"),{page:"talent.html",id:t.id,title:t.name+" | 架空事務所 ぽっぽー",label:"プロフィールをシェア"});

  }else{const robots=document.createElement("meta");robots.name="robots";robots.content="noindex,follow";document.head.append(robots);profile.innerHTML='<div class="empty-state profile-empty"><span class="eyebrow">PROFILE</span><h1>プロフィールは準備中です</h1><p>お探しのプロフィールは、まだ公開されていないか、掲載を終了しています。</p><a class="btn secondary" href="talents.html">参加メンバー一覧へ戻る</a></div>'}
 }
 for(const [kind,ids] of [["talents",["cohort-filter","talent-search","role-filter","activity-filter","genre-filter","member-sort","member-reset"]],["news",["news-category","news-search","news-year","news-sort","news-reset","news-more","news-member"]],["schedule",["schedule-member","schedule-day","schedule-platform","schedule-search","schedule-reset"]]]){
 if(datasetFailed("data/"+kind+".json")){for(const id of ids){const el=document.getElementById(id);if(el)el.disabled=true;}if(kind==="schedule")document.querySelectorAll(".schedule-period button").forEach(b=>b.disabled=true);}
 }
 const article=document.querySelector("#news-detail");
 if(article&&!markUnavailable(article,"news","記事","news.html")){
 const id=publicDetailId(),all=published(news).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))),n=all.find(x=>x.id===id);
 if(n){
 setDetailCanonical("news",n.id);
 document.title=n.title+" | NEWS | 架空事務所 ぽっぽー";
 const index=all.indexOf(n),newer=all[index-1],older=all[index+1],category=n.category||"INFORMATION";
 const related=all.filter(x=>x.id!==id&&(x.category||"INFORMATION")===category).slice(0,3);
 const linked=published(talents).filter(t=>newsMemberIds(n).includes(t.id));
 const linkedSection=linked.length?'<section class="news-linked-members"><h2>関連メンバー</h2><div class="news-linked-grid">'+linked.map(t=>'<a href="talent.html?id='+encodeURIComponent(t.id)+'">'+escapeHtml(t.name)+' →</a>').join("")+'</div></section>':"";
 const articleLink=(x,label)=>x?'<a href="news-detail.html?id='+encodeURIComponent(x.id)+'"><small>'+label+'</small><strong>'+escapeHtml(x.title)+'</strong></a>':'<span></span>';
 const body=String(n.body||"").split(/\r?\n/).map(line=>line?"<p>"+escapeHtml(line)+"</p>":"").join("");
 article.innerHTML='<article class="detail-article news-detail-article"><div class="news-detail-heading"><span class="eyebrow">'+escapeHtml(category)+'</span><time datetime="'+escapeHtml(n.date||"")+'">'+dateLabel(n.date)+'</time></div><h1>'+escapeHtml(n.title)+'</h1>'+(newsImage(n)?'<img class="pop-news-cover" src="'+escapeHtml(newsImage(n))+'" alt="">':"")+(n.summary?'<p class="detail-summary">'+escapeHtml(n.summary)+'</p>':"")+'<div class="prose news-prose">'+body+'</div>'+linkedSection+'<div class="news-detail-footer"><div id="news-share"></div><a class="text-link" href="news.html">← お知らせ一覧へ戻る</a></div></article>'+(newer||older?'<nav class="news-neighbor-nav" aria-label="前後の記事">'+articleLink(newer,"← 新しい記事")+articleLink(older,"古い記事 →")+'</nav>':"")+(related.length?'<section class="news-related"><span class="eyebrow">RELATED NEWS</span><h2>同じカテゴリーのお知らせ</h2><div class="cards news-related-grid">'+related.map(newsCard).join("")+'</div></section>':"");
 mountPublicShare(article.querySelector("#news-share"),{page:"news-detail.html",id:n.id,title:n.title+" | 架空事務所 ぽっぽー",label:"記事をシェア"});
 }else {const robots=document.createElement("meta");robots.name="robots";robots.content="noindex,follow";document.head.append(robots);article.innerHTML='<div class="empty-state news-detail-empty"><span class="eyebrow">NEWS</span><h1>記事が見つかりませんでした</h1><p>記事が公開されていないか、掲載を終了している可能性があります。</p><a class="btn secondary" href="news.html">お知らせ一覧へ戻る</a></div>';}
 }
})();
