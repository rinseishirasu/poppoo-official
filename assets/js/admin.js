(() => {
"use strict";
const REPO="rinseishirasu/poppoo-official";
const BRANCH="main";
const API="https://api.github.com";
const AUTH_API=(document.querySelector('meta[name="poppoo-auth-api"]')?.content||"").replace(/\/$/,"");
const FILES={talents:"talents.json",schedule:"schedule.json",news:"news.json",events:"events.json"};
const LABELS={talents:"所属ライバー",schedule:"配信予定",news:"お知らせ",events:"イベント"};
const STORAGE_KEY="poppoo-admin-draft-v1";
const SCHEMAS={
 talents:[["id","ID","text",true],["published","公開する","checkbox"],["name","活動名","text",true],["cohort","期生","cohort"],["generation","所属形態","generation"],["iconImage","プロフィールアイコン画像","image"],["avatarImage","アバター画像","image"],["emoji","画像未設定時のアイコン絵文字","text"],["catchphrase","キャッチコピー","text"],["bio","プロフィール本文","textarea"],["tags","活動タグ（カンマ区切り）","tags"],["links","公式リンク（1行に「表示名 | URL」）","links"]],
 schedule:[["published","公開する","checkbox"],["date","日付","date",true],["time","開始時刻","time",true],["talent","ライバー名","text",true],["title","配信タイトル","text",true],["platform","配信プラットフォーム","text"],["url","配信先URL（任意）","url"]],
 news:[["id","ID","text",true],["published","公開する","checkbox"],["date","投稿日","date",true],["title","タイトル","text",true],["category","カテゴリ","text"],["summary","概要","textarea"],["body","本文","textarea",true]],
 events:[["id","ID","text",true],["published","公開する","checkbox"],["status","開催状況","text"],["date","開始日・掲載日","date",true],["period","終了日（任意）","date"],["title","イベント名","text",true],["description","紹介文","textarea"],["target","参加対象","textarea"],["howto","参加方法","textarea"],["body","詳細本文","textarea"]]
};
const data={talents:[],schedule:[],news:[],events:[]};
let current="talents",editing=-1,accessToken="",githubLogin="",tokenExpiresAt=0,authPopup=null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(message){$("admin-status").textContent=message}
function saveDraft(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{status("ブラウザー内に保存できませんでした。公開操作を行う前に内容を控えてください。")}}
function authReady(){return Boolean(accessToken&&Date.now()<tokenExpiresAt)}
function updateAuthUI(){
 const ready=authReady();
 $("auth-status").textContent=ready?"ログイン中: @"+githubLogin:"ログインしていません";
 $("auth-detail").textContent=ready?"GitHubへの直接公開が利用できます。ログインはこのブラウザーのメモリー上だけで保持されます。":(AUTH_API.includes("YOUR-WORKER")||!AUTH_API?"認証サーバーの設定がまだ完了していません。セットアップガイドを確認してください。":"公開するには運営者のGitHubアカウントでログインしてください。");
 $("login-button").disabled=ready||!AUTH_API||AUTH_API.includes("YOUR-WORKER");
 $("logout-button").disabled=!ready;
 $("publish-button").disabled=!ready;
}
function fieldHtml(field){
 const [key,label,type,required]=field,req=required?" required":"";
 if(type==="checkbox")return `<label class="admin-check"><input name="${key}" type="checkbox"><span>${label}</span></label>`;
 if(type==="generation")return `<label class="admin-field"><span>${label}</span><select name="${key}"><option value="">選択してください</option><option>正式所属ライバー</option><option>業務提携ライバー</option><option>研修生・準所属ライバー</option></select></label>`;
 if(type==="cohort")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}（複数選択可）</legend><div class="admin-choice-grid">${["0期生",...Array.from({length:10},(_,i)=>(i+1)+"期生"),"その他"].map(v=>`<label><input type="checkbox" name="cohort" value="${v}"><span>${v}</span></label>`).join("")}</div></fieldset>`;
 if(type==="image")return `<div class="admin-field admin-field-wide admin-image-field"><span>${label}</span><input type="file" name="${key}File" accept="image/png,image/jpeg,image/webp,image/gif"><small>画像を選ぶとGitHubの assets/images/talents/ にアップロードします。PNG・JPG・WebP・GIF、最大8MB。</small><input type="hidden" name="${key}"><span class="admin-image-path" data-image-path="${key}"></span></div>`;
 if(type==="textarea")return `<label class="admin-field admin-field-wide"><span>${label}${required?" *":""}</span><textarea name="${key}" rows="4"${req}></textarea></label>`;
 if(type==="tags"||type==="links")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="3" placeholder="${type==="tags"?"雑談, ゲーム":"X | https://x.com/..."}"></textarea></label>`;
 return `<label class="admin-field"><span>${label}${required?" *":""}</span><input name="${key}" type="${type}"${req} ${key==="url"?'placeholder="https://"':""}></label>`;
}
function renderForm(item={}){
 const form=$("content-form");form.reset();$("form-fields").innerHTML=SCHEMAS[current].map(fieldHtml).join("");
 for(const [key,,type] of SCHEMAS[current]){
  const el=form.elements.namedItem(key);if(!el)continue;
  if(type==="checkbox")el.checked=item[key]===true;
  else if(type==="cohort"){const values=Array.isArray(item[key])?item[key]:item[key]?[item[key]]:[];form.querySelectorAll('input[name="cohort"]').forEach(input=>input.checked=values.includes(input.value))}
  else if(type==="generation")el.value=item[key]||"";
  else if(type==="image"){el.value=item[key]||"";const note=form.querySelector(`[data-image-path="${key}"]`);if(note)note.textContent=item[key]?"登録済み: "+item[key]:"画像未登録"}
  else if(type==="tags")el.value=Array.isArray(item[key])?item[key].join(", "):"";
  else if(type==="links")el.value=Array.isArray(item[key])?item[key].map(x=>(x.label||"")+" | "+(x.url||"")).join("\n"):"";
  else el.value=item[key]??"";
 }
 $("editor-title").textContent=LABELS[current]+"を"+(editing<0?"登録":"編集");
 $("save-button").textContent=editing<0?"登録する":"変更を保存";
 $("publish-description").textContent=LABELS[current]+"のデータ "+data[current].length+"件をGitHubへ公開します。";
}
function summary(item){
 if(current==="talents")return [item.name,item.generation].filter(Boolean).join(" / ");
 if(current==="schedule")return [item.date,item.time,item.title].filter(Boolean).join("　");
 return [item.date,item.title].filter(Boolean).join("　");
}
function renderList(){
 const list=data[current];$("item-count").textContent=list.length+"件";
 $("content-list").innerHTML=list.length?list.map((item,i)=>`<article class="admin-list-item"><div><strong>${esc(summary(item)||"名称未設定")}</strong><span class="admin-publish-state ${item.published?"is-published":""}">${item.published?"公開設定":"非公開"}</span></div><div class="admin-list-actions"><button type="button" data-edit="${i}" class="admin-small-button">編集</button><button type="button" data-delete="${i}" class="admin-small-button danger">削除</button></div></article>`).join(""):'<p class="admin-empty">登録済みデータはありません。</p>';
}
function renderTabs(){
 document.querySelectorAll(".admin-tab").forEach(b=>{const active=b.dataset.kind===current;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});
 renderForm();renderList();updateAuthUI();
}
function formObject(){
 const obj={};
 for(const [key,,type] of SCHEMAS[current]){
  const el=$("content-form").elements.namedItem(key);if(!el)continue;
  if(type==="checkbox")obj[key]=el.checked;
  else if(type==="cohort")obj[key]=Array.from($("content-form").querySelectorAll('input[name="cohort"]:checked')).map(input=>input.value);
  else if(type==="image")obj[key]=el.value;
  else if(type==="tags")obj[key]=el.value.split(",").map(s=>s.trim()).filter(Boolean);
  else if(type==="links")obj[key]=el.value.split("\n").map(line=>{const i=line.indexOf("|");return i<0?null:{label:line.slice(0,i).trim(),url:line.slice(i+1).trim()}}).filter(x=>x&&x.label&&/^https?:\/\//i.test(x.url));
  else obj[key]=el.value.trim();
 }
 return obj;
}
function validateDataset(kind,items){
 if(!Array.isArray(items))return "データ形式が配列ではありません。";
 const ids=new Set();
 for(let i=0;i<items.length;i++){
  const item=items[i];
  if(!item||typeof item!=="object"||Array.isArray(item))return (i+1)+"件目のデータ形式が正しくありません。";
  for(const [key,label,,required] of SCHEMAS[kind])if(required&&(!String(item[key]??"").trim()))return (i+1)+"件目:「"+label+"」を入力してください。";
  if(["talents","news","events"].includes(kind)){
   if(!/^[A-Za-z0-9_-]+$/.test(item.id||""))return (i+1)+"件目: IDは半角英数字・ハイフン・アンダースコアで入力してください。";
   if(ids.has(item.id))return "ID「"+item.id+"」が重複しています。";
   ids.add(item.id);
  }
  if(kind==="schedule"&&(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!/^\d{2}:\d{2}$/.test(item.time)))return (i+1)+"件目: 日付または時刻の形式を確認してください。";
  if(["news","events"].includes(kind)&&!/^\d{4}-\d{2}-\d{2}$/.test(item.date))return (i+1)+"件目: 日付はYYYY-MM-DD形式で入力してください。";
  if(item.url&&!/^https?:\/\//i.test(item.url))return (i+1)+"件目: URLはhttp://またはhttps://で始めてください。";
  if(kind==="talents"&&item.cohort!==undefined&&!Array.isArray(item.cohort))item.cohort=item.cohort?[item.cohort]:[];
  if(kind==="talents")for(const key of ["iconImage","avatarImage"])if(item[key]&&!/^(https:\/\/|assets\/images\/talents\/)/i.test(item[key]))return (i+1)+"件目: "+(key==="iconImage"?"プロフィールアイコン":"アバター")+"画像の保存先が正しくありません。";
  if(Array.isArray(item.links)&&item.links.some(x=>!x||!x.label||!/^https?:\/\//i.test(x.url||"")))return (i+1)+"件目: 公式リンクの表示名またはURLを確認してください。";
 }
 return "";
}
async function uploadTalentImage(input){
 if(!authReady()){input.value="";status("画像をGitHubへ保存するには、先にGitHubへログインしてください。");return}
 const form=$("content-form"),key=input.name.replace(/File$/,""),id=(form.elements.namedItem("id")?.value||"").trim();
 if(!/^[A-Za-z0-9_-]+$/.test(id)){input.value="";status("先にライバーIDを半角英数字・ハイフン・アンダースコアで入力してください。");return}
 const file=input.files?.[0];if(!file)return;
 const allowed={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"};
 if(!allowed[file.type]){input.value="";status("PNG・JPG・WebP・GIF形式の画像を選択してください。");return}
 if(file.size>8*1024*1024){input.value="";status("画像は8MB以下にしてください。");return}
 input.disabled=true;status("画像をGitHubへアップロードしています...");
 try{
  const path="assets/images/talents/"+id+"-"+(key==="iconImage"?"icon":"avatar")+"."+allowed[file.type];
  const encodedPath=path.split("/").map(encodeURIComponent).join("/");
  const get=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath+"?ref="+encodeURIComponent(BRANCH));
  let sha=null;if(get.status===200)sha=(await get.json()).sha;else if(get.status!==404)throw new Error("画像の保存先を確認できませんでした ("+get.status+")");
  const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);
  const payload={message:"Upload talent "+key+" for "+id,content:btoa(binary),branch:BRANCH};if(sha)payload.sha=sha;
  const put=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath,{method:"PUT",body:JSON.stringify(payload)});
  if(!put.ok){const detail=await put.text();throw new Error("画像のアップロードに失敗しました ("+put.status+"): "+detail.slice(0,180))}
  form.elements.namedItem(key).value=path;
  const note=form.querySelector(`[data-image-path="${key}"]`);if(note)note.textContent="GitHubに保存済み: "+path;
  saveDraft();status("画像をGitHubに保存しました。プロフィールデータを登録後、「このデータを公開する」を押してください。");
 }catch(error){status(error.message||"画像のアップロードに失敗しました。")}
 finally{input.disabled=false}
}
$("form-fields").addEventListener("change",e=>{if(e.target.matches('input[type="file"][name$="File"]'))uploadTalentImage(e.target)});
$("content-form").addEventListener("submit",e=>{
 e.preventDefault();const obj=formObject();
 if(current==="talents"&&obj.links.length===0)delete obj.links;
 if(current==="talents"&&obj.tags.length===0)delete obj.tags;
 if(obj.url&&!/^https?:\/\//i.test(obj.url)){status("URLは http:// または https:// で始まる形式にしてください。");return}
 if(obj.id&&data[current].some((x,i)=>x.id===obj.id&&i!==editing)){status("同じIDがすでに登録されています。別のIDを指定してください。");return}
 if(editing<0)data[current].push(obj);else data[current][editing]=obj;
 editing=-1;renderForm();renderList();saveDraft();status("変更を一時保存しました。公開するには「このデータを公開する」を押してください。");
});
$("clear-button").addEventListener("click",()=>{editing=-1;renderForm();status("入力欄をクリアしました。")});
$("content-list").addEventListener("click",e=>{
 const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
 if(edit){editing=Number(edit.dataset.edit);renderForm(data[current][editing]);window.scrollTo({top:$("content-form").getBoundingClientRect().top+window.scrollY-110,behavior:"smooth"})}
 if(del){const i=Number(del.dataset.delete);if(!confirm("このデータを削除しますか？"))return;data[current].splice(i,1);if(editing===i)editing=-1;saveDraft();renderForm();renderList();status("データを削除しました。公開するには公開ボタンを押してください。")}
});
document.querySelectorAll(".admin-tab").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.kind;editing=-1;renderTabs()}));
$("reset-button").addEventListener("click",async()=>{
 if(!confirm("このブラウザー内の編集内容を破棄し、GitHub上の公開データを読み直しますか？"))return;
 localStorage.removeItem(STORAGE_KEY);await loadRemote();status("GitHub上の公開データを読み込みました。");
});
async function loadRemote(){
 for(const key of Object.keys(FILES)){try{const r=await fetch("data/"+FILES[key],{cache:"no-store"});if(!r.ok)throw new Error();const a=await r.json();data[key]=Array.isArray(a)?a:[]}catch{data[key]=[]}}
}
function base64Utf8(value){
 const bytes=new TextEncoder().encode(value);let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);
}
async function githubRequest(path,options={}){
 const response=await fetch(API+path,{...options,headers:{Accept:"application/vnd.github+json","Authorization":"Bearer "+accessToken,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(options.headers||{})}});
 if(response.status===401){accessToken="";githubLogin="";tokenExpiresAt=0;updateAuthUI();throw new Error("GitHubログインの有効期限が切れました。再度ログインしてください。")}
 return response;
}
async function publishCurrent(){
 if(!authReady()){status("先にGitHubへログインしてください。");updateAuthUI();return}
 const validation=validateDataset(current,data[current]);if(validation){status("公開できません: "+validation);return}
 const file="data/"+FILES[current],button=$("publish-button");
 if(!confirm(LABELS[current]+"のデータ "+data[current].length+"件をGitHubへ公開します。よろしいですか？"))return;
 button.disabled=true;button.textContent="公開中...";
 try{
  const encodedPath=file.split("/").map(encodeURIComponent).join("/");
  const get=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath+"?ref="+encodeURIComponent(BRANCH));
  let sha=null;
  if(get.status===200){const existing=await get.json();sha=existing.sha}
  else if(get.status!==404){const detail=await get.text();throw new Error("現在の公開データを確認できませんでした ("+get.status+"): "+detail.slice(0,180))}
  const payload={message:"Update "+file+" via Poppoo Admin",content:base64Utf8(JSON.stringify(data[current],null,2)+"\n"),branch:BRANCH};
  if(sha)payload.sha=sha;
  const put=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath,{method:"PUT",body:JSON.stringify(payload)});
  if(!put.ok){const detail=await put.text();throw new Error("GitHubへの保存に失敗しました ("+put.status+"): "+detail.slice(0,240))}
  const result=await put.json();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  status("公開しました。GitHubのコミット: "+(result.commit?.sha||"完了")+". 公式サイトへの反映には数分かかる場合があります。");
 }catch(error){status(error.message||"公開に失敗しました。変更内容はブラウザー内に残っています。")}
 finally{button.textContent="このデータを公開する";updateAuthUI()}
}
$("publish-button").addEventListener("click",publishCurrent);
$("login-button").addEventListener("click",()=>{
 if(!AUTH_API||AUTH_API.includes("YOUR-WORKER")){status("認証サーバーURLが未設定です。worker/README.mdの手順に沿って設定してください。");return}
 authPopup=window.open(AUTH_API+"/auth/start","poppoo-github-auth","popup=yes,width=620,height=760");
 if(!authPopup){status("ログイン画面を開けませんでした。ポップアップを許可してください。");return}
 status("GitHubの認証画面を開いています...");
});
$("logout-button").addEventListener("click",()=>{accessToken="";githubLogin="";tokenExpiresAt=0;authPopup=null;updateAuthUI();status("このブラウザーのログイン情報を破棄しました。")});
window.addEventListener("message",event=>{
 if(!AUTH_API||event.origin!==new URL(AUTH_API).origin||!authPopup||event.source!==authPopup)return;
 if(!event.data||event.data.type!=="POPPOO_GITHUB_AUTH")return;
 authPopup=null;
 if(event.data.error){status(event.data.error);return}
 if(!event.data.token||!event.data.login){status("GitHub認証の応答を確認できませんでした。");return}
 accessToken=event.data.token;githubLogin=event.data.login;tokenExpiresAt=Date.now()+Number(event.data.expiresIn||28800)*1000;
 updateAuthUI();status("@"+githubLogin+" としてログインしました。公開するカテゴリを選択してください。");
});
(async()=>{
 await loadRemote();
 try{const draft=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(draft&&typeof draft==="object")for(const key of Object.keys(FILES))if(Array.isArray(draft[key]))data[key]=draft[key]}catch{}
 renderTabs();status("準備完了。編集内容はこのブラウザー内に一時保存されます。");
})();
})();