(async()=>{
"use strict";
const $=id=>document.getElementById(id),home=$("home-activity-list"),timeline=$("activity-timeline");
if(!home&&!timeline)return;
const talents=await loadPublicData("data/talents.json"),records=publicActivityRecords(talents);
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
const empty=(el,msg)=>el.replaceChildren(make("p","empty-state",msg));
const dateText=r=>r.date||publicText("日付未登録");
function card(r){
 const item=make("article","activity-record"),date=make("div","activity-record-date",dateText(r)),body=make("div","activity-record-body");
 const label=make("span","activity-member-label",r.name),title=make("h3","",r.title),link=make("a","text-link",publicText("プロフィールを見る →"));link.href=r.href;
 body.append(label,title);if(r.description)body.append(make("p","",r.description));body.append(link);item.append(date,body);return item;
}
if(datasetFailed("data/talents.json")){if(home)empty(home,publicText("活動実績を取得できませんでした。"));else{ $("activity-status").textContent=publicText("活動実績を取得できませんでした。");empty(timeline,publicText("ページを再読み込みしてください。"));}return}
if(home){home.replaceChildren(...records.slice(0,3).map(card));if(!records.length)empty(home,publicText("現在、掲載中の活動実績はありません。"));return}
const q=$("activity-search"),member=$("activity-member"),year=$("activity-year"),sort=$("activity-sort"),status=$("activity-status"),more=$("activity-more-wrap");
const normalize=v=>String(v??"").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).trim();
const people=new Map(records.map(r=>[r.memberId,r.name]));
for(const [id,name] of [...people.entries()].sort((a,b)=>a[1].localeCompare(b[1],"ja"))){const o=make("option","",name);o.value=id;member.append(o)}
for(const y of [...new Set(records.filter(r=>r.dateKey).map(r=>r.dateKey.slice(0,4)))].sort().reverse()){const o=make("option","",publicLanguage==="ko"?y+"년":publicEnglish?y:y+"年");o.value=y;year.append(o)}
const params=new URLSearchParams(location.search);if(people.has(params.get("member")))member.value=params.get("member");q.value=(params.get("q")||"").slice(0,160);let limit=15;
if([...year.options].some(o=>o.value===params.get("year")))year.value=params.get("year");if(params.get("sort")==="old")sort.value="old";
const advanced=$("activity-advanced"),active=$("activity-active-filters"),fields=[["q",q,"検索"],["member",member,"メンバー"],["year",year,"年"],["sort",sort,"表示順"]];
if(member.value||year.value||sort.value==="old")advanced.open=true;
function syncFilters(){active.replaceChildren();for(const [key,el,label] of fields){if(!el.value.trim()||key==="sort"&&el.value==="new")continue;const btn=make("button","news-filter-chip",publicText(label)+"："+(el.tagName==="SELECT"?el.selectedOptions[0].textContent:el.value)+" ×");btn.type="button";btn.setAttribute("aria-label",publicFormat("filterClear",publicText(label))??(publicEnglish?"Clear "+publicText(label)+" filter":label+"の条件を解除"));btn.onclick=()=>{el.value=key==="sort"?"new":"";changed();if(advanced.contains(el))advanced.open=true;el.focus()};active.append(btn)}active.hidden=!active.childElementCount;
try{const u=new URL(location.href);for(const [key,el] of fields){const value=el.value.trim();if(value&&!(key==="sort"&&value==="new"))u.searchParams.set(key,value);else u.searchParams.delete(key)}if(u.href!==location.href)history.replaceState(history.state,"",u.href)}catch{}}

function render(){
 const terms=normalize(q.value).split(/\s+/).filter(Boolean);
 const list=records.filter(r=>(!member.value||r.memberId===member.value)&&(!year.value||r.dateKey.slice(0,4)===year.value)&&terms.every(t=>normalize([r.title,r.name,r.description,r.date,originalPublicRecord(talents.find(t=>t.id===r.memberId))?.name].join(" ")).includes(t)));
 if(sort.value==="old")list.sort((a,b)=>Number(!a.dateKey)-Number(!b.dateKey)||a.dateKey.localeCompare(b.dateKey)||a.name.localeCompare(b.name,"ja"));
 status.textContent=publicFormat("total",Math.min(limit,list.length),list.length,records.length)??(publicEnglish?"Showing "+Math.min(limit,list.length)+" of "+list.length+" matching / "+records.length+" total":list.length+"件中 "+Math.min(limit,list.length)+"件を表示 / 全"+records.length+"件");timeline.replaceChildren();more.hidden=list.length<=limit;syncFilters();
 if(!list.length){empty(timeline,records.length?publicText("条件に一致する活動実績はありません。"):publicText("現在、掲載中の活動実績はありません。"));return}
 const groups=new Map();for(const r of list.slice(0,limit)){const key=r.dateKey?(publicLanguage==="ko"?r.dateKey.slice(0,4)+"년":publicEnglish?r.dateKey.slice(0,4):r.dateKey.slice(0,4)+"年"):publicText("日付未登録・その他");if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 for(const [label,rows] of groups){const section=make("section","activity-year-group");section.append(make("h2","activity-year-heading",label),...rows.map(card));timeline.append(section)}
}
const changed=()=>{limit=15;render()};q.addEventListener("input",changed);[member,year,sort].forEach(el=>el.addEventListener("change",changed));$("activity-reset").addEventListener("click",()=>{q.value="";member.value="";year.value="";sort.value="new";changed();q.focus()});$("activity-more").addEventListener("click",()=>{limit+=15;render()});render();
})().catch(()=>{const el=document.getElementById("activity-status")||document.getElementById("home-activity-list");if(el)el.textContent=publicText("活動実績の表示に失敗しました。ページを再読み込みしてください。")});
