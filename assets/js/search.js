(() => {
"use strict";
const labels={member:"メンバー",news:"ニュース",schedule:"配信予定",anniversary:"記念日",activity:"活動実績",info:"基本情報"};
const normalize=value=>String(value??"").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-96)).trim();
const text=value=>typeof value==="string"?value.trim():"";
const strings=value=>Array.isArray(value)?value.filter(x=>typeof x==="string"):typeof value==="string"?[value]:[];
const visible=(t,key)=>!Array.isArray(t.hiddenSections)||!t.hiddenSections.includes(key);
const published=items=>(Array.isArray(items)?items:[]).filter(x=>x&&x.published===true);
const validId=id=>typeof id==="string"&&/^[A-Za-z0-9_-]+$/.test(id);
const validDate=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
function buildIndex(sets,today){
 const rows=[],add=(kind,title,detail,href,keywords=[],date="")=>{if(!title)return;rows.push({kind,title,detail,href,date,hay:normalize([title,detail,labels[kind],publicText(labels[kind]),...keywords].join(" ")),titleKey:normalize(title)})};
 const members=displayPublicMembers(published(sets.talents).filter(t=>validId(t.id)&&text(t.name)));
 const names=new Map(members.map(t=>[t.id,t.name]));
 for(const t of members){
 const href="talent.html?id="+encodeURIComponent(t.id),cohorts=strings(t.cohort),roles=strings(t.roles),tags=visible(t,"activity")?strings(t.tags):[],keywords=[...cohorts,...roles,...tags,...originalContentText(t,["name","catchphrase",...(visible(t,"bio")?["bio"]:[]),...(visible(t,"facts")?["affiliationAgency"]:[]),...(visible(t,"personality")?["likes"]:[]),...(visible(t,"fan")?["fanName"]:[]),...(visible(t,"activity")?["activityStatus","regularSchedule"]:[])])];
 if(visible(t,"bio"))keywords.push(text(t.bio));
 if(visible(t,"facts"))keywords.push(text(t.affiliationAgency));
 if(visible(t,"personality"))keywords.push(text(t.likes));
 if(visible(t,"fan"))for(const key of ["fanName","oshiMark","streamTag","fanArtTag"])keywords.push(text(t[key]));
 if(visible(t,"activity"))for(const key of ["activityStatus","regularSchedule"])keywords.push(text(t[key]));
 if(visible(t,"achievements"))for(const a of Array.isArray(t.achievements)?t.achievements:[])if(a)keywords.push(text(a.title),text(a.description));

 const detail=[...cohorts,...roles,text(t.catchphrase),visible(t,"bio")?text(t.bio).slice(0,140):""].filter(Boolean).join(" ・ ");
 add("member",t.name,detail||"参加メンバーのプロフィール",href,keywords);

 }
 for(const n of published(sets.news).filter(x=>validId(x.id)&&text(x.title)).map(n=>displayPublicRecord("news",n))){
 const linked=(Array.isArray(n.memberIds)?n.memberIds:[]).map(id=>names.get(id)).filter(Boolean);
 add("news",n.title,[text(n.date),newsCategory(n.category),newsExcerpt(n)].filter(Boolean).join(" ・ "),"news-detail.html?id="+encodeURIComponent(n.id),[text(n.body),...originalContentText(n,["title","summary","body"]),...linked],text(n.date));
 }
 for(const s of published(sets.schedule).filter(x=>scheduleIsPublic(x,sets.talents)&&validDate(x.date)&&x.date>=today).map(s=>displayPublicRecord("schedule",s))){
 const people=scheduleParticipants(s,members),name=people.map(p=>p.name).join("・")||"参加メンバー",platform=text(s.platform)||"REALITY",format=scheduleFormat(s)==="collab"?"コラボ配信":"ソロ配信";
 const first=people.find(p=>p.id),href="schedule.html?day="+encodeURIComponent(s.date)+(first?"&member="+encodeURIComponent(first.id):"")+"&q="+encodeURIComponent(text(originalPublicRecord(s).title));
 add("schedule",text(s.title)||"配信",[s.date,text(s.time)||"時間未定",name,platform,format].join(" ・ "),href,[...people.map(p=>p.name),...people.filter(p=>p.id).map(p=>originalPublicRecord(members.find(t=>t.id===p.id))?.name||""),...originalContentText(s,["title"]),platform,format],s.date);
 }
 for(const r of publicActivityRecords(members))add("activity",r.title,[r.name,r.date,r.description].filter(Boolean).join(" ・ "),"activity.html?member="+encodeURIComponent(r.memberId)+"&q="+encodeURIComponent(r.title),[r.name,r.description],r.dateKey);
 const settings=displayPublicRecord("settings",published(sets.settings)[0])||{};
 const basic=[
 ["ぽっぽーについて","REALITYで活動する配信者の交流コミュニティ","about.html#about-us",[text(settings.aboutLead),"架空事務所 ぽっぽー Vライバー 個性 専属 マネジメント"]],
 ["名前の由来","ぽっぽーに込めた想い","about.html#about-name",["汽車 汽笛"]],
 ["活動方針","個性・交流・自分のペースを大切に","about.html#about-community",[text(settings.communityPolicy),"休止 退所 活動方針"]],
 ["コミュニティ概要・運営者","設立・代表者・活動拠点","about.html#about-overview",[text(settings.operator)||"ぽっぽー運営",text(settings.representative)||"いつみん",text(settings.chair)||"ユージーン・ペコリーノ",text(settings.founded)||"2026年11月25日",text(settings.base)||"日本国内 オンライン"]],
 ["募集対象・参加条件","REALITYで活動したい方へ","audition.html#join-requirements",[text(settings.requirements),text(settings.joinIntro),"応募 参加 審査 年齢"]],
 ["費用・配信収益","参加費・月額費用は無料。収益は原則本人に帰属","audition.html#join-cost",["所属 事務所 契約 お金"]],
 ["応募窓口","参加申込み・受付方法","audition.html#join-application",["応募 申込み 参加 審査"]],
 ["よくある質問","他の事務所・休止・退会・交流","audition.html#join-faq",["所属事務所 退所 退会 コラボ FAQ"]],
 ["お問い合わせ","受付窓口・ご相談内容","contact.html#contact-method",["連絡 相談 コラボレーション 不具合 権利"]],
 ["プライバシー・サイトポリシー","個人情報・著作権・利用について","policy.html",["アクセス情報 外部サービス 禁止事項 免責"]],
 ["公開プロフィール・掲載情報","掲載データと非表示設定の取り扱い","policy.html#publication",["公開リポジトリ 訂正 削除 プロフィール コラボ 個人情報"]]
 ];
 for(const [title,detail,href,keywords] of basic)add("info",publicText(title),publicText(detail),href,[title,detail,...keywords]);
 for(const e of nextAnniversaryEvents(anniversaryRecords(members,sets.settings),today)){
 const title=publicAnniversaryTitle(e);
 const url="anniversary.html?month="+e.date.slice(0,7)+(e.id?"&member="+encodeURIComponent(e.id):"");
 add("anniversary",title,e.month+"月"+e.day+"日 ・ 次回 "+e.date,url,[e.title,originalPublicRecord(members.find(t=>t.id===e.id))?.name||"","記念日 周年"],e.date);
 }

 return rows;
}
function findResults(index,query,kind){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 return index.filter(x=>(kind==="all"||x.kind===kind)&&terms.every(q=>x.hay.includes(q))).map((x,i)=>({x,i,score:terms.reduce((s,q)=>s+(x.titleKey===q?10:x.titleKey.includes(q)?4:1),0)})).sort((a,b)=>b.score-a.score||(a.x.kind===b.x.kind&&a.x.date&&b.x.date?(["news","activity"].includes(a.x.kind)?b.x.date.localeCompare(a.x.date):a.x.date.localeCompare(b.x.date)):0)||a.i-b.i).map(v=>v.x);
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
 const list=findResults(index,query,kind);status.textContent=publicEnglish?(query?list.length+" results for “"+query+"”":kind==="all"?"Enter a keyword or select a category.":publicText(labels[kind])+": "+list.length+" results")+(failures.length?" Some data could not be loaded.":""):query?"「"+query+"」の検索結果 "+list.length+"件"+warning:(kind==="all"?publicText("キーワードを入力するか、検索対象を選んでください。"):"検索対象："+labels[kind]+" "+list.length+"件")+warning;
 buttons.forEach(b=>{const k=b.dataset.searchKind;const n=findResults(index,query,k).length;b.textContent=(k==="all"?publicText("すべて"):publicText(labels[k]))+" ("+n+")";b.setAttribute("aria-pressed",String(k===kind))});
 result.replaceChildren();wrap.hidden=true;
 if(!query&&kind==="all"){const p=document.createElement("p");p.className="empty-state";p.textContent=publicText("メンバー名、ニュース、配信タイトル、誕生日などを入力して検索してください。");result.append(p);return}
 if(!list.length){const p=document.createElement("p");p.className="empty-state";p.textContent=publicText("条件に一致する情報がありません。別のキーワードをお試しください。");result.append(p);return}
 for(const item of list.slice(0,limit)){
 const a=document.createElement("a");a.className="pop-search-result";a.href=item.href;
 const badge=document.createElement("span");badge.className="pop-search-kind";badge.textContent=publicText(labels[item.kind]);
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
start().catch(()=>{const status=document.getElementById("site-search-status");if(status)status.textContent=publicText("検索を初期化できませんでした。ページを再読み込みしてください。")});
})();
