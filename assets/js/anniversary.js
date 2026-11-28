(async()=>{
"use strict";
const $=id=>document.getElementById(id);
const calendar=$("anniversary-calendar"),home=$("home-anniversary-list");if(!calendar&&!home)return;
const [talents,settings]=await Promise.all([loadData("data/talents.json"),loadData("data/settings.json")]);
const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10),[thisYear,thisMonth]=today.split("-").map(Number),records=anniversaryRecords(talents,settings);
const labels={birthday:"誕生日",debut:"デビュー",join:"加入",other:"その他",community:"設立"};
const failed=datasetFailed("data/talents.json"),settingsFailed=datasetFailed("data/settings.json");
const make=(tag,className,value)=>{const el=document.createElement(tag);if(className)el.className=className;if(value!==undefined)el.textContent=value;return el};
const empty=(el,message)=>el.replaceChildren(make("p","empty-state",message));
const days=e=>Math.round((Date.parse(e.date)-Date.parse(today))/86400000);
function eventRow(e,countdown){
 const a=make("a","anniversary-event");a.href=e.href;
 const date=make("time","anniversary-event-date",e.date.replaceAll("-","/"));date.dateTime=e.date;
 const info=make("div","anniversary-event-info");info.append(make("span","anniversary-kind "+e.kind,labels[e.kind]),make("strong","",e.title));if(e.shifted)info.append(make("small","anniversary-shift-note","2月29日の記念日（平年は3月1日）"));a.append(date,info);
 if(countdown)a.append(make("span","anniversary-countdown-label",days(e)===0?"本日":days(e)+"日後"));return a;
}
function upcomingAnniversaryGroups(events,limit=3){
 const groups=new Map();for(const e of events){if(!groups.has(e.date)){if(groups.size>=limit)break;groups.set(e.date,[])}groups.get(e.date).push(e)}return [...groups].map(([date,events])=>({date,events}));
}
const upcoming=nextAnniversaryEvents(records,today);
if(home){
 if(failed||settingsFailed){empty(home,"一部の記念日情報を取得できませんでした。");return}
 home.replaceChildren(...upcoming.slice(0,3).map(e=>eventRow(e,true)));if(!upcoming.length)empty(home,"掲載中の記念日はありません。");return;
}
const status=$("anniversary-status"),member=$("anniversary-member"),kind=$("anniversary-kind"),list=$("anniversary-list"),up=$("anniversary-upcoming");
const people=new Map(records.filter(e=>e.id).map(e=>[e.id,e.name]));
for(const [id,name] of people){const option=make("option","",name);option.value=id;member.append(option)}
const params=new URLSearchParams(location.search),id=params.get("member");if(people.has(id))member.value=id;
if([...kind.options].some(o=>o.value===params.get("kind")))kind.value=params.get("kind");
let year=thisYear,month=thisMonth;
const dateParam=params.get("month");if(/^\d{4}-(0[1-9]|1[0-2])$/.test(dateParam||"")){const [y,m]=dateParam.split("-").map(Number);if(y>=1900&&y<=9998){year=y;month=m}}
const filter=r=>(!member.value||r.id===member.value)&&(!kind.value||r.kind===kind.value);
const iso=(y,m,d)=>String(y).padStart(4,"0")+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
function syncUrl(){try{const u=new URL(location.href);for(const [key,value] of [["member",member.value],["kind",kind.value],["month",iso(year,month,1).slice(0,7)]]){if(value)u.searchParams.set(key,value);else u.searchParams.delete(key)}if(u.href!==location.href)history.replaceState(history.state,"",u.href)}catch{}}
function upcomingGroup(group){const section=make("section","anniversary-upcoming-group"),header=make("div","anniversary-upcoming-heading"),time=make("time","",group.date.replaceAll("-","/"));time.dateTime=group.date;const label=make("span","anniversary-countdown-label",days(group.events[0])===0?"本日":days(group.events[0])+"日後"),jump=make("button","anniversary-jump","カレンダーで見る");jump.type="button";jump.addEventListener("click",()=>{[year,month]=group.date.split("-").map(Number);render();const target=$("anniversary-date-"+Number(group.date.slice(8)));if(target){target.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});target.focus({preventScroll:true})}});header.append(time,label,jump);section.append(header,...group.events.map(e=>eventRow(e,false)));return section}
function render(){
 const filtered=records.filter(filter),next=nextAnniversaryEvents(filtered,today);
 up.replaceChildren(...upcomingAnniversaryGroups(next).map(upcomingGroup));if(!next.length)empty(up,"対象の記念日はありません。");
 $("anniversary-filter-note").textContent=(member.value||kind.value?"絞り込み中：":"すべて表示：")+(member.value?people.get(member.value):"全メンバー・コミュニティ")+" / "+(kind.value?kind.selectedOptions[0].textContent:"全種類")+"。以下の一覧とカレンダーに適用します。";
 $("anniversary-reset").disabled=!member.value&&!kind.value;
 syncUrl();
 $("anniversary-month").textContent=year+"年"+month+"月";$("anniversary-list-heading").textContent=year+"年"+month+"月の記念日";
 const events=filtered.map(r=>anniversaryOccurrence(r,year)).filter(e=>e&&e.month===month).sort((a,b)=>a.day-b.day||a.name.localeCompare(b.name,"ja"));
 status.textContent=(failed||settingsFailed?"一部のデータを取得できませんでした。 ":"")+year+"年"+month+"月の記念日："+events.length+"件";
 const table=make("table","anniversary-table");table.setAttribute("aria-label",year+"年"+month+"月のカレンダー");const head=make("thead"),tr=make("tr");
 for(const label of ["日","月","火","水","木","金","土"]){const th=make("th","",label);th.scope="col";tr.append(th)}head.append(tr);table.append(head);
 const first=new Date(Date.UTC(year,month-1,1)).getUTCDay(),last=new Date(Date.UTC(year,month,0)).getUTCDate(),body=make("tbody");
 for(let offset=0;offset<first+last;offset+=7){const row=make("tr");for(let col=0;col<7;col++){
 const d=offset+col-first+1,cell=make("td",d<1||d>last?"outside":"");
 if(d>=1&&d<=last){
 const key=iso(year,month,d),dayEvents=events.filter(e=>e.day===d);if(key===today)cell.classList.add("is-today");
 const number=make("span","anniversary-day",String(d));if(key===today)number.setAttribute("aria-label",d+"日 本日");cell.append(number);
 if(dayEvents.length){const button=make("button","anniversary-day-events",dayEvents.length+"件");button.type="button";button.setAttribute("aria-label",d+"日の記念日 "+dayEvents.map(e=>e.title).join("、"));button.addEventListener("click",()=>{const target=$("anniversary-date-"+d);if(target){target.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});target.focus({preventScroll:true})}});cell.append(button);const names=make("small","anniversary-cell-names",dayEvents.map(e=>e.name).join("・"));names.setAttribute("aria-hidden","true");cell.append(names)}
 }row.append(cell)}body.append(row)}table.append(body);calendar.replaceChildren(table);
 list.replaceChildren();
 for(const d of [...new Set(events.map(e=>e.day))]){const section=make("section","anniversary-day-group");section.id="anniversary-date-"+d;section.tabIndex=-1;section.append(make("h4","",month+"月"+d+"日"));section.append(...events.filter(e=>e.day===d).map(e=>eventRow(e,false)));list.append(section)}
 if(!events.length)empty(list,"選択した月の記念日はありません。");
 $("anniversary-prev").disabled=year===1900&&month===1;$("anniversary-next").disabled=year===9998&&month===12;
}
function move(delta){const d=new Date(Date.UTC(year,month-1+delta,1));year=d.getUTCFullYear();month=d.getUTCMonth()+1;render()}
$("anniversary-prev").addEventListener("click",()=>move(-1));$("anniversary-next").addEventListener("click",()=>move(1));$("anniversary-today").addEventListener("click",()=>{year=thisYear;month=thisMonth;render()});
member.addEventListener("change",render);kind.addEventListener("change",render);$("anniversary-reset").addEventListener("click",()=>{member.value="";kind.value="";render();member.focus()});render();
})().catch(()=>{const el=document.getElementById("anniversary-status")||document.getElementById("home-anniversary-list");if(el)el.textContent="記念日を取得できませんでした。ページを再読み込みしてください。"});
