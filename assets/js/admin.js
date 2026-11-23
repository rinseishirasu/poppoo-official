(() => {
"use strict";
const FILES={talents:"talents.json",schedule:"schedule.json",news:"news.json",events:"events.json"};
const LABELS={talents:"所属ライバー",schedule:"配信予定",news:"お知らせ",events:"イベント"};
const STORAGE_KEY="poppoo-admin-draft-v1";
const SCHEMAS={
 talents:[
  ["id","ID","text",true],["published","公開する","checkbox"],["name","活動名","text",true],["generation","所属形態・区分","text"],["emoji","アイコン絵文字","text"],["catchphrase","キャッチコピー","text"],["bio","プロフィール本文","textarea"],["tags","活動タグ（カンマ区切り）","tags"],["links","公式リンク（1行に「表示名 | URL」）","links"]
 ],
 schedule:[
  ["published","公開する","checkbox"],["date","日付","date",true],["time","開始時刻","time",true],["talent","ライバー名","text",true],["title","配信タイトル","text",true],["platform","配信プラットフォーム","text"],["url","配信先URL（任意）","url"]
 ],
 news:[
  ["id","ID","text",true],["published","公開する","checkbox"],["date","投稿日","date",true],["title","タイトル","text",true],["category","カテゴリ","text"],["summary","概要","textarea"],["body","本文","textarea",true]
 ],
 events:[
  ["id","ID","text",true],["published","公開する","checkbox"],["status","開催状況","text"],["date","開始日・掲載日","date",true],["period","終了日（任意）","date"],["title","イベント名","text",true],["description","紹介文","textarea"],["target","参加対象","textarea"],["howto","参加方法","textarea"],["body","詳細本文","textarea"]
 ]
};
const data={talents:[],schedule:[],news:[],events:[]};
let current="talents",editing=-1;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(message){$("admin-status").textContent=message}
function saveDraft(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(e){status("ブラウザー内に保存できませんでした。JSONを書き出して保管してください。")}}
function makeId(prefix){const d=new Date();const stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0"),String(d.getHours()).padStart(2,"0"),String(d.getMinutes()).padStart(2,"0")].join("");return prefix+"-"+stamp}
function fieldHtml(field){
 const [key,label,type,required]=field;const req=required?" required":"";
 if(type==="checkbox")return `<label class="admin-check"><input name="${key}" type="checkbox"><span>${label}</span></label>`;
 if(type==="textarea")return `<label class="admin-field admin-field-wide"><span>${label}${required?" *":""}</span><textarea name="${key}" rows="4"${req}></textarea></label>`;
 if(type==="tags"||type==="links")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="3" placeholder="${type==="tags"?"雑談, ゲーム":"X | https://x.com/..." }"></textarea></label>`;
 return `<label class="admin-field"><span>${label}${required?" *":""}</span><input name="${key}" type="${type}"${req} ${key==="url"?'placeholder="https://"':""}></label>`;
}
function renderForm(item={}){
 const form=$("content-form");form.reset();
 $("form-fields").innerHTML=SCHEMAS[current].map(fieldHtml).join("");
 for(const [key,,type] of SCHEMAS[current]){
  const el=form.elements.namedItem(key);if(!el)continue;
  if(type==="checkbox")el.checked=item[key]===true;
  else if(type==="tags")el.value=Array.isArray(item[key])?item[key].join(", "):"";
  else if(type==="links")el.value=Array.isArray(item[key])?item[key].map(x=>(x.label||"")+" | "+(x.url||"")).join("\n"):"";
  else el.value=item[key]??"";
 }
 $("editor-title").textContent=LABELS[current]+"を"+(editing<0?"登録":"編集");
 $("save-button").textContent=editing<0?"登録する":"変更を保存";
}
function summary(item){
 if(current==="talents")return [item.name,item.generation].filter(Boolean).join(" / ");
 if(current==="schedule")return [item.date,item.time,item.title].filter(Boolean).join("　");
 if(current==="news")return [item.date,item.title].filter(Boolean).join("　");
 return [item.date,item.title].filter(Boolean).join("　");
}
function renderList(){
 const list=data[current];$("item-count").textContent=list.length+"件";
 $("content-list").innerHTML=list.length?list.map((item,i)=>`<article class="admin-list-item"><div><strong>${esc(summary(item)||"名称未設定")}</strong><span class="admin-publish-state ${item.published?"is-published":""}">${item.published?"公開設定":"非公開"}</span></div><div class="admin-list-actions"><button type="button" data-edit="${i}" class="admin-small-button">編集</button><button type="button" data-delete="${i}" class="admin-small-button danger">削除</button></div></article>`).join(""):'<p class="admin-empty">登録済みデータはありません。</p>';
}
function renderTabs(){
 document.querySelectorAll(".admin-tab").forEach(b=>{const active=b.dataset.kind===current;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});
 renderForm();renderList();
}
function formObject(){
 const obj={};
 for(const [key,,type] of SCHEMAS[current]){
  const el=$("content-form").elements.namedItem(key);if(!el)continue;
  if(type==="checkbox")obj[key]=el.checked;
  else if(type==="tags")obj[key]=el.value.split(",").map(s=>s.trim()).filter(Boolean);
  else if(type==="links")obj[key]=el.value.split("\n").map(line=>{const i=line.indexOf("|");return i<0?null:{label:line.slice(0,i).trim(),url:line.slice(i+1).trim()}}).filter(x=>x&&x.label&&/^https?:\/\//i.test(x.url));
  else obj[key]=el.value.trim();
 }
 return obj;
}
$("content-form").addEventListener("submit",e=>{
 e.preventDefault();const obj=formObject();
 if(current==="talents"&&obj.links.length===0)delete obj.links;
 if(current==="talents"&&obj.tags.length===0)delete obj.tags;
 if(obj.url&&!/^https?:\/\//i.test(obj.url)){status("URLは http:// または https:// で始まる形式にしてください。");return}
 if(obj.id&&data[current].some((x,i)=>x.id===obj.id&&i!==editing)){status("同じIDがすでに登録されています。別のIDを指定してください。");return}
 if(editing<0)data[current].push(obj);else data[current][editing]=obj;
 editing=-1;renderForm();renderList();saveDraft();status("変更をブラウザー内に保存しました。公式サイトにはまだ公開されていません。");
});
$("clear-button").addEventListener("click",()=>{editing=-1;renderForm();status("入力欄をクリアしました。")});
$("content-list").addEventListener("click",e=>{
 const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
 if(edit){editing=Number(edit.dataset.edit);renderForm(data[current][editing]);window.scrollTo({top:$("content-form").getBoundingClientRect().top+window.scrollY-110,behavior:"smooth"});}
 if(del){const i=Number(del.dataset.delete);if(!confirm("このデータを削除しますか？"))return;data[current].splice(i,1);if(editing===i)editing=-1;saveDraft();renderForm();renderList();status("データを削除しました。");}
});
document.querySelectorAll(".admin-tab").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.kind;editing=-1;renderTabs()}));
function download(name,content,type="application/json"){
 const blob=new Blob([content],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
$("export-button").addEventListener("click",()=>{download(FILES[current],JSON.stringify(data[current],null,2)+"\n");status(FILES[current]+" を書き出しました。")});
$("import-button").addEventListener("click",()=>$("import-file").click());
$("import-file").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed))throw new Error("JSONは配列形式である必要があります。");data[current]=parsed;editing=-1;saveDraft();renderForm();renderList();status(FILES[current]+" を読み込みました。");}
 catch(err){status("読み込みに失敗しました: "+err.message)}finally{e.target.value=""}
});
$("reset-button").addEventListener("click",async()=>{
 if(!confirm("このブラウザー内の編集内容を破棄し、GitHub上の公開データを読み直しますか？"))return;
 localStorage.removeItem(STORAGE_KEY);await loadRemote();status("公開データを読み込みました。");
});
async function loadRemote(){
 for(const key of Object.keys(FILES)){try{const r=await fetch("data/"+FILES[key],{cache:"no-store"});if(!r.ok)throw new Error();const a=await r.json();data[key]=Array.isArray(a)?a:[]}catch{data[key]=[]}}
}
(async()=>{
 await loadRemote();
 try{const draft=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(draft&&typeof draft==="object")for(const key of Object.keys(FILES))if(Array.isArray(draft[key]))data[key]=draft[key]}catch{}
 renderTabs();status("準備完了。編集内容はこのブラウザー内に一時保存されます。");
})();
})();