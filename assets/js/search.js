(() => {
"use strict";
const labels={member:"メンバー",news:"ニュース",schedule:"配信予定",anniversary:"記念日",info:"基本情報"};
const normalize=value=>String(value??"").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-96)).trim();
const text=value=>typeof value==="string"?value.trim():"";
const strings=value=>Array.isArray(value)?value.filter(x=>typeof x==="string"):typeof value==="string"?[value]:[];
const visible=(t,key)=>!Array.isArray(t.hiddenSections)||!t.hiddenSections.includes(key);
const published=items=>(Array.isArray(items)?items:[]).filter(x=>x&&x.published===true);
const validId=id=>typeof id==="string"&&/^[A-Za-z0-9_-]+$/.test(id);
const validDate=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
function nextAnniversary(value,today){
 const match=text(value).match(/^(?:\d{4}[-/])?(\d{1,2})(?:月|[-/])(\d{1,2})日?$/);
 if(!match)return null;
 const m=Number(match[1]),d=Number(match[2]),year=Number(today.slice(0,4));
 if(m<1||m>12||d<1||d>31)return null;
 for(let y=year;y<year+9;y++){
 const date=new Date(Date.UTC(y,m-1,d));if(date.getUTCMonth()!==m-1||date.getUTCDate()!==d)continue;
 const iso=date.toISOString().slice(0,10);if(iso>=today)return {date:iso,display:m+"月"+d+"日"};
 }
 return null;
}
function buildIndex(sets,today){
 const rows=[],add=(kind,title,detail,href,keywords=[],date="")=>{if(!title)return;rows.push({kind,title,detail,href,date,hay:normalize([title,detail,labels[kind],...keywords].join(" ")),titleKey:normalize(title)})};
 const members=published(sets.talents).filter(t=>validId(t.id)&&text(t.name));
 const names=new Map(members.map(t=>[t.id,t.name]));
 for(const t of members){
 const href="talent.html?id="+encodeURIComponent(t.id),cohorts=strings(t.cohort),roles=strings(t.roles),tags=strings(t.tags),keywords=[...cohorts,...roles,...tags,text(t.greeting)];
 if(visible(t,"bio"))keywords.push(text(t.bio));
 if(visible(t,"facts"))keywords.push(text(t.affiliationAgency),text(t.height),text(t.bloodType));
 if(visible(t,"personality"))for(const key of ["hobbies","skills","likes","dislikes","favoriteFood","favoriteWorks"])keywords.push(text(t[key]));
 if(visible(t,"fan"))for(const key of ["fanName","oshiMark","streamTag","fanArtTag"])keywords.push(text(t[key]));
 if(visible(t,"activity"))for(const key of ["activityStatus","regularSchedule","activityGoal"])keywords.push(text(t[key]));
 if(visible(t,"achievements"))for(const a of Array.isArray(t.achievements)?t.achievements:[])if(a)keywords.push(text(a.title),text(a.description));
 if(visible(t,"message"))keywords.push(text(t.message));
 if(visible(t,"credit"))keywords.push(text(t.illustrator),text(t.modeler));
 const detail=[...cohorts,...roles,text(t.catchphrase),visible(t,"bio")?text(t.bio).slice(0,140):""].filter(Boolean).join(" ・ ");
 add("member",t.name,detail||"参加メンバーのプロフィール",href,keywords);
 if(visible(t,"facts")){
 const dates=[[t.birthday,"誕生日"],[t.debutDate,"REALITYデビュー周年"],[t.joinDate,"ぽっぽー加入周年"],...(Array.isArray(t.anniversaries)?t.anniversaries.filter(Boolean).map(a=>[a.date,a.title]):t.anniversary?[[t.anniversary,"活動記念日"]]:[])];
 for(const [value,label] of dates){const a=nextAnniversary(value,today);if(a&&text(label))add("anniversary",t.name+"の"+label,a.display+" ・ 次回 "+a.date,href,[text(value),"誕生日 記念日 周年"],a.date)}
 }
 }
 for(const n of published(sets.news).filter(x=>validId(x.id)&&text(x.title))){
 const linked=(Array.isArray(n.memberIds)?n.memberIds:[]).map(id=>names.get(id)).filter(Boolean);
 add("news",n.title,[text(n.date),text(n.category),text(n.summary)].filter(Boolean).join(" ・ "),"news-detail.html?id="+encodeURIComponent(n.id),[text(n.body),...linked],text(n.date));
 }
 for(const s of published(sets.schedule).filter(x=>validDate(x.date)&&x.date>=today)){
 const matches=s.memberId?members.filter(t=>t.id===s.memberId):members.filter(t=>t.name===s.talent),t=matches.length===1?matches[0]:null;
 const name=t?.name||text(s.talent)||"参加メンバー",platform=text(s.platform)||"REALITY";
 const href="schedule.html"+(t?"?member="+encodeURIComponent(t.id):"");
 add("schedule",text(s.title)||"配信",[s.date,text(s.time)||"時間未定",name,platform].join(" ・ "),href,[name,platform],s.date);
 }
 const settings=published(sets.settings)[0]||{};
 const basic=[
 ["コミュニティ概要","REALITYを中心とした配信者コミュニティ","about.html#about-us",[text(settings.aboutLead),"架空事務所 ぽっぽー Vライバー 個性"]],
 ["名前の由来","ぽっぽーに込めた想い","about.html#about-name",["汽車 汽笛"]],
 ["活動方針","個性・交流・自分のペースを大切に","about.html#about-community",[text(settings.communityPolicy),"休止 退所 活動方針"]],
 ["コミュニティ概要・運営者","設立・代表者・活動拠点","about.html#about-overview",[text(settings.operator)||"ぽっぽー運営",text(settings.representative)||"いつみん",text(settings.chair)||"ユージーン・ペコリーノ",text(settings.founded)||"2026年11月23日",text(settings.base)||"日本国内 オンライン"]],
 ["募集対象・参加条件","REALITYで活動したい方へ","audition.html#join-requirements",[text(settings.requirements),text(settings.joinIntro),"応募 参加 審査 年齢"]],
 ["費用・配信収益","参加費・月額費用は無料。収益は原則本人に帰属","audition.html#join-cost",["所属 事務所 契約 お金"]],
 ["よくある質問・応募窓口","参加に関するご案内","audition.html#join-faq",["応募 申込み 参加 FAQ"]],
 ["お問い合わせ","受付方法とお問い合わせ内容","contact.html",["連絡 相談 コラボレーション 不具合 権利"]],
 ["プライバシー・サイトポリシー","個人情報・著作権・利用について","policy.html",["アクセス情報 外部サービス 禁止事項 免責"]]
 ];
 for(const [title,detail,href,keywords] of basic)add("info",title,detail,href,keywords);
 const founded=text(settings.founded)||"2026年11月23日",a=nextAnniversary(founded.replace(/^(\d{4})年/,"$1-"),today);
 if(a)add("anniversary","ぽっぽー設立記念日",a.display+" ・ 次回 "+a.date,"about.html#about-overview",["コミュニティ 設立 周年",founded],a.date);
 return rows;
}
function findResults(index,query,kind){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 return index.filter(x=>(kind==="all"||x.kind===kind)&&terms.every(q=>x.hay.includes(q))).map((x,i)=>({x,i,score:terms.reduce((s,q)=>s+(x.titleKey===q?10:x.titleKey.includes(q)?4:1),0)})).sort((a,b)=>b.score-a.score||(a.x.kind===b.x.kind&&a.x.date&&b.x.date?(a.x.kind==="news"?b.x.date.localeCompare(a.x.date):a.x.date.localeCompare(b.x.date)):0)||a.i-b.i).map(v=>v.x);
}
async function start(){
 const form=document.getElementById("site-search-form");if(!form)return;
 const input=document.getElementById("site-search-input"),status=document.getElementById("site-search-status"),result=document.getElementById("site-search-results"),more=document.getElementById("site-search-more"),wrap=document.getElementById("site-search-more-wrap"),buttons=[...document.querySelectorAll("[data-search-kind]")];
 const params=new URLSearchParams(location.search);input.value=(params.get("q")||"").slice(0,160);let query=input.value.trim(),kind="all",limit=15;
 const keys=["talents","news","schedule","settings"],sets={},failures=[];
 await Promise.all(keys.map(async key=>{try{const r=await fetch("data/"+key+".json",{cache:"no-cache"});if(!r.ok)throw Error();const a=await r.json();if(!Array.isArray(a))throw Error();sets[key]=a}catch{sets[key]=[];failures.push(key)}}));
 // Search uses public data only, even if a CMS preview is open elsewhere.
 const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10),index=buildIndex(sets,today);
 const warning=failures.length?" 一部の情報を取得できませんでした。":"";
 const render=()=>{
 const list=findResults(index,query,kind);status.textContent=query?"「"+query+"」の検索結果 "+list.length+"件"+warning:(kind==="all"?"キーワードを入力するか、検索対象を選んでください。":"検索対象："+labels[kind]+" "+list.length+"件")+warning;
 buttons.forEach(b=>{const k=b.dataset.searchKind;const n=findResults(index,query,k).length;b.textContent=(k==="all"?"すべて":labels[k])+" ("+n+")";b.setAttribute("aria-pressed",String(k===kind))});
 result.replaceChildren();wrap.hidden=true;
 if(!query&&kind==="all"){const p=document.createElement("p");p.className="empty-state";p.textContent="メンバー名、ニュース、配信タイトル、誕生日などを入力して検索してください。";result.append(p);return}
 if(!list.length){const p=document.createElement("p");p.className="empty-state";p.textContent="条件に一致する情報がありません。別のキーワードをお試しください。";result.append(p);return}
 for(const item of list.slice(0,limit)){
 const a=document.createElement("a");a.className="pop-search-result";a.href=item.href;
 const badge=document.createElement("span");badge.className="pop-search-kind";badge.textContent=labels[item.kind];
 const h=document.createElement("h2");h.textContent=item.title;
 const p=document.createElement("p");p.textContent=item.detail;
 a.append(badge,h,p);result.append(a);
 }
 wrap.hidden=list.length<=limit;
 };
 form.addEventListener("submit",e=>{e.preventDefault();query=input.value.trim().slice(0,160);limit=15;const url=new URL(location.href);if(query)url.searchParams.set("q",query);else url.searchParams.delete("q");history.replaceState(null,"",url.href);render()});
 buttons.forEach(b=>b.addEventListener("click",()=>{kind=b.dataset.searchKind;limit=15;render()}));
 more.addEventListener("click",()=>{limit+=15;render()});render();
}
start().catch(()=>{const status=document.getElementById("site-search-status");if(status)status.textContent="検索を初期化できませんでした。ページを再読み込みしてください。"});
})();
