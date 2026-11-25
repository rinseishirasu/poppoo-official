// Portal authentication: initial administrator and login.
const encoder = new TextEncoder();
const ITERATIONS = 100000; // Compatibility test only; review before production.
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join("");
function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
async function digest(value){return hex(await crypto.subtle.digest("SHA-256",encoder.encode(value)));}
async function derive(password,salt){
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:ITERATIONS},key,256));
}
export async function hashPassword(password){
 if(typeof password!=="string" || password.length<16 || encoder.encode(password).length>1024) throw new Error("Invalid password length");
 const salt=randomToken();
 return "pbkdf2-sha256$"+ITERATIONS+"$"+salt+"$"+await derive(password,salt);
}
export async function verifyPassword(password,stored){
 if(typeof password!=="string" || encoder.encode(password).length>1024 || typeof stored!=="string")return false;
 const [algorithm,iterations,salt,expected,...extra]=stored.split("$");
 if(extra.length || algorithm!=="pbkdf2-sha256" || iterations!==String(ITERATIONS) || !/^[a-f0-9]{64}$/.test(salt||"") || !/^[a-f0-9]{64}$/.test(expected||""))return false;
 const actual=await derive(password,salt);
 const bytes=s=>Uint8Array.from(s.match(/../g),v=>parseInt(v,16));
 return crypto.subtle.timingSafeEqual(bytes(actual),bytes(expected));
}
export async function createSession(db,accountId){
 const token=randomToken(),expires=Math.floor(Date.now()/1000)+28800;
 const result=await db.prepare("INSERT INTO sessions(token_hash,account_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND status='active'").bind(await digest(token),expires,accountId).run();
 if(result.meta.changes!==1)throw new Error("Account unavailable");
 return {token,expires};
}
export async function readSession(db,token){
 if(!/^[a-f0-9]{64}$/.test(token||""))return null;
 return db.prepare("SELECT a.id,a.member_id,a.role FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.status='active'").bind(await digest(token),Math.floor(Date.now()/1000)).first();
}
export async function revokeSession(db,token){
 if(/^[a-f0-9]{64}$/.test(token||""))await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
}
export function sessionCookie(token){return "__Host-poppoo_session="+token+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=28800";}
export function clearSessionCookie(){return "__Host-poppoo_session=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0";}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"}});}
const now=()=>Math.floor(Date.now()/1000);
const validEmail=e=>typeof e==="string"&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const cookie=request=>(request.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-poppoo_session=([a-f0-9]{64})(?:;|$)/)?.[1]||"";
async function limit(db,key,max){
 const hash=await digest(key),t=now();
 const row=await db.prepare("INSERT INTO login_limits(bucket_hash,attempts,window_until) VALUES (?,1,?) ON CONFLICT(bucket_hash) DO UPDATE SET attempts=CASE WHEN window_until<=? THEN 1 ELSE attempts+1 END, window_until=CASE WHEN window_until<=? THEN excluded.window_until ELSE window_until END RETURNING attempts").bind(hash,t+900,t,t).first();
 return row.attempts<=max;
}
async function equalSecret(a,b){
 if(typeof a!=="string"||typeof b!=="string"||b.length<32||a.length>1024)return false;
 const [x,y]=await Promise.all([crypto.subtle.digest("SHA-256",encoder.encode(a)),crypto.subtle.digest("SHA-256",encoder.encode(b))]);
 return crypto.subtle.timingSafeEqual(x,y);
}
function page(mode,message="",status=200,content=""){
 const nonce=randomToken(),csrf=randomToken();
 const setup=mode==="setup",home=mode==="home";
 const form=["activate","profile"].includes(mode)?content:mode==="admin"?content+'<form method="post" action="/logout"><button>ログアウト</button></form>':home?content+'<form method="post" action="/logout"><button>ログアウト</button></form>':'<form method="post" action="'+(setup?"/setup":"/login")+'">'+(setup?'<label>初期設定Secret<input name="secret" type="password" required autocomplete="off" maxlength="1024"></label>':'')+'<label>メールアドレス<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label>パスワード<input name="password" type="password" required '+(setup?'minlength="16" autocomplete="new-password"':'autocomplete="current-password"')+' maxlength="1024"></label><button>'+(setup?"初期管理者を登録":"ログイン")+'</button></form>';
 return new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>POPPŌ MEMBER PORTAL</title><style nonce="'+nonce+'">*{box-sizing:border-box}body{margin:0;background:#edf5fc;color:#142f56;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:20px}main{background:white;border:1px solid #dbe8f4;border-radius:20px;padding:32px;width:min(100%,'+(mode==="admin"?"840px":home||mode==="profile"?"1000px":"440px")+')}h1{font-size:1.3rem}h2{font-size:1.1rem}label{display:grid;gap:6px;margin:18px 0}input,select,textarea,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #b8cde1;width:100%}button{background:#176bb2;color:white;border:0;cursor:pointer}p{line-height:1.7}small{color:#536b83}article{border-top:1px solid #dbe8f4;padding:12px 0;overflow-wrap:anywhere}article form{margin-top:8px}a{color:#176bb2}textarea{resize:vertical;min-height:90px}pre{white-space:pre-wrap;overflow-wrap:anywhere} .portal-hero{background:#142f56;color:white;padding:24px;border-radius:14px;margin:16px 0}.portal-hero h2{font-size:1.6rem;margin:8px 0}.portal-hero small{color:#c9e3ff}.portal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:16px 0}.portal-tile{padding:18px;border:1px solid #dbe8f4;border-radius:12px;overflow-wrap:anywhere}.portal-tile h2,.portal-tile h3{margin:4px 0 10px;font-size:1.05rem}.portal-tile p{margin:6px 0}.portal-tag{display:inline-block;padding:4px 10px;background:#e6f2ff;color:#174d80;border-radius:20px;font-size:.8rem;margin:3px 4px 3px 0}.portal-section{margin:22px 0}.portal-notice{background:#eff6fd;border-radius:10px;padding:12px}.portal-link{display:inline-block;padding:8px 0;font-weight:600}@media(max-width:600px){main{padding:20px}.portal-grid{grid-template-columns:1fr}.portal-hero{padding:18px}}</style><main><small>POPPŌ MEMBER PORTAL</small><h1>'+(setup?"初期管理者登録":mode==="admin"?"アカウント管理":mode==="activate"?"初回パスワード設定":mode==="profile"?"プロフィール変更申請":home?"ダッシュボード":"ログイン")+'</h1><p role="status">'+message+'</p>'+form.replace(/(<form[^>]*>)/g,'$1<input type="hidden" name="csrf" value="'+csrf+'">')+'</main></html>',{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Set-Cookie":"__Host-poppoo_csrf="+csrf+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=900","Referrer-Policy":"same-origin","Content-Security-Policy":"default-src 'none'; style-src 'nonce-"+nonce+"'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
async function publishedMembers(){
 const response=await fetch("https://rinseishirasu.github.io/poppoo-official/data/talents.json",{headers:{"Accept":"application/json"},cache:"no-store"});
 if(!response.ok)throw Error("Member registry unavailable");
 const data=await response.json();if(!Array.isArray(data))throw Error("Member registry invalid");
 return data.filter(t=>t&&t.published===true&&typeof t.id==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(t.id)&&typeof t.name==="string");
}
async function memberDashboard(db,session){
 const base="https://rinseishirasu.github.io/poppoo-official/";
 let member=null,registryError=false,requests=null;
 try{member=(await publishedMembers()).find(m=>m.id===session.member_id)||null;}catch{registryError=true;}
 try{requests=(await db.prepare("SELECT status,COUNT(*) AS total FROM profile_requests WHERE account_id=? GROUP BY status").bind(session.id).all()).results;}catch{}
 const count=state=>requests===null?"取得できません":String(requests.find(x=>x.status===state)?.total||0)+"件";
 const tags=value=>(Array.isArray(value)?value:typeof value==="string"?[value]:[]).filter(v=>typeof v==="string"&&v.trim()).map(v=>'<span class="portal-tag">'+esc(v)+'</span>').join("");
 const profile=member?'<div>'+tags(member.cohort)+tags(member.roles)+'</div><p>'+esc(member.catchphrase||"")+'</p><a class="portal-link" href="'+base+'talent.html?id='+encodeURIComponent(member.id)+'" target="_blank" rel="noopener noreferrer">公式プロフィールを見る</a>':"<p>"+(registryError?"公開プロフィールを取得できません。":"公開プロフィールが見つかりません。")+"</p>";
 const cards=[["プロフィール・アバター","プロフィール変更申請（画像管理は準備中）"],["配信スケジュール","本人の配信予定の登録・更新"],["活動記録・記念日","活動実績や記念日の管理"],["運営からのお知らせ","メンバー向けの連絡事項"],["各種申請","活動休止・その他の申請"],["アカウント設定","パスワード変更・アカウント設定"]] .map(([title,description],i)=>'<section class="portal-tile"><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p>'+(i===0?'<a class="portal-link" href="/profile">プロフィールを編集・申請</a>':'<span class="portal-tag">準備中</span>')+'</section>').join("");
 const html='<div class="portal-hero"><small>MEMBER DASHBOARD / TEST MODE</small><h2>おかえりなさい'+(member?'、'+esc(member.name)+'さん':'')+'</h2><p>あなたの配信活動を、ひとつの場所から。</p></div><p class="portal-notice">検証版です。プロフィール変更申請をお試しいただけます。</p><div class="portal-grid"><section class="portal-tile"><h2>マイプロフィール</h2>'+profile+'</section><section class="portal-tile"><h2>プロフィール申請状況</h2><p>審査待ち：'+esc(count("pending"))+'</p><p>差し戻し：'+esc(count("returned"))+'</p><p>下書き：'+esc(count("draft"))+'</p><small>申請は公式サイトにまだ反映されません。</small></section></div><section class="portal-section"><h2>メンバーメニュー</h2><div class="portal-grid">'+cards+'</div></section><p><a href="'+base+'" target="_blank" rel="noopener noreferrer">ぽっぽー公式サイト</a></p>';
 return page("home","",200,html);
}
// Only these text fields may be requested by members. Identity, roles, publication and images are administrator-controlled.
const PROFILE_FIELDS=[["catchphrase","キャッチフレーズ",100],["bio","自己紹介",800],["hobbies","趣味",200],["skills","特技",200],["fanName","ファンネーム",60],["oshiMark","推しマーク",60],["streamTag","配信タグ",100],["fanArtTag","ファンアートタグ",100],["message","メッセージ",400]];
const profileValues=m=>Object.fromEntries(PROFILE_FIELDS.map(([k])=>[k,typeof m[k]==="string"?m[k]:""]));
const profileRevision=async m=>digest(JSON.stringify(profileValues(m)));
const profileStatus={draft:"下書き",pending:"審査待ち",approved:"承認済み",returned:"差し戻し",withdrawn:"取り下げ"};
async function profilePage(db,session,message="",status=200){
 const member=(await publishedMembers()).find(m=>m.id===session.member_id);
 if(!member)return page("profile","公開プロフィールが見つかりません。",404,'<a href="/">ダッシュボードに戻る</a>');
 const base=profileValues(member),revision=await profileRevision(member);
 const rows=(await db.prepare("SELECT id,base_revision,patch_json,status,review_note,updated_at FROM profile_requests WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT 30").bind(session.id).all()).results;
 const open=await db.prepare("SELECT id,base_revision,patch_json,status FROM profile_requests WHERE account_id=? AND status IN ('draft','pending') ORDER BY created_at DESC,id DESC LIMIT 1").bind(session.id).first();
 const draft=open?.status==="draft"?open:null;
 const stale=draft&&draft.base_revision!==revision;
 const patch=draft?JSON.parse(draft.patch_json):{};
 const values={...base,...Object.fromEntries(PROFILE_FIELDS.filter(([k])=>typeof patch[k]==="string").map(([k])=>[k,patch[k]]))};
 const editor=open?.status==="pending"?'<p class="portal-notice">審査中の申請があります。取り下げるまで新規申請はできません。</p>':stale?'<p class="portal-notice">公開プロフィールが変更されています。下書きを取り下げてから編集し直してください。</p>':'<form method="post" action="/profile/save"><input type="hidden" name="revision" value="'+esc(revision)+'"><input type="hidden" name="request_id" value="'+esc(draft?.id||"")+'"><input type="hidden" name="draft_version" value="'+esc(draft?await digest(draft.patch_json):"")+'">'+PROFILE_FIELDS.map(([k,label,max])=>'<label>'+esc(label)+'（'+max+'文字以内）<textarea name="'+k+'" maxlength="'+max+'">'+esc(values[k])+'</textarea></label>').join("")+'<p>変更内容はD1に保存され、公式サイトには反映されません。</p><button name="action" value="draft">下書き保存</button><p></p><button name="action" value="pending">審査へ提出</button></form>';
 const history=rows.length?rows.map(row=>{
 const patch=JSON.parse(row.patch_json);
 const details=PROFILE_FIELDS.filter(([k])=>typeof patch[k]==="string").map(([k,label])=>'<p><strong>'+esc(label)+'</strong></p><pre>'+esc(patch[k]||"（空欄に変更）")+'</pre>').join("");
 return '<article><strong>'+esc(profileStatus[row.status]||row.status)+'</strong> <small>'+esc(row.updated_at)+' UTC</small><details><summary>変更内容を見る</summary>'+details+'</details>'+(row.review_note?'<p>運営コメント：'+esc(row.review_note)+'</p>':"")+(["draft","pending","returned"].includes(row.status)?'<form method="post" action="/profile/withdraw"><input type="hidden" name="id" value="'+esc(row.id)+'"><button>この申請を取り下げる</button></form>':"")+'</article>';
 }).join(""):"<p>申請履歴はまだありません。</p>";
 return page("profile",message,status,'<p><a href="/">ダッシュボードに戻る</a></p><div class="portal-hero"><small>PROFILE REQUEST / TEST MODE</small><h2>'+esc(member.name)+'</h2><p>プロフィールの変更内容を運営へ申請します。</p></div><p class="portal-notice">名前・期生・役職・画像・公開設定は現在編集対象外です。個人情報を入力しないでください。</p><h2>プロフィール編集</h2>'+editor+'<h2>申請履歴（最新30件）</h2>'+history);
}
async function saveProfile(db,session,form){
 const member=(await publishedMembers()).find(m=>m.id===session.member_id);
 if(!member)return json({error:"Profile unavailable"},404);
 const revision=await profileRevision(member),base=profileValues(member),action=form.get("action");
 if(!["draft","pending"].includes(action)||form.get("revision")!==revision)return json({error:"Profile changed; reopen editor"},409);
 const patch={};
 for(const [k,,max] of PROFILE_FIELDS){
 const value=form.get(k);if(typeof value!=="string"||value.length>max)return json({error:"Invalid profile field"},400);
 const normalized=value.replace(/\r\n/g,"\n").trim();if(normalized!==base[k].replace(/\r\n/g,"\n").trim())patch[k]=normalized;
 }
 if(!Object.keys(patch).length)return profilePage(db,session,"変更された項目がありません。",400);
 const id=form.get("request_id")||"",payload=JSON.stringify(patch);
 let result;
 if(id){
 const old=await db.prepare("SELECT patch_json FROM profile_requests WHERE id=? AND account_id=? AND status='draft' AND base_revision=?").bind(id,session.id,revision).first();
 if(!old||await digest(old.patch_json)!==form.get("draft_version"))return json({error:"Draft changed; reopen editor"},409);
 result=await db.prepare("UPDATE profile_requests SET patch_json=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status='draft' AND base_revision=? AND patch_json=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active')").bind(payload,action,id,session.id,revision,old.patch_json,session.id).run();
 }else{
 result=await db.prepare("INSERT INTO profile_requests(id,account_id,base_revision,patch_json,status) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM profile_requests WHERE account_id=? AND status IN ('draft','pending')) AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active')").bind(crypto.randomUUID(),session.id,revision,payload,action,session.id,session.id).run();
 }
 if(result.meta.changes!==1)return json({error:"Request changed; reopen editor"},409);
 return redirect("/profile");
}
async function adminPage(db,message="",status=200,testEnabled=false,issued=""){
 const rows=(await db.prepare("SELECT id,email,member_id,role,status FROM accounts ORDER BY role,email").all()).results;
 let members=[],warning="";try{members=await publishedMembers();}catch{warning="<p>公開メンバー情報を取得できません。アカウント発行は停止中です。</p>";}
 const eligible=members.filter(m=>!rows.some(a=>a.member_id===m.id));
 const labels={active:"有効",invited:"初回設定待ち",suspended:"利用停止"};
 const list=rows.map(a=>'<article><strong>'+esc(members.find(m=>m.id===a.member_id)?.name||a.member_id||"運営管理者")+'</strong><p>'+esc(a.email)+'<br>'+esc(a.role==="admin"?"管理者":labels[a.status]||a.status)+'</p>'+(testEnabled&&a.role==="member"&&a.status==="invited"?'<form method="post" action="/admin/invite"><input type="hidden" name="id" value="'+esc(a.id)+'"><button>招待コードを発行・再発行</button></form>':"")+(a.role==="member"&&a.status!=="suspended"?'<form method="post" action="/admin/suspend"><input type="hidden" name="id" value="'+esc(a.id)+'"><label><span>利用停止を実行する場合のみ押してください</span><button>利用停止・セッション失効</button></label></form>':"")+'</article>').join("");
 const form=eligible.length?'<form method="post" action="/admin/accounts"><label>公開メンバー<select name="member_id" required><option value="">選択してください</option>'+eligible.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join("")+'</select></label><label>メールアドレス<input name="email" type="email" required maxlength="254"></label><button>アカウントを仮発行</button></form>':"<p>発行可能な公開メンバーはいません。</p>";
 return page("admin",message,status,"<p>運営専用・検証版。"+(testEnabled?"招待機能はテスト専用です。":"招待機能は停止中です。")+"</p>"+(issued?'<article><h2>招待コード（24時間有効）</h2><label>一度だけ表示します<input readonly value="'+esc(issued)+'"></label><p><a href="/activate">初回設定ページ</a></p></article>':"")+"<h2>アカウント仮発行</h2>"+warning+form+"<h2>登録済みアカウント</h2>"+list);
}
function activationPage(message="",status=200){return page("activate",message,status,'<p>運営から受け取った招待コードを入力してください。検証用です。</p><form method="post" action="/activate"><label>招待コード<input name="token" required maxlength="64" autocomplete="off" spellcheck="false"></label><label>新しいパスワード（16文字以上）<input name="password" type="password" required minlength="16" maxlength="1024" autocomplete="new-password"></label><label>パスワード確認<input name="confirm" type="password" required minlength="16" maxlength="1024" autocomplete="new-password"></label><button>初回設定を完了</button></form><p><a href="/">ログインに戻る</a></p>');}
function redirect(path,setCookie){const headers=new Headers({"Location":path,"Cache-Control":"no-store"});if(setCookie)headers.set("Set-Cookie",setCookie);return new Response(null,{status:303,headers});}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,db=env.DB;
 let step="request";
 try{
 if(request.method==="GET"&&path==="/health"){await db.prepare("SELECT id FROM accounts LIMIT 0").all();return json({ok:true,stage:"authentication",authenticationEnabled:true,revision:"profile-request-v9"});}
 if(request.method==="GET"&&path==="/setup"){
  if(!env.BOOTSTRAP_SECRET||await db.prepare("SELECT id FROM accounts WHERE role='admin' LIMIT 1").first())return json({error:"Setup unavailable"},404);
  return page("setup");
 }
 if(request.method==="GET"&&path==="/"){const session=await readSession(db,cookie(request));return session?.role==="admin"?redirect("/admin"):session&&session.role==="member"&&env.PORTAL_TEST_MODE==="true"?await memberDashboard(db,session):page("login");}
 if(request.method==="GET"&&path==="/profile"){const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);return await profilePage(db,session);}
 if(request.method==="GET"&&path==="/activate"){if(env.PORTAL_TEST_MODE!=="true")return json({error:"Activation disabled"},404);return activationPage();}
 if(request.method==="GET"&&path==="/admin"){const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="admin")return json({error:"Forbidden"},403);return await adminPage(db,"",200,env.PORTAL_TEST_MODE==="true"); }
 if(request.method!=="POST"||!["/setup","/login","/logout","/admin/accounts","/admin/suspend","/admin/invite","/activate","/profile/save","/profile/withdraw"].includes(path))return json({error:"Not found"},404);
 const origin=request.headers.get("Origin");
 if((origin&&origin!=="null"&&origin!==url.origin)||request.headers.get("Sec-Fetch-Site")==="cross-site")return json({error:"Cross-origin request rejected"},403);

 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 if(!await limit(db,"ip:"+ip,20))return page(path==="/setup"?"setup":"login","試行回数の上限です。15分後にお試しください。",429);
 if(!request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded"))return json({error:"Invalid request"},400);
 const reader=request.body?.getReader();let size=0;const chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>(path==="/profile/save"?32768:8192)){await reader.cancel();return json({error:"Request too large"},413);}chunks.push(value);}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const form=new URLSearchParams(new TextDecoder().decode(bytes)),email=(form.get("email")||"").trim().toLowerCase(),password=form.get("password")||"";
 const csrfCookie=(request.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-poppoo_csrf=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!csrfCookie||!await equalSecret(form.get("csrf"),csrfCookie))return json({error:"CSRF token invalid; reopen the form"},403);
 if(path==="/logout"){await revokeSession(db,cookie(request));return redirect("/",clearSessionCookie());}
 if(path.startsWith("/profile/")){
 const session=await readSession(db,cookie(request));if(session?.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);
 if(path==="/profile/save")return await saveProfile(db,session,form);
 const result=await db.prepare("UPDATE profile_requests SET status='withdrawn',updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status IN ('draft','pending','returned') AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active')").bind(form.get("id")||"",session.id,session.id).run();
 if(result.meta.changes!==1)return json({error:"Request unavailable"},409);
 return redirect("/profile");
 }
 if(path==="/activate"){
  if(env.PORTAL_TEST_MODE!=="true")return json({error:"Activation disabled"},404);
  const token=(form.get("token")||"").trim();if(!/^[a-f0-9]{64}$/.test(token)||password.length<16||encoder.encode(password).length>1024||password!==form.get("confirm"))return activationPage("入力内容を確認してください。",400);
  const tokenHash=await digest(token);
  const target=await db.prepare("SELECT a.id FROM activation_tokens t JOIN accounts a ON a.id=t.account_id WHERE t.token_hash=? AND t.used_at IS NULL AND t.expires_at>? AND a.role='member' AND a.status='invited'").bind(tokenHash,now()).first();
  if(!target)return activationPage("招待コードが無効または期限切れです。",400);
  step="activation-password-hash";const hash=await hashPassword(password);
  const results=await db.batch([db.prepare("UPDATE accounts SET password_hash=?,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='member' AND status='invited' AND EXISTS(SELECT 1 FROM activation_tokens WHERE token_hash=? AND account_id=accounts.id AND used_at IS NULL AND expires_at>?)").bind(hash,target.id,tokenHash,now()),db.prepare("UPDATE activation_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=? AND account_id=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='active')").bind(tokenHash,target.id,target.id)]);
  if(results[0].meta.changes!==1)return activationPage("招待コードが無効または期限切れです。",400);
  return redirect("/");
 }
 if(path.startsWith("/admin/")){
 const session=await readSession(db,cookie(request));if(session?.role!=="admin")return json({error:"Forbidden"},403);
 if(path==="/admin/accounts"){
 const memberId=form.get("member_id")||"";if(!validEmail(email)||! /^[A-Za-z0-9_-]{1,100}$/.test(memberId))return await adminPage(db,"入力内容を確認してください。",400,env.PORTAL_TEST_MODE==="true");
 const members=await publishedMembers();if(!members.some(m=>m.id===memberId))return await adminPage(db,"公開メンバーを選択してください。",400,env.PORTAL_TEST_MODE==="true");
 const id=crypto.randomUUID();const result=await db.prepare("INSERT INTO accounts(id,email,member_id,role,status) VALUES (?,?,?,\'member\',\'invited\') ON CONFLICT DO NOTHING").bind(id,email,memberId).run();if(result.meta.changes!==1)return await adminPage(db,"メールアドレスまたはメンバーは登録済みです。",409,env.PORTAL_TEST_MODE==="true");
 return redirect("/admin");
 }
 const id=form.get("id")||"";if(!/^[a-f0-9-]{36}$/.test(id))return json({error:"Invalid account"},400);
 if(path==="/admin/invite"){
  if(env.PORTAL_TEST_MODE!=="true")return json({error:"Invitation disabled"},403);
  const token=randomToken(),tokenHash=await digest(token);
  const result=await db.batch([db.prepare("DELETE FROM activation_tokens WHERE account_id IN (SELECT id FROM accounts WHERE id=? AND role='member' AND status='invited')").bind(id),db.prepare("INSERT INTO activation_tokens(token_hash,account_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND role='member' AND status='invited'").bind(tokenHash,now()+86400,id)]);
  if(result[1].meta.changes!==1)return json({error:"Account not eligible"},409);
  return await adminPage(db,"招待コードを発行しました。",200,true,token);
 }
 await db.batch([db.prepare("UPDATE accounts SET status=\'suspended\',updated_at=CURRENT_TIMESTAMP WHERE id=? AND role=\'member\'").bind(id),db.prepare("DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE id=? AND role=\'member\')").bind(id),db.prepare("DELETE FROM activation_tokens WHERE account_id IN (SELECT id FROM accounts WHERE id=? AND role=\'member\')").bind(id)]);
 return redirect("/admin");
 }
 if(!validEmail(email)||encoder.encode(password).length>1024)return page(path==="/setup"?"setup":"login","入力内容を確認してください。",400);
 if(path==="/setup"){
  if(await db.prepare("SELECT id FROM accounts WHERE role=\'admin\' LIMIT 1").first())return json({error:"Setup unavailable"},404);
  if(!await equalSecret(form.get("secret"),env.BOOTSTRAP_SECRET))return page("setup","登録できませんでした。",403);
  if(password.length<16)return page("setup","パスワードは16文字以上にしてください。",400);
  step="password-hash";
 const hash=await hashPassword(password);
 step="administrator-insert";
  const result=await db.prepare("INSERT INTO accounts(id,email,role,status,password_hash) SELECT ?,?,'admin','active',? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE role='admin')").bind(crypto.randomUUID(),email,hash).run();
  if(result.meta.changes!==1)return json({error:"Setup unavailable"},409);
  return redirect("/");
 }
 if(!await limit(db,"email:"+email,8))return page("login","試行回数の上限です。15分後にお試しください。",429);
 const account=await db.prepare("SELECT id,status,password_hash,role FROM accounts WHERE email=?").bind(email).first();
 const dummy="pbkdf2-sha256$"+ITERATIONS+"$"+"0".repeat(64)+"$"+"0".repeat(64);
 step="password-verify";
 const valid=await verifyPassword(password,account?.password_hash||dummy);
 if(!valid||account?.status!=="active"||(account.role==="member"&&env.PORTAL_TEST_MODE!=="true"))return page("login","メールアドレスまたはパスワードを確認してください。",401);
 await revokeSession(db,cookie(request));
 step="session-create";
 const session=await createSession(db,account.id);
 return redirect("/",sessionCookie(session.token));
 }catch(error){console.error("Portal operation failed",step,error?.name||"Error");return json({error:"Service unavailable",step,revision:"profile-request-v9"},503);}
}};
