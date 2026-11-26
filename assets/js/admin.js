(() => {
"use strict";
const REPO="rinseishirasu/poppoo-official";
const BRANCH="main";
const API="https://api.github.com";
const AUTH_API=(document.querySelector('meta[name="poppoo-auth-api"]')?.content||"").replace(/\/$/,"");
const FILES={talents:"talents.json",schedule:"schedule.json",news:"news.json",home:"home.json",settings:"settings.json"};
const LABELS={talents:"参加メンバー",schedule:"配信予定",news:"お知らせ",home:"トップページ設定",settings:"サイト基本設定"};
const STORAGE_KEY="poppoo-admin-draft-v1";
const BASELINE_KEY=STORAGE_KEY+"-baseline";
let draftConflict=false, dataReady=false, imageBusy=false;
const singleton=k=>["home","settings"].includes(k);
const SCHEMAS={
 settings:[["published","設定を有効にする","checkbox"],["operator","運営者名","text"],["representative","代表者","text"],["chair","盛り上げ会長","text"],["managementIds","ABOUT運営メンバー紹介","managementOrder"],["founded","設立・活動開始日（表示用）","text"],["base","活動拠点","text"],["aboutLead","コミュニティ紹介","textarea"],["communityPolicy","運営方針","textarea"],["joinIntro","参加案内の紹介文","textarea"],["requirements","募集対象（1行に1項目）","textarea"],["applicationUrl","応募窓口URL（HTTPS・任意）","url"],["contactUrl","お問い合わせ窓口URL（HTTPS・任意）","url"],["footerText","フッター紹介文","textarea"],["seoTitle","検索・SNS表示タイトル（トップページ）","text"],["seoDescription","検索・SNS表示説明文（トップページ）","textarea"],["seoImage","SNS共有画像パス（画像ライブラリからコピー）","text"]],
 home:[["published","設定を有効にする","checkbox"],["headline1","キャッチコピー1行目","text"],["headline2","キャッチコピー2行目","text"],["lead","紹介メッセージ","textarea"],["heroImage","メインビジュアル画像（任意）","image"],["featuredIds","ピックアップメンバー","memberSelect"],["notice","トップページのお知らせ（任意）","textarea"],["aboutText","コミュニティ紹介文","textarea"],["joinText","参加案内メッセージ","text"],...["News","Schedule","Members","About","Join"].map((v,i)=>["hide"+v,["最新情報","配信予定","メンバー","概要","参加案内"][i]+"を非表示","checkbox"])],
 talents:[["id","ID","text",true],["published","公開する","checkbox"],["name","活動名","text",true],["imageColor","イメージカラー（任意）","themeColor"],["cohort","期生","cohort"],["roles","コミュニティ内の役職（複数はカンマ区切り）","roles"],["affiliationAgency","所属事務所（任意）","agency"],["iconImage","プロフィールアイコン画像","image"],["avatarImages","アバター画像（先頭がメイン）","gallery"],["catchphrase","キャッチコピー","text"],["bio","自己紹介","textarea"],["achievements","活動実績（1行に「日付 | 内容 | 詳細」）","achievements"],["hiddenSections","公式サイトに表示しない項目","visibility"],["birthday","誕生日（例：1月1日）","text"],["debutDate","REALITYデビュー日","date"],["joinDate","ぽっぽー加入日","date"],["anniversaries","その他の記念日（1行に 日付 | 記念日名）","anniversaries"],["activityStatus","活動状況（例：活動中・休止中）","text"],["regularSchedule","定期配信（例：毎週金曜21:00）","text"],["fanName","ファンネーム","text"],["oshiMark","推しマーク","text"],["streamTag","配信タグ","text"],["fanArtTag","ファンアートタグ","text"],["likes","趣味・好きなもの","textarea"],["tags","主な配信ジャンル（カンマ区切り）","tags"],["links","公式リンク（1行に「表示名 | URL」）","links"]],
 schedule:[["published","公開する","checkbox"],["memberId","参加メンバー","scheduleMember"],["talent","参加メンバー名","scheduleName",true],["date","配信日","date",true],["time","開始時刻","time",true],["title","配信タイトル","text",true],["platform","配信プラットフォーム","text"],["url","配信先URL（任意）","url"]],
 news:[["id","ID","text",true],["published","公開する","checkbox"],["date","投稿日","date",true],["title","タイトル","text",true],["category","カテゴリ","text"],["memberIds","関連メンバー","newsMembers"],["thumbnailImage","サムネイル画像（任意）","image"],["summary","概要","textarea"],["body","本文","textarea",true]],
};
const data={talents:[],schedule:[],news:[],home:[],settings:[]};
const baseline={};
let publishing=false;
let current="talents",editing=-1,accessToken="",githubLogin="",tokenExpiresAt=0,authPopup=null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(message){const el=$("admin-status");el.textContent=message;el.dataset.tone=/失敗|できません|不正|停止|中止|重複/.test(message)?"error":/公開しました|保存しました|準備完了|読み込みました/.test(message)?"success":/確認|注意|未保存/.test(message)?"warning":"info"}
function saveDraft(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));if(!draftConflict)localStorage.setItem(BASELINE_KEY,JSON.stringify(baseline));return true}catch{status("ブラウザー内に保存できませんでした。公開操作を行う前に内容を控えてください。");return false}}
function authReady(){return Boolean(accessToken&&Date.now()<tokenExpiresAt)}
function updateAuthUI(){
 const ready=authReady();
 $("cms-top-auth").textContent=ready?"@"+githubLogin:"未ログイン";
 $("auth-status").textContent=ready?"ログイン中: @"+githubLogin:"ログインしていません";
 $("auth-detail").textContent=ready?"GitHubへの直接公開が利用できます。ログインはこのブラウザーのメモリー上だけで保持されます。":(AUTH_API.includes("YOUR-WORKER")||!AUTH_API?"認証サーバーの設定がまだ完了していません。セットアップガイドを確認してください。":"公開するには運営者のGitHubアカウントでログインしてください。");
 $("login-button").disabled=ready||!AUTH_API||AUTH_API.includes("YOUR-WORKER");
 $("logout-button").disabled=!ready;
 $("publish-button").disabled=!ready||!dataReady||publishing||imageBusy||draftConflict;
 document.querySelector(".admin-auth-panel").dataset.authenticated=String(ready);
}
function fieldHtml(field){
 const [key,label,type,required]=field,req=required?" required":"",mark=required?' <span class="admin-required-label">必須</span>':"";
 if(type==="managementOrder")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}</legend><small>掲載するメンバーを追加し、上下ボタンで表示順を設定できます。公開設定が有効なメンバーのみ公式HPに掲載されます。全員を除外すると掲載なしになります。</small><input type="hidden" name="${key}"><div data-management-list></div><label>追加するメンバー<select data-management-select><option value="">メンバーを選択</option></select></label><button type="button" class="admin-small-button" data-management-add>追加</button><button type="button" class="admin-small-button" data-management-default>初期の4名に戻す</button></fieldset>`;
 if(type==="newsMembers")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}（複数選択可）</legend><small>選択したメンバーの個別プロフィールにこの記事を掲載します。未選択の場合は共通のお知らせとしてNEWSのみに掲載されます。</small><div class="admin-choice-grid" data-related-options>${data.talents.filter(t=>t?.id).map(t=>`<label><input type="checkbox" name="${key}" value="${esc(t.id)}"><span>${esc(t.name||t.id)}${t.published===true?"":"（非公開）"}</span></label>`).join("")}</div></fieldset>`;
 if(type==="scheduleName")return '<input type="hidden" name="talent">';
 if(type==="scheduleMember")return '<fieldset class="admin-choice-group admin-field-wide schedule-participant-editor"><legend>配信形式・参加者</legend><label>配信形式<select name="scheduleFormat"><option value="solo">ソロ配信</option><option value="collab">コラボ配信</option></select></label><input type="hidden" name="memberId"><input type="hidden" name="scheduleMemberIds"><input type="hidden" name="scheduleGuests"><div class="schedule-member-picker"><label>ぽっぽーの参加メンバー<select data-schedule-member-select><option value="">メンバーを選択</option></select></label><button type="button" class="admin-small-button" data-schedule-member-add>追加</button></div><div data-schedule-members></div><div data-schedule-guest-panel hidden><h3>外部コラボ相手</h3><p class="small">掲載許諾を確認してください。公式リンクは任意です。</p><div data-schedule-guests></div><button type="button" class="admin-small-button" data-schedule-guest-add>＋ 外部コラボ相手を追加</button></div><p data-schedule-participant-count role="status"></p></fieldset>';
 if(type==="memberSelect")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}（複数選択可）</legend><small>未選択の場合は公開メンバー全員を表示します。画像未設定のメンバーは代替アイコンで表示されます。</small>${data.talents.filter(t=>t.published===true).map(t=>`<label><input type="checkbox" name="${key}" value="${esc(t.id)}">${esc(t.name)}</label>`).join("")}</fieldset>`;
 if(type==="themeColor")return `<div class="admin-field admin-field-wide"><label>イメージカラー（任意）<input name="${key}" type="text" pattern="#[0-9a-fA-F]{6}" placeholder="#666666" maxlength="7"></label><label>カラーピッカー <input type="color" data-theme-picker value="#666666"></label><button type="button" class="admin-small-button" data-theme-clear>標準色に戻す</button><div class="admin-theme-preview" data-theme-preview><span class="admin-theme-swatch" aria-hidden="true"></span><div><strong>MEMBER PROFILE</strong><p>イメージカラーの表示見本</p><small data-theme-label></small></div></div><small>空欄の場合はニュートラルなグレーを使用します。本文・見出しは読みやすさを保つように自動調整します。</small></div>`;
 if(type==="checkbox")return `<label class="admin-check"><input name="${key}" type="checkbox"><span>${label}</span></label>`;
 if(type==="visibility")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}</legend><small>チェックした項目は公式サイトの該当表示・検索対象から除外します。GitHubの公開リポジトリに保存されたデータ自体は非公開になりません。機密情報は登録しないでください。</small><div class="admin-choice-grid">${[["bio","自己紹介"],["facts","基本プロフィール"],["personality","趣味・好きなもの"],["fan","ファン情報"],["gallery","アバターギャラリー"],["activity","活動状況・配信ジャンル・定期配信"],["achievements","活動実績"],["schedule","配信スケジュール"],["news","関連ニュース"],["links","公式リンク"]].map(([v,l])=>`<label><input type="checkbox" name="hiddenSections" value="${v}"><span>${l}</span></label>`).join("")}</div></fieldset>`;
 if(type==="anniversaries")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="5" placeholder="2026-11-23 | 新ビジュアル公開"></textarea><small>YYYY-MM-DD または MM-DD と記念日名を入力してください。</small></label>`;
 if(type==="achievements")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="4" placeholder="2026-11-23 | 活動開始 | 架空事務所 ぽっぽーで活動開始"></textarea><small>日付は任意です。日付・内容・詳細を「 | 」で区切って入力します。公開メンバーの表示対象の活動実績は、ACTIVITY・TOP・サイト内検索にも掲載されます。</small></label>`;
 if(type==="cohort")return `<fieldset class="admin-choice-group admin-field-wide"><legend>${label}（複数選択可）</legend><div class="admin-choice-grid">${["0期生",...Array.from({length:10},(_,i)=>(i+1)+"期生"),"その他"].map(v=>`<label><input type="checkbox" name="cohort" value="${v}"><span>${v}</span></label>`).join("")}</div></fieldset>`;
 if(type==="image")return `<div class="admin-field admin-field-wide admin-image-field"><span>${label}</span><input type="file" name="${key}File" accept="image/png,image/jpeg,image/webp,image/gif"><small>画像を選ぶとGitHubの ${key==="heroImage"?"assets/images/home/":key==="thumbnailImage"?"assets/images/news/":"assets/images/talents/"} にアップロードします。PNG・JPG・WebP・GIF、最大8MB。</small><input type="hidden" name="${key}"><span class="admin-image-path" data-image-path="${key}"></span></div>`;
 if(type==="gallery")return `<div class="admin-field admin-field-wide admin-image-field"><span>${label}</span><input type="file" name="${key}File" accept="image/png,image/jpeg,image/webp,image/gif" multiple><small>先頭の画像がメインアバター、2枚目以降がギャラリーになります。PNG・JPG・WebP・GIF、1枚8MB以下。画像は選択・アップロード時点で公開GitHubに保存されます。</small><input type="hidden" name="${key}"><div class="admin-gallery-path" data-image-path="${key}"></div></div>`;
 if(type==="textarea")return `<label class="admin-field admin-field-wide"><span>${label}${mark}</span><textarea name="${key}" rows="4"${req}></textarea></label>`;
 if(type==="roles")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="2" placeholder="代表者, 盛り上げ会長"></textarea><small>入力した役職はメンバーカードとプロフィールに表示されます。</small></label>`;
 if(type==="agency")return `<label class="admin-field"><span>${label}</span><input name="${key}" type="text" placeholder="例：〇〇プロダクション"><small>ぽっぽー以外に所属事務所がある場合のみ入力してください。</small></label>`;
 if(type==="tags"||type==="links")return `<label class="admin-field admin-field-wide"><span>${label}</span><textarea name="${key}" rows="3" placeholder="${type==="tags"?"雑談, ゲーム":"X | https://x.com/..."}"></textarea></label>`;
 return `<label class="admin-field"><span>${label}${mark}</span><input name="${key}" type="${type}"${req} ${key==="id"?'pattern="[A-Za-z0-9_\\-]+" placeholder="例：member_name" autocapitalize="none" spellcheck="false"':key==="url"?'placeholder="https://"':""}>${key==="id"?'<small data-id-hint>半角英数字・ハイフン・アンダースコア。登録後は変更できません（メンバーID）。</small>':""}</label>`;
}
function setupManagementOrder(form,input,initial){
 const list=form.querySelector("[data-management-list]"),select=form.querySelector("[data-management-select]"),add=form.querySelector("[data-management-add]"),reset=form.querySelector("[data-management-default]");
 let ids=[...new Set(initial.filter(id=>typeof id==="string"))];
 const choices=data.talents.filter(t=>t?.id);
 const make=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el};
 const render=()=>{
 input.value=JSON.stringify(ids);list.replaceChildren();select.replaceChildren(make("option","メンバーを選択"));select.options[0].value="";
 for(const t of choices.filter(t=>!ids.includes(t.id))){const o=make("option",(t.name||t.id)+(t.published===true?"":"（非公開）"));o.value=t.id;select.append(o)}
 if(!ids.length)list.append(make("p","掲載メンバーなし"));
 for(const [i,id] of ids.entries()){
 const t=choices.find(x=>x.id===id),row=document.createElement("div");row.className="admin-management-row";
 row.append(make("span",(i+1)+". "+(t?.name||id)+(t?t.published===true?"":"（非公開）":"（登録なし）")));
 const controls=document.createElement("div");controls.className="admin-management-controls";
 for(const [label,delta] of [["上へ",-1],["下へ",1],["除外",0]]){
 const b=make("button",label);b.type="button";b.className="admin-small-button"+(delta===0?" danger":"");b.disabled=delta!==0&&(i+delta<0||i+delta>=ids.length);b.setAttribute("aria-label",(t?.name||id)+" "+label);
 b.onclick=()=>{if(delta===0)ids.splice(i,1);else [ids[i],ids[i+delta]]=[ids[i+delta],ids[i]];render();input.dispatchEvent(new Event("input",{bubbles:true}))};controls.append(b)
 }row.append(controls);list.append(row)
 }};
 add.onclick=()=>{if(select.value&&!ids.includes(select.value)){ids.push(select.value);render();input.dispatchEvent(new Event("input",{bubbles:true}))}};
 reset.onclick=()=>{ids=[...DEFAULT_MANAGEMENT_IDS];render();input.dispatchEvent(new Event("input",{bubbles:true}))};render();
}
function galleryValues(input){
 try{const value=JSON.parse(input.value||"[]");return Array.isArray(value)?value:[]}catch{return []}
}
function adminImagePreview(path,alt){
 const src=typeof path==="string"&&(/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif)$/i.test(path)&&!path.split("/").includes("..")||/^https:\/\//i.test(path))?path:"";
 const box=document.createElement("span");box.className="admin-image-thumb";if(!src){box.textContent="画像なし";return box}
 const img=document.createElement("img");img.alt=alt;img.loading="lazy";img.referrerPolicy="no-referrer";img.addEventListener("error",()=>{box.textContent="反映待ち・取得不可"},{once:true});img.src=src;box.append(img);return box
}
function renderSingleImage(key,path){
 const note=$("content-form").querySelector('[data-image-path="'+key+'"]');if(!note)return;note.replaceChildren();if(!path){note.textContent="画像未登録";return}
 const row=document.createElement("div");row.className="admin-image-row";row.append(adminImagePreview(path,"登録画像"));
 const content=document.createElement("div");content.className="admin-image-info";const label=document.createElement("small");label.textContent=path;const button=document.createElement("button");button.type="button";button.className="admin-small-button danger";button.dataset.imageDelete=key;button.dataset.imagePathValue=path;button.textContent="掲載解除";content.append(label,button);row.append(content);note.append(row)
}
function renderGallery(input){
 const note=$("content-form").querySelector('[data-image-path="avatarImages"]');if(!note||!input)return;
 const values=galleryValues(input);
 note.replaceChildren();
 if(!values.length){note.textContent="画像未登録（プロフィールアイコン、または活動名の頭文字を表示）";return}
 values.forEach((v,i)=>{
  const row=document.createElement("div");row.className="admin-management-row admin-gallery-row";row.append(adminImagePreview(v,"アバター "+(i+1)));
  const label=document.createElement("div");label.className="admin-image-info";const heading=document.createElement("strong");heading.textContent=(i===0?"メインアバター":"アバター "+(i+1));const filename=document.createElement("small");filename.textContent=v;label.append(heading,filename);row.append(label);
  const controls=document.createElement("div");controls.className="admin-management-controls";controls.style.flexWrap="wrap";
  for(const [action,title,disabled] of [["main","メインにする",i===0],["up","上へ",i===0],["down","下へ",i===values.length-1],["delete","掲載解除",false]]){
   const b=document.createElement("button");b.type="button";b.textContent=title;b.className="admin-small-button"+(action==="delete"?" danger":"");b.disabled=disabled;b.setAttribute("aria-label",(i+1)+"枚目 "+title);
   if(action==="delete")b.dataset.galleryDelete=String(i);else{b.dataset.galleryMove=action;b.dataset.galleryIndex=String(i)}controls.append(b)
  }
  row.append(controls);note.append(row)
 })
}
function moveGallery(action,index){
 if(imageBusy||publishing||current!=="talents")return;
 const input=$("content-form").elements.namedItem("avatarImages");if(!input)return;
 const values=galleryValues(input);if(!Number.isInteger(index)||index<0||index>=values.length)return;
 const to=action==="main"?0:action==="up"?index-1:action==="down"?index+1:index;
 if(to<0||to>=values.length||to===index)return;
 const [value]=values.splice(index,1);values.splice(to,0,value);input.value=JSON.stringify(values);renderGallery(input);input.dispatchEvent(new Event("input",{bubbles:true}));status("アバターの掲載順を変更しました。保存・公開すると反映されます。")
}
const profileChecklist=[
 ["活動名",t=>t.name],["期生",t=>t.cohort?.length],["キャッチコピー",t=>t.catchphrase],["プロフィール画像",t=>t.iconImage||t.avatarImages?.length],["自己紹介",t=>t.bio],["誕生日",t=>t.birthday],["活動ジャンル",t=>t.tags?.length],["公式リンク",t=>t.links?.length],["ファン情報",t=>t.fanName||t.oshiMark||t.streamTag||t.fanArtTag],["趣味・好きなもの",t=>t.likes]
];
function updateProfileSummary(){
 const box=$("admin-live-profile");if(!box||current!=="talents")return;
 const t=formObject(),done=profileChecklist.filter(([,check])=>Boolean(check(t))).length;
 box.querySelector("[data-profile-preview-name]").textContent=t.name||"活動名未入力";
 box.querySelector("[data-profile-preview-caption]").textContent=t.catchphrase||"キャッチコピー未入力";
 box.querySelector("[data-profile-preview-meta]").textContent=[...(t.cohort||[]),...(t.roles||[])].join(" / ")||"期生・役職未設定";
 box.querySelector("[data-profile-preview-state]").textContent=t.published?"公開設定オン（保存・公開前）":"非公開設定";
 box.querySelector("progress").value=done;
 box.querySelector("[data-profile-preview-score]").textContent=done+" / "+profileChecklist.length+" 項目入力済み（任意項目を含む目安）";
 box.querySelector("[data-profile-preview-missing]").textContent=profileChecklist.filter(([,check])=>!check(t)).map(([label])=>label).join("、")||"すべて入力済み";
}
function setupScheduleParticipants(form,item){
 const kind=form.elements.namedItem("scheduleFormat"),idField=form.elements.namedItem("memberId"),nameField=form.elements.namedItem("talent"),idsField=form.elements.namedItem("scheduleMemberIds"),guestsField=form.elements.namedItem("scheduleGuests");
 const picker=form.querySelector("[data-schedule-member-select]"),add=form.querySelector("[data-schedule-member-add]"),list=form.querySelector("[data-schedule-members]"),guestPanel=form.querySelector("[data-schedule-guest-panel]"),guestList=form.querySelector("[data-schedule-guests]"),count=form.querySelector("[data-schedule-participant-count]");
 let ids=scheduleParticipantIds(item,data.talents),guests=Array.isArray(item.guests)?item.guests.map(g=>({name:String(g?.name||""),url:String(g?.url||"")})):[];
 kind.value=scheduleFormat(item);
 const dirty=()=>idsField.dispatchEvent(new Event("input",{bubbles:true}));
 const sync=()=>{idsField.value=JSON.stringify(ids);guestsField.value=JSON.stringify(guests.filter(g=>g.name.trim()||g.url.trim()).map(g=>({name:g.name.trim(),url:g.url.trim()})));idField.value=ids[0]||"";nameField.value=data.talents.find(t=>t?.id===ids[0])?.name||"";count.textContent="ぽっぽー "+ids.length+"名 / 外部 "+guests.filter(g=>g.name.trim()).length+"名";guestPanel.hidden=kind.value!=="collab"};
 const btn=(text,fn,disabled=false)=>{const b=document.createElement("button");b.type="button";b.className="admin-small-button";b.textContent=text;b.disabled=disabled;b.onclick=fn;return b};
 const renderMembers=()=>{list.replaceChildren();picker.replaceChildren(new Option("メンバーを選択",""));for(const t of data.talents.filter(t=>t?.id&&!ids.includes(t.id))){picker.append(new Option((t.name||t.id)+(t.published===true?"":"（非公開）"),t.id))}add.disabled=kind.value==="solo"&&ids.length>0;
 ids.forEach((id,i)=>{const row=document.createElement("div");row.className="admin-management-row";const label=document.createElement("span");const t=data.talents.find(t=>t?.id===id);label.textContent=(i+1)+". "+(t?.name||id)+(t?.published===true?"":t?"（非公開）":"（登録なし）");const actions=document.createElement("div");actions.className="admin-management-controls";actions.append(btn("上へ",()=>{[ids[i-1],ids[i]]=[ids[i],ids[i-1]];renderMembers();sync();dirty()},i===0),btn("下へ",()=>{[ids[i+1],ids[i]]=[ids[i],ids[i+1]];renderMembers();sync();dirty()},i===ids.length-1),btn("除外",()=>{ids.splice(i,1);renderMembers();sync();dirty()}));row.append(label,actions);list.append(row)})};
 const renderGuests=()=>{guestList.replaceChildren();guests.forEach((g,i)=>{const row=document.createElement("div");row.className="schedule-guest-row";for(const [key,label,type] of [["name","活動名","text"],["url","公式リンク（任意）","url"]]){const l=document.createElement("label");l.textContent=label;const input=document.createElement("input");input.type=type;input.value=g[key];input.placeholder=key==="url"?"https://...":"コラボ相手の活動名";input.addEventListener("input",()=>{g[key]=input.value;sync();dirty()});l.append(input);row.append(l)}row.append(btn("除外",()=>{guests.splice(i,1);renderGuests();sync();dirty()}));guestList.append(row)})};
 add.onclick=()=>{if(picker.value&&!ids.includes(picker.value)&&(kind.value==="collab"||!ids.length)){ids.push(picker.value);renderMembers();sync();dirty()}};
 form.querySelector("[data-schedule-guest-add]").onclick=()=>{guests.push({name:"",url:""});renderGuests();sync();dirty()};
 kind.addEventListener("change",()=>{if(kind.value==="solo"&&(ids.length>1||guests.length)){if(!confirm("ソロ配信に変更すると先頭のメンバー以外の参加者を除外します。よろしいですか？")){kind.value="collab";sync();return}ids=ids.slice(0,1);guests=[]}renderMembers();renderGuests();sync();dirty()});
 if(!item.id&&!item.date&&!item.platform)form.elements.namedItem("platform").value="REALITY";
 renderMembers();renderGuests();sync();
}

function renderForm(item={}){
 const form=$("content-form");form.reset();if(current==="talents")item=normalizedMemberProfile(item);const groups=[["基本情報","name id cohort roles affiliationAgency activityStatus"],["画像・カラー","iconImage avatarImages imageColor"],["自己紹介","catchphrase bio likes"],["記念日","birthday debutDate joinDate anniversaries"],["配信活動","tags regularSchedule achievements"],["ファン情報","fanName oshiMark streamTag fanArtTag"],["公式リンク","links"],["公開設定","published hiddenSections"]];
 const fields=$("form-fields"),tabs=$("cms-profile-tabs");tabs.hidden=current!=="talents";tabs.replaceChildren();
 if(current==="talents"){const used=new Set(groups.flatMap(g=>g[1].split(" ")));groups[0][1]+=" "+SCHEMAS[current].filter(f=>!used.has(f[0])).map(f=>f[0]).join(" ");fields.innerHTML=groups.map(([label,keys],i)=>'<section class="cms-profile-group admin-fields" data-profile-group="'+i+'" '+(i?'hidden':'')+'><h3 class="admin-field-wide">'+esc(label)+'</h3>'+keys.split(" ").filter(Boolean).map(key=>SCHEMAS[current].find(f=>f[0]===key)).filter(Boolean).map(fieldHtml).join("")+'</section>').join("");
 const select=i=>{fields.querySelectorAll("[data-profile-group]").forEach((p,j)=>p.hidden=i!==j);Array.from(tabs.children).forEach((b,j)=>b.setAttribute("aria-pressed",String(i===j)))};
 groups.forEach(([label],i)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=()=>select(i);tabs.append(b)});select(0);
 }else fields.innerHTML=SCHEMAS[current].map(fieldHtml).join("");
 if(form._profileInvalidHandler)form.removeEventListener("invalid",form._profileInvalidHandler,true);form._profileInvalidHandler=e=>{const group=e.target.closest("[data-profile-group]");if(group&&group.hidden)tabs.children[Number(group.dataset.profileGroup)]?.click()};form.addEventListener("invalid",form._profileInvalidHandler,true);
 for(const [key,,type] of SCHEMAS[current]){
  const el=form.elements.namedItem(key);if(!el&&!["memberSelect","newsMembers"].includes(type))continue;
  if(type==="managementOrder"){
   setupManagementOrder(form,el,Array.isArray(item[key])?item[key]:DEFAULT_MANAGEMENT_IDS);
  }else if(type==="newsMembers"){
   const values=Array.isArray(item[key])?item[key].filter(v=>typeof v==="string"):[];
   const options=form.querySelector("[data-related-options]");
   for(const id of values)if(!data.talents.some(t=>t?.id===id)){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.name=key;input.value=id;label.append(input,document.createTextNode(id+"（登録なし）"));options.append(label)}
   form.querySelectorAll('input[name="memberIds"]').forEach(e=>e.checked=values.includes(e.value));
  }else if(type==="scheduleMember"){
   el.value=item.memberId||"";
  }else if(type==="memberSelect")form.querySelectorAll('input[name="featuredIds"]').forEach(e=>e.checked=(item[key]||[]).includes(e.value));
  else if(type==="checkbox")el.checked=item[key]===true;
  else if(type==="visibility"){const values=Array.isArray(item[key])?item[key]:[];form.querySelectorAll('input[name="hiddenSections"]').forEach(input=>input.checked=values.includes(input.value))}
  else if(type==="anniversaries"){const rows=Array.isArray(item[key])?item[key]:item.anniversary?[{date:item.anniversary,title:"活動記念日"}]:[];el.value=rows.map(x=>[x.date,x.title].join(" | ")).join("\n")}
  else if(type==="achievements"){el.value=Array.isArray(item[key])?item[key].map(x=>[x.date||"",x.title||"",x.description||""].join(" | ")).join("\n"):(item[key]||"")}
  else if(type==="cohort"){const values=Array.isArray(item[key])?item[key]:item[key]?[item[key]]:[];form.querySelectorAll('input[name="cohort"]').forEach(input=>input.checked=values.includes(input.value))}
  else if(type==="image"){el.value=item[key]||"";renderSingleImage(key,el.value)}
  else if(type==="gallery"){const values=Array.isArray(item[key])?item[key]:item[key]?[item[key]]:[];el.value=JSON.stringify(values);renderGallery(el)}
  else if(type==="tags"||type==="roles")el.value=Array.isArray(item[key])?item[key].join(", "):(item[key]||"");
  else if(type==="links")el.value=Array.isArray(item[key])?item[key].map(x=>(x.label||"")+" | "+(x.url||"")).join("\n"):"";
  else el.value=item[key]??"";
 }
 if(current==="talents"){
 const id=form.elements.namedItem("id");if(id&&editing>=0&&item.id){id.readOnly=true;const hint=form.querySelector("[data-id-hint]");if(hint)hint.textContent="登録済みID（変更不可）。配信予定や関連ニュースとの紐づけに使用します。"}
 const intro=fields.querySelector('[data-profile-group="2"]');if(intro){const p=document.createElement("p");p.className="admin-field-wide admin-form-guide";p.textContent="自己紹介には挨拶・特技・活動目標・本人メッセージなどを自由に記載できます。旧項目の表示対象の情報は自動で引き継がれます。";intro.querySelector("h3")?.after(p)}
 const basics=fields.querySelector('[data-profile-group="0"]');if(basics){const p=document.createElement("p");p.className="admin-field-wide admin-form-guide";p.textContent="活動名とIDが必須です。その他は任意です。分かる情報から登録できます。";basics.querySelector("h3")?.after(p)}
 const images=fields.querySelector('[data-profile-group="1"]');if(images){const p=document.createElement("p");p.className="admin-field-wide admin-form-guide";p.textContent="画像は登録順に表示されます。アップロード時点でGitHubに公開されるため、掲載許諾を確認してください。";images.querySelector("h3")?.after(p)}
 const publish=fields.querySelector('[data-profile-group="7"]');if(publish){const p=document.createElement("p");p.className="admin-field-wide admin-form-guide";p.textContent="公開設定は下書きを保存した後、公開操作を行うと公式サイトに反映されます。";publish.querySelector("h3")?.after(p)}
 }
 if(current==="schedule"){
 const ownership=document.createElement("div");ownership.className="admin-field admin-field-wide";
 const note=document.createElement("p");note.textContent=item.scheduleSource==="member"&&item.published===true?"本人管理の予定です。対象メンバーの変更・非公開化・コラボ配信への変更を行うと運営管理へ切り替わります。":"運営管理の予定です。メンバーポータルからは公開中の予定の閲覧のみ可能です。";ownership.append(note);
 if(item.scheduleSource==="member"&&item.published===true){const label=document.createElement("label"),check=document.createElement("input");check.type="checkbox";check.name="scheduleTakeOver";label.append(check,document.createTextNode("この予定を運営管理に切り替える（本人の編集・削除を停止）"));ownership.append(label)}
 fields.append(ownership);
 setupScheduleParticipants(form,item);
 }
 const color=form.elements.namedItem("imageColor"),picker=form.querySelector("[data-theme-picker]");if(color&&picker){const preview=form.querySelector("[data-theme-preview]"),label=form.querySelector("[data-theme-label]");const sync=()=>{const p=applyMemberPalette(preview,color.value);picker.value=p.base;label.textContent=color.value&&!/^#[0-9a-f]{6}$/i.test(color.value)?"#RRGGBB 形式で入力してください":color.value?p.base.toUpperCase():"標準色 "+p.base.toUpperCase()};sync();color.addEventListener("input",sync);picker.addEventListener("input",()=>{color.value=picker.value;color.dispatchEvent(new Event("input",{bubbles:true}))});form.querySelector("[data-theme-clear]").onclick=()=>{color.value="";color.dispatchEvent(new Event("input",{bubbles:true}))}}
 document.getElementById("admin-live-profile")?.remove();
 if(current==="talents"){const box=document.createElement("details");box.id="admin-live-profile";box.className="cms-overview-panel";box.style.marginBlock="12px";box.innerHTML='<summary>入力状況・簡易プレビュー</summary><strong data-profile-preview-name></strong><p data-profile-preview-caption></p><p data-profile-preview-meta></p><p data-profile-preview-state></p><label>プロフィール入力状況 <progress max="10" value="0"></progress></label><p data-profile-preview-score></p><small>未入力の目安：<span data-profile-preview-missing></span>。すべての項目が必須ではありません。公開ページの表示は別途プレビューで確認してください。</small>';fields.before(box);updateProfileSummary()}
 $("editor-title").textContent=LABELS[current]+"を"+(editing<0?"登録":"編集");
 $("save-button").textContent="下書きを保存";
 $("publish-description").textContent=LABELS[current]+"のデータ "+data[current].length+"件をGitHubへ公開します。";
}
function summary(item){
 if(singleton(current))return LABELS[current];
 if(current==="talents")return [item.name].filter(Boolean).join(" / ");
 if(current==="schedule")return [item.date,item.time,scheduleFormat(item)==="collab"?"コラボ配信":"",scheduleParticipants(item,data.talents,false).map(p=>p.name).join("・")||item.talent,item.title].filter(Boolean).join("　");
 return [item.date,item.title].filter(Boolean).join("　");
}

function renderDashboard(){
 const metrics=$("cms-metrics");if(!metrics)return;
 const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 const members=data.talents.filter(Boolean),cohorts=new Map();
 for(const t of members){const groups=Array.isArray(t.cohort)?t.cohort:t.cohort?[t.cohort]:[];for(const g of new Set(groups.filter(Boolean).length?groups.filter(Boolean):["未設定"]))cohorts.set(g,(cohorts.get(g)||0)+1)}
 const upcoming=data.schedule.filter(s=>s&&s.date>=today).sort((a,b)=>(a.date+" "+(a.time||"")).localeCompare(b.date+" "+(b.time||"")));
 const dates=[];
 for(const t of members)for(const [value,label] of [[t.birthday,"誕生日"],[t.debutDate,"デビュー周年"],[t.joinDate,"ぽっぽー加入周年"],...(Array.isArray(t.anniversaries)?t.anniversaries:t.anniversary?[{date:t.anniversary,title:"活動記念日"}]:[]).map(x=>[x.date,x.title])]){
 const raw=String(value||"").trim(),m=raw.match(/^(?:\d{4}[-/])?(\d{1,2})(?:月|[-/])(\d{1,2})日?$/);if(!m)continue;
 const month=Number(m[1]),day=Number(m[2]);let year=Number(today.slice(0,4));let date="";
 for(let i=0;i<9;i++,year++){const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCMonth()!==month-1||d.getUTCDate()!==day)continue;const iso=d.toISOString().slice(0,10);if(iso>=today){date=iso;break}}
 if(date)dates.push({date,label,name:t.name,published:t.published===true});
 }
 dates.sort((a,b)=>a.date.localeCompare(b.date));
 const state=x=>x.published===true?"公開設定":"非公開";
 const rows=(items,fn,empty)=>items.length?items.slice(0,5).map(fn).join(""):'<p class="admin-empty">'+empty+'</p>';
 metrics.innerHTML=Object.keys(FILES).filter(k=>!singleton(k)).map(k=>{const total=data[k].length,pub=data[k].filter(x=>x?.published===true).length;return '<div class="cms-metric"><span>'+LABELS[k]+'</span><strong>'+total+'</strong><small>公開設定 '+pub+' 件 / 非公開 '+(total-pub)+' 件</small></div>'}).join("");
 const detail=$("cms-overview");if(!detail)return;
 detail.innerHTML='<section class="cms-overview-panel"><h3>期生別メンバー数</h3>'+rows([...cohorts].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),"ja",{numeric:true})),([g,n])=>'<div class="cms-overview-row"><span>'+esc(g)+'</span><strong>'+n+' 名</strong></div>',"登録メンバーなし")+'<small>複数期生はそれぞれに集計します（最大5区分表示）。</small></section><section class="cms-overview-panel"><h3>直近の配信予定</h3>'+rows(upcoming,s=>'<div class="cms-overview-row"><div><small>'+esc(s.date)+' '+esc(s.time)+'</small><strong>'+esc(s.title)+'</strong><small>'+esc(scheduleParticipants(s,data.talents,false).map(p=>p.name).join("・")||s.talent)+'</small></div><span>'+state(s)+'</span></div>',"今後の配信予定はありません")+'</section><section class="cms-overview-panel"><h3>誕生日・周年・記念日</h3>'+rows(dates,d=>'<div class="cms-overview-row"><div><small>'+esc(d.date)+'</small><strong>'+esc(d.name)+'</strong><small>'+esc(d.label)+'</small></div><span>'+state(d)+'</span></div>',"登録された記念日はありません")+'</section>';
}

function canonical(v){return JSON.stringify(v,(_,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)}
function changes(kind,after=data[kind]){
 const before=baseline[kind]||[],key=x=>singleton(kind)?"settings":kind==="schedule"?(x.id?"id:"+x.id:"legacy:"+canonical([x.date,x.time,x.talent,x.title])):String(x.id||"");
 const groups=a=>{const m=new Map();for(const x of a){const k=key(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return m};
 const old=groups(before),next=groups(after),out=[];
 for(const k of new Set([...old.keys(),...next.keys()])){
 const a=[...(old.get(k)||[])],b=[...(next.get(k)||[])];
 for(let i=a.length-1;i>=0;i--){const j=b.findIndex(x=>canonical(x)===canonical(a[i]));if(j>=0){a.splice(i,1);b.splice(j,1)}}
 while(a.length&&b.length)out.push({type:"変更",before:a.shift(),after:b.shift()});
 for(const x of a)out.push({type:"削除",before:x});for(const x of b)out.push({type:"新規",after:x});
 }return out;
}
function renderChanges(){
 const panel=$("cms-changes");if(!panel)return;
 const list=changes(current),name=x=>x.name||x.title||x.id||LABELS[current];
 const title=$("cms-changes-title");if(title)title.textContent="未公開の変更内容（"+list.length+"件）";
 const draft=$("cms-draft-summary");if(draft){const pending=Object.keys(FILES).map(k=>[k,changes(k).length]).filter(([,n])=>n>0);draft.replaceChildren();const label=document.createElement("strong");label.textContent=pending.length?"保存済み・未公開の変更 "+pending.reduce((n,x)=>n+x[1],0)+"件":"保存済み・未公開の変更はありません";draft.append(label);for(const [k,n] of pending){const button=document.createElement("button");button.type="button";button.dataset.cmsJump=k;button.className="btn secondary";button.textContent=LABELS[k]+" "+n+"件 →";draft.append(button)}}
 const counts=Object.keys(FILES).map(k=>LABELS[k]+" "+changes(k).length+"件").join(" / ");
 panel.innerHTML='<p>'+esc(counts)+'</p><h3>'+esc(LABELS[current])+'：変更 '+list.length+'件</h3>'+ (list.length?list.map(d=>{const a=d.before||{},b=d.after||{},keys=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>canonical(a[k])!==canonical(b[k]));return '<details class="cms-change-row"><summary>'+esc(d.type+"｜"+name(d.after||d.before))+'</summary>'+keys.map(k=>'<div class="cms-change-field"><strong>'+esc(SCHEMAS[current].find(f=>f[0]===k)?.[1]||k)+'</strong><div><small>変更前</small><pre>'+esc(a[k]===undefined?"（なし）":JSON.stringify(a[k],null,2))+'</pre></div><div><small>変更後</small><pre>'+esc(b[k]===undefined?"（なし）":JSON.stringify(b[k],null,2))+'</pre></div></div>').join("")+'</details>'}).join(""):'<p>保存済みの変更はありません。</p>');
}
// Missing/unknown ownership is administrative, never implicitly member-editable.
function scheduleSourceForSave(previous,next,takeOver){
 return previous?.scheduleSource==="member"&&previous.published===true&&next.published===true&&typeof previous.memberId==="string"&&previous.memberId&&previous.memberId===next.memberId&&scheduleFormat(next)==="solo"&&!takeOver?"member":"admin";
}
function renderList(){
 renderChanges();
 renderDashboard();
 const list=data[current],term=($("cms-search")?.value||"").trim().toLowerCase(),visibility=$("cms-visibility")?.value||"",filtered=list.map((item,i)=>({item,i})).filter(({item})=>(!visibility||(item.published===true)===(visibility==="yes"))&&JSON.stringify(item).toLowerCase().includes(term));$("item-count").textContent=filtered.length+" / "+list.length+"件";
 $("content-list").innerHTML=filtered.length?filtered.map(({item,i})=>`<article class="admin-list-item"><div><strong>${esc(summary(item)||"名称未設定")}</strong><span class="admin-publish-state ${item.published?"is-published":""}">${item.published?"公開設定":"非公開"}</span>${current==="schedule"?`<span class="admin-publish-state">${item.scheduleSource==="member"&&item.published===true?"本人管理":"運営管理"}</span>`:""}</div><div class="admin-list-actions"><button type="button" data-edit="${i}" class="admin-small-button">編集</button><button type="button" data-delete="${i}" class="admin-small-button danger">削除</button></div></article>`).join(""):'<p class="admin-empty">登録済みデータはありません。</p>';
}
$("cms-search")?.addEventListener("input",renderList);
$("cms-visibility")?.addEventListener("change",renderList);
let formDirty=false;
function editorMode(open){$("cms-workspace-title").textContent=LABELS[current]+(open?"を編集":"の管理");$("cms-workspace-hint").textContent=open?"入力 → 下書きを保存 → 公開": "登録済みデータの確認・編集・公開";$("clear-button").hidden=!open;$("cms-other-actions").open=false;document.querySelector(".admin-form-actions").hidden=!open;$("publish-button").hidden=open&&!singleton(current);document.querySelector(".admin-editor").hidden=!open;document.querySelector(".admin-list-panel").hidden=open&&!singleton(current);$("cms-new-record").hidden=singleton(current)||open;$("cms-back-list").hidden=!open||singleton(current);}
function allowDiscard(){if(imageBusy||publishing){status("画像処理・公開中は編集画面を切り替えられません。");return false}return !formDirty||confirm("未保存の入力内容を破棄しますか？")}
$("content-form").addEventListener("input",()=>{formDirty=true;updateProfileSummary()});
 $("content-form").addEventListener("change",updateProfileSummary);
$("cms-new-record").onclick=()=>{editing=-1;renderForm();formDirty=false;editorMode(true)};
$("cms-back-list").onclick=()=>{if(!allowDiscard())return;editing=-1;renderForm();formDirty=false;editorMode(false)};
window.addEventListener("beforeunload",e=>{if(formDirty){e.preventDefault();e.returnValue=""}});
function renderTabs(){
 if($("cms-search"))$("cms-search").value="";if($("cms-visibility"))$("cms-visibility").value="";
 document.querySelectorAll(".admin-tab").forEach(b=>{const active=b.dataset.kind===current;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});
 if(singleton(current)){editing=data[current].length?0:-1;renderForm(data[current][0]||{})}else renderForm();formDirty=false;editorMode(singleton(current));renderList();updateAuthUI();
}
function formObject(){
 const obj={};
 for(const [key,,type] of SCHEMAS[current]){
  const el=$("content-form").elements.namedItem(key);if(!el&&!["memberSelect","newsMembers"].includes(type))continue;
  if(type==="managementOrder"){obj[key]=JSON.parse(el.value||"[]")}
  else if(type==="newsMembers")obj[key]=Array.from($("content-form").querySelectorAll('input[name="memberIds"]:checked')).map(e=>e.value);
  else if(type==="memberSelect")obj[key]=Array.from($("content-form").querySelectorAll('input[name="featuredIds"]:checked')).map(e=>e.value);
  else if(type==="checkbox")obj[key]=el.checked;
  else if(type==="visibility")obj[key]=Array.from($("content-form").querySelectorAll('input[name="hiddenSections"]:checked')).map(input=>input.value);
  else if(type==="anniversaries")obj[key]=el.value.split(/\r?\n/).filter(s=>s.trim()).map(s=>{const [date,...title]=s.split("|");return {date:date.trim(),title:title.join("|").trim()}});
  else if(type==="achievements")obj[key]=el.value.split(/\r?\n/).map(line=>{const parts=line.split("|").map(s=>s.trim());return parts[1]?{date:parts[0],title:parts[1],description:parts.slice(2).join(" | ")}:null}).filter(Boolean);
  else if(type==="cohort")obj[key]=Array.from($("content-form").querySelectorAll('input[name="cohort"]:checked')).map(input=>input.value);
  else if(type==="image")obj[key]=el.value;
  else if(type==="gallery"){try{obj[key]=JSON.parse(el.value||"[]")}catch{obj[key]=[]}}
  else if(type==="tags"||type==="roles")obj[key]=el.value.split(",").map(s=>s.trim()).filter(Boolean);
  else if(type==="links")obj[key]=el.value.split("\n").map(line=>{const i=line.indexOf("|");return i<0?null:{label:line.slice(0,i).trim(),url:line.slice(i+1).trim()}}).filter(x=>x&&x.label&&/^https?:\/\//i.test(x.url));
  else obj[key]=el.value.trim();
 }
 if(current==="talents"){obj.profileFormat=2;const old=data.talents[editing];if(old&&Array.isArray(old.hiddenSections))obj.hiddenSections=[...new Set([...obj.hiddenSections,...old.hiddenSections.filter(k=>["message","credit"].includes(k))])];}
 if(current==="schedule"){const form=$("content-form");obj.memberIds=JSON.parse(form.elements.namedItem("scheduleMemberIds").value||"[]");obj.guests=JSON.parse(form.elements.namedItem("scheduleGuests").value||"[]");obj.format=form.elements.namedItem("scheduleFormat").value;obj.memberId=obj.memberIds[0]||"";obj.talent=data.talents.find(t=>t?.id===obj.memberId)?.name||"";}
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
  if(kind==="news"&&item.memberIds!==undefined&&(!Array.isArray(item.memberIds)||item.memberIds.some(id=>typeof id!=="string"||!/^[A-Za-z0-9_-]+$/.test(id))||new Set(item.memberIds).size!==item.memberIds.length))return (i+1)+"件目: 関連メンバーIDを確認してください。";
  if(kind==="schedule"&&item.scheduleSource!==undefined&&(!["admin","member"].includes(item.scheduleSource)||item.scheduleSource==="member"&&(item.published!==true||typeof item.memberId!=="string"||!item.memberId||typeof item.id!=="string"||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).test(item.id))))return (i+1)+"件目: 配信予定の管理区分を確認してください。";
  if(kind==="schedule"){const error=scheduleParticipantError(item);if(error)return (i+1)+"件目: "+error;}
  if(kind==="schedule"&&item.memberId&&(!/^[A-Za-z0-9_-]+$/.test(item.memberId)))return (i+1)+"件目: 対象メンバーIDを確認してください。";
  if(kind==="schedule"&&(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!/^\d{2}:\d{2}$/.test(item.time)))return (i+1)+"件目: 日付または時刻の形式を確認してください。";
  if(kind==="news"&&item.thumbnailImage&&!/^assets\/images\/news\/[A-Za-z0-9_-]+\.(png|jpg|webp|gif)$/.test(item.thumbnailImage))return "ニュース画像の保存先が正しくありません。";
  if(kind==="news"&&!/^\d{4}-\d{2}-\d{2}$/.test(item.date))return (i+1)+"件目: 日付はYYYY-MM-DD形式で入力してください。";
  if(kind==="settings"&&item.managementIds!==undefined&&(!Array.isArray(item.managementIds)||item.managementIds.some(id=>typeof id!=="string"||!/^[A-Za-z0-9_-]+$/.test(id))||new Set(item.managementIds).size!==item.managementIds.length))return "運営メンバーのID・表示順を確認してください。";
  if(kind==="settings")for(const key of ["applicationUrl","contactUrl"])if(item[key]){try{if(new URL(item[key]).protocol!=="https:")throw Error()}catch{return "窓口URLは有効なHTTPS URLを指定してください。"}}
  if(item.url&&!/^https?:\/\//i.test(item.url))return (i+1)+"件目: URLはhttp://またはhttps://で始めてください。";
  if(kind==="talents"&&item.imageColor&&!/^#[0-9a-f]{6}$/i.test(item.imageColor))return (i+1)+"件目: イメージカラーは #RRGGBB 形式で入力してください。";
  if(kind==="talents"&&item.cohort!==undefined&&!Array.isArray(item.cohort))item.cohort=item.cohort?[item.cohort]:[];
  if(kind==="talents")for(const key of ["iconImage","avatarImage"])if(item[key]&&!/^(https:\/\/|assets\/images\/talents\/)/i.test(item[key]))return (i+1)+"件目: 画像の保存先が正しくありません。";
  if(kind==="talents"&&item.avatarImages!==undefined&&(!Array.isArray(item.avatarImages)||item.avatarImages.some(v=>typeof v!=="string"||!/^(https:\/\/|assets\/images\/talents\/)/i.test(v))))return (i+1)+"件目: アバターギャラリーの画像データを確認してください。";
  if(Array.isArray(item.links)&&item.links.some(x=>!x||!x.label||!/^https?:\/\//i.test(x.url||"")))return (i+1)+"件目: 公式リンクの表示名またはURLを確認してください。";
 }
 return "";
}
async function uploadTalentImage(input){
 if(imageBusy||publishing||!dataReady){input.value="";return}
 if(!authReady()){input.value="";status("画像をGitHubへ保存するには、先にGitHubへログインしてください。");return}
 const form=$("content-form"),key=input.name.replace(/File$/,""),id=(key==="heroImage"?"home":form.elements.namedItem("id")?.value||"").trim();
 if(!/^[A-Za-z0-9_-]+$/.test(id)){input.value="";status("先に記事またはメンバーのIDを半角英数字・ハイフン・アンダースコアで入力してください。");return}
 const files=Array.from(input.files||[]);if(!files.length)return;
 const allowed={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"};
 if(files.some(file=>!allowed[file.type])){input.value="";status("PNG・JPG・WebP・GIF形式の画像を選択してください。");return}
 if(files.some(file=>file.size>8*1024*1024)){input.value="";status("画像は1枚8MB以下にしてください。");return}
 if(!confirm("画像はアップロード時点で公開GitHubに保存されます。掲載許諾を確認しましたか？")){input.value="";return}
 imageBusy=true;updateAuthUI();input.disabled=true;status(files.length+"枚の画像をGitHubへアップロードしています...");
 try{
  const gallery=key==="avatarImages",hidden=form.elements.namedItem(key);
  const existing=gallery?JSON.parse(hidden.value||"[]"):[];
  let uploaded=[];
  for(let i=0;i<files.length;i++){
   const file=files[i],ext=allowed[file.type];
   const folder=key==="heroImage"?"home":key==="thumbnailImage"?"news":"talents";
   const path="assets/images/"+folder+"/"+id+"-"+(gallery?"look":key==="iconImage"?"icon":key==="avatarImage"?"avatar":"image")+"-"+crypto.randomUUID()+"."+ext;
   const encodedPath=path.split("/").map(encodeURIComponent).join("/");
   const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let j=0;j<bytes.length;j+=8192)binary+=String.fromCharCode(...bytes.subarray(j,j+8192));
   const payload={message:"Upload new image "+key+" for "+id,content:btoa(binary),branch:BRANCH};
   const put=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath,{method:"PUT",body:JSON.stringify(payload)});
   if(!put.ok){const detail=await put.text();throw new Error("画像のアップロードに失敗しました ("+put.status+"): "+detail.slice(0,180))}
   uploaded.push(path);
  }
  if(!hidden.isConnected){status("画像は保存されましたが、編集画面が切り替わったため登録されていません。");return}
  if(gallery){
   const values=[...existing,...uploaded];hidden.value=JSON.stringify(values);
   renderGallery(hidden);
  }else{
   if(!hidden.isConnected){status("画像は保存されましたが、編集画面が切り替わったため登録されていません。");return}
   hidden.value=uploaded[0];
   renderSingleImage(key,uploaded[0]);
  }
  formDirty=true;updateProfileSummary();status(files.length+"枚の画像をGitHubに保存しました。編集データを登録後、「このデータを公開する」を押してください。");
 }catch(error){status(error.message||"画像のアップロードに失敗しました。")}
 finally{imageBusy=false;updateAuthUI();input.disabled=false;input.value=""}
}
// Unlink on draft only; never remove a file still referenced by the public site.
function unlinkImage(key,index=null){
 if(imageBusy||publishing)return;
 const form=$("content-form"),el=form.elements.namedItem(key),note=form.querySelector('[data-image-path="'+key+'"]');
 if(!el||!note||!confirm("画像の掲載を解除します。保存・公開すると反映されます。元ファイルはGitHubに残ります。"))return;
 if(key==="avatarImages"){
 const values=JSON.parse(el.value||"[]");if(!Number.isInteger(index)||index<0||index>=values.length)return;
 values.splice(index,1);el.value=JSON.stringify(values);
 renderGallery(el);
 }else{el.value="";note.textContent="画像未登録"}
 formDirty=true;updateProfileSummary();status("画像の掲載を解除しました。保存・公開するまで公式サイトは変更されません。");
}
$("form-fields").addEventListener("click",e=>{
 const gallery=e.target.closest("[data-gallery-delete]"),single=e.target.closest("[data-image-delete]"),move=e.target.closest("[data-gallery-move]");
 if(move)moveGallery(move.dataset.galleryMove,Number(move.dataset.galleryIndex));
 if(gallery)unlinkImage("avatarImages",Number(gallery.dataset.galleryDelete));
 if(single&&["iconImage","avatarImage","thumbnailImage","heroImage"].includes(single.dataset.imageDelete))unlinkImage(single.dataset.imageDelete);
});
$("form-fields").addEventListener("change",e=>{if(e.target.matches('input[type="file"][name$="File"]'))uploadTalentImage(e.target)});
$("content-form").addEventListener("submit",e=>{
 e.preventDefault();if(!dataReady||publishing||imageBusy){status("読み込み・公開・画像処理中は保存できません。");return}const obj=formObject();
 if(current==="schedule"){
 const previous=editing>=0?data.schedule[editing]:null;
 const invalid=scheduleParticipantError(obj,data.talents);if(invalid){status("保存できません: "+invalid);return}
 if(obj.published&&obj.memberIds.some(id=>!data.talents.some(t=>t?.id===id&&t.published===true))){status("公開する配信予定には公開メンバーのみ登録してください。");return}
 obj.id=previous?.id||crypto.randomUUID();
 obj.scheduleSource=scheduleSourceForSave(previous,obj,$("content-form").elements.namedItem("scheduleTakeOver")?.checked===true);
 if(previous?.scheduleSource==="member"&&obj.scheduleSource==="admin"&&!confirm("この予定は運営管理へ切り替わり、本人の編集・削除が停止されます。よろしいですか？"))return;
 if(obj.scheduleSource==="member"){delete obj.memberIds;delete obj.guests;delete obj.format;}
 }
 if(current==="talents"&&editing>=0&&data.talents[editing]?.id!==obj.id){status("登録済みメンバーのIDは関連ニュース・配信予定との紐づけを保つため変更できません。");return}
 if(current==="talents"&&obj.anniversaries?.some(x=>{const m=x.date.match(/^(?:(\d{4})[-/])?(\d{1,2})(?:月|[-/])(\d{1,2})日?$/);if(!m||!x.title)return true;const d=new Date(Date.UTC(Number(m[1]||2000),Number(m[2])-1,Number(m[3])));return d.getUTCMonth()!==Number(m[2])-1||d.getUTCDate()!==Number(m[3])})){status("その他の記念日の日付・名称が不正です。");return}
 
 
 if(obj.url&&!/^https?:\/\//i.test(obj.url)){status("URLは http:// または https:// で始まる形式にしてください。");return}
 if(obj.id&&data[current].some((x,i)=>x.id===obj.id&&i!==editing)){status("同じIDがすでに登録されています。別のIDを指定してください。");return}
 if(singleton(current))data[current]=[obj];else if(editing<0)data[current].push(obj);else data[current][editing]={...data[current][editing],...obj};
 editing=singleton(current)?0:-1;renderForm(singleton(current)?data[current][0]:{});renderList();const saved=saveDraft();formDirty=false;editorMode(singleton(current));if(saved)status("変更を一時保存しました。公開するには「このデータを公開する」を押してください。");
});
$("clear-button").addEventListener("click",()=>{if(!allowDiscard())return;editing=singleton(current)&&data[current].length?0:-1;renderForm();formDirty=false;status("入力欄をクリアしました。")});
$("content-list").addEventListener("click",e=>{
 const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
 if(edit){if(!allowDiscard())return;editing=Number(edit.dataset.edit);renderForm(data[current][editing]);formDirty=false;editorMode(true);window.scrollTo({top:0,behavior:"instant"})}
 if(del){if(!dataReady||publishing||imageBusy)return;const i=Number(del.dataset.delete);if(!confirm("このデータを削除しますか？"))return;data[current].splice(i,1);editing=-1;saveDraft();renderForm();renderList();status("データを削除しました。公開するには公開ボタンを押してください。")}
});
document.querySelectorAll(".admin-tab").forEach(b=>b.addEventListener("click",()=>{if(!allowDiscard())return;current=b.dataset.kind;editing=-1;renderTabs()}));
$("reset-button").addEventListener("click",async()=>{
 if(publishing||imageBusy)return;
 if(!confirm("このブラウザー内の編集内容を破棄し、GitHub上の公開データを読み直しますか？"))return;
 try{await loadRemote();dataReady=true;localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(BASELINE_KEY);draftConflict=false;editing=-1;renderTabs();status("公開データを読み込みました。")}catch(e){status(e.message+"。編集内容は維持しました。")}
});
async function loadRemote(){
 const next={};for(const key of Object.keys(FILES)){const r=await fetch("data/"+FILES[key],{cache:"no-store"});if(!r.ok)throw new Error("公開データを取得できません: "+LABELS[key]);const a=await r.json();if(!Array.isArray(a))throw new Error("データ形式が不正です: "+LABELS[key]);next[key]=a}Object.assign(data,next);Object.assign(baseline,JSON.parse(JSON.stringify(next)));
}
function base64Utf8(value){
 const bytes=new TextEncoder().encode(value);let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);
}
async function githubRequest(path,options={}){
 const response=await fetch(API+path,{...options,headers:{Accept:"application/vnd.github+json","Authorization":"Bearer "+accessToken,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(options.headers||{})}});
 if(response.status===401){accessToken="";githubLogin="";tokenExpiresAt=0;updateAuthUI();throw new Error("GitHubログインの有効期限が切れました。再度ログインしてください。")}
 return response;
}
// Publish JSON and its generated Open Graph pages in a single non-forced commit.
async function publishWithSharePages(kind,file,snapshot){
 const base="/repos/"+REPO+"/",encoded=file.split("/").map(encodeURIComponent).join("/");
 const git=async(path,method="GET",payload)=>{const res=await githubRequest(base+path,{method,...(payload?{body:JSON.stringify(payload)}:{})});if(!res.ok)throw Error("OGP付き公開を中止しました ("+res.status+")。GitHubの状態を確認してから再試行してください。");return res.json()};
 const head=await git("git/ref/heads/"+encodeURIComponent(BRANCH)),parent=head.object?.sha;
 if(!/^[a-f0-9]{40}$/.test(parent||""))throw Error("公開ブランチを確認できません。");
 const commit=await git("git/commits/"+parent),treeSha=commit.tree?.sha;
 if(!/^[a-f0-9]{40}$/.test(treeSha||""))throw Error("公開データのツリーを確認できません。");
 const remote=await git("contents/"+encoded+"?ref="+parent);
 const decoded=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(remote.content.replace(/\s/g,"")),ch=>ch.charCodeAt(0))));
 if(canonical(decoded)!==canonical(baseline[kind]))throw Error("GitHub上のデータが変更されました。上書きを中止しました。公開データを再読込してください。");
 const generated=new Map(),snapshotItems=JSON.parse(snapshot);
 for(const item of (kind==="settings"?[]:snapshotItems)){if(item.published!==true)continue;const entry=sharePageHtml(kind,item);if(!entry||generated.has(entry.path))throw Error("共有ページを生成できません。公開レコードのID・名称を確認してください。");generated.set(entry.path,entry.content)}
 const existing=await git("git/trees/"+treeSha);
 if(existing.truncated||!Array.isArray(existing.tree))throw Error("共有ページ一覧が不完全です。公開を中止しました。");
 const prefix=kind==="talents"?"share-member-":"share-news-",pattern=new RegExp("^"+prefix+"[A-Za-z0-9_-]+\\.html$");
 const entries=[{path:file,mode:"100644",type:"blob",content:snapshot},...[...generated].map(([path,content])=>({path,mode:"100644",type:"blob",content}))];
 for(const entry of existing.tree)if(kind!=="settings"&&entry.type==="blob"&&pattern.test(entry.path)&&!generated.has(entry.path))entries.push({path:entry.path,mode:"100644",type:"blob",sha:null});
 const decodeFile=async path=>{const remote=await git("contents/"+path+"?ref="+parent);return new TextDecoder().decode(Uint8Array.from(atob(remote.content.replace(/\s/g,"")),ch=>ch.charCodeAt(0)))};
 if(kind==="settings"){const html=await decodeFile("index.html");entries.push({path:"index.html",mode:"100644",type:"blob",content:homepageSeo(html,snapshotItems)})}
 else{
 const other=kind==="talents"?"news":"talents",otherItems=JSON.parse(await decodeFile("data/"+other+".json"));
 if(!Array.isArray(otherItems))throw Error("サイトマップの公開データを確認できません。");
 entries.push({path:"sitemap.xml",mode:"100644",type:"blob",content:sitemapXml(kind==="talents"?snapshotItems:otherItems,kind==="news"?snapshotItems:otherItems)});
 }
 const tree=await git("git/trees","POST",{base_tree:treeSha,tree:entries});
 if(!/^[a-f0-9]{40}$/.test(tree.sha||""))throw Error("共有ページの保存を確認できません。");
 const next=await git("git/commits","POST",{message:"Update "+file+" and Open Graph pages via Poppoo Admin",tree:tree.sha,parents:[parent]});
 if(!/^[a-f0-9]{40}$/.test(next.sha||""))throw Error("公開コミットを確認できません。");
 const latest=await git("git/ref/heads/"+encodeURIComponent(BRANCH));
 if(latest.object?.sha!==parent)throw Error("別の更新を検出したため公開を中止しました。再読み込みしてください。");
 const updated=await git("git/refs/heads/"+encodeURIComponent(BRANCH),"PATCH",{sha:next.sha,force:false});
 if(updated.object?.sha!==next.sha)throw Error("公開結果を確認できません。GitHub上の状態をご確認ください。");
 return {commit:{sha:next.sha}};
}
async function publishCurrent(){
 if(publishing||imageBusy||!dataReady)return;
 if(formDirty){status("未保存の入力があります。先に変更を保存してください。");return}
 if(draftConflict){status("保存済み下書きと公開データの比較基準が一致しません。下書きを控えて公開データを読み直してください。");return}
 if(!authReady()){status("先にGitHubへログインしてください。");updateAuthUI();return}
 const issues=checkData(data).filter(x=>x.kind===current);
 const errors=issues.filter(x=>x.level==="error");if(errors.length){status("公開できません: "+errors[0].message+"（データ整合性チェックを確認してください）");return}
 const validation=validateDataset(current,data[current]);if(validation){status("公開できません: "+validation);return}
 const kind=current, snapshot=JSON.stringify(data[current],null,2)+"\n",file="data/"+FILES[kind],button=$("publish-button");
 const diff=changes(kind);if(canonical(baseline[kind])===canonical(data[kind])){status("公開する変更はありません。");return}
 if(!confirm(LABELS[kind]+"を公開します。新規 "+diff.filter(x=>x.type==="新規").length+"件、変更 "+diff.filter(x=>x.type==="変更").length+"件、削除 "+diff.filter(x=>x.type==="削除").length+"件。"+(issues.some(x=>x.level==="warning")?"\n警告 "+issues.filter(x=>x.level==="warning").length+"件があります。整合性チェックの内容を確認してください。":"")+"\nよろしいですか？"))return;
 publishing=true;
 button.disabled=true;button.textContent="公開中...";
 try{
  let result;
  if(["talents","news","settings"].includes(kind))result=await publishWithSharePages(kind,file,snapshot);
  else{
  const encodedPath=file.split("/").map(encodeURIComponent).join("/");
  const get=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath+"?ref="+encodeURIComponent(BRANCH));
  let sha=null;
  if(get.status===200){const existing=await get.json();sha=existing.sha;const remote=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(existing.content.replace(/\s/g,"")),ch=>ch.charCodeAt(0))));if(canonical(remote)!==canonical(baseline[kind]))throw Error("GitHub上のデータが読み込み後に変更されました。上書きを中止しました。編集内容を控えてから公開データを読み直してください。")}
  else {const detail=await get.text();throw new Error("現在の公開データを確認できませんでした ("+get.status+"): "+detail.slice(0,180))}
  const payload={message:"Update "+file+" via Poppoo Admin",content:base64Utf8(snapshot),branch:BRANCH};
  if(sha)payload.sha=sha;
  const put=await githubRequest("/repos/"+REPO+"/contents/"+encodedPath,{method:"PUT",body:JSON.stringify(payload)});
  if(!put.ok){const detail=await put.text();throw new Error("GitHubへの保存に失敗しました ("+put.status+"): "+detail.slice(0,240))}
  result=await put.json();
  }
  baseline[kind]=JSON.parse(snapshot);renderList();
  const saved=saveDraft();
  status("公開しました。GitHubのコミット: "+(result.commit?.sha||"完了")+(saved?"":"。ブラウザー内の保存に失敗しました。公開データを再読込してください。")+". 公式サイトへの反映には数分かかる場合があります。");
 }catch(error){status(error.message||"公開に失敗しました。変更内容はブラウザー内に残っています。")}
 finally{publishing=false;button.textContent="このデータを公開する";updateAuthUI()}
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


function checkData(sets,paths=null){
 const issues=[],add=(kind,index,level,message)=>issues.push({kind,index,level,message});
 const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const members=Array.isArray(sets.talents)?sets.talents.filter(x=>x&&typeof x==="object"):[];
 for(const kind of Object.keys(FILES)){
 const items=sets[kind];if(!Array.isArray(items)){add(kind,-1,"error","配列形式ではありません");continue}
 if(singleton(kind)&&items.length>1)add(kind,-1,"error","設定は1件のみ登録できます");
 const ids=new Set();
 items.forEach((x,i)=>{
 if(!x||typeof x!=="object"||Array.isArray(x)){add(kind,i,"error","レコード形式が不正です");return}
 const issue=(level,msg)=>add(kind,i,level,msg);
 for(const [key,label,,required] of SCHEMAS[kind])if(required&&(typeof x[key]!=="string"||!x[key].trim()))issue("error",label+"が未入力または不正です");
 if(typeof x.published!=="boolean")issue("warning","公開設定が未指定または不正です");
 if(["talents","news"].includes(kind)){if(!/^[A-Za-z0-9_-]+$/.test(x.id||""))issue("error","ID形式が不正です");if(ids.has(x.id))issue("error","IDが重複しています");ids.add(x.id)}
 for(const key of ["date","debutDate","joinDate"])if((x[key]||key==="date"&&["news","schedule"].includes(kind))&&!validDate(x[key]))issue("error",key+"が実在する日付ではありません");
 if(kind==="news"&&Array.isArray(x.memberIds))for(const id of x.memberIds){const m=members.find(t=>t.id===id);if(!m)issue("warning","関連メンバーIDが見つかりません: "+id);else if(x.published===true&&m.published!==true)issue("warning","非公開メンバーへの関連付けがあります: "+id)}
 if(kind==="schedule"&&x.scheduleSource!==undefined&&(!["admin","member"].includes(x.scheduleSource)||x.scheduleSource==="member"&&(x.published!==true||typeof x.memberId!=="string"||!x.memberId||typeof x.id!=="string"||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).test(x.id))))issue("error","配信予定の管理区分が不正です");
 if(kind==="schedule"&&x.id){if(!/^[A-Za-z0-9_-]+$/.test(x.id))issue("error","配信予定IDが不正です");if(ids.has(x.id))issue("error","配信予定IDが重複しています");ids.add(x.id)}
 if(kind==="schedule"){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time||""))issue("error","開始時刻が不正です");const error=scheduleParticipantError(x,members);if(error)issue("error",error);const ids=scheduleParticipantIds(x,members);if(!ids.length)issue("warning","登録メンバーに一致する名前がありません");for(const id of ids){const t=members.find(m=>m.id===id);if(!t)issue("warning","参加メンバーIDが見つかりません: "+id);else if(x.published===true&&t.published!==true)issue("warning","非公開メンバーへの関連付けがあります: "+id)}}
 if(kind==="talents"&&x.imageColor&&!/^#[0-9a-f]{6}$/i.test(x.imageColor))issue("error","イメージカラーは #RRGGBB 形式で指定してください");
 if(kind==="settings"&&Array.isArray(x.managementIds))for(const id of x.managementIds)if(!members.some(t=>t.id===id&&t.published===true))issue("warning","公開メンバーに存在しない運営メンバーID: "+id);
 if(kind==="home"&&Array.isArray(x.featuredIds))for(const id of x.featuredIds)if(!members.some(t=>t.id===id&&t.published===true))issue("warning","公開メンバーに存在しないピックアップID: "+id);
 for(const key of ["iconImage","avatarImage","avatarImages","thumbnailImage","heroImage","seoImage"]){const values=Array.isArray(x[key])?x[key]:x[key]?[x[key]]:[];for(const v of values){if(typeof v!=="string"){issue("error",key+"の画像パスが不正です");continue}if(/^https:\/\//i.test(v)){issue("warning",key+"の外部画像は到達確認対象外です");continue}if(!/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(v)||v.split("/").includes(".."))issue("error",key+"の画像パスが不正です");else if(paths&&!paths.has(v))issue("warning","GitHubに画像が見つかりません: "+v)}}
 });
 }return issues;
}
function showCheck(issues,note){$("cms-check-status").textContent="エラー "+issues.filter(x=>x.level==="error").length+"件 / 警告 "+issues.filter(x=>x.level==="warning").length+"件。"+note;$("cms-check-results").replaceChildren(...issues.map(x=>{const p=document.createElement("p");p.className="cms-check-"+x.level;p.textContent=(x.level==="error"?"エラー":"警告")+" | "+LABELS[x.kind]+(x.index>=0?" "+(x.index+1)+"件目":"")+" | "+x.message;return p}))}
$("cms-check-open").onclick=()=>{$("cms-check-panel").hidden=false;showCheck(checkData(data),"画像の存在確認は未実施です。");$("cms-check-panel").scrollIntoView({block:"start"})};
$("cms-check-close").onclick=()=>{$("cms-check-panel").hidden=true};
$("cms-check-run").onclick=async()=>{const button=$("cms-check-run");button.disabled=true;let paths=null,note="画像の存在確認は未実施です。";try{if(authReady()){const r=await githubRequest("/repos/"+REPO+"/git/trees/"+BRANCH+"?recursive=1");if(!r.ok)throw Error("GitHub取得失敗");const tree=await r.json();if(tree.truncated||!Array.isArray(tree.tree))throw Error("一覧不完全");paths=new Set(tree.tree.filter(x=>x.type==="blob").map(x=>x.path));note="GitHub内の画像パスを確認しました。外部画像は未確認です。"}}catch(e){note="画像確認を完了できませんでした: "+e.message}finally{showCheck(checkData(data,paths),note);button.disabled=false}};
const mediaPanel=$("cms-media-panel");let mediaFiles=[],mediaBusy=false;
const mediaPath=p=>/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(p)&&!p.split("/").includes("..");
function mediaRefs(path){const out=[];for(const [source,sets] of [["編集中",data],["読み込み時の公開データ",baseline]])for(const k of Object.keys(FILES))for(const item of sets[k]||[]){for(const field of ["iconImage","avatarImage","avatarImages","thumbnailImage","heroImage","seoImage"]){const v=item[field];if(v===path||(Array.isArray(v)&&v.includes(path)))out.push(source+" / "+LABELS[k]+" / "+(item.name||item.title||item.id||"設定")+" / "+field)}}return out}
function renderMedia(){const q=$("cms-media-search").value.toLowerCase(),category=$("cms-media-category").value,unused=$("cms-media-unused").checked;const list=mediaFiles.filter(f=>f.path.toLowerCase().includes(q)&&(!category||f.path.startsWith(category))&&(!unused||!mediaRefs(f.path).length));$("cms-media-count").textContent=list.length+" / "+mediaFiles.length+" 件";$("cms-media-grid").replaceChildren(...list.map(f=>{const card=document.createElement("article");card.className="cms-media-card";const img=document.createElement("img");img.src=f.path;img.loading="lazy";img.alt=f.path.split("/").pop();const name=document.createElement("strong");name.textContent=img.alt;const info=document.createElement("small");const refs=mediaRefs(f.path);info.textContent=Math.ceil(f.size/1024)+" KB / "+(refs.length?"参照あり":"登録データ内の参照なし");const detail=document.createElement("button");detail.type="button";detail.textContent="詳細・再利用";detail.className="btn secondary";detail.onclick=()=>{ $("cms-media-path").value=f.path;$("cms-media-detail").textContent=refs.length?refs.join("\n"):"登録データ内に参照はありません。固定HTML・CSS・過去履歴での使用は未確認です。";$("cms-media-apply").disabled=false};card.append(img,name,info,detail);return card}))}
async function mediaLoad(){if(mediaBusy)return;mediaBusy=true;try{if(!authReady())throw Error("GitHubへログインしてください。");const r=await githubRequest("/repos/"+REPO+"/git/trees/"+BRANCH+"?recursive=1");if(!r.ok)throw Error("画像一覧取得に失敗しました ("+r.status+")");const tree=await r.json();if(tree.truncated)throw Error("一覧が途中で切れています。取得を中止しました。");mediaFiles=tree.tree.filter(f=>f.type==="blob"&&mediaPath(f.path));renderMedia();$("cms-media-status").textContent="画像一覧を取得しました。"}catch(e){$("cms-media-status").textContent=e.message}finally{mediaBusy=false}}
$("cms-media-open").onclick=()=>{mediaPanel.hidden=false;mediaPanel.scrollIntoView({block:"start"});mediaLoad()};
$("cms-media-close").onclick=()=>{mediaPanel.hidden=true};
$("cms-media-load").onclick=mediaLoad;
for(const id of ["cms-media-search","cms-media-category","cms-media-unused"])$(id).addEventListener("input",renderMedia);
$("cms-media-copy").onclick=async()=>{try{await navigator.clipboard.writeText($("cms-media-path").value);$("cms-media-status").textContent="画像パスをコピーしました。"}catch{$("cms-media-path").select();$("cms-media-status").textContent="選択されたパスをコピーしてください。"}};
$("cms-media-apply").onclick=()=>{if(imageBusy||publishing||!dataReady){$("cms-media-status").textContent="処理中は設定できません。";return}const path=$("cms-media-path").value,key=$("cms-media-field").value,el=$("content-form").elements.namedItem(key);if(!mediaFiles.some(f=>f.path===path)||!el||!SCHEMAS[current].some(f=>f[0]===key&&["image","gallery"].includes(f[2]))){$("cms-media-status").textContent="対象の編集カテゴリ・画像欄を選択してください。";return}const folder=key==="thumbnailImage"?"news":key==="heroImage"?"home":"talents";if(!path.startsWith("assets/images/"+folder+"/")){$("cms-media-status").textContent="この画像欄には対応するカテゴリの画像を選択してください。";return}if(key==="avatarImages"){const values=galleryValues(el);if(!values.includes(path))values.push(path);el.value=JSON.stringify(values);renderGallery(el)}else{el.value=path;renderSingleImage(key,path)}formDirty=true;updateProfileSummary();editorMode(true);const group=el.closest("[data-profile-group]");if(group&&group.hidden)$("cms-profile-tabs").children[Number(group.dataset.profileGroup)]?.click();$("cms-media-status").textContent="編集フォームに設定しました。保存してから公開してください。"};
$("cms-media-upload").onclick=async()=>{if(mediaBusy)return;mediaBusy=true;try{if(!authReady())throw Error("GitHubへログインしてください。");const folder=$("cms-media-upload-folder").value; if(!["talents","news","home","common"].includes(folder))throw Error("保存先が不正です");const files=Array.from($("cms-media-files").files);for(const file of files){const ext=({"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"})[file.type];if(!ext||file.size>8*1024*1024)throw Error("PNG/JPG/WebP/GIF、8MB以下の画像を選択してください。")}for(const file of files){const ext=({"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"})[file.type],path="assets/images/"+folder+"/"+crypto.randomUUID()+"."+ext;const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const r=await githubRequest("/repos/"+REPO+"/contents/"+path,{method:"PUT",body:JSON.stringify({message:"Upload media "+path,content:btoa(binary),branch:BRANCH})});if(!r.ok)throw Error("アップロード失敗 ("+r.status+")。先に成功した画像はGitHubに残ります。")} $("cms-media-files").value="";$("cms-media-status").textContent="アップロード完了。画像は公開リポジトリに保存されました。"}catch(e){$("cms-media-status").textContent=e.message}finally{mediaBusy=false}};
const historyPanel=$("cms-history-panel"),historyKind=$("cms-history-kind"),historyList=$("cms-history-list"),historyStatus=$("cms-history-status");
let historySnapshot=null,historyBusy=false;
function clearHistory(){historySnapshot=null;$("cms-history-restore").disabled=true;$("cms-history-content").textContent="";historyList.replaceChildren()}
async function historyAction(fn){if(historyBusy)return;historyBusy=true;for(const id of ["cms-history-load","cms-history-kind","cms-history-close","cms-history-open"])$(id).disabled=true;try{if(!authReady())throw Error("GitHubへログインしてください。");await fn()}catch(e){historyStatus.textContent=e.message}finally{historyBusy=false;for(const id of ["cms-history-load","cms-history-kind","cms-history-close","cms-history-open"])$(id).disabled=false}}
$("cms-history-open").addEventListener("click",()=>{historyPanel.hidden=false;historyKind.value=current;clearHistory();historyStatus.textContent="カテゴリを選び、履歴を取得してください。";historyPanel.scrollIntoView({block:"start"})});
$("cms-history-close").addEventListener("click",()=>{clearHistory();historyPanel.hidden=true});
historyKind.addEventListener("change",()=>{clearHistory();historyStatus.textContent="履歴を取得してください。"});
$("cms-history-load").addEventListener("click",()=>historyAction(async()=>{
 clearHistory();const kind=historyKind.value;historyStatus.textContent="履歴を取得中...";
 const q=new URLSearchParams({sha:BRANCH,path:"data/"+FILES[kind],per_page:"20"});
 const r=await githubRequest("/repos/"+REPO+"/commits?"+q);if(!r.ok)throw Error("履歴取得に失敗しました ("+r.status+")");
 const list=await r.json();if(!Array.isArray(list))throw Error("履歴形式が不正です");
 for(const entry of list){if(!/^[a-f0-9]{40}$/.test(entry.sha))continue;const b=document.createElement("button");b.type="button";b.className="cms-history-entry";b.textContent=(entry.commit?.committer?.date||"")+" | "+entry.sha.slice(0,8)+" | "+(entry.commit?.message||"");b.addEventListener("click",()=>historyAction(async()=>{
 historySnapshot=null;$("cms-history-restore").disabled=true;$("cms-history-content").textContent="";
 const response=await githubRequest("/repos/"+REPO+"/contents/data/"+FILES[kind]+"?ref="+entry.sha);if(!response.ok)throw Error("過去データを取得できません ("+response.status+")");
 const file=await response.json();const items=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,"")),ch=>ch.charCodeAt(0))));
 if(!Array.isArray(items))throw Error("過去データ形式が不正です");
 const validation=validateDataset(kind,items);$("cms-history-content").textContent=JSON.stringify(items,null,2);
 historyStatus.textContent=items.length+"件 / "+entry.sha.slice(0,8)+(validation?" / 復元不可: "+validation:" / 復元可能");
 if(!validation){historySnapshot={kind,items,sha:entry.sha};$("cms-history-restore").disabled=false}
 }));historyList.append(b)}
 historyStatus.textContent=list.length+"件の履歴（最大20件）";
}));
$("cms-history-restore").addEventListener("click",()=>{
 if(historyBusy||publishing||!historySnapshot||!authReady())return;
 const {kind,items,sha}=historySnapshot;
 if(!confirm(LABELS[kind]+"を "+sha.slice(0,8)+" 時点の内容に置き換えます。現在の保存済み編集内容と未保存の入力は失われます。GitHubにはまだ公開しません。続けますか？"))return;
 data[kind]=JSON.parse(JSON.stringify(items));current=kind;editing=-1;renderTabs();saveDraft();status("過去データを編集用に復元しました。変更内容を確認してから公開してください。");historyPanel.hidden=true;clearHistory();
});
const previewPanel=$("cms-preview-panel"),previewFrame=$("cms-preview-frame"),previewTarget=$("cms-preview-target");
function closePreview(){previewFrame.removeAttribute("src");previewPanel.hidden=true;try{sessionStorage.removeItem("poppoo-cms-preview")}catch{}}
function refreshPreview(){
 try{
 const snapshot=JSON.parse(JSON.stringify(Object.fromEntries(Object.keys(FILES).map(k=>["data/"+FILES[k],data[k]]))));
 const selected=JSON.parse(previewTarget.value);const [page,kind,id]=selected;
 if(kind){const item=snapshot["data/"+FILES[kind]].find(x=>x.id===id);if(!item)throw Error("対象が見つかりません");item.published=true}
 const u=new URL(page,location.href);u.searchParams.set("cmsPreview","1");if(id)u.searchParams.set("id",id);
 sessionStorage.setItem("poppoo-cms-preview",JSON.stringify(snapshot));previewFrame.style.width=$("cms-preview-width").value+"px";previewFrame.src=u.href;$("cms-preview-status").textContent="保存済み編集データを表示しています。GitHubへの公開は行っていません。";
 }catch(e){previewFrame.removeAttribute("src");$("cms-preview-status").textContent="プレビューを開けません: "+e.message}
}
$("cms-preview-open").addEventListener("click",()=>{
 const options=[["index.html",null,null,"トップページ"],["about.html",null,null,"コミュニティ概要"],["audition.html",null,null,"参加案内"],["contact.html",null,null,"お問い合わせ"],["talents.html",null,null,"メンバー一覧"],["news.html",null,null,"お知らせ一覧"],["schedule.html",null,null,"配信予定一覧"],["activity.html",null,null,"活動実績一覧"],["anniversary.html",null,null,"記念日カレンダー"],...data.talents.map(t=>["talent.html","talents",t.id,"メンバー: "+t.name]),...data.news.map(n=>["news-detail.html","news",n.id,"記事: "+n.title])];
 previewTarget.replaceChildren(...options.map(([page,kind,id,label])=>{const o=document.createElement("option");o.value=JSON.stringify([page,kind,id]);o.textContent=label;return o}));previewPanel.hidden=false;refreshPreview();previewPanel.scrollIntoView({block:"start"});
});
$("cms-preview-refresh").addEventListener("click",refreshPreview);
previewTarget.addEventListener("change",refreshPreview);
$("cms-preview-width").addEventListener("change",()=>{previewFrame.style.width=$("cms-preview-width").value+"px"});
$("cms-preview-close").addEventListener("click",closePreview);
window.addEventListener("pagehide",closePreview);
(async()=>{
 try{await loadRemote();dataReady=true}catch(e){updateAuthUI();status(e.message+"。再読み込みしてください。");return}
 try{const draft=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"),previous=JSON.parse(localStorage.getItem(BASELINE_KEY)||"null");if(draft&&typeof draft==="object")for(const key of Object.keys(FILES))if(Array.isArray(draft[key])){if(canonical(draft[key])===canonical(baseline[key]))continue;if(previous&&canonical(draft[key])===canonical(previous[key]))continue;if(!previous||canonical(previous[key])!==canonical(baseline[key]))draftConflict=true;data[key]=draft[key]}}catch{draftConflict=true}
 renderTabs();status(draftConflict?"保存済み下書きの比較基準を確認できません。内容を控えて公開データを読み直してください。公開は停止しています。":"準備完了。編集内容はこのブラウザー内に一時保存されます。");
})();
})();