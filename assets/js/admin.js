(() => {
"use strict";
const REPO="rinseishirasu/poppoo-official";
const BRANCH="main";
const API="https://api.github.com";
const AUTH_API=(document.querySelector('meta[name="poppoo-auth-api"]')?.content||"").replace(/\/$/,"");
const FILES={talents:"talents.json",schedule:"schedule.json",news:"news.json",home:"home.json",settings:"settings.json"};
const LABELS={talents:"参加メンバー",schedule:"配信予定",news:"お知らせ",home:"トップページ設定",settings:"サイト基本設定"};
const STORAGE_KEY="poppoo-admin-draft-v1";
const singleton=k=>["home","settings"].includes(k);
const SCHEMAS={
 settings:[["published","設定を有効にする","checkbox"],["operator","運営者名","text"],["representative","代表者","text"],["chair","盛り上げ会長","text"],["founded","設立・活動開始日（表示用）","text"],["base","活動拠点","text"],["aboutLead","コミュニティ紹介","textarea"],["communityPolicy","運営方針","textarea"],["joinIntro","参加案内の紹介文","textarea"],["requirements","募集対象（1行に1項目）","textarea"],["applicationUrl","応募窓口URL（HTTPS・任意）","url"],["contactUrl","お問い合わせ窓口URL（HTTPS・任意）","url"],["footerText","フッター紹介文","textarea"]],
 home:[["published","設定を有効にする","checkbox"],["headline1","キャッチコピー1行目","text"],["headline2","キャッチコピー2行目","text"],["lead","紹介メッセージ","textarea"],["heroImage","メインビジュアル画像（任意）","image"],["featuredIds","ピックアップメンバー","memberSelect"],["notice","トップページのお知らせ（任意）","textarea"],["aboutText","コミュニティ紹介文","textarea"],["joinText","参加案内メッセージ","text"],...["News","Schedule","Members","About","Join"].map((v,i)=>["hide"+v,["最新情報","配信予定","メンバー","概要","参加案内"][i]+"を非表示","checkbox"])],
 talents:[["id","ID","text",true],["published","公開する","checkbox"],["name","活動名","text",true],["imageColor","イメージカラー（任意）","themeColor"],["cohort","期生","cohort"],["roles","コミュニティ内の役職（複数ある場合はカンマ区切り）","roles"],["affiliationAgency","所属事務所・所属先（任意）","agency"],["iconImage","プロフィールアイコン画像","image"],["avatarImage","従来のメインアバター画像（既存データ用）","image"],["avatarImages","アバターギャラリー（複数画像）","gallery"],["emoji","画像未設定時のアイコン絵文字","text"],["catchphrase","キャッチコピー","text"],["bio","プロフィール本文","textarea"],["achievements","活動実績（1行に「日付 | 内容 | 詳細」）","achievements"],["hiddenSections","プロフィールで非公開にする項目","visibility"],["birthday","誕生日（例：1月1日）","text"],["debutDate","デビュー日","date"],["anniversary","活動記念日（例：11月23日）","text"],["activityStatus","活動状況（例：活動中・休止中）","text"],["regularSchedule","定期配信（例：毎週金曜21:00）","text"],["activityGoal","活動目標","textarea"],["favoriteWorks","好きな作品・ジャンル","textarea"],["height","身長","text"],["bloodType","血液型","text"],["fanName","ファンネーム","text"],["oshiMark","推しマーク","text"],["streamTag","配信タグ","text"],["fanArtTag","ファンアートタグ","text"],["greeting","配信の挨拶・定番フレーズ","textarea"],["hobbies","趣味","text"],["skills","特技","text"],["likes","好きなもの","textarea"],["dislikes","苦手なもの","textarea"],["favoriteFood","好きな食べ物","text"],["illustrator","キャラクターデザイン","text"],["modeler","Live2Dモデラー","text"],["message","本人からのメッセージ","textarea"],["tags","活動ジャンル・タグ（カンマ区切り）","tags"],["links","公式リンク（1行に「表示名 | URL」）","links"]],
 schedule:[["published","公開する","checkbox"],["date","日付","date",true],["time","開始時刻","time",true],["talent","参加メンバー名","text",true],["title","配信タイトル","text",true],["platform","配信プラットフォーム","text"],["url","配信先URL（任意）","url"]],
 news:[["id","ID","text",true],["published","公開する","checkbox"],["date","投稿日","date",true],["title","タイトル","text",true],["category","カテゴリ","text"],["thumbnailImage","サムネイル画像（任意）","image"],["summary","概要","textarea"],["body","本文","textarea",true]],
};
const data={talents:[],schedule:[],news:[],home:[],settings:[]};
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
 if(type==="memberSelect")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}（複数選択可）</legend><small>未選択の場合は画像のある公開メンバー全員を表示します。</small>${data.talents.filter(t=>t.published===true).map(t=>`<label><input type="checkbox" name="${key}" value="${esc(t.id)}">${esc(t.name)}</label>`).join("")}</fieldset>`;
 if(type==="themeColor")return `<div class="admin-field"><label>イメージカラー（任意）<input name="${key}" type="text" pattern="#[0-9a-fA-F]{6}" placeholder="#1978C8" maxlength="7"></label><label>カラーピッカー <input type="color" data-theme-picker value="#1978c8"></label><small>空欄の場合は標準の青を使用します。</small></div>`;
 if(type==="checkbox")return `<label class="admin-check"><input name="${key}" type="checkbox"><span>${label}</span></label>`;
 if(type==="visibility")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}</legend><small>チェックした項目はプロフィールに表示されません。未選択なら従来どおり表示されます。</small><div class="admin-choice-grid">${[["bio","自己紹介"],["facts","基本プロフィール"],["personality","趣味・好きなもの"],["fan","ファン情報"],["gallery","アバターギャラリー"],["activity","活動情報"],["achievements","活動実績"],["schedule","配信スケジュール"],["message","本人メッセージ"],["credit","クリエイター"],["links","公式リンク"]].map(([v,l])=>`<label><input type="checkbox" name="hiddenSections" value="${v}"><span>${l}</span></label>`).join("")}</div></fieldset>`;
 if(type==="achievements")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="4" placeholder="2026-11-23 | 活動開始 | 架空事務所 ぽっぽーで活動開始"></textarea><small>日付は任意です。日付・内容・詳細を「 | 」で区切って入力します。</small></label>`;
 if(type==="cohort")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}（複数選択可）</legend><div class="admin-choice-grid">${["0期生",...Array.from({length:10},(_,i)=>(i+1)+"期生"),"その他"].map(v=>`<label><input type="checkbox" name="cohort" value="${v}"><span>${v}</span></label>`).join("")}</div></fieldset>`;
 if(type==="image")return `<div class="admin-field admin-field-wide admin-image-field"><span>${label}</span><input type="file" name="${key}File" accept="image/png,image/jpeg,image/webp,image/gif"><small>画像を選ぶとGitHubの ${key==="heroImage"?"assets/images/home/":key==="thumbnailImage"?"assets/images/news/":"assets/images/talents/"} にアップロードします。PNG・JPG・WebP・GIF、最大8MB。</small><input type="hidden" name="${key}"><span class="admin-image-path" data-image-path="${key}"></span></div>`;
 if(type==="gallery")return `<div class="admin-field admin-field-wide admin-image-field"><span>${label}</span><input type="file" name="${key}File" accept="image/png,image/jpeg,image/webp,image/gif" multiple><small>複数画像をまとめて選択できます。選択した順に掲載します。PNG・JPG・WebP・GIF、1枚8MB以下。画像はGitHubの assets/images/talents/ に保存します。</small><input type="hidden" name="${key}"><div class="admin-gallery-path" data-image-path="${key}"></div></div>`;
 if(type==="textarea")return `<label class="admin-field admin-field-wide"><span>${label}${required?" *":""}</span><textarea name="${key}" rows="4"${req}></textarea></label>`;
 if(type==="roles")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="2" placeholder="代表者, 盛り上げ会長"></textarea><small>入力した役職はメンバーカードとプロフィールに表示されます。</small></label>`;
 if(type==="agency")return `<label class="admin-field"><span>${label}</span><input name="${key}" type="text" placeholder="例：〇〇プロダクション"><small>ぽっぽー以外に所属事務所・所属先がある場合のみ入力してください。</small></label>`;
 if(type==="tags"||type==="links")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="3" placeholder="${type==="tags"?"雑談, ゲーム":"X | https://x.com/..."}"></textarea></label>`;
 return `<label class="admin-field"><span>${label}${required?" *":""}</span><input name="${key}" type="${type}"${req} ${key==="url"?'placeholder="https://"':""}></label>`;
}
function renderForm(item={}){
 const form=$("content-form");form.reset();$("form-fields").innerHTML=SCHEMAS[current].map(fieldHtml).join("");
 for(const [key,,type] of SCHEMAS[current]){
  const el=form.elements.namedItem(key);if(!el&&type!=="memberSelect")continue;
  if(type==="memberSelect")form.querySelectorAll('input[name="featuredIds"]').forEach(e=>e.checked=(item[key]||[]).includes(e.value));
  else if(type==="checkbox")el.checked=item[key]===true;
  else if(type==="visibility"){const values=Array.isArray(item[key])?item[key]:[];form.querySelectorAll('input[name="hiddenSections"]').forEach(input=>input.checked=values.includes(input.value))}
  else if(type==="achievements"){el.value=Array.isArray(item[key])?item[key].map(x=>[x.date||"",x.title||"",x.description||""].join(" | ")).join("\n"):(item[key]||"")}
  else if(type==="cohort"){const values=Array.isArray(item[key])?item[key]:item[key]?[item[key]]:[];form.querySelectorAll('input[name="cohort"]').forEach(input=>input.checked=values.includes(input.value))}
  else if(type==="image"){el.value=item[key]||"";const note=form.querySelector(`[data-image-path="${key}"]`);if(note)note.innerHTML=item[key]?`登録済み: ${esc(item[key])} <button type="button" class="admin-small-button danger" data-image-delete="${key}" data-image-path-value="${esc(item[key])}">${["thumbnailImage","heroImage"].includes(key)?"掲載解除":"GitHubから削除"}</button>`:"画像未登録"}
  else if(type==="gallery"){const values=Array.isArray(item[key])?item[key]:item[key]?[item[key]]:[];el.value=JSON.stringify(values);const note=form.querySelector(`[data-image-path="${key}"]`);if(note)note.innerHTML=values.length?values.map((v,i)=>`<span>${i+1}. ${esc(v)} <button type="button" class="admin-small-button danger" data-gallery-delete="${i}">GitHubから削除</button></span>`).join(""):"画像未登録"}
  else if(type==="tags"||type==="roles")el.value=Array.isArray(item[key])?item[key].join(", "):(item[key]||"");
  else if(type==="links")el.value=Array.isArray(item[key])?item[key].map(x=>(x.label||"")+" | "+(x.url||"")).join("\n"):"";
  else el.value=item[key]??"";
 }
 const color=form.elements.namedItem("imageColor"),picker=form.querySelector("[data-theme-picker]");if(color&&picker){const sync=()=>{picker.value=/^#[0-9a-f]{6}$/i.test(color.value)?color.value:"#1978c8"};sync();color.addEventListener("input",sync);picker.addEventListener("input",()=>{color.value=picker.value})}
 $("editor-title").textContent=LABELS[current]+"を"+(editing<0?"登録":"編集");
 $("save-button").textContent=editing<0?"登録する":"変更を保存";
 $("publish-description").textContent=LABELS[current]+"のデータ "+data[current].length+"件をGitHubへ公開します。";
}
function summary(item){
 if(singleton(current))return LABELS[current];
 if(current==="talents")return [item.name].filter(Boolean).join(" / ");
 if(current==="schedule")return [item.date,item.time,item.title].filter(Boolean).join("　");
 return [item.date,item.title].filter(Boolean).join("　");
}

function renderDashboard(){
 const metrics=$("cms-metrics");if(!metrics)return;
 const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 const members=data.talents.filter(Boolean),cohorts=new Map();
 for(const t of members){const groups=Array.isArray(t.cohort)?t.cohort:t.cohort?[t.cohort]:[];for(const g of new Set(groups.filter(Boolean).length?groups.filter(Boolean):["未設定"]))cohorts.set(g,(cohorts.get(g)||0)+1)}
 const upcoming=data.schedule.filter(s=>s&&s.date>=today).sort((a,b)=>(a.date+" "+(a.time||"")).localeCompare(b.date+" "+(b.time||"")));
 const dates=[];
 for(const t of members)for(const [key,label] of [["birthday","誕生日"],["anniversary","活動記念日"],["debutDate","デビュー記念日"]]){
 const raw=String(t[key]||"").trim(),m=raw.match(/^(?:\d{4}[-/])?(\d{1,2})(?:月|[-/])(\d{1,2})日?$/);if(!m)continue;
 const month=Number(m[1]),day=Number(m[2]);let year=Number(today.slice(0,4));let date="";
 for(let i=0;i<9;i++,year++){const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCMonth()!==month-1||d.getUTCDate()!==day)continue;const iso=d.toISOString().slice(0,10);if(iso>=today){date=iso;break}}
 if(date)dates.push({date,label,name:t.name,published:t.published===true});
 }
 dates.sort((a,b)=>a.date.localeCompare(b.date));
 const state=x=>x.published===true?"公開設定":"非公開";
 const rows=(items,fn,empty)=>items.length?items.slice(0,5).map(fn).join(""):'<p class="admin-empty">'+empty+'</p>';
 metrics.innerHTML=Object.keys(FILES).filter(k=>!singleton(k)).map(k=>{const total=data[k].length,pub=data[k].filter(x=>x?.published===true).length;return '<div class="cms-metric"><span>'+LABELS[k]+'</span><strong>'+total+'</strong><small>公開設定 '+pub+' 件 / 非公開 '+(total-pub)+' 件</small></div>'}).join("");
 const detail=$("cms-overview");if(!detail)return;
 detail.innerHTML='<section class="cms-overview-panel"><h3>期生別メンバー数</h3>'+rows([...cohorts].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),"ja",{numeric:true})),([g,n])=>'<div class="cms-overview-row"><span>'+esc(g)+'</span><strong>'+n+' 名</strong></div>',"登録メンバーなし")+'<small>複数期生はそれぞれに集計します（最大5区分表示）。</small></section><section class="cms-overview-panel"><h3>直近の配信予定</h3>'+rows(upcoming,s=>'<div class="cms-overview-row"><div><small>'+esc(s.date)+' '+esc(s.time)+'</small><strong>'+esc(s.title)+'</strong><small>'+esc(s.talent)+'</small></div><span>'+state(s)+'</span></div>',"今後の配信予定はありません")+'</section><section class="cms-overview-panel"><h3>誕生日・活動記念日</h3>'+rows(dates,d=>'<div class="cms-overview-row"><div><small>'+esc(d.date)+'</small><strong>'+esc(d.name)+'</strong><small>'+esc(d.label)+'</small></div><span>'+state(d)+'</span></div>',"登録された記念日はありません")+'</section>';
}

function renderList(){
 renderDashboard();
 const list=data[current],term=($("cms-search")?.value||"").trim().toLowerCase(),visibility=$("cms-visibility")?.value||"",filtered=list.map((item,i)=>({item,i})).filter(({item})=>(!visibility||(item.published===true)===(visibility==="yes"))&&JSON.stringify(item).toLowerCase().includes(term));$("item-count").textContent=filtered.length+" / "+list.length+"件";
 $("content-list").innerHTML=filtered.length?filtered.map(({item,i})=>`<article class="admin-list-item"><div><strong>${esc(summary(item)||"名称未設定")}</strong><span class="admin-publish-state ${item.published?"is-published":""}">${item.published?"公開設定":"非公開"}</span></div><div class="admin-list-actions"><button type="button" data-edit="${i}" class="admin-small-button">編集</button><button type="button" data-delete="${i}" class="admin-small-button danger">削除</button></div></article>`).join(""):'<p class="admin-empty">登録済みデータはありません。</p>';
}
$("cms-search")?.addEventListener("input",renderList);
$("cms-visibility")?.addEventListener("change",renderList);
function renderTabs(){
 if($("cms-search"))$("cms-search").value="";if($("cms-visibility"))$("cms-visibility").value="";
 document.querySelectorAll(".admin-tab").forEach(b=>{const active=b.dataset.kind===current;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});
 if(singleton(current)){editing=data[current].length?0:-1;renderForm(data[current][0]||{})}else renderForm();renderList();updateAuthUI();
}
function formObject(){
 const obj={};
 for(const [key,,type] of SCHEMAS[current]){
  const el=$("content-form").elements.namedItem(key);if(!el&&type!=="memberSelect")continue;
  if(type==="memberSelect")obj[key]=Array.from($("content-form").querySelectorAll('input[name="featuredIds"]:checked')).map(e=>e.value);
  else if(type==="checkbox")obj[key]=el.checked;
  else if(type==="visibility")obj[key]=Array.from($("content-form").querySelectorAll('input[name="hiddenSections"]:checked')).map(input=>input.value);
  else if(type==="achievements")obj[key]=el.value.split(/\r?\n/).map(line=>{const parts=line.split("|").map(s=>s.trim());return parts[1]?{date:parts[0],title:parts[1],description:parts.slice(2).join(" | ")}:null}).filter(Boolean);
  else if(type==="cohort")obj[key]=Array.from($("content-form").querySelectorAll('input[name="cohort"]:checked')).map(input=>input.value);
  else if(type==="image")obj[key]=el.value;
  else if(type==="gallery"){try{obj[key]=JSON.parse(el.value||"[]")}catch{obj[key]=[]}}
  else if(type==="tags"||type==="roles")obj[key]=el.value.split(",").map(s=>s.trim()).filter(Boolean);
  else if(type==="links")obj[key]=el.value.split("\n").map(line=>{const i=line.indexOf("|");return i<0?null:{label:line.slice(0,i).trim(),url:line.slice(i+1).trim()}}).filter(x=>x&&x.label&&/^https?:\/\//i.test(x.url));
  else obj[key]=el.value.trim();
 }
 return obj;
}
function validateDataset(kind,items){
 if(singleton(kind)&&Array.isArray(items)&&items.length>1)return "トップページ設定は1件のみです。";
 if(!Array.isArray(items))return "データ形式が配列ではありません。";
 const ids=new Set();
 for(let i=0;i<items.length;i++){
  const item=items[i];
  if(!item||typeof item!=="object"||Array.isArray(item))return (i+1)+"件目のデータ形式が正しくありません。";
  for(const [key,label,,required] of SCHEMAS[kind])if(required&&(!String(item[key]??"").trim()))return (i+1)+"件目:「"+label+"」を入力してください。";
  if(["talents","news"].includes(kind)){
   if(!/^[A-Za-z0-9_-]+$/.test(item.id||""))return (i+1)+"件目: IDは半角英数字・ハイフン・アンダースコアで入力してください。";
   if(ids.has(item.id))return "ID「"+item.id+"」が重複しています。";
   ids.add(item.id);
  }
  if(kind==="schedule"&&(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!/^\d{2}:\d{2}$/.test(item.time)))return (i+1)+"件目: 日付または時刻の形式を確認してください。";
  if(kind==="news"&&item.thumbnailImage&&!/^assets\/images\/news\/[A-Za-z0-9_-]+\.(png|jpg|webp|gif)$/.test(item.thumbnailImage))return "ニュース画像の保存先が正しくありません。";
  if(kind==="news"&&!/^\d{4}-\d{2}-\d{2}$/.test(item.date))return (i+1)+"件目: 日付はYYYY-MM-DD形式で入力してください。";
  if(kind==="settings")for(const key of ["applicationUrl","contactUrl"])if(item[key]){try{if(new URL(item[key]).protocol!=="https:")throw Error()}catch{return "窓口URLは有効なHTTPS URLを指定してください。"}}
  if(item.url&&!/^https?:\/\//i.test(item.url))return (i+1)+"件目: URLはhttp://またはhttps://で始めてください。";
  if(kind==="talents"&&item.cohort!==undefined&&!Array.isArray(item.cohort))item.cohort=item.cohort?[item.cohort]:[];
  if(kind==="talents")for(const key of ["iconImage","avatarImage"])if(item[key]&&!/^(https:\/\/|assets\/images\/talents\/)/i.test(item[key]))return (i+1)+"件目: 画像の保存先が正しくありません。";
  if(kind==="talents"&&item.avatarImages!==undefined&&(!Array.isArray(item.avatarImages)||item.avatarImages.some(v=>typeof v!=="string"||!/^(https:\/\/|assets\/images\/talents\/)/i.test(v))))return (i+1)+"件目: アバターギャラリーの画像データを確認してください。";
  if(Array.isArray(item.links)&&item.links.some(x=>!x||!x.label||!/^https?:\/\//i.test(x.url||"")))return (i+1)+"件目: 公式リンクの表示名またはURLを確認してください。";
 }
 return "";
}
async function uploadTalentImage(input){
 if(!authReady()){input.value="";status("画像をGitHubへ保存するには、先にGitHubへログインしてください。");return}
 const form=$("content-form"),key=input.name.replace(/File$/,""),id=(key==="heroImage"?"home":form.elements.namedItem("id")?.value||"").trim();
 if(!/^[A-Za-z0-9_-]+$/.test(id)){input.value="";status("先に記事またはメンバーのIDを半角英数字・ハイフン・アンダースコアで入力してください。");return}
 const files=Array.from(input.files||[]);if(!files.length)return;
 const allowed={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"};
 if(files.some(file=>!allowed[file.type])){input.value="";status("PNG・JPG・WebP・GIF形式の画像を選択してください。");return}
 if(files.some(file=>file.size>8*1024*1024)){input.value="";status("画像は1枚8MB以下にしてください。");return}
 input.disabled=true;status(files.length+"枚の画像をGitHubへアップロードしています...");
 try{
  const gallery=key==="avatarImages",hidden=form.elements.namedItem(key);
  const existing=gallery?JSON.parse(hidden.value||"[]"):[];
  let uploaded=[];
  for(let i=0;i<files.length;i++){
   const file=files[i],ext=allowed[file.type];
   let path;
   if(gallery){
    const n=Math.max(0,...existing.concat(uploaded).map(p=>Number(p.match(/-look-(\d+)\./)?.[1]||0)))+1;
    const seq=String(n).padStart(3,"0");
    path="assets/images/talents/"+id+"-look-"+seq+"."+ext;
   }else if(key==="heroImage")path="assets/images/home/home-"+crypto.randomUUID()+"."+ext;
   else if(key==="thumbnailImage")path="assets/images/news/"+id+"-"+crypto.randomUUID()+"."+ext;
   else path="assets/images/talents/"+id+"-"+(key==="iconImage"?"icon":"avatar")+"."+ext;
   const encodedPath=path.split("/").map(encodeURIComponent).join("/");
   const get=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath+"?ref="+encodeURIComponent(BRANCH));
   let sha=null;if(get.status===200)sha=(await get.json()).sha;else if(get.status!==404)throw new Error("画像の保存先を確認できませんでした ("+get.status+")");
   const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);
   const payload={message:"Upload image "+key+" for "+id,content:btoa(binary),branch:BRANCH};if(sha)payload.sha=sha;
   const put=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath,{method:"PUT",body:JSON.stringify(payload)});
   if(!put.ok){const detail=await put.text();throw new Error("画像のアップロードに失敗しました ("+put.status+"): "+detail.slice(0,180))}
   uploaded.push(path);
  }
  if(gallery){
   const values=[...existing,...uploaded];hidden.value=JSON.stringify(values);
   const note=form.querySelector(`[data-image-path="${key}"]`);if(note)note.innerHTML=values.map((v,i)=>`<span>${i+1}. ${esc(v)} <button type="button" class="admin-small-button danger" data-gallery-delete="${i}">GitHubから削除</button></span>`).join("");
  }else{
   if(!hidden.isConnected){status("画像は保存されましたが、編集画面が切り替わったため登録されていません。");return}
   hidden.value=uploaded[0];
   const note=form.querySelector(`[data-image-path="${key}"]`);if(note)note.innerHTML=`GitHubに保存済み: ${esc(uploaded[0])} <button type="button" class="admin-small-button danger" data-image-delete="${key}" data-image-path-value="${esc(uploaded[0])}">${["thumbnailImage","heroImage"].includes(key)?"掲載解除":"GitHubから削除"}</button>`;
  }
  saveDraft();status(files.length+"枚の画像をGitHubに保存しました。編集データを登録後、「このデータを公開する」を押してください。");
 }catch(error){status(error.message||"画像のアップロードに失敗しました。")}
 finally{input.disabled=false;input.value=""}
}
async function deleteTalentImage(key,path,index=null){
 if(!authReady()){status("画像を削除するにはGitHubへログインしてください。");return}
 const form=$("content-form"),id=(form.elements.namedItem("id")?.value||"").trim();
 const patterns={thumbnailImage:/^assets\/images\/news\/[A-Za-z0-9_-]+-[0-9a-f-]{36}\.(png|jpg|webp|gif)$/,iconImage:new RegExp("^assets/images/talents/"+id+"-icon\\.(png|jpg|webp|gif)$"),avatarImage:new RegExp("^assets/images/talents/"+id+"-avatar\\.(png|jpg|webp|gif)$"),avatarImages:new RegExp("^assets/images/talents/"+id+"-look-[0-9]{3}\\.(png|jpg|webp|gif)$")};
 if(!/^[A-Za-z0-9_-]+$/.test(id)||!patterns[key]||!patterns[key].test(path)||(key==="thumbnailImage"&&!path.startsWith("assets/images/news/"+id+"-"))){status("安全確認のため、この画像は管理画面から削除できません。");return}
 if(!confirm("GitHubから画像ファイルを完全に削除します。元に戻すには再アップロードが必要です。続行しますか？"))return;
 try{
  status("GitHubから画像を削除しています...");
  const encodedPath=path.split("/").map(encodeURIComponent).join("/");
  const get=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath+"?ref="+encodeURIComponent(BRANCH));
  if(get.status===404)throw new Error("GitHub上に画像ファイルが見つかりません。");
  if(!get.ok)throw new Error("画像情報を取得できませんでした ("+get.status+")");
  const file=await get.json();
  const del=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath,{method:"DELETE",body:JSON.stringify({message:"Delete talent image "+path,sha:file.sha,branch:BRANCH})});
  if(!del.ok){const detail=await del.text();throw new Error("画像の削除に失敗しました ("+del.status+"): "+detail.slice(0,180))}
  if(key==="avatarImages"){
   const hidden=form.elements.namedItem(key),values=JSON.parse(hidden.value||"[]");values.splice(index,1);hidden.value=JSON.stringify(values);
   const note=form.querySelector('[data-image-path="avatarImages"]');if(note)note.innerHTML=values.length?values.map((v,i)=>`<span>${i+1}. ${esc(v)} <button type="button" class="admin-small-button danger" data-gallery-delete="${i}">GitHubから削除</button></span>`).join(""):"画像未登録";
  }else{
   form.elements.namedItem(key).value="";
   const note=form.querySelector(`[data-image-path="${key}"]`);if(note)note.textContent="画像未登録";
  }
  saveDraft();status("GitHubから画像を削除しました。プロフィールデータの変更を反映するには「このデータを公開する」を押してください。");
 }catch(error){status(error.message||"画像の削除に失敗しました。")}
}
$("form-fields").addEventListener("click",e=>{
 const galleryButton=e.target.closest("[data-gallery-delete]"),singleButton=e.target.closest("[data-image-delete]");
 if(galleryButton){const form=$("content-form"),values=JSON.parse(form.elements.namedItem("avatarImages").value||"[]");deleteTalentImage("avatarImages",values[Number(galleryButton.dataset.galleryDelete)],Number(galleryButton.dataset.galleryDelete))}
 if(singleButton){if(["thumbnailImage","heroImage"].includes(singleButton.dataset.imageDelete)){const key=singleButton.dataset.imageDelete;const el=$("content-form").elements.namedItem(key);el.value="";$("content-form").querySelector(`[data-image-path="${key}"]`).textContent="画像未登録";status("画像の掲載を解除しました。保存・公開すると反映されます。元ファイルはGitHubに残ります。")}else deleteTalentImage(singleButton.dataset.imageDelete,singleButton.dataset.imagePathValue);}
});
$("form-fields").addEventListener("change",e=>{if(e.target.matches('input[type="file"][name$="File"]'))uploadTalentImage(e.target)});
$("content-form").addEventListener("submit",e=>{
 e.preventDefault();const obj=formObject();
 
 
 if(obj.url&&!/^https?:\/\//i.test(obj.url)){status("URLは http:// または https:// で始まる形式にしてください。");return}
 if(obj.id&&data[current].some((x,i)=>x.id===obj.id&&i!==editing)){status("同じIDがすでに登録されています。別のIDを指定してください。");return}
 if(singleton(current))data[current]=[obj];else if(editing<0)data[current].push(obj);else data[current][editing]={...data[current][editing],...obj};
 editing=singleton(current)?0:-1;renderForm(singleton(current)?data[current][0]:{});renderList();saveDraft();status("変更を一時保存しました。公開するには「このデータを公開する」を押してください。");
});
$("clear-button").addEventListener("click",()=>{editing=-1;renderForm();status("入力欄をクリアしました。")});
$("content-list").addEventListener("click",e=>{
 const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
 if(edit){editing=Number(edit.dataset.edit);renderForm(data[current][editing]);window.scrollTo({top:$("content-form").getBoundingClientRect().top+window.scrollY-110,behavior:"smooth"})}
 if(del){const i=Number(del.dataset.delete);if(!confirm("このデータを削除しますか？"))return;data[current].splice(i,1);editing=-1;saveDraft();renderForm();renderList();status("データを削除しました。公開するには公開ボタンを押してください。")}
});
document.querySelectorAll(".admin-tab").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.kind;editing=-1;renderTabs()}));
$("reset-button").addEventListener("click",async()=>{
 if(!confirm("このブラウザー内の編集内容を破棄し、GitHub上の公開データを読み直しますか？"))return;
 try{await loadRemote();localStorage.removeItem(STORAGE_KEY);editing=-1;renderTabs();status("公開データを読み込みました。")}catch(e){status(e.message+"。編集内容は維持しました。")}
});
async function loadRemote(){
 const next={};for(const key of Object.keys(FILES)){const r=await fetch("data/"+FILES[key],{cache:"no-store"});if(!r.ok)throw new Error("公開データを取得できません: "+LABELS[key]);const a=await r.json();if(!Array.isArray(a))throw new Error("データ形式が不正です: "+LABELS[key]);next[key]=a}Object.assign(data,next);
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
 const kind=current, snapshot=JSON.stringify(data[current],null,2)+"\n",file="data/"+FILES[kind],button=$("publish-button");
 if(!confirm(LABELS[current]+"のデータ "+data[current].length+"件をGitHubへ公開します。よろしいですか？"))return;
 button.disabled=true;button.textContent="公開中...";
 try{
  const encodedPath=file.split("/").map(encodeURIComponent).join("/");
  const get=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath+"?ref="+encodeURIComponent(BRANCH));
  let sha=null;
  if(get.status===200){const existing=await get.json();sha=existing.sha}
  else if(get.status!==404){const detail=await get.text();throw new Error("現在の公開データを確認できませんでした ("+get.status+"): "+detail.slice(0,180))}
  const payload={message:"Update "+file+" via Poppoo Admin",content:base64Utf8(snapshot),branch:BRANCH};
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
 try{await loadRemote()}catch(e){status(e.message+"。再読み込みしてください。");return}
 try{const draft=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(draft&&typeof draft==="object")for(const key of Object.keys(FILES))if(Array.isArray(draft[key]))data[key]=draft[key]}catch{}
 renderTabs();status("準備完了。編集内容はこのブラウザー内に一時保存されます。");
})();
})();