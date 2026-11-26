// Portal authentication: initial administrator and login.
const encoder = new TextEncoder();
const ITERATIONS = 100000; // Compatibility test only; review before production.
const STRONG_ITERATIONS=600000;
const configuredIterations=env=>env.PASSWORD_KDF_ITERATIONS==="600000"?STRONG_ITERATIONS:ITERATIONS;
const kdfConfigValid=env=>env.PASSWORD_KDF_ITERATIONS===undefined||["100000","600000"].includes(env.PASSWORD_KDF_ITERATIONS);
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join("");
function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
async function digest(value){return hex(await crypto.subtle.digest("SHA-256",encoder.encode(value)));}
// Keep the measured 100k compatibility setting for this test build.
// New credentials additionally use a separately stored high-entropy HMAC key.
const pepperReady=env=>typeof env.PASSWORD_PEPPER==="string"&&/^[a-f0-9]{64}$/i.test(env.PASSWORD_PEPPER);
async function prehash(password,env){
 if(!pepperReady(env))throw Error("Password pepper missing");
 const key=await crypto.subtle.importKey("raw",Uint8Array.from(env.PASSWORD_PEPPER.match(/../g),v=>parseInt(v,16)),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return hex(await crypto.subtle.sign("HMAC",key,encoder.encode(password)));
}
async function derive(password,salt,iterations=ITERATIONS){
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations},key,256));
}
const passwordValid=p=>typeof p==="string"&&p.length>=20&&encoder.encode(p).length<=1024;
export async function hashPassword(password,env){
 if(!passwordValid(password))throw Error("Invalid password length");
 if(!kdfConfigValid(env))throw Error("Invalid KDF configuration");
 const salt=randomToken(),iterations=configuredIterations(env);
 return "pbkdf2-sha256-hmac-v1$"+iterations+"$"+salt+"$"+await derive(await prehash(password,env),salt,iterations);
}
export async function verifyPassword(password,stored,env){
 if(typeof password!=="string"||encoder.encode(password).length>1024||typeof stored!=="string")return false;
 const [algorithm,iterations,salt,expected,...extra]=stored.split("$");
 if(extra.length||!["pbkdf2-sha256","pbkdf2-sha256-hmac-v1"].includes(algorithm)||(![String(ITERATIONS),String(STRONG_ITERATIONS)].includes(iterations)||algorithm==="pbkdf2-sha256"&&iterations!==String(ITERATIONS))||!/^[a-f0-9]{64}$/.test(salt||"")||!/^[a-f0-9]{64}$/.test(expected||""))return false;
 if(algorithm==="pbkdf2-sha256-hmac-v1"&&!pepperReady(env))return false;
 const actual=await derive(algorithm==="pbkdf2-sha256-hmac-v1"?await prehash(password,env):password,salt,Number(iterations));
 const bytes=s=>Uint8Array.from(s.match(/../g),v=>parseInt(v,16));
 return crypto.subtle.timingSafeEqual(bytes(actual),bytes(expected));
}
// D1 meta.changes includes trigger writes. RETURNING counts only directly affected rows.
const oneAffected=result=>result?.success===true&&Array.isArray(result.results)&&result.results.length===1&&result.results[0]?.affected===1;
export async function createSession(db,accountId,expectedHash){
 const token=randomToken(),expires=Math.floor(Date.now()/1000)+28800;
 const result=await db.prepare("INSERT INTO sessions(token_hash,account_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND status='active' AND password_hash=? RETURNING 1 AS affected").bind(await digest(token),expires,accountId,expectedHash).all();
 if(!oneAffected(result))throw new Error("Account unavailable");
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
const PORTAL_NAV={
 member:[["home","/","HOME","ダッシュボード"],["profile","/profile","PROFILE","プロフィール"],["avatars","/avatars","AVATAR","画像管理"],["schedule","/schedule","SCHEDULE","配信予定"],["activity","/activity","ACTIVITY","活動・記念日"],["notices","/notices","NOTICES","お知らせ"],["applications","/applications","REQUESTS","各種申請"],["account","/account","ACCOUNT","アカウント設定"]],
 admin:[["admin","/admin","ACCOUNTS","アカウント管理"],["reviews","/admin/reviews","REVIEWS","プロフィール・画像審査"],["operations","/admin/operations","OPERATIONS","運営連絡・申請管理"],["audit","/admin/audit","AUDIT","監査履歴"],["account","/account","ACCOUNT","アカウント設定"]]
};
const PORTAL_TITLES={setup:"初期管理者登録",login:"ログイン",activate:"初回パスワード設定",home:"ダッシュボード",admin:"アカウント管理",profile:"プロフィール変更申請",avatars:"アバター画像管理",schedule:"配信スケジュール",activity:"活動記録・記念日",notices:"運営からのお知らせ",applications:"各種申請",operations:"運営連絡・申請管理",reviews:"プロフィール・画像審査",account:"アカウント設定",audit:"監査履歴"};
function portalRole(mode,role){
 if(mode==="account")return ["admin","member"].includes(role)?role:"";
 if(["admin","reviews","operations","audit"].includes(mode))return "admin";
 if(["home","profile","avatars","schedule","activity","notices","applications"].includes(mode))return "member";
 return "";
}
const PORTAL_STYLE=/* css */"\
:root{color-scheme:light;--ink:#142f56;--muted:#526b85;--blue:#176bb2;--line:#d9e6f2;--soft:#eff6fd;--paper:#fff}\
*{box-sizing:border-box}html{scroll-padding-top:16px}body{margin:0;background:#f2f7fc;color:var(--ink);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65}\
a{color:var(--blue);text-underline-offset:3px}a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #176bb2;outline-offset:3px}\
.portal-skip{position:absolute;left:12px;top:-100px;z-index:10;background:#fff;padding:12px;border-radius:8px}.portal-skip:focus{top:12px}\
.portal-header{background:white;border-bottom:1px solid var(--line);padding:16px clamp(16px,4vw,48px);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.portal-brand{display:flex;align-items:center;gap:12px;color:var(--ink);text-decoration:none;font-weight:800;letter-spacing:.02em}.portal-brand-mark{display:grid;place-items:center;background:#176bb2;color:white;width:42px;height:42px;border-radius:12px;font-size:17px;flex:none}.portal-brand small{display:block;font-size:.7rem;letter-spacing:.1em;color:var(--muted);font-weight:600}.portal-mode{font-size:.75rem;background:#edf4fd;border:1px solid var(--line);border-radius:6px;padding:5px 10px;color:#174d80;font-weight:700}.portal-header form{margin:0}.portal-header-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.portal-header-actions button{width:auto;background:white;color:var(--blue);border:1px solid var(--line)}\
.portal-shell{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1440px;margin:0 auto;gap:24px;padding:24px clamp(12px,3vw,36px);align-items:start}.portal-sidebar{background:white;border:1px solid var(--line);border-radius:16px;padding:14px;min-width:0}.portal-sidebar>small{display:block;padding:5px 10px 12px;font-weight:800;letter-spacing:.12em;color:var(--muted)}.portal-nav{display:grid;gap:5px}.portal-nav a{display:grid;gap:1px;min-height:44px;border-radius:8px;padding:9px 11px;text-decoration:none;color:var(--ink);border:1px solid transparent;overflow-wrap:anywhere}.portal-nav a small{font-size:.65rem;letter-spacing:.08em;font-weight:750}.portal-nav a[aria-current=page]{border-color:#c3dff8;background:#e6f2ff;color:#145b98;font-weight:800}.portal-nav a:hover{background:var(--soft)}.portal-nav-footer{display:block;border-top:1px solid var(--line);padding:12px 10px 3px;margin-top:12px;font-size:.85rem}\
main{min-width:0;background:white;border:1px solid var(--line);border-radius:18px;padding:clamp(16px,3vw,32px);box-shadow:0 12px 38px #142f5608;overflow-wrap:anywhere}.portal-page-heading{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:20px}.portal-page-heading small{font-weight:800;letter-spacing:.13em;color:var(--blue);font-size:.73rem}h1{font-size:clamp(1.35rem,3vw,1.85rem);margin:4px 0 0;line-height:1.4}h2{font-size:1.15rem;margin:26px 0 12px;line-height:1.5}h3{font-size:1.05rem}p{margin:10px 0;line-height:1.75}small{color:var(--muted)}\
.portal-auth{max-width:470px;padding:24px 14px;margin:24px auto}.portal-auth main{padding:clamp(20px,5vw,34px)}.portal-auth-intro{color:var(--muted);font-size:.9rem;margin:0 0 20px}.portal-footer{max-width:1440px;margin:auto;padding:16px 24px 32px;color:var(--muted);font-size:.78rem;text-align:center}\
.portal-status{padding:12px 14px;border:1px solid #c5ddf6;border-left:4px solid var(--blue);border-radius:8px;background:var(--soft);margin:0 0 18px}.portal-status.is-error{background:#fff5f4;border-color:#e7b7b2;color:#862e28}.portal-notice{background:var(--soft);border:1px solid #d9e8f6;border-radius:10px;padding:12px 15px;color:#284e73}\
label{display:grid;gap:6px;margin:16px 0;font-weight:650;min-width:0;overflow-wrap:anywhere}input,select,textarea,button{font:inherit;border:1px solid #b8cde1;border-radius:8px;padding:10px 12px;min-height:44px;width:100%;min-width:0;max-width:100%}input,select,textarea{background:white;color:var(--ink)}input[type=hidden]{display:none}input[type=checkbox]{width:22px;height:22px;min-height:22px;justify-self:start;accent-color:var(--blue)}input[type=file]{font-size:.86rem;padding:8px}textarea{min-height:100px;resize:vertical}button{background:var(--blue);color:white;border-color:var(--blue);font-weight:700;cursor:pointer}button:hover{background:#10578f;color:white}button:disabled{opacity:.55;cursor:not-allowed}form{min-width:0}form[action='/schedule/delete'] button,form[action='/activity/delete'] button,form[action='/admin/suspend'] button,form[action='/admin/reset-account'] button{background:#fff;color:#a53632;border:1px solid #d9a4a0}form[action='/schedule/delete'] button:hover,form[action='/activity/delete'] button:hover,form[action='/admin/suspend'] button:hover,form[action='/admin/reset-account'] button:hover{background:#fff0ef}button[value=return],form[action$='/withdraw'] button{background:white;color:var(--blue);border:1px solid #adcbe6}\
article{border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0;overflow-wrap:anywhere;background:white}article form{margin-top:10px}details{border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:10px 0;background:#f8fbfe}summary{cursor:pointer;font-weight:700;color:#174d80;min-height:32px;line-height:1.8}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;background:#f5f8fc;padding:12px;border-radius:8px}\
.avatar-preview{display:block;width:100%;max-width:240px;aspect-ratio:1;object-fit:contain;background:var(--soft);border:1px solid var(--line);border-radius:12px;margin:10px 0}\
.portal-hero{background:linear-gradient(115deg,#142f56,#1b5689);color:white;padding:clamp(18px,3vw,28px);border-radius:14px;margin:16px 0}.portal-hero h2{font-size:clamp(1.25rem,3vw,1.75rem);margin:8px 0;overflow-wrap:anywhere}.portal-hero small{color:#d7eaff;font-weight:700;letter-spacing:.08em}.portal-hero p{margin:8px 0 0}.portal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:16px 0}.portal-tile{min-width:0;padding:18px;border:1px solid var(--line);border-radius:12px;overflow-wrap:anywhere;background:white}.portal-tile h2,.portal-tile h3{margin:4px 0 10px;font-size:1.05rem}.portal-tile p{margin:6px 0;color:#3b5671}.portal-tag{display:inline-block;padding:4px 10px;background:#e6f2ff;color:#174d80;border-radius:20px;font-size:.8rem;margin:3px 4px 3px 0}.portal-section{margin:26px 0}.portal-link{display:inline-flex;align-items:center;min-height:44px;padding:8px 0;font-weight:650}.portal-link:hover{text-decoration:underline}\
.portal-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}.portal-metric{display:grid;gap:6px;border:1px solid var(--line);border-radius:12px;padding:14px;text-decoration:none;background:#f6faff;color:var(--ink)}.portal-metric strong{font-size:1.35rem;color:#145b98;font-variant-numeric:tabular-nums;line-height:1.4}.portal-metric small{font-size:.78rem}.portal-metric:hover{border-color:#176bb2}.portal-card-code{font-size:.72rem;letter-spacing:.1em;font-weight:800;color:#145b98}\
@media(max-width:900px){.portal-shell{grid-template-columns:minmax(0,1fr);gap:12px;padding-top:12px}.portal-sidebar{padding:10px}.portal-sidebar>small{padding:4px 8px 8px}.portal-nav{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.portal-nav a{padding:7px;font-size:.82rem;line-height:1.4}.portal-nav-footer{display:none}}\
@media(max-width:600px){.portal-header{padding:12px;gap:10px}.portal-brand{font-size:.86rem;gap:8px}.portal-brand-mark{width:34px;height:34px}.portal-header-actions{gap:6px}.portal-header-actions button{font-size:.8rem;padding:8px;min-height:44px}.portal-mode{font-size:.68rem;padding:4px 6px}.portal-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.portal-grid{grid-template-columns:1fr}.portal-metrics{grid-template-columns:minmax(0,1fr)}.portal-metric{grid-template-columns:minmax(0,1fr) auto;align-items:center}.portal-metric strong{font-size:1.1rem}input,select,textarea{font-size:16px}main{border-radius:12px}.portal-tile,article{padding:12px}}\
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}";
function page(mode,message="",status=200,content="",role=""){
 const nonce=randomToken(),csrf=randomToken(),kind=portalRole(mode,role),title=PORTAL_TITLES[mode]||"ポータル";
 const setup=mode==="setup",auth=!kind;
 const form=kind||mode==="activate"?content:'<p class="portal-auth-intro">'+(setup?"運営管理者の初期設定を行います。":"運営から発行されたアカウントでログインしてください。")+'</p><form method="post" action="'+(setup?"/setup":"/login")+'">'+(setup?'<label>初期設定Secret<input name="secret" type="password" required autocomplete="off" maxlength="1024"></label>':'')+'<label>メールアドレス<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label>パスワード<input name="password" type="password" required '+(setup?'minlength="20" autocomplete="new-password"':'autocomplete="current-password"')+' maxlength="1024"></label><button>'+(setup?"初期管理者を登録":"ログイン")+'</button></form>';
 const logout=kind?'<form method="post" action="/logout"><button>ログアウト</button></form>':"";
 const nav=kind?'<aside class="portal-sidebar"><small>'+(kind==="admin"?"ADMIN MENU":"MEMBER MENU")+'</small><nav class="portal-nav" aria-label="ポータルメニュー">'+PORTAL_NAV[kind].map(([id,url,en,ja])=>'<a href="'+url+'"'+(id===mode?' aria-current="page"':'')+'><small>'+en+'</small><span>'+ja+'</span></a>').join("")+'</nav><a class="portal-nav-footer" href="https://rinseishirasu.github.io/poppoo-official/" target="_blank" rel="noopener noreferrer">公式HPを開く ↗</a></aside>':"";
 const header='<a class="portal-skip" href="#portal-main">本文へ移動</a><header class="portal-header"><a class="portal-brand" href="'+(kind==="admin"?"/admin":"/")+'"><span class="portal-brand-mark" aria-hidden="true">P</span><span>POPPŌ<small>MEMBER PORTAL</small></span></a><div class="portal-header-actions"><span class="portal-mode">検証環境'+(kind==="admin"?" / 運営":"")+'</span>'+logout+'</div></header>';
 const heading='<div class="portal-page-heading"><small>'+esc(mode.toUpperCase())+'</small><h1>'+esc(title)+'</h1></div>';
 const notice=message?'<p class="portal-status'+(status>=400?' is-error':'')+'" role="'+(status>=400?'alert':'status')+'">'+esc(message)+'</p>':"";
 const body=header+'<div class="'+(auth?'portal-auth':'portal-shell')+'">'+nav+'<main id="portal-main" tabindex="-1">'+heading+notice+form+'</main></div><footer class="portal-footer">架空事務所 ぽっぽー / POPPŌ CREATOR COMMUNITY</footer>';
 return new Response('<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#142f56"><title>'+esc(title)+' | POPPŌ MEMBER PORTAL</title><style nonce="'+nonce+'">'+PORTAL_STYLE+'</style></head><body>'+body.replace(/(<form[^>]*>)/g,'$1<input type="hidden" name="csrf" value="'+csrf+'">')+'</body></html>',{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Set-Cookie":"__Host-poppoo_csrf="+csrf+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=900","Referrer-Policy":"same-origin","Content-Security-Policy":"default-src 'none'; img-src 'self' https://rinseishirasu.github.io; style-src 'nonce-"+nonce+"'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
async function publishedMembers(env){
 if(env&&publicationReady(env)){const {data}=await githubDataset(env,"talents");return data.filter(t=>t?.published===true&&typeof t.id==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(t.id)&&typeof t.name==="string");}
 const response=await fetch("https://rinseishirasu.github.io/poppoo-official/data/talents.json",{headers:{"Accept":"application/json"},cache:"no-store"});
 if(!response.ok)throw Error("Member registry unavailable");
 const data=await response.json();if(!Array.isArray(data))throw Error("Member registry invalid");
 return data.filter(t=>t&&t.published===true&&typeof t.id==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(t.id)&&typeof t.name==="string");
}
async function memberDashboard(env,session){
 const db=env.DB;
 const base="https://rinseishirasu.github.io/poppoo-official/";
 let member=null,registryError=false,requests=null,unread=null,applications=null;
 try{member=(await publishedMembers(env)).find(m=>m.id===session.member_id)||null;}catch{registryError=true;}
 try{requests=(await db.prepare("SELECT status,COUNT(*) AS total FROM profile_requests WHERE account_id=? GROUP BY status").bind(session.id).all()).results;}catch{}
 try{unread=(await db.prepare("SELECT COUNT(*) AS total FROM portal_notices n WHERE n.published=1 AND NOT EXISTS(SELECT 1 FROM notice_reads r WHERE r.notice_id=n.id AND r.account_id=?)").bind(session.id).first())?.total??0;}catch{}
 try{applications=(await db.prepare("SELECT COUNT(*) AS total FROM member_applications WHERE account_id=? AND status='pending'").bind(session.id).first())?.total??0;}catch{}
 const count=state=>requests===null?"取得できません":String(requests.find(x=>x.status===state)?.total||0)+"件";
 const tags=value=>(Array.isArray(value)?value:typeof value==="string"?[value]:[]).filter(v=>typeof v==="string"&&v.trim()).map(v=>'<span class="portal-tag">'+esc(v)+'</span>').join("");
 const profile=member?'<div>'+tags(member.cohort)+tags(member.roles)+'</div><p>'+esc(member.catchphrase||"")+'</p><a class="portal-link" href="'+base+'talent.html?id='+encodeURIComponent(member.id)+'" target="_blank" rel="noopener noreferrer">公式プロフィールを見る</a>':"<p>"+(registryError?"公開プロフィールを取得できません。":"公開プロフィールが見つかりません。")+"</p>";
 const cards=[["プロフィール・アバター","プロフィール変更申請・非公開画像提出"],["配信スケジュール","本人の配信予定の登録・更新"],["活動記録・記念日","活動実績や記念日の管理"],["運営からのお知らせ","メンバー向けの連絡事項"],["各種申請","活動休止・その他の申請"],["アカウント設定","パスワード変更・アカウント設定"]] .map(([title,description],i)=>'<section class="portal-tile"><span class="portal-card-code">'+["PROFILE / AVATAR","SCHEDULE","ACTIVITY","NOTICES","REQUESTS","ACCOUNT"][i]+'</span><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p>'+(i===0?'<a class="portal-link" href="/profile">プロフィールを編集・申請</a><br><a class="portal-link" href="/avatars">アバター・アイコン画像管理</a>':i===1?'<a class="portal-link" href="/schedule">配信予定を管理</a>':i===2?'<a class="portal-link" href="/activity">活動記録・記念日を管理</a>':i===3?'<a class="portal-link" href="/notices">お知らせを確認</a>':i===4?'<a class="portal-link" href="/applications">申請・履歴を確認</a>':'<a class="portal-link" href="/account">パスワードを変更</a>')+'</section>').join("");
 const metrics=[["プロフィール審査待ち",count("pending"),"/profile"],["未読のお知らせ",unread===null?"取得不可":unread+"件","/notices"],["各種申請の審査待ち",applications===null?"取得不可":applications+"件","/applications"]].map(([label,value,href])=>'<a class="portal-metric" href="'+href+'"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></a>').join("");
 const html='<div class="portal-hero"><small>MEMBER DASHBOARD / TEST MODE</small><h2>おかえりなさい'+(member?'、'+esc(member.name)+'さん':'')+'</h2><p>あなたの配信活動を、ひとつの場所から。</p></div><p class="portal-notice">検証版です。公開機能の利用は運営の指示に従ってください。</p><div class="portal-metrics">'+metrics+'</div><div class="portal-grid"><section class="portal-tile"><h2>マイプロフィール</h2>'+profile+'</section><section class="portal-tile"><h2>プロフィール申請状況</h2><p>審査待ち：'+esc(count("pending"))+'</p><p>差し戻し：'+esc(count("returned"))+'</p><p>下書き：'+esc(count("draft"))+'</p><small>承認されるまで公式サイトに反映されません。</small></section></div><section class="portal-section"><h2>メンバーメニュー</h2><div class="portal-grid">'+cards+'</div></section><p><a href="'+base+'" target="_blank" rel="noopener noreferrer">ぽっぽー公式サイト</a></p>';
 return page("home","",200,html);
}
// Only these text fields may be requested by members. Identity, roles, publication and images are administrator-controlled.
const PROFILE_FIELDS=[["catchphrase","キャッチフレーズ",100],["bio","自己紹介",800],["hobbies","趣味",200],["skills","特技",200],["fanName","ファンネーム",60],["oshiMark","推しマーク",60],["streamTag","配信タグ",100],["fanArtTag","ファンアートタグ",100],["message","メッセージ",400],["greeting","挨拶",200],["likes","好きなもの",200],["dislikes","苦手なもの",200],["favoriteFood","好きな食べ物",200],["favoriteWorks","好きな作品",300],["activityGoal","活動目標",400],["regularSchedule","定期配信時間",150],["illustrator","イラストレーター",100],["modeler","モデラー",100],["height","身長",40],["bloodType","血液型",40],["affiliationAgency","所属事務所",150]];
const profileValues=m=>Object.fromEntries(PROFILE_FIELDS.map(([k])=>[k,typeof m[k]==="string"?m[k]:""]));
const profileRevision=async m=>digest(JSON.stringify(profileValues(m)));
const profileStatus={draft:"下書き",pending:"審査待ち",approved:"承認済み",returned:"差し戻し",withdrawn:"取り下げ"};
async function profilePage(env,session,message="",status=200){
 const db=env.DB;
 const member=(await publishedMembers(env)).find(m=>m.id===session.member_id);
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
 const record=publicationRecordPatch(patch);
 const details=record?recordPatchDetail(record):PROFILE_FIELDS.filter(([k])=>typeof patch[k]==="string").map(([k,label])=>'<p><strong>'+esc(label)+'</strong></p><pre>'+esc(patch[k]||"（空欄に変更）")+'</pre>').join("");
 return '<article><strong>'+esc(profileStatus[row.status]||row.status)+'</strong> <small>'+esc(row.updated_at)+' UTC</small><details><summary>変更内容を見る</summary>'+details+'</details>'+(row.review_note?'<p>運営コメント：'+esc(row.review_note)+'</p>':"")+(["draft","pending","returned"].includes(row.status)?'<form method="post" action="/profile/withdraw"><input type="hidden" name="id" value="'+esc(row.id)+'"><button>この申請を取り下げる</button></form>':"")+'</article>';
 }).join(""):"<p>申請履歴はまだありません。</p>";
 return page("profile",message,status,'<p><a href="/">ダッシュボードに戻る</a></p><div class="portal-hero"><small>PROFILE REQUEST / TEST MODE</small><h2>'+esc(member.name)+'</h2><p>プロフィールの変更内容を運営へ申請します。</p></div><p class="portal-notice">名前・期生・役職・公開設定は運営管理です。画像は別ページから提出できます。個人情報を入力しないでください。</p><h2>プロフィール編集</h2>'+editor+'<h2>申請履歴（最新30件）</h2>'+history);
}
async function saveProfile(env,session,form){
 const db=env.DB;
 const member=(await publishedMembers(env)).find(m=>m.id===session.member_id);
 if(!member)return json({error:"Profile unavailable"},404);
 const revision=await profileRevision(member),base=profileValues(member),action=form.get("action");
 if(!["draft","pending"].includes(action)||form.get("revision")!==revision)return json({error:"Profile changed; reopen editor"},409);
 const patch={};
 for(const [k,,max] of PROFILE_FIELDS){
 const value=form.get(k);if(typeof value!=="string"||value.length>max)return json({error:"Invalid profile field"},400);
 const normalized=value.replace(/\r\n/g,"\n").trim();if(normalized!==base[k].replace(/\r\n/g,"\n").trim())patch[k]=normalized;
 }
 if(!Object.keys(patch).length)return profilePage(env,session,"変更された項目がありません。",400);
 const id=form.get("request_id")||"",payload=JSON.stringify(patch);
 let result;
 if(id){
 const old=await db.prepare("SELECT patch_json FROM profile_requests WHERE id=? AND account_id=? AND status='draft' AND base_revision=?").bind(id,session.id,revision).first();
 if(!old||await digest(old.patch_json)!==form.get("draft_version"))return json({error:"Draft changed; reopen editor"},409);
 result=await db.prepare("UPDATE profile_requests SET patch_json=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status='draft' AND base_revision=? AND patch_json=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') RETURNING 1 AS affected").bind(payload,action,id,session.id,revision,old.patch_json,session.id).all();
 }else{
 result=await db.prepare("INSERT INTO profile_requests(id,account_id,base_revision,patch_json,status) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM profile_requests WHERE account_id=? AND status IN ('draft','pending')) AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') RETURNING 1 AS affected").bind(crypto.randomUUID(),session.id,revision,payload,action,session.id,session.id).all();
 }
 if(!oneAffected(result))return json({error:"Request changed; reopen editor"},409);
 return redirect("/profile");
}
// Private submissions: fixed per-account slots, never write to public GitHub.
const AVATAR_SLOTS=[["icon","アイコン"],["avatar1","アバター1"],["avatar2","アバター2"],["avatar3","アバター3"]];
const avatarSlot=s=>AVATAR_SLOTS.some(([k])=>k===s);
// Bounded structural validation, not a full image decoder. Reject animation and metadata containers.
function imageMime(b){
 if(!(b instanceof Uint8Array)||b.length<24||b.length>524288)return "";
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength),str=(i,n)=>String.fromCharCode(...b.subarray(i,i+n));
 const dimensions=(w,h)=>Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0&&w<=2048&&h<=2048&&w*h<=4194304;
 if([137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x)){
 let pos=8,seenHeader=false,seenData=false,seenEnd=false;
 const allowed=new Set(["IHDR","PLTE","IDAT","IEND","tRNS","gAMA","cHRM","sRGB","pHYs","sBIT","bKGD"]);
 while(pos+12<=b.length){
 const n=v.getUint32(pos),type=str(pos+4,4),next=pos+12+n;
 if(next>b.length||!allowed.has(type)||seenEnd)return "";
 if(!seenHeader){if(type!=="IHDR"||n!==13||!dimensions(v.getUint32(pos+8),v.getUint32(pos+12)))return "";seenHeader=true;}
 else if(type==="IHDR")return "";
 if(type==="IDAT"){if(!n)return "";seenData=true;}
 if(type==="IEND"){if(n!==0||!seenData||next!==b.length)return "";seenEnd=true;}
 pos=next;
 }
 return seenHeader&&seenData&&seenEnd&&pos===b.length?"image/png":"";
 }
 if(b[0]===255&&b[1]===216){
 let pos=2,frame=false,scan=false,seenScan=false;
 while(pos<b.length){
 if(scan){
 while(pos<b.length&&b[pos]!==255)pos++;
 if(pos>=b.length)return "";
 const markerStart=pos;while(pos<b.length&&b[pos]===255)pos++;
 if(pos>=b.length)return "";
 const marker=b[pos];
 if(marker===0||(marker>=0xd0&&marker<=0xd7)){pos++;continue}
 pos=markerStart;scan=false;
 }
 if(b[pos++]!==255)return "";
 while(pos<b.length&&b[pos]===255)pos++;
 if(pos>=b.length)return "";
 const marker=b[pos++];
 if(marker===0xd9)return frame&&seenScan&&pos===b.length?"image/jpeg":"";
 if(pos+2>b.length)return "";
 const n=v.getUint16(pos),end=pos+n;
 if(n<2||end>b.length)return "";
 if(marker===0xe0){if(seenScan||n!==16||str(pos+2,5)!=="JFIF\0"||b[pos+14]!==0||b[pos+15]!==0)return "";}
 else if(marker===0xee){if(seenScan||n!==14||str(pos+2,5)!=="Adobe")return "";}
 else if((marker>=0xe0&&marker<=0xef)||marker===0xfe)return "";
 else if(marker===0xc0||marker===0xc2){if(frame||n<8||!dimensions(v.getUint16(pos+5),v.getUint16(pos+3)))return "";frame=true;}
 else if(marker===0xda){if(!frame||n<6||end>=b.length-2)return "";scan=true;seenScan=true;}
 else if(![0xdb,0xc4,0xdd].includes(marker))return "";
 pos=end;
 }
 return "";
 }
 if(str(0,4)==="RIFF"&&str(8,4)==="WEBP"&&v.getUint32(4,true)+8===b.length){
 let pos=12,frame=false,extended=false,canvasW=0,canvasH=0;
 const u24=i=>b[i]+(b[i+1]<<8)+(b[i+2]<<16);
 while(pos+8<=b.length){
 const type=str(pos,4),n=v.getUint32(pos+4,true),i=pos+8,end=i+n;
 if(end+(n%2)>b.length)return "";
 if(type==="VP8X"){
 if(pos!==12||extended||n!==10||(b[i]&~0x10)!==0)return "";
 canvasW=u24(i+4)+1;canvasH=u24(i+7)+1;if(!dimensions(canvasW,canvasH))return "";extended=true;
 }else if(type==="VP8 "){
 if(frame||n<10||(b[i]&1)!==0||b[i+3]!==157||b[i+4]!==1||b[i+5]!==42)return "";
 const w=v.getUint16(i+6,true)&16383,h=v.getUint16(i+8,true)&16383;
 if(!dimensions(w,h)||(extended&&(w!==canvasW||h!==canvasH)))return "";frame=true;
 }else if(type==="VP8L"){
 if(frame||n<5||b[i]!==47)return "";
 const bits=v.getUint32(i+1,true),w=(bits&16383)+1,h=((bits>>>14)&16383)+1;
 if((bits>>>29)!==0||!dimensions(w,h)||(extended&&(w!==canvasW||h!==canvasH)))return "";frame=true;
 }else if(type==="ALPH"){if(!extended||frame||!n)return "";}
 else return "";
 pos=end+(n%2);
 }
 return frame&&pos===b.length?"image/webp":"";
 }
 return "";
}
function publicAvatar(path){
 if(typeof path!=="string"||!/^assets\/images\/talents\/[A-Za-z0-9_-]+\.(png|jpe?g|webp|gif)$/i.test(path))return "";
 return "https://rinseishirasu.github.io/poppoo-official/"+path;
}
async function avatarPage(env,session){
 const db=env.DB;
 const member=(await publishedMembers(env)).find(m=>m.id===session.member_id);
 if(!member)return page("avatars","公開プロフィールが見つかりません。",404,'<a href="/">ダッシュボードに戻る</a>');
 let rows;
 try{rows=(await db.prepare("SELECT slot,id,created_at FROM avatar_requests WHERE account_id=?").bind(session.id).all()).results;}
 catch{return page("avatars","画像管理の初期設定が未完了です。",503,'<a href="/">ダッシュボードに戻る</a>');}
 const gallery=(Array.isArray(member.avatarImages)&&member.avatarImages.length?member.avatarImages:[member.avatarImage]).map(publicAvatar).filter(Boolean);
 const current=[["アイコン",publicAvatar(member.iconImage)],...gallery.map((url,i)=>["アバター"+(i+1),url])].filter(([,url])=>url);
 const published=current.length?current.map(([label,url])=>'<div class="portal-tile"><h3>'+esc(label)+'</h3><img class="avatar-preview" src="'+esc(url)+'" alt="'+esc(label)+'" referrerpolicy="no-referrer"></div>').join(""):"<p>公開画像はありません。</p>";
 const cards=AVATAR_SLOTS.map(([slot,label])=>{
 const row=rows.find(x=>x.slot===slot);
 return '<section class="portal-tile"><h3>'+esc(label)+'</h3>'+(row?'<p>審査待ち・非公開</p><img class="avatar-preview" src="/avatars/image?slot='+slot+'&amp;v='+encodeURIComponent(row.id)+'" alt="提出画像"><form method="post" action="/avatars/withdraw"><input type="hidden" name="slot" value="'+slot+'"><input type="hidden" name="id" value="'+esc(row.id)+'"><button>提出を取り下げる</button></form>':'<p>未提出</p>')+'<form method="post" enctype="multipart/form-data" action="/avatars/upload"><input type="hidden" name="slot" value="'+slot+'"><input type="hidden" name="previous" value="'+esc(row?.id||"")+'"><label>画像を選択（512KiB以下・縦横2048px以内）<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required></label><button>'+(row?"画像を差し替える":"画像を提出する")+'</button></form></section>';
 }).join("");
 const reviewed=(await db.prepare("SELECT request_id,state,note,updated_at FROM publication_jobs WHERE account_id=? AND kind='avatar' AND state IN ('published','returned') ORDER BY updated_at DESC LIMIT 30").bind(session.id).all()).results;
 const history=reviewed.map(j=>'<article><strong>'+(j.state==="published"?"公開済み":"差し戻し")+'</strong><p><small>'+esc(j.updated_at)+' UTC</small></p><pre>'+esc(j.note||"")+'</pre></article>').join("")||"<p>審査履歴はありません。</p>";
 return page("avatars","",200,'<p><a href="/">ダッシュボードに戻る</a></p><div class="portal-hero"><small>AVATAR REQUEST / TEST MODE</small><h2>'+esc(member.name)+'</h2><p>アイコンとアバターの提出・確認</p></div><p class="portal-notice">提出画像はD1に非公開保存されます。運営が内容を確認し承認した画像のみ公開されます。本人が権利を持つ画像のみ提出してください。位置情報などのメタデータを除去し、静止画に書き出してから提出してください。</p><h2>現在の公開画像</h2><div class="portal-grid">'+published+'</div><h2>新しい画像の提出</h2><div class="portal-grid">'+cards+'</div><h2>画像の審査履歴</h2>'+history);
}
async function uploadAvatar(env,session,form){
 const db=env.DB;
 const slot=form.get("slot"),previous=form.get("previous")||"",file=form.get("image");
 if(!avatarSlot(slot)||typeof previous!=="string"||previous.length>36||!file||typeof file.arrayBuffer!=="function"||file.size<12||file.size>524288)return json({error:"Invalid image or size; maximum 512KiB"},400);
 const data=await file.arrayBuffer(),mime=imageMime(new Uint8Array(data));
 if(!mime||file.type!==mime)return json({error:"Unsupported image structure, metadata or dimensions"},400);
 const member=(await publishedMembers(env)).find(m=>m.id===session.member_id);
 if(!member)return json({error:"Profile unavailable"},404);
 const id=crypto.randomUUID();
 const result=previous?await db.prepare("UPDATE avatar_requests SET id=?,mime=?,image_data=?,created_at=CURRENT_TIMESTAMP WHERE account_id=? AND slot=? AND id=? AND NOT EXISTS(SELECT 1 FROM publication_jobs j WHERE j.request_id=avatar_requests.id AND j.state='processing') AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') RETURNING 1 AS affected").bind(id,mime,data,session.id,slot,previous,session.id).all():await db.prepare("INSERT INTO avatar_requests(account_id,slot,id,mime,image_data) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') ON CONFLICT(account_id,slot) DO NOTHING RETURNING 1 AS affected").bind(session.id,slot,id,mime,data,session.id).all();
 if(!oneAffected(result))return json({error:"Submission changed; reopen page"},409);
 return redirect("/avatars");
}
async function privateAvatar(db,session,slot,version){
 if(!avatarSlot(slot)||!safeId(version))return json({error:"Not found"},404);
 const row=await db.prepare("SELECT mime,image_data FROM avatar_requests WHERE account_id=? AND slot=? AND id=?").bind(session.id,slot,version).first();
 if(!row)return json({error:"Not found"},404);
 const data=new Uint8Array(row.image_data);
 if(imageMime(data)!==row.mime)return json({error:"Invalid image"},415);
 return new Response(data,{headers:{"Content-Type":row.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Cross-Origin-Resource-Policy":"same-origin","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"}});
}
async function adminPage(db,message="",status=200,testEnabled=false,issued=""){
 const rows=(await db.prepare("SELECT id,email,member_id,role,status FROM accounts ORDER BY role,email").all()).results;
 let members=[],warning="";try{members=await publishedMembers();}catch{warning="<p>公開メンバー情報を取得できません。アカウント発行は停止中です。</p>";}
 const eligible=members.filter(m=>!rows.some(a=>a.member_id===m.id));
 const labels={active:"有効",invited:"初回設定待ち",suspended:"利用停止"};
 const list=rows.map(a=>'<article><strong>'+esc(members.find(m=>m.id===a.member_id)?.name||a.member_id||"運営管理者")+'</strong><p>'+esc(a.email)+'<br>'+esc(a.role==="admin"?"管理者":labels[a.status]||a.status)+'</p>'+(testEnabled&&a.role==="member"&&a.status==="invited"?'<form method="post" action="/admin/invite"><input type="hidden" name="id" value="'+esc(a.id)+'"><button>招待コードを発行・再発行</button></form>':"")+(testEnabled&&a.role==="member"&&a.status!=="invited"?'<form method="post" action="/admin/reset-account"><input type="hidden" name="id" value="'+esc(a.id)+'"><label><input type="checkbox" name="confirm" value="yes" required>本人確認済み・旧パスワードと全セッションを無効にする</label><button>'+(a.status==="suspended"?"利用再開・再招待":"パスワード再設定・再招待")+'</button></form>':"")+(a.role==="member"&&a.status!=="suspended"?'<form method="post" action="/admin/suspend"><input type="hidden" name="id" value="'+esc(a.id)+'"><label><span>利用停止を実行する場合のみ押してください</span><button>利用停止・セッション失効</button></label></form>':"")+'</article>').join("");
 const form=!testEnabled?"<p>アカウント発行は検証モードでのみ利用できます。</p>":eligible.length?'<form method="post" action="/admin/accounts"><label>公開メンバー<select name="member_id" required><option value="">選択してください</option>'+eligible.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join("")+'</select></label><label>メールアドレス<input name="email" type="email" required maxlength="254"></label><button>アカウントを仮発行</button></form>':"<p>発行可能な公開メンバーはいません。</p>";
 return page("admin",message,status,'<p><a class="portal-link" href="/admin/operations">運営連絡・申請管理</a>　<a class="portal-link" href="/admin/reviews">プロフィール・画像審査</a>　<a class="portal-link" href="/account">アカウント設定</a>　<a class="portal-link" href="/admin/audit">監査履歴</a></p>'+"<p>運営専用・検証版。"+(testEnabled?"招待機能はテスト専用です。":"招待機能は停止中です。")+"</p>"+(issued?'<article><h2>招待コード（24時間有効）</h2><label>一度だけ表示します<input readonly value="'+esc(issued)+'"></label><p><a href="/activate">初回設定ページ</a></p></article>':"")+"<h2>アカウント仮発行</h2>"+warning+form+"<h2>登録済みアカウント</h2>"+list);
}
function activationPage(message="",status=200){return page("activate",message,status,'<p>運営から受け取った招待コードを入力してください。検証用です。</p><form method="post" action="/activate"><label>招待コード<input name="token" required maxlength="64" autocomplete="off" spellcheck="false"></label><label>新しいパスワード（20文字以上）<input name="password" type="password" required minlength="20" maxlength="1024" autocomplete="new-password"></label><label>パスワード確認<input name="confirm" type="password" required minlength="20" maxlength="1024" autocomplete="new-password"></label><button>初回設定を完了</button></form><p><a href="/">ログインに戻る</a></p>');}
// Publication writes are disabled unless explicitly enabled for a controlled release test.
const publicationReady=env=>env.PORTAL_MAINTENANCE!=="true"&&pepperReady(env)&&kdfConfigValid(env)&&env.PORTAL_TEST_MODE==="true"&&env.PORTAL_PUBLICATION_ENABLED==="true"&&typeof env.GITHUB_PUBLISH_TOKEN==="string"&&env.GITHUB_PUBLISH_TOKEN.length>0;
const githubDataUrl=kind=>"https://api.github.com/repos/rinseishirasu/poppoo-official/contents/data/"+({schedule:"schedule.json",talents:"talents.json",news:"news.json"}[kind]);
const githubHeaders=env=>({"Authorization":"Bearer "+env.GITHUB_PUBLISH_TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"poppoo-member-portal"});
// Safe diagnostics: never expose response bodies, URLs, headers, tokens or raw exception messages.
class GitHubFailure extends Error {
 constructor(operation,reason,status){super("GitHub operation failed");this.operation=operation;this.reason=reason;this.status=status;}
}
async function gitFetchJson(operation,url,options){
 let res;
 try{res=await fetch(url,options)}catch{throw new GitHubFailure(operation,"transport")}
 if(!res.ok)throw new GitHubFailure(operation,"http",res.status);
 try{return await res.json()}catch{throw new GitHubFailure(operation,"invalid-json")}
}
function safeGitDiagnostic(error){
 if(!(error instanceof GitHubFailure))return {};
 return {githubOperation:error.operation,githubReason:error.reason,...(Number.isInteger(error.status)&&error.status>=100&&error.status<=599?{githubStatus:error.status}:{})};
}
async function githubDataset(env,kind,ref="main"){
 if(!["schedule","talents","news"].includes(kind)||!publicationReady(env))throw Error("Publication disabled");
 const operation="dataset-"+kind;
 const f=await gitFetchJson(operation,githubDataUrl(kind)+"?ref="+encodeURIComponent(ref),{headers:githubHeaders(env),redirect:"error",cache:"no-store"});
 if(!f||f.encoding!=="base64"||typeof f.content!=="string"||f.content.length>1500000||!/^[a-f0-9]{40}$/.test(f.sha||""))throw new GitHubFailure(operation,"invalid-response");
 let data;try{data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\s/g,"")),ch=>ch.charCodeAt(0))))}catch{throw new GitHubFailure(operation,"invalid-dataset")}
 if(!Array.isArray(data)||data.some(x=>!x||typeof x!=="object"||Array.isArray(x)))throw new GitHubFailure(operation,"invalid-dataset");
 return {data,sha:f.sha};
}
function encodeGitHubJson(data){
 const bytes=encoder.encode(JSON.stringify(data,null,2)+"\n");
 if(bytes.length>900000)throw Error("Dataset too large");
 let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
// Only explicitly member-created, currently published records can be changed by members.
const scheduleUuid=id=>typeof id==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const scheduleOwned=(s,session)=>s?.scheduleSource==="member"&&s.published===true&&s.memberId===session.member_id&&scheduleUuid(s.id);
const scheduleRelated=(s,member,uniqueName)=>s?.published===true&&(s.memberId?s.memberId===member.id:uniqueName&&s.talent===member.name);
async function buildScheduleCommit(env,head,data){
 const blob=await gitBlob(env,encodeGitHubJson(data));
 const tree=await gitCall(env,"/git/trees","POST",{base_tree:head.tree,tree:[{path:"data/schedule.json",mode:"100644",type:"blob",sha:blob}]});
 if(!shaValid(tree.sha))throw Error("Invalid schedule tree");
 const commit=await gitCall(env,"/git/commits","POST",{message:"Update member schedule via portal",tree:tree.sha,parents:[head.sha]});
 if(!shaValid(commit.sha))throw Error("Invalid schedule commit");
 return commit.sha;
}
const jstDate=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
function validScheduleDate(s){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+"T00:00:00Z");
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s&&s>=jstDate();
}
function scheduleFields(s={}){
 const fields=[["date","配信日","date",10],["time","開始時刻（日本時間）","time",5],["title","配信タイトル","text",150],["platform","配信プラットフォーム","text",80],["url","配信先URL（任意）","url",500]];
 return fields.map(([k,label,type,max])=>'<label>'+label+'<input name="'+k+'" type="'+type+'" maxlength="'+max+'" value="'+esc(typeof s[k]==="string"?s[k]:k==="platform"?"REALITY":"")+'" '+(k==="url"?"":"required")+(k==="date"?' min="'+jstDate()+'"':"")+'></label>').join("");
}
async function schedulePage(env,session,success=false){
 let data,sha="",member,legacyCount=0,enabled=publicationReady(env);
 if(enabled){
 const head=await gitHead(env);
 const [s,t]=await Promise.all([githubDataset(env,"schedule",head.sha),githubDataset(env,"talents",head.sha)]);
 data=s.data;sha=s.sha;member=t.data.find(m=>m.id===session.member_id&&m.published===true);
 legacyCount=t.data.filter(m=>m.published===true&&m.name===member?.name).length;
 }else{
 const [s,t]=await Promise.all([fetch("https://rinseishirasu.github.io/poppoo-official/data/schedule.json",{cache:"no-store"}),publishedMembers()]);
 if(!s.ok)throw Error("Schedule unavailable");data=await s.json();if(!Array.isArray(data))throw Error("Invalid schedule");
 member=t.find(m=>m.id===session.member_id);legacyCount=t.filter(m=>m.name===member?.name).length;
 }
 if(!member)return page("schedule","公開プロフィールが見つかりません。",404,'<a href="/">ダッシュボードに戻る</a>');
 const owned=data.filter(s=>scheduleOwned(s,session));
 const legacy=data.filter(s=>scheduleRelated(s,member,legacyCount===1)&&!scheduleOwned(s,session));
 const revision='<input type="hidden" name="revision" value="'+esc(sha)+'">';
 const form=enabled?'<form method="post" action="/schedule/save">'+revision+scheduleFields()+'<button>配信予定を公開登録</button></form>':'<p class="portal-notice">公開登録・更新は最終検証まで停止しています。</p>';
 const rows=owned.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time).localeCompare(String(b.time))).map(s=>'<article><strong>'+esc(s.date)+' '+esc(s.time)+' '+esc(s.title)+'</strong><p>'+esc(s.platform||"")+'</p>'+(enabled?'<details><summary>編集する</summary><form method="post" action="/schedule/save">'+revision+'<input type="hidden" name="id" value="'+esc(s.id)+'">'+scheduleFields(s)+'<button>変更を公開</button></form></details><form method="post" action="/schedule/delete">'+revision+'<input type="hidden" name="id" value="'+esc(s.id)+'"><label><input type="checkbox" name="confirm" value="yes" required>この配信予定を削除する</label><button>公開予定を削除</button></form>':"")+'</article>').join("");
 const old=legacy.map(s=>'<article>'+esc(s.date)+' '+esc(s.time)+' '+esc(s.title)+'<p>運営登録・閲覧のみ</p></article>').join("");
 return page("schedule",success?"GitHubへの更新が完了しました。公式サイトへの配信には反映時間がかかる場合があります。":"",200,'<p><a href="/">ダッシュボードに戻る</a></p><div class="portal-hero"><small>SCHEDULE / TEST MODE</small><h2>'+esc(member.name)+'</h2><p>本人の配信予定を管理します。</p></div><h2>新規登録</h2>'+form+'<h2>本人の登録済み予定</h2>'+(rows||"<p>登録はありません。</p>")+'<h2>既存の公開予定（運営管理）</h2>'+(old||"<p>該当する予定はありません。</p>"));
}
async function mutateSchedule(env,session,form,path){
 if(!publicationReady(env))return json({error:"Publication disabled"},403);
 const head=await gitHead(env);
 const [s,t]=await Promise.all([githubDataset(env,"schedule",head.sha),githubDataset(env,"talents",head.sha)]);
 const member=t.data.find(m=>m.id===session.member_id&&m.published===true);
 if(!member||typeof member.name!=="string"||!member.name.trim())return json({error:"Profile unavailable"},404);
 if(form.get("revision")!==s.sha)return json({error:"Schedule changed; reopen editor"},409);
 const id=form.get("id")||"",matches=id?s.data.filter(x=>x.id===id):[];
 if(id&&(matches.length!==1||!scheduleOwned(matches[0],session)))return json({error:"Schedule unavailable"},404);
 let next;
 if(path==="/schedule/delete"){
 if(!id||form.get("confirm")!=="yes")return json({error:"Confirmation required"},400);
 next=s.data.filter(x=>x.id!==id);
 }else{
 const fields=["date","time","title","platform","url"];if(fields.some(k=>typeof form.get(k)!=="string"))return json({error:"Invalid schedule fields"},400);
 const values=Object.fromEntries(fields.map(k=>[k,form.get(k).trim()]));
 if(!validScheduleDate(values.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)||!values.title||values.title.length>150||!values.platform||values.platform.length>80||values.url.length>500)return json({error:"Invalid schedule"},400);
 if(values.url){try{const u=new URL(values.url);if(!["https:","http:"].includes(u.protocol)||u.username||u.password)throw Error();}catch{return json({error:"Invalid URL"},400);}}
 const item={...(matches[0]||{}),...values,id:id||crypto.randomUUID(),memberId:session.member_id,talent:member.name,published:true,scheduleSource:"member"};
 next=id?s.data.map(x=>x.id===id?item:x):[...s.data,item];
 }
 const active=await env.DB.prepare("SELECT id FROM accounts WHERE id=? AND member_id=? AND role='member' AND status='active'").bind(session.id,session.member_id).first();
 if(!active)return json({error:"Forbidden"},403);
 let commit;
 try{commit=await buildScheduleCommit(env,head,next);const current=await gitHead(env);if(current.sha!==head.sha)return json({error:"Publication conflict; reload schedule"},409);
 const stillActive=await env.DB.prepare("SELECT id FROM accounts WHERE id=? AND member_id=? AND role='member' AND status='active'").bind(session.id,session.member_id).first();
 if(!stillActive)return json({error:"Forbidden"},403);
 }catch(error){return json({error:"Publication stopped; reload schedule before retry",...safeGitDiagnostic(error)},409);}
 // After the ref request, transport failure can be ambiguous. Recheck before any retry.
 try{const result=await gitCall(env,"/git/refs/heads/main","PATCH",{sha:commit,force:false});if(result.object?.sha!==commit)throw Error("Unconfirmed ref");}
 catch{return page("schedule","公開結果を確認できませんでした。再登録せず、最新の配信予定を確認してください。",409,'<p><a href="/schedule">配信予定を再読み込み</a></p>');}
 return page("schedule","GitHubへの更新が完了しました。公式サイトへの反映には時間がかかる場合があります。",200,'<p><a href="/schedule">配信予定へ戻る</a></p>');
}
// Member-only records and operations. No public GitHub writes from these routes.
const applicationKinds={pause:"活動休止",resume:"活動再開",leave:"退所",other:"その他"};
const applicationStatuses={pending:"審査待ち",accepted:"受付済み",returned:"差し戻し",withdrawn:"取り下げ"};
const dateValid=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;};
const memberBack='<p><a href="/">ダッシュボードに戻る</a></p>';
const adminBack='<p><a href="/admin">アカウント管理に戻る</a></p>';
const hInput=(name,value)=>'<input type="hidden" name="'+esc(name)+'" value="'+esc(value)+'">';
const textField=(name,label,max,value="")=>'<label>'+esc(label)+'<textarea name="'+esc(name)+'" maxlength="'+max+'">'+esc(value)+'</textarea></label>';
const inputField=(name,label,max,value="")=>'<label>'+esc(label)+'<input name="'+esc(name)+'" maxlength="'+max+'" value="'+esc(value)+'" required></label>';
const confirmDelete='<label><input type="checkbox" name="confirm" value="yes" required>取り消しできないことを確認しました</label>';
const safeId=s=>typeof s==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
const getText=(form,k,max,required=false)=>{const v=form.get(k);if(typeof v!=="string")return null;const s=v.trim();return s.length>max||(required&&!s)?null:s;};
function activityFields(row={}){
 return '<label>分類<select name="kind"><option value="activity"'+(row.kind!=="anniversary"?" selected":"")+'>活動記録</option><option value="anniversary"'+(row.kind==="anniversary"?" selected":"")+'>記念日</option></select></label><label>日付<input type="date" name="event_date" value="'+esc(row.event_date||"")+'" required></label>'+inputField("title","タイトル",150,row.title||"")+textField("description","詳細",1000,row.description||"");
}
// Record publication uses the existing profile approval queue and Git publication job.
function recordPublication(row){
 if(!row||!["activity","anniversary"].includes(row.kind)||typeof row.event_date!=="string"||!dateValid(row.event_date)||typeof row.title!=="string"||!row.title.trim()||row.title.length>150)throw Error("Invalid activity");
 const record={kind:row.kind,date:row.event_date,title:row.title.trim()};
 if(row.kind==="activity"){if(typeof row.description!=="string"||row.description.length>1000)throw Error("Invalid description");record.description=row.description.trim()}
 return record;
}
function publicationRecordPatch(patch){
 if(!patch||typeof patch!=="object"||Array.isArray(patch)||!Object.hasOwn(patch,"recordPublication"))return null;
 const r=patch.recordPublication;
 if(Object.keys(patch).length!==1||!r||typeof r!=="object"||Array.isArray(r))throw Error("Invalid record patch");
 const normalized=recordPublication({kind:r.kind,event_date:r.date,title:r.title,description:r.description});
 if(JSON.stringify(normalized)!==JSON.stringify(r))throw Error("Invalid record fields");
 return normalized;
}
function annualDateKey(v){
 const m=String(v||"").match(/^(?:(\d{4})(?:年|[-/]))?(\d{1,2})(?:月|[-/])(\d{1,2})日?$/);
 return m?Number(m[2])+"-"+Number(m[3]):"";
}
function recordPublicationBase(member,record){
 const hidden=Array.isArray(member.hiddenSections)?member.hiddenSections:[];
 if(hidden.includes(record.kind==="activity"?"achievements":"facts"))throw Error("Section hidden");
 const key=record.kind==="activity"?"achievements":"anniversaries";
 let rows=member[key];
 if(rows!==undefined&&rows!==null&&!Array.isArray(rows))throw Error("Invalid published records");
 rows=Array.isArray(rows)?rows:[];
 if(key==="anniversaries"&&!rows.length&&typeof member.anniversary==="string"&&member.anniversary.trim())rows=[{date:member.anniversary,title:"活動記念日"}];
 if(rows.length>=500)throw Error("Published record limit");
 if(rows.some(x=>x&&x.title===record.title&&(record.kind==="activity"?x.date===record.date:annualDateKey(x.date)===annualDateKey(record.date))))throw Error("Already published");
 return {key,rows};
}
async function recordRevision(member,record){
 const {key,rows}=recordPublicationBase(member,record);
 return digest(JSON.stringify([member.id,key,rows]));
}
function recordPatchDetail(record){
 return '<p><strong>'+esc(record.kind==="activity"?"活動実績の追加":"その他の記念日の追加")+'</strong></p><p>'+esc(record.date)+' / '+esc(record.title)+'</p>'+(record.kind==="activity"?'<pre>'+esc(record.description)+'</pre>':'<p>毎年の記念日として日付と名称を掲載します。非公開メモは掲載しません。</p>');
}
async function submitActivityPublication(env,session,form){
 const id=form.get("id"),version=form.get("version");
 if(!safeId(id)||typeof version!=="string"||!/^[a-f0-9]{64}$/.test(version)||form.get("confirm")!=="yes")return json({error:"Invalid publication request"},400);
 const db=env.DB,row=await db.prepare("SELECT id,kind,event_date,title,description FROM member_activity WHERE id=? AND account_id=?").bind(id,session.id).first();
 if(!row||await digest(JSON.stringify([row.kind,row.event_date,row.title,row.description]))!==version)return json({error:"Record changed; reopen activity"},409);
 const member=(await publishedMembers(env)).find(m=>m.id===session.member_id);
 if(!member)return json({error:"Profile unavailable"},404);
 let record,revision;
 try{record=recordPublication(row);revision=await recordRevision(member,record)}catch{return page("activity","公開済み・非表示設定・日付などを確認してください。",409,memberBack+'<p><a href="/activity">活動記録へ戻る</a></p>')}
 const payload=JSON.stringify({recordPublication:record});
 const result=await db.prepare("INSERT INTO profile_requests(id,account_id,base_revision,patch_json,status) SELECT ?,?,?,?,'pending' WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') AND EXISTS(SELECT 1 FROM member_activity WHERE id=? AND account_id=? AND kind=? AND event_date=? AND title=? AND description=?) AND NOT EXISTS(SELECT 1 FROM profile_requests WHERE account_id=? AND status IN ('draft','pending')) RETURNING 1 AS affected").bind(crypto.randomUUID(),session.id,revision,payload,session.id,id,session.id,row.kind,row.event_date,row.title,row.description,session.id).all();
 if(!oneAffected(result))return page("activity","記録が変更されたか、審査中・下書きのプロフィール申請があります。先に申請状況を確認してください。",409,memberBack+'<p><a href="/profile">申請状況を確認</a>　<a href="/activity">活動記録へ戻る</a></p>');
 return redirect("/profile");
}
async function activityPage(env,session){
 const db=env.DB;
 const rows=(await db.prepare("SELECT id,kind,event_date,title,description FROM member_activity WHERE account_id=? ORDER BY event_date DESC,id LIMIT 100").bind(session.id).all()).results;
 const member=(await publishedMembers(env)).find(m=>m.id===session.member_id);
 const dates=member?[["誕生日",member.birthday],["REALITYデビュー日",member.debutDate],["ぽっぽー加入日",member.joinDate],...(Array.isArray(member.anniversaries)?member.anniversaries.filter(x=>x&&typeof x==="object").map(x=>[x.title,x.date]):[["活動記念日",member.anniversary]])].filter(([,date])=>typeof date==="string"&&date):[];
 const official=dates.map(([label,date])=>'<p>'+esc(label||"記念日")+'：'+esc(date)+'</p>').join("")||"<p>公開記念日は未登録です。</p>";
 const list=(await Promise.all(rows.map(async row=>'<article><strong>'+esc(row.event_date)+' '+esc(row.title)+'</strong><p>'+ (row.kind==="anniversary"?"記念日":"活動記録")+'</p><pre>'+esc(row.description)+'</pre><details><summary>編集する</summary><form method="post" action="/activity/save">'+hInput("id",row.id)+activityFields(row)+'<button>更新</button></form></details><form method="post" action="/activity/delete">'+hInput("id",row.id)+confirmDelete+'<button>削除</button></form>'+(member?'<form method="post" action="/activity/publish">'+hInput("id",row.id)+hInput("version",await digest(JSON.stringify([row.kind,row.event_date,row.title,row.description])))+'<p>'+(row.kind==="activity"?"日付・タイトル・詳細を公開申請します。":"日付・タイトルのみ公開申請します。詳細メモは非公開のままです。")+'</p><label><input type="checkbox" name="confirm" value="yes" required>公開内容を確認しました</label><button>公式サイトへの掲載を申請</button></form>':"")+'</article>'))).join("");
 return page("activity","",200,memberBack+'<p class="portal-notice">個人用の記録です。掲載を申請した項目だけ運営が審査します。記録の編集・削除は申請済みの内容や公開情報には影響しません。申請状況はプロフィール変更申請で確認できます。</p><h2>公式プロフィールの記念日</h2>'+official+'<h2>新規登録</h2><form method="post" action="/activity/save">'+activityFields()+'<button>保存</button></form><h2>登録済み記録（最大100件表示）</h2>'+(list||"<p>記録はありません。</p>"));
}
async function mutateActivity(db,session,form,path){
 const id=form.get("id")||"";
 if(id&&!safeId(id))return json({error:"Invalid record"},400);
 let result;
 if(path==="/activity/delete"){
 if(!id||form.get("confirm")!=="yes")return json({error:"Confirmation required"},400);
 result=await db.prepare("DELETE FROM member_activity WHERE id=? AND account_id=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='active' AND role='member') RETURNING 1 AS affected").bind(id,session.id,session.id).all();
 }else{
 const kind=form.get("kind"),date=form.get("event_date"),title=getText(form,"title",150,true),body=getText(form,"description",1000);
 if(!["activity","anniversary"].includes(kind)||!dateValid(date)||title===null||body===null)return json({error:"Invalid record"},400);
 if(id)result=await db.prepare("UPDATE member_activity SET kind=?,event_date=?,title=?,description=? WHERE id=? AND account_id=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='active' AND role='member') RETURNING 1 AS affected").bind(kind,date,title,body,id,session.id,session.id).all();
 else result=await db.prepare("INSERT INTO member_activity(id,account_id,kind,event_date,title,description) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='active' AND role='member') AND (SELECT COUNT(*) FROM member_activity WHERE account_id=?)<500 RETURNING 1 AS affected").bind(crypto.randomUUID(),session.id,kind,date,title,body,session.id,session.id).all();
 }
 if(!oneAffected(result))return json({error:"Record unavailable or limit reached"},409);
 return redirect("/activity");
}
async function noticesPage(db,session){
 const rows=(await db.prepare("SELECT n.id,n.title,n.body,n.created_at,r.read_at FROM portal_notices n LEFT JOIN notice_reads r ON r.notice_id=n.id AND r.account_id=? WHERE n.published=1 ORDER BY n.created_at DESC,n.id DESC LIMIT 100").bind(session.id).all()).results;
 const list=rows.map(n=>'<article><strong>'+esc(n.title)+'</strong> <span class="portal-tag">'+(n.read_at?"既読":"未読")+'</span><p><small>'+esc(n.created_at)+' UTC</small></p><pre>'+esc(n.body)+'</pre>'+(n.read_at?"":'<form method="post" action="/notices/read">'+hInput("id",n.id)+'<button>既読にする</button></form>')+'</article>').join("");
 return page("notices","",200,memberBack+'<p>運営からメンバーへの非公開のお知らせです。</p>'+(list||"<p>現在、お知らせはありません。</p>"));
}
async function applicationsPage(db,session){
 const rows=(await db.prepare("SELECT id,kind,body,status,review_note,created_at FROM member_applications WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT 100").bind(session.id).all()).results;
 const list=rows.map(a=>'<article><strong>'+esc(applicationKinds[a.kind]||a.kind)+'</strong> <span class="portal-tag">'+esc(applicationStatuses[a.status]||a.status)+'</span><p><small>'+esc(a.created_at)+' UTC</small></p><pre>'+esc(a.body)+'</pre>'+(a.review_note?'<p>運営コメント：'+esc(a.review_note)+'</p>':"")+(a.status==="pending"?'<form method="post" action="/applications/withdraw">'+hInput("id",a.id)+'<button>申請を取り下げる</button></form>':"")+'</article>').join("");
 return page("applications","",200,memberBack+'<p class="portal-notice">申請は運営への連絡です。受付だけでアカウントや公開設定が変更されることはありません。</p><h2>新規申請</h2><form method="post" action="/applications/submit"><label>申請種別<select name="kind">'+Object.entries(applicationKinds).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join("")+'</select></label>'+textField("body","申請内容（必要な事項のみ）",1000)+'<button>申請する</button></form><h2>申請履歴</h2>'+(list||"<p>申請履歴はありません。</p>"));
}
async function operationsPage(db){
 const [n,a]=await Promise.all([db.prepare("SELECT id,title,body,published,created_at FROM portal_notices ORDER BY created_at DESC,id DESC LIMIT 100").all(),db.prepare("SELECT a.id,a.kind,a.body,a.status,a.review_note,a.created_at,m.member_id FROM member_applications a JOIN accounts m ON m.id=a.account_id ORDER BY (a.status='pending') DESC,a.created_at DESC,a.id DESC LIMIT 100").all()]);
 const notices=n.results.map(row=>'<article><strong>'+esc(row.title)+'</strong><p>'+(row.published?"掲載中":"非掲載")+'</p><pre>'+esc(row.body)+'</pre><form method="post" action="/admin/notice-toggle">'+hInput("id",row.id)+hInput("expected",row.published)+'<button>'+(row.published?"掲載を停止":"再掲載")+'</button></form></article>').join("");
 const requests=a.results.map(row=>'<article><strong>'+esc(row.member_id)+' / '+esc(applicationKinds[row.kind]||row.kind)+'</strong><p>'+esc(applicationStatuses[row.status]||row.status)+'</p><pre>'+esc(row.body)+'</pre>'+(row.review_note?'<p>運営コメント：'+esc(row.review_note)+'</p>':"")+(row.status==="pending"?'<form method="post" action="/admin/application-review">'+hInput("id",row.id)+textField("note","運営コメント",1000)+'<button name="decision" value="accepted">受付済みにする</button><p></p><button name="decision" value="returned">差し戻す</button></form>':"")+'</article>').join("");
 return page("operations","",200,adminBack+'<h2>メンバー向けお知らせ</h2><form method="post" action="/admin/notice-create">'+inputField("title","件名",150)+textField("body","本文",2000)+'<button>メンバー向けに掲載</button></form><h2>お知らせ一覧</h2>'+(notices||"<p>ありません。</p>")+'<h2>メンバーからの申請</h2>'+(requests||"<p>ありません。</p>"));
}
async function mutateOperations(db,session,form,path){
 const id=form.get("id")||"";let result;
 if(path==="/admin/notice-create"){
 const title=getText(form,"title",150,true),body=getText(form,"body",2000,true);if(title===null||body===null)return json({error:"Invalid notice"},400);
 result=await db.prepare("INSERT INTO portal_notices(id,author_id,title,body) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='admin' AND status='active') RETURNING 1 AS affected").bind(crypto.randomUUID(),session.id,title,body,session.id).all();
 }else if(path==="/admin/notice-toggle"){
 const expected=form.get("expected");if(!safeId(id)||!["0","1"].includes(expected))return json({error:"Invalid notice"},400);
 result=await db.prepare("UPDATE portal_notices SET published=1-published WHERE id=? AND published=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='admin' AND status='active') RETURNING 1 AS affected").bind(id,Number(expected),session.id).all();
 }else{
 const decision=form.get("decision"),note=getText(form,"note",1000);if(!safeId(id)||!["accepted","returned"].includes(decision)||note===null||(decision==="returned"&&!note))return json({error:"Invalid review"},400);
 result=await db.prepare("UPDATE member_applications SET status=?,review_note=?,reviewed_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='admin' AND status='active') RETURNING 1 AS affected").bind(decision,note,session.id,id,session.id).all();
 }
 if(!oneAffected(result))return json({error:"Record changed; reopen page"},409);
 return redirect("/admin/operations");
}
// Approvals publish one Git commit against a verified branch head.
// The durable lock survives a timeout. Never mark a request approved before confirmed ref update.
const gitRoot="https://api.github.com/repos/rinseishirasu/poppoo-official";
const shaValid=s=>typeof s==="string"&&/^[a-f0-9]{40}$/.test(s);
const reconciliationReady=env=>env.PORTAL_MAINTENANCE==="true"&&env.PORTAL_RECOVERY_ENABLED==="true"&&env.PORTAL_PUBLICATION_ENABLED!=="true"&&typeof env.GITHUB_PUBLISH_TOKEN==="string"&&env.GITHUB_PUBLISH_TOKEN.length>0;
async function gitCall(env,path,method="GET",body){
 if(!publicationReady(env)&&!(reconciliationReady(env)&&method==="GET"&&/^\/compare\/[a-f0-9]{40}\.\.\.main$/.test(path)))throw Error("Publication disabled");
 const operation=path==="/git/ref/heads/main"?"head-ref":path.startsWith("/git/commits/")?"head-commit":path==="/git/commits"?"create-commit":path==="/git/blobs"?"create-blob":path==="/git/trees"?"create-tree":path==="/git/refs/heads/main"?"update-ref":path.startsWith("/compare/")?"compare":"git-request";
 return gitFetchJson(operation,gitRoot+path,{method,redirect:"error",headers:{...githubHeaders(env),"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
}
async function gitHead(env){
 const ref=await gitCall(env,"/git/ref/heads/main");if(!shaValid(ref?.object?.sha))throw new GitHubFailure("head-ref","invalid-response");
 const commit=await gitCall(env,"/git/commits/"+ref.object.sha);
 if(!shaValid(commit?.tree?.sha))throw new GitHubFailure("head-commit","invalid-response");
 return {sha:ref.object.sha,tree:commit.tree.sha};
}
function bytesBase64(bytes){let s="";for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
async function gitBlob(env,content){
 const b=await gitCall(env,"/git/blobs","POST",{content,encoding:"base64"});if(!shaValid(b.sha))throw Error("Invalid blob");return b.sha;
}
// Inlined static metadata generator, kept identical to main assets/js/site.js for paste-ready Worker deployment.
const SHARE_BASE="https://rinseishirasu.github.io/poppoo-official/";
// Static search metadata. Only published detail pages enter the sitemap.
const SEO_PUBLIC_PAGES=["","about.html","talents.html","schedule.html","anniversary.html","activity.html","news.html","audition.html","contact.html","policy.html"];
function sitemapXml(talents,news){
 const paths=new Set(SEO_PUBLIC_PAGES);
 for(const [kind,items] of [["talents",talents],["news",news]])for(const item of Array.isArray(items)?items:[]){
 if(item?.published!==true||typeof (kind==="talents"?item.name:item.title)!=="string"||!(kind==="talents"?item.name:item.title).trim())continue;
 const path=shareDetailPath(kind,item.id);if(path)paths.add(path);
 }
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...paths].map(p=>"<url><loc>"+SHARE_BASE+p+"</loc></url>").join("\n")+"\n</urlset>\n";
}
function jsonLd(value){return JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")}
function organizationSchema(){return {"@type":"Organization","@id":SHARE_BASE+"#community",name:"架空事務所 ぽっぽー",url:SHARE_BASE,logo:SHARE_BASE+"assets/image/poppoo-icon.png",description:"REALITYを中心に活動する配信者コミュニティ"}}
function shareDetailPath(kind,id){
 if(!["talents","news"].includes(kind)||typeof id!=="string"||!/^[A-Za-z0-9_-]+$/.test(id))return "";
 return "share-"+(kind==="talents"?"member":"news")+"-"+id+".html";
}
function sharePageHtml(kind,item){
 const path=shareDetailPath(kind,item?.id);
 if(!path||item.published!==true)return null;
 const member=kind==="talents",name=String(member?item.name:item.title||"").trim();
 if(!name)return null;
 const title=name+" | 架空事務所 ぽっぽー",desc=String(member?(item.catchphrase||"架空事務所 ぽっぽーの参加メンバー、"+name+"のプロフィールです。"):(item.summary||"架空事務所 ぽっぽーからのお知らせです。")).replace(/\s+/g," ").trim().slice(0,180);
 const hidden=Array.isArray(item.hiddenSections)&&item.hiddenSections.includes("gallery");
 const avatars=Array.isArray(item.avatarImages)?item.avatarImages:[item.avatarImages];
 const candidates=member?[...(!hidden?[...avatars,item.avatarImage]:[]),item.iconImage]:[item.thumbnailImage];
 const imagePath=candidates.find(x=>typeof x==="string"&&/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(x)&&!x.split("/").includes(".."))||"assets/image/poppoo-icon.png";
 const url=SHARE_BASE+path,image=SHARE_BASE+imagePath;
 const e=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const meta=(key,value,property=false)=>'<meta '+(property?"property":"name")+'="'+key+'" content="'+e(value)+'">';
 const heading=member?"MEMBERS":"NEWS",list=member?"talents.html":"news.html",detail=member?"talent-profile":"news-detail",klass=member?"pop-profile":"pop-info pop-news-detail";
 const person={"@type":"Person",name,identifier:item.id,url,...(imagePath!=="assets/image/poppoo-icon.png"?{image}:{}),...(item.catchphrase?{description:String(item.catchphrase)}:{})};
 const schema=member?{"@context":"https://schema.org","@type":"ProfilePage",url,mainEntity:person,inLanguage:"ja"}:{"@context":"https://schema.org","@type":"Article",headline:name,description:desc,url,mainEntityOfPage:url,publisher:organizationSchema(),...(imagePath!=="assets/image/poppoo-icon.png"?{image}:{}),...(typeof item.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&Number.isFinite(Date.parse(item.date))&&new Date(item.date).toISOString().slice(0,10)===item.date?{datePublished:item.date}:{}),inLanguage:"ja"};
 const structured='<script type="application/ld+json">'+jsonLd(schema)+'</script>';
 const tags=[meta("description",desc),meta("og:title",title,true),meta("og:description",desc,true),meta("og:type",member?"website":"article",true),meta("og:url",url,true),meta("og:image",image,true),meta("og:image:alt",imagePath==="assets/image/poppoo-icon.png"?"ぽっぽー公式アイコン":name+"の掲載画像",true),meta("og:site_name","架空事務所 ぽっぽー",true),meta("og:locale","ja_JP",true),meta("twitter:card",member?"summary":"summary_large_image"),meta("twitter:title",title),meta("twitter:description",desc),meta("twitter:image",image)].join("\n");
 return {path,content:'<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f4f7fc"><title>'+e(title)+'</title>\n'+tags+'\n'+structured+'\n<link rel="canonical" href="'+e(url)+'"><link rel="icon" href="assets/image/poppoo-icon.png"><link rel="stylesheet" href="assets/css/style.css"><link rel="stylesheet" href="assets/css/renewal.css"></head><body><header id="site-header"></header><main class="'+klass+'"><section class="page-hero detail-breadcrumb"><div class="container"><div class="breadcrumbs"><a href="index.html">TOP</a> / <a href="'+list+'">'+heading+'</a></div></div></section><section class="content"><div class="container"><div id="'+detail+'"><article class="detail-article"><h1>'+e(name)+'</h1><p>'+e(desc)+'</p><p class="small">詳細情報を読み込み中...</p><noscript><p>詳しい情報を表示するにはJavaScriptを有効にしてください。</p></noscript></article></div></div></section></main><footer id="site-footer" class="site-footer"></footer><script src="assets/js/site.js"></script><script src="assets/js/pages.js"></script></body></html>\n'};
}

async function buildPublicationCommit(env,head,data,image,updatedMember){
 const page=sharePageHtml("talents",updatedMember);
 if(!page)throw Error("Member share metadata invalid");
 const news=await githubDataset(env,"news",head.sha);
 const entries=[{path:"data/talents.json",mode:"100644",type:"blob",sha:await gitBlob(env,encodeGitHubJson(data))},{path:page.path,mode:"100644",type:"blob",sha:await gitBlob(env,bytesBase64(encoder.encode(page.content)))},{path:"sitemap.xml",mode:"100644",type:"blob",sha:await gitBlob(env,bytesBase64(encoder.encode(sitemapXml(data,news.data))))}];
 if(image)entries.push({path:image.path,mode:"100644",type:"blob",sha:await gitBlob(env,bytesBase64(image.bytes))});
 const tree=await gitCall(env,"/git/trees","POST",{base_tree:head.tree,tree:entries});
 if(!shaValid(tree.sha))throw Error("Invalid tree");
 const commit=await gitCall(env,"/git/commits","POST",{message:"Approve member profile submission",tree:tree.sha,parents:[head.sha]});
 if(!shaValid(commit.sha))throw Error("Invalid commit");return commit.sha;
}
async function finishPublication(db,job){
 if(!["profile","avatar"].includes(job.kind)||!shaValid(job.commit_sha))throw Error("Invalid job");
 const source=job.kind==="profile"?"profile_requests p WHERE p.id=publication_jobs.request_id AND p.account_id=publication_jobs.account_id AND p.status='pending'":"avatar_requests p WHERE p.id=publication_jobs.request_id AND p.account_id=publication_jobs.account_id";
 const guard=" AND EXISTS(SELECT 1 FROM publication_jobs WHERE request_id=? AND account_id=? AND state='published' AND commit_sha=?)";
 const sql=job.kind==="profile"?"UPDATE profile_requests SET status='approved',review_note=?,reviewed_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status='pending'":"DELETE FROM avatar_requests WHERE id=? AND account_id=?";
 const stmt=job.kind==="profile"?db.prepare(sql+guard+" RETURNING 1 AS affected").bind(job.note,job.actor_id,job.request_id,job.account_id,job.request_id,job.account_id,job.commit_sha):db.prepare(sql+guard+" RETURNING 1 AS affected").bind(job.request_id,job.account_id,job.request_id,job.account_id,job.commit_sha);
 const result=await db.batch([db.prepare("UPDATE publication_jobs SET state='published',updated_at=CURRENT_TIMESTAMP WHERE request_id=? AND account_id=? AND kind=? AND state='processing' AND commit_sha=? AND EXISTS(SELECT 1 FROM "+source+") RETURNING 1 AS affected").bind(job.request_id,job.account_id,job.kind,job.commit_sha),stmt]);
 if(!oneAffected(result[0])||!oneAffected(result[1]))throw Error("Job or source changed");
}
async function reviewPage(env){
 const db=env.DB,enabled=publicationReady(env);
 const [profiles,avatars,jobs,members]=await Promise.all([
 db.prepare("SELECT p.id,p.account_id,p.base_revision,p.patch_json,p.updated_at,a.member_id,a.status AS account_status FROM profile_requests p JOIN accounts a ON a.id=p.account_id WHERE p.status='pending' ORDER BY p.created_at LIMIT 100").all(),
 db.prepare("SELECT p.id,p.slot,p.account_id,p.created_at,a.member_id,a.status AS account_status FROM avatar_requests p JOIN accounts a ON a.id=p.account_id ORDER BY p.created_at LIMIT 100").all(),
 db.prepare("SELECT request_id,kind,account_id,state,commit_sha,note,updated_at FROM publication_jobs ORDER BY (state='processing') DESC,updated_at DESC LIMIT 100").all(),
 enabled?githubDataset(env,"talents"):publishedMembers().then(data=>({data,sha:""}))
 ]);
 const member=id=>members.data.find(m=>m.id===id&&m.published===true);
 const form=(row,kind)=>{
 if(env.PORTAL_MAINTENANCE==="true")return '<p>保守モード中は承認・差し戻しを停止しています。</p>';
 const busy=jobs.results.some(j=>j.request_id===row.id&&j.state==="processing");
 if(busy)return '<p>公開処理中または結果確認待ちです。</p>';
 return '<form method="post" action="/admin/review">'+hInput("id",row.id)+hInput("kind",kind)+hInput("revision",members.sha)+textField("note","運営コメント（差し戻し時は必須）",1000)+(enabled&&row.account_status==="active"&&member(row.member_id)?'<label><input type="checkbox" name="confirm" value="yes">内容・権利・公開範囲を確認しました</label><button name="decision" value="approve">承認して公式サイトに公開</button><p></p>':"")+'<button name="decision" value="return">差し戻す</button></form>';
 };
 const p=profiles.results.map(row=>{
 const m=member(row.member_id),patch=JSON.parse(row.patch_json);
 const record=publicationRecordPatch(patch);
 const changes=record?recordPatchDetail(record):PROFILE_FIELDS.filter(([k])=>Object.hasOwn(patch,k)).map(([k,label])=>'<p><strong>'+esc(label)+'</strong></p><small>現在</small><pre>'+esc(m?.[k]||"（空欄）")+'</pre><small>申請内容</small><pre>'+esc(patch[k]||"（空欄）")+'</pre>').join("");
 return '<article><h3>'+esc(m?.name||row.member_id)+'</h3><details open><summary>変更差分</summary>'+changes+'</details>'+form(row,"profile")+'</article>';
 }).join("");
 const a=avatars.results.map(row=>'<article><h3>'+esc(member(row.member_id)?.name||row.member_id)+' / '+esc(AVATAR_SLOTS.find(([k])=>k===row.slot)?.[1]||row.slot)+'</h3><img class="avatar-preview" src="/admin/review-image?id='+encodeURIComponent(row.id)+'" alt="審査対象画像">'+form(row,"avatar")+'</article>').join("");
 const history=jobs.results.map(j=>'<article><strong>'+esc(j.kind)+' / '+esc(j.state)+'</strong><p>'+esc(j.request_id)+'</p><small>'+esc(j.updated_at)+' UTC</small>'+(j.commit_sha?'<p>Git commit: '+esc(j.commit_sha)+'</p>':"")+(j.note?'<pre>'+esc(j.note)+'</pre>':"")+(j.state==="processing"&&j.commit_sha&&(enabled||reconciliationReady(env))?'<form method="post" action="/admin/reconcile">'+hInput("id",j.request_id)+'<button>GitHubの反映結果を確認</button></form>':"")+'</article>').join("");
 return page("reviews","",200,adminBack+'<p class="portal-notice">'+(enabled?"承認すると公開GitHubへ反映します。":env.PORTAL_MAINTENANCE==="true"?"保守モード：新規公開・差し戻しは停止中です。照合のみ実施できます。":"公開処理は停止中です。差し戻しのみ可能です。")+'</p><h2>プロフィール変更申請</h2>'+(p||"<p>審査待ちはありません。</p>")+'<h2>画像提出</h2>'+(a||"<p>審査待ちはありません。</p>")+'<h2>公開・審査履歴（最新100件）</h2>'+(history||"<p>履歴はありません。</p>"));
}
async function adminReviewImage(db,id){
 if(!safeId(id))return json({error:"Not found"},404);
 const row=await db.prepare("SELECT mime,image_data FROM avatar_requests WHERE id=?").bind(id).first();
 if(!row)return json({error:"Not found"},404);
 const data=new Uint8Array(row.image_data);
 if(imageMime(data)!==row.mime)return json({error:"Invalid image"},415);
 return new Response(data,{headers:{"Content-Type":row.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Cross-Origin-Resource-Policy":"same-origin","Referrer-Policy":"no-referrer"}});
}
async function reviewSubmission(env,session,form){
 const db=env.DB,id=form.get("id"),kind=form.get("kind"),decision=form.get("decision"),note=getText(form,"note",1000);
 if(!safeId(id)||!["profile","avatar"].includes(kind)||!["approve","return"].includes(decision)||note===null||(decision==="return"&&!note))return json({error:"Invalid review"},400);
 const select=kind==="profile"?"SELECT p.*,a.member_id,a.status AS account_status FROM profile_requests p JOIN accounts a ON a.id=p.account_id WHERE p.id=? AND p.status='pending'":"SELECT p.*,a.member_id,a.status AS account_status FROM avatar_requests p JOIN accounts a ON a.id=p.account_id WHERE p.id=?";
 const row=await db.prepare(select).bind(id).first();if(!row)return json({error:"Submission unavailable"},404);
 // Lock acquisition and source existence are a single SQLite statement.
 const source=kind==="profile"?"profile_requests p WHERE p.id=? AND p.account_id=? AND p.status='pending'":"avatar_requests p WHERE p.id=? AND p.account_id=?";
 if(decision==="approve"&&(!publicationReady(env)||form.get("confirm")!=="yes"||row.account_status!=="active"))return json({error:"Publication disabled or confirmation required"},403);
 const lock=await db.prepare("INSERT INTO publication_jobs(request_id,kind,account_id,actor_id,state,note) SELECT ?,?,?,?,'processing',? WHERE EXISTS(SELECT 1 FROM "+source+") AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='active' AND role='admin') ON CONFLICT(request_id) DO UPDATE SET state='processing',actor_id=excluded.actor_id,note=excluded.note,commit_sha=NULL,updated_at=CURRENT_TIMESTAMP WHERE publication_jobs.state='failed' RETURNING 1 AS affected").bind(id,kind,row.account_id,session.id,note,id,row.account_id,session.id).all();
 if(!oneAffected(lock))return json({error:"Review already in progress"},409);
 if(decision==="return"){
 const stmt=kind==="profile"?db.prepare("UPDATE profile_requests SET status='returned',review_note=?,reviewed_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status='pending'").bind(note,session.id,id,row.account_id):db.prepare("DELETE FROM avatar_requests WHERE id=? AND account_id=?").bind(id,row.account_id);
 await db.batch([stmt,db.prepare("UPDATE publication_jobs SET state='returned',updated_at=CURRENT_TIMESTAMP WHERE request_id=? AND state='processing'").bind(id)]);
 return redirect("/admin/reviews");
 }
 let commitSha="",refAttempted=false;
 try{
 const head=await gitHead(env),dataset=await githubDataset(env,"talents",head.sha);
 if(dataset.sha!==form.get("revision"))throw Error("Public profile changed");
 const matches=dataset.data.filter(m=>m.id===row.member_id&&m.published===true);
 if(matches.length!==1)throw Error("Member unavailable");
 const member=matches[0];let updated={...member},image=null;
 if(kind==="profile"){
 const patch=JSON.parse(row.patch_json);
 if(!patch||typeof patch!=="object"||Array.isArray(patch)||!Object.keys(patch).length)throw Error("Invalid patch");
 const record=publicationRecordPatch(patch);
 if(record){
 if(await recordRevision(member,record)!==row.base_revision)throw Error("Published records changed");
 const {key,rows}=recordPublicationBase(member,record);
 updated[key]=[...rows,record.kind==="activity"?{date:record.date,title:record.title,description:record.description}:{date:record.date,title:record.title}];
 }else{
 if(await profileRevision(member)!==row.base_revision)throw Error("Profile base changed");
 for(const [k,v] of Object.entries(patch)){const field=PROFILE_FIELDS.find(([key])=>key===k);if(!field||typeof v!=="string"||v.length>field[2])throw Error("Invalid patch field");updated[k]=v;}
 }
 }else{
 const bytes=new Uint8Array(row.image_data),mime=imageMime(bytes),ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[mime];
 if(!ext||mime!==row.mime||bytes.length>524288||!avatarSlot(row.slot)||!/^[A-Za-z0-9_-]{1,100}$/.test(row.member_id))throw Error("Invalid image");
 const path="assets/images/talents/"+row.member_id+"-portal-"+id+"."+ext;
 image={path,bytes};
 if(row.slot==="icon")updated.iconImage=path;
 else{
 const index=Number(row.slot.slice(-1))-1;
 const gallery=Array.isArray(member.avatarImages)&&member.avatarImages.length?[...member.avatarImages]:member.avatarImage?[member.avatarImage]:[];
 if(index>gallery.length)throw Error("Publish earlier avatar slots first");
 gallery[index]=path;updated.avatarImages=gallery;updated.avatarImage=gallery[0]||"";
 }
 }
 const data=dataset.data.map(m=>m===member?updated:m);
 const active=await db.prepare("SELECT id FROM accounts WHERE id=? AND status='active' AND role='member'").bind(row.account_id).first();
 if(!active)throw Error("Member inactive");
 const sha=await buildPublicationCommit(env,head,data,image,updated);
 const saved=await db.prepare("UPDATE publication_jobs SET commit_sha=?,updated_at=CURRENT_TIMESTAMP WHERE request_id=? AND state='processing' AND commit_sha IS NULL RETURNING 1 AS affected").bind(sha,id).all();
 if(!oneAffected(saved))throw Error("Job changed");
 commitSha=sha;
 // Non-forced update rejects concurrent changes to main.
 const current=await gitHead(env);if(current.sha!==head.sha)throw Error("Branch head changed before publish");
 const stillActive=await db.prepare("SELECT id FROM accounts WHERE id=? AND status='active' AND role='member'").bind(row.account_id).first();
 const actor=await db.prepare("SELECT id FROM accounts WHERE id=? AND status='active' AND role='admin'").bind(session.id).first();
 if(!stillActive||!actor)throw Error("Account inactive before publish");
 refAttempted=true;
 const ref=await gitCall(env,"/git/refs/heads/main","PATCH",{sha:commitSha,force:false});
 if(ref.object?.sha!==commitSha)throw Error("Unconfirmed ref update");
 await finishPublication(db,{kind,request_id:id,account_id:row.account_id,actor_id:session.id,note,commit_sha:commitSha});
 return redirect("/admin/reviews");
 }catch(error){
 if(!refAttempted)await db.prepare("UPDATE publication_jobs SET state='failed',commit_sha=NULL,updated_at=CURRENT_TIMESTAMP WHERE request_id=? AND state='processing' AND (commit_sha IS NULL OR commit_sha=?)").bind(id,commitSha).run();
 return json({error:refAttempted?"Publication result unconfirmed; reconcile in review console":"Publication stopped before ref update; review current data before retry"},409);
 }
}
async function reconcilePublication(env,form){
 if((!publicationReady(env)&&!reconciliationReady(env))||!safeId(form.get("id")))return json({error:"Invalid reconciliation"},400);
 const job=await env.DB.prepare("SELECT * FROM publication_jobs WHERE request_id=? AND state='processing'").bind(form.get("id")).first();
 if(!job||!shaValid(job.commit_sha))return json({error:"No reconcilable commit"},409);
 const comparison=await gitCall(env,"/compare/"+job.commit_sha+"...main");
 if(comparison.behind_by!==0||!["ahead","identical"].includes(comparison.status)||comparison.merge_base_commit?.sha!==job.commit_sha)return json({error:"Commit not confirmed on main; keep locked for investigation"},409);
 await finishPublication(env.DB,job);return redirect("/admin/reviews");
}
async function accountPage(env,session,message="",status=200){
 const a=await env.DB.prepare("SELECT email,password_hash FROM accounts WHERE id=? AND status='active'").bind(session.id).first();
 if(!a)return redirect("/");
 const legacy=String(a.password_hash).startsWith("pbkdf2-sha256$")||String(a.password_hash).startsWith("pbkdf2-sha256-hmac-v1$100000$")&&configuredIterations(env)===STRONG_ITERATIONS;
 return page("account",message,status,(session.role==="admin"?adminBack:memberBack)+'<p>登録メールアドレス：'+esc(a.email)+'</p>'+(legacy?'<p class="portal-notice">旧方式のパスワードです。新方式へ変更してください。</p>':"")+(!pepperReady(env)?'<p>新方式の設定が完了していません。</p>':'<form method="post" action="/account/password"><label>現在のパスワード<input type="password" name="current" autocomplete="current-password" required maxlength="1024"></label><label>新しいパスワード（20文字以上、長いランダムな文字列を推奨）<input type="password" name="password" autocomplete="new-password" required minlength="20" maxlength="1024"></label><label>再入力<input type="password" name="confirm" autocomplete="new-password" required minlength="20" maxlength="1024"></label><button>変更して全端末からログアウト</button></form>'),session.role);
}
async function changePassword(env,session,form){
 const db=env.DB,old=form.get("current"),password=form.get("password");
 if(!pepperReady(env)||!kdfConfigValid(env))return json({error:"Password setup unavailable"},503);
 if(!passwordValid(password)||password!==form.get("confirm")||password===old||typeof old!=="string"||encoder.encode(old).length>1024)return accountPage(env,session,"入力内容を確認してください。",400);
 if(!await limit(db,"password-change:"+session.id,5))return json({error:"Too many attempts"},429);
 const a=await db.prepare("SELECT password_hash FROM accounts WHERE id=? AND status='active'").bind(session.id).first();
 if(!a||!await verifyPassword(old,a.password_hash,env))return accountPage(env,session,"現在のパスワードを確認してください。",401);
 const hash=await hashPassword(password,env);
 const results=await db.batch([db.prepare("UPDATE accounts SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active' AND password_hash=? RETURNING 1 AS affected").bind(hash,session.id,a.password_hash),db.prepare("DELETE FROM sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND password_hash=?)").bind(session.id,session.id,hash)]);
 if(!oneAffected(results[0]))return json({error:"Account changed; sign in again"},409);
 return redirect("/",clearSessionCookie());
}
async function resetMemberAccount(env,session,form){
 if(env.PORTAL_TEST_MODE!=="true"||!pepperReady(env)||!kdfConfigValid(env)||form.get("confirm")!=="yes"||!safeId(form.get("id")))return json({error:"Reset unavailable"},403);
 const db=env.DB,id=form.get("id"),token=randomToken(),hash=await digest(token);
 // Insert a fresh unique token only if the reset is eligible, then use it as the batch guard.
 const result=await db.batch([
 db.prepare("INSERT INTO activation_tokens(token_hash,account_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND role='member' AND status IN ('active','suspended') AND NOT EXISTS(SELECT 1 FROM publication_jobs WHERE account_id=accounts.id AND state='processing') AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='admin' AND status='active') RETURNING 1 AS affected").bind(hash,now()+86400,id,session.id),
 db.prepare("UPDATE accounts SET status='invited',password_hash=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='member' AND status IN ('active','suspended') AND EXISTS(SELECT 1 FROM activation_tokens WHERE token_hash=? AND account_id=accounts.id) RETURNING 1 AS affected").bind(id,hash),
 db.prepare("DELETE FROM sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM activation_tokens WHERE token_hash=? AND account_id=?)").bind(id,hash,id),
 db.prepare("DELETE FROM activation_tokens WHERE account_id=? AND token_hash<>? AND EXISTS(SELECT 1 FROM activation_tokens WHERE token_hash=? AND account_id=?)").bind(id,hash,hash,id)
 ]);
 if(!oneAffected(result[0])||!oneAffected(result[1]))return json({error:"Reset unavailable; refresh account list"},409);
 return adminPage(db,"再設定用コードを発行しました。本人にのみ安全に渡してください。",200,true,token);
}
async function auditPage(db){
 const rows=(await db.prepare("SELECT actor_id,action,target_id,created_at FROM audit_log ORDER BY created_at DESC,id DESC LIMIT 200").all()).results;
 const list=rows.map(a=>'<article><strong>'+esc(a.action)+'</strong><p>実行者：'+esc(a.actor_id||"システム・実行者未記録")+' / 対象：'+esc(a.target_id||"")+'</p><small>'+esc(a.created_at)+' UTC</small></article>').join("");
 return page("audit","",200,adminBack+'<p>重要操作の記録（最新200件）。パスワードや招待コードは記録しません。</p>'+(list||"<p>記録はありません。</p>"));
}
async function audit(db,actor,action,target){
 await db.prepare("INSERT INTO audit_log(id,actor_id,action,target_id) VALUES (?,?,?,?)").bind(crypto.randomUUID(),actor,action,target).run();
}
function redirect(path,setCookie){const headers=new Headers({"Location":path,"Cache-Control":"no-store"});if(setCookie)headers.set("Set-Cookie",setCookie);return new Response(null,{status:303,headers});}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,db=env.DB;
 let step="request";
 try{
 if(request.method==="GET"&&path==="/health"){
 const tables=["accounts","sessions","activation_tokens","profile_requests","audit_log","login_limits","avatar_requests","member_activity","portal_notices","notice_reads","member_applications","publication_jobs"];
 const triggers=["audit_account_create","audit_account_status","audit_password_change","audit_profile_submit","audit_profile_status","audit_notice_create","audit_notice_status","audit_application_create","audit_application_status","audit_publication_start","audit_publication_status"];
 const found=(await db.prepare("SELECT name,type FROM sqlite_master WHERE type IN ('table','trigger')").all()).results;
 const schemaReady=tables.every(t=>found.some(x=>x.name===t&&x.type==="table"))&&triggers.every(t=>found.some(x=>x.name===t&&x.type==="trigger"));
 return json({ok:schemaReady,stage:"release-validation",authenticationEnabled:true,revision:"release-validation-v23",schemaReady,passwordPepperConfigured:pepperReady(env),passwordKdfIterations:configuredIterations(env),passwordKdfConfigValid:kdfConfigValid(env),productionEnabled:false,maintenanceEnabled:env.PORTAL_MAINTENANCE==="true",reconciliationEnabled:reconciliationReady(env),publicationEnabled:publicationReady(env)},schemaReady?200:503);
 }
 if(env.PORTAL_MAINTENANCE==="true"&&!(request.method==="GET"&&["/","/admin","/admin/reviews","/admin/audit","/account"].includes(path))&&!(request.method==="POST"&&["/login","/logout","/admin/reconcile"].includes(path)))return json({error:"Maintenance mode"},503);
 if(request.method==="GET"&&path==="/account"){const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="admin"&&(env.PORTAL_TEST_MODE!=="true"||env.PORTAL_MAINTENANCE==="true"))return json({error:"Forbidden"},403);return await accountPage(env,session);}
 if(request.method==="GET"&&path==="/admin/audit"){const session=await readSession(db,cookie(request));if(session?.role!=="admin")return json({error:"Forbidden"},403);return await auditPage(db);}
 if(request.method==="GET"&&path==="/setup"){
  if(!env.BOOTSTRAP_SECRET||await db.prepare("SELECT id FROM accounts WHERE role='admin' LIMIT 1").first())return json({error:"Setup unavailable"},404);
  return page("setup");
 }
 if(request.method==="GET"&&path==="/"){const session=await readSession(db,cookie(request));return session?.role==="admin"?redirect("/admin"):session&&session.role==="member"&&env.PORTAL_TEST_MODE==="true"&&env.PORTAL_MAINTENANCE!=="true"?await memberDashboard(env,session):page("login");}
 if(request.method==="GET"&&["/activity","/notices","/applications"].includes(path)){
 const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);
 return path==="/activity"?await activityPage(env,session):path==="/notices"?await noticesPage(db,session):await applicationsPage(db,session);
 }
 if(request.method==="GET"&&["/admin/reviews","/admin/review-image"].includes(path)){
 const session=await readSession(db,cookie(request));if(session?.role!=="admin")return json({error:"Forbidden"},403);
 return path==="/admin/reviews"?await reviewPage(env):await adminReviewImage(db,url.searchParams.get("id"));
 }
 if(request.method==="GET"&&path==="/admin/operations"){const session=await readSession(db,cookie(request));if(session?.role!=="admin")return json({error:"Forbidden"},403);return await operationsPage(db);}
 if(request.method==="GET"&&path==="/schedule"){const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);step="schedule-read";return await schedulePage(env,session,false);}
 if(request.method==="GET"&&path==="/profile"){const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);return await profilePage(env,session);}
 if(request.method==="GET"&&(path==="/avatars"||path==="/avatars/image")){
 const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);
 return path==="/avatars"?await avatarPage(env,session):await privateAvatar(db,session,url.searchParams.get("slot"),url.searchParams.get("v"));
 }
 if(request.method==="GET"&&path==="/activate"){if(env.PORTAL_TEST_MODE!=="true")return json({error:"Activation disabled"},404);return activationPage();}
 if(request.method==="GET"&&path==="/admin"){const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="admin")return json({error:"Forbidden"},403);return await adminPage(db,"",200,env.PORTAL_TEST_MODE==="true"); }
 if(request.method!=="POST"||!["/setup","/login","/logout","/admin/accounts","/admin/suspend","/admin/invite","/activate","/profile/save","/profile/withdraw","/avatars/upload","/avatars/withdraw","/schedule/save","/schedule/delete","/activity/save","/activity/delete","/activity/publish","/notices/read","/applications/submit","/applications/withdraw","/admin/notice-create","/admin/notice-toggle","/admin/application-review","/admin/review","/admin/reconcile","/account/password","/admin/reset-account"].includes(path))return json({error:"Not found"},404);
 const origin=request.headers.get("Origin");
 if(origin!==url.origin||["cross-site","same-site"].includes(request.headers.get("Sec-Fetch-Site")))return json({error:"Cross-origin request rejected"},403);

 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 if(["/login","/activate","/setup","/account/password"].includes(path)&&!await limit(db,"auth-ip:"+ip,20))return page(path==="/setup"?"setup":"login","試行回数の上限です。15分後にお試しください。",429);
 if(!["/login","/activate","/setup","/account/password","/logout"].includes(path)&&!await limit(db,"mutation-ip:"+ip,120))return json({error:"Too many requests"},429);
 const upload=path==="/avatars/upload",contentType=request.headers.get("Content-Type")||"";
 if(upload?!contentType.startsWith("multipart/form-data;"):!contentType.startsWith("application/x-www-form-urlencoded"))return json({error:"Invalid request"},400);
 if(upload){const session=await readSession(db,cookie(request));if(session?.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);}
 const reader=request.body?.getReader();let size=0;const chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>(upload?540672:path==="/profile/save"?65536:32768)){await reader.cancel();return json({error:"Request too large"},413);}chunks.push(value);}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const form=upload?await new Request(request.url,{method:"POST",headers:{"Content-Type":contentType},body:bytes}).formData():new URLSearchParams(new TextDecoder().decode(bytes)),email=typeof form.get("email")==="string"?form.get("email").trim().toLowerCase():"",password=typeof form.get("password")==="string"?form.get("password"):"";
 const csrfCookie=(request.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-poppoo_csrf=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!csrfCookie||!await equalSecret(form.get("csrf"),csrfCookie))return json({error:"CSRF token invalid; reopen the form"},403);
 if(path==="/logout"){await revokeSession(db,cookie(request));return redirect("/",clearSessionCookie());}
 if(path==="/account/password"){const session=await readSession(db,cookie(request));if(!session||(session.role!=="admin"&&env.PORTAL_TEST_MODE!=="true"))return json({error:"Forbidden"},403);return await changePassword(env,session,form);}
 if(path.startsWith("/avatars/")){
 const session=await readSession(db,cookie(request));if(session?.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);
 if(path==="/avatars/upload"){step="avatar-upload";return await uploadAvatar(env,session,form);}
 const slot=form.get("slot"),id=form.get("id");if(!avatarSlot(slot)||typeof id!=="string")return json({error:"Invalid submission"},400);
 const result=await db.prepare("DELETE FROM avatar_requests WHERE account_id=? AND slot=? AND id=? AND NOT EXISTS(SELECT 1 FROM publication_jobs j WHERE j.request_id=avatar_requests.id AND j.state='processing') AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') RETURNING 1 AS affected").bind(session.id,slot,id,session.id).all();
 if(!oneAffected(result))return json({error:"Submission unavailable"},409);
 return redirect("/avatars");
 }
 if(["/activity/save","/activity/delete","/activity/publish","/notices/read","/applications/submit","/applications/withdraw"].includes(path)){
 const session=await readSession(db,cookie(request));if(session?.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);
 if(path==="/activity/publish")return await submitActivityPublication(env,session,form);
 if(path.startsWith("/activity/"))return await mutateActivity(db,session,form,path);
 const id=form.get("id")||"";
 if(path==="/notices/read"){
 if(!safeId(id))return json({error:"Invalid notice"},400);
 await db.prepare("INSERT OR IGNORE INTO notice_reads(notice_id,account_id) SELECT id,? FROM portal_notices WHERE id=? AND published=1 AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='active' AND role='member')").bind(session.id,id,session.id).run();return redirect("/notices");
 }
 let result;
 if(path==="/applications/submit"){
 const kind=form.get("kind"),body=getText(form,"body",1000,true);if(!Object.hasOwn(applicationKinds,kind)||body===null)return json({error:"Invalid application"},400);
 result=await db.prepare("INSERT INTO member_applications(id,account_id,kind,body) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') AND (SELECT COUNT(*) FROM member_applications WHERE account_id=? AND status='pending')<10 RETURNING 1 AS affected").bind(crypto.randomUUID(),session.id,kind,body,session.id,session.id).all();
 }else{
 if(!safeId(id))return json({error:"Invalid application"},400);
 result=await db.prepare("UPDATE member_applications SET status='withdrawn',updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status='pending' AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') RETURNING 1 AS affected").bind(id,session.id,session.id).all();
 }
 if(!oneAffected(result))return json({error:"Application unavailable or limit reached"},409);return redirect("/applications");
 }
 if(path.startsWith("/schedule/")){
 const session=await readSession(db,cookie(request));if(session?.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);
 step="schedule-publication";return await mutateSchedule(env,session,form,path);
 }
 if(path.startsWith("/profile/")){
 const session=await readSession(db,cookie(request));if(session?.role!=="member"||env.PORTAL_TEST_MODE!=="true")return json({error:"Forbidden"},403);
 if(path==="/profile/save")return await saveProfile(env,session,form);
 const result=await db.prepare("UPDATE profile_requests SET status='withdrawn',updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status IN ('draft','pending','returned') AND NOT EXISTS(SELECT 1 FROM publication_jobs j WHERE j.request_id=profile_requests.id AND j.state='processing') AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='member' AND status='active') RETURNING 1 AS affected").bind(form.get("id")||"",session.id,session.id).all();
 if(!oneAffected(result))return json({error:"Request unavailable"},409);
 return redirect("/profile");
 }
 if(path==="/activate"){
  if(env.PORTAL_TEST_MODE!=="true"||!pepperReady(env)||!kdfConfigValid(env))return json({error:"Activation disabled"},404);
  const token=(form.get("token")||"").trim();if(!/^[a-f0-9]{64}$/.test(token)||!passwordValid(password)||encoder.encode(password).length>1024||password!==form.get("confirm"))return activationPage("入力内容を確認してください。",400);
  const tokenHash=await digest(token);
  const target=await db.prepare("SELECT a.id FROM activation_tokens t JOIN accounts a ON a.id=t.account_id WHERE t.token_hash=? AND t.used_at IS NULL AND t.expires_at>? AND a.role='member' AND a.status='invited'").bind(tokenHash,now()).first();
  if(!target)return activationPage("招待コードが無効または期限切れです。",400);
  step="activation-password-hash";const hash=await hashPassword(password,env);
  const results=await db.batch([db.prepare("UPDATE accounts SET password_hash=?,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='member' AND status='invited' AND EXISTS(SELECT 1 FROM activation_tokens WHERE token_hash=? AND account_id=accounts.id AND used_at IS NULL AND expires_at>?) RETURNING 1 AS affected").bind(hash,target.id,tokenHash,now()),db.prepare("UPDATE activation_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=? AND account_id=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='active')").bind(tokenHash,target.id,target.id)]);
  if(!oneAffected(results[0]))return activationPage("招待コードが無効または期限切れです。",400);
  return redirect("/");
 }
 if(path.startsWith("/admin/")){
 const session=await readSession(db,cookie(request));if(session?.role!=="admin")return json({error:"Forbidden"},403);
 if(path==="/admin/reset-account")return await resetMemberAccount(env,session,form);
 if(path==="/admin/review")return await reviewSubmission(env,session,form);
 if(path==="/admin/reconcile")return await reconcilePublication(env,form);
 if(["/admin/notice-create","/admin/notice-toggle","/admin/application-review"].includes(path))return await mutateOperations(db,session,form,path);
 if(path==="/admin/accounts"){
 if(env.PORTAL_TEST_MODE!=="true"||!pepperReady(env)||!kdfConfigValid(env))return json({error:"Account issuance disabled"},403);
 const memberId=form.get("member_id")||"";if(!validEmail(email)||! /^[A-Za-z0-9_-]{1,100}$/.test(memberId))return await adminPage(db,"入力内容を確認してください。",400,env.PORTAL_TEST_MODE==="true");
 const members=await publishedMembers(env);if(!members.some(m=>m.id===memberId))return await adminPage(db,"公開メンバーを選択してください。",400,env.PORTAL_TEST_MODE==="true");
 const id=crypto.randomUUID();const result=await db.prepare("INSERT INTO accounts(id,email,member_id,role,status) VALUES (?,?,?,\'member\',\'invited\') ON CONFLICT DO NOTHING RETURNING 1 AS affected").bind(id,email,memberId).all();if(!oneAffected(result))return await adminPage(db,"メールアドレスまたはメンバーは登録済みです。",409,env.PORTAL_TEST_MODE==="true");
 return redirect("/admin");
 }
 const id=form.get("id")||"";if(!safeId(id))return json({error:"Invalid account"},400);
 if(path==="/admin/invite"){
  if(env.PORTAL_TEST_MODE!=="true"||!pepperReady(env)||!kdfConfigValid(env))return json({error:"Invitation disabled"},403);
  const token=randomToken(),tokenHash=await digest(token);
  const result=await db.batch([db.prepare("DELETE FROM activation_tokens WHERE account_id IN (SELECT id FROM accounts WHERE id=? AND role='member' AND status='invited')").bind(id),db.prepare("INSERT INTO activation_tokens(token_hash,account_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND role='member' AND status='invited' RETURNING 1 AS affected").bind(tokenHash,now()+86400,id)]);
  if(!oneAffected(result[1]))return json({error:"Account not eligible"},409);
  return await adminPage(db,"招待コードを発行しました。",200,true,token);
 }
 await db.batch([db.prepare("UPDATE accounts SET status=\'suspended\',updated_at=CURRENT_TIMESTAMP WHERE id=? AND role=\'member\'").bind(id),db.prepare("DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE id=? AND role=\'member\')").bind(id),db.prepare("DELETE FROM activation_tokens WHERE account_id IN (SELECT id FROM accounts WHERE id=? AND role=\'member\')").bind(id)]);
 return redirect("/admin");
 }
 if(!validEmail(email)||encoder.encode(password).length>1024)return page(path==="/setup"?"setup":"login","入力内容を確認してください。",400);
 if(path==="/setup"){
  if(!pepperReady(env)||!kdfConfigValid(env))return json({error:"Password setup unavailable"},503);
  if(await db.prepare("SELECT id FROM accounts WHERE role=\'admin\' LIMIT 1").first())return json({error:"Setup unavailable"},404);
  if(!await equalSecret(form.get("secret"),env.BOOTSTRAP_SECRET))return page("setup","登録できませんでした。",403);
  if(!passwordValid(password))return page("setup","パスワードは20文字以上にしてください。",400);
  step="password-hash";
 const hash=await hashPassword(password,env);
 step="administrator-insert";
  const result=await db.prepare("INSERT INTO accounts(id,email,role,status,password_hash) SELECT ?,?,'admin','active',? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE role='admin') RETURNING 1 AS affected").bind(crypto.randomUUID(),email,hash).all();
  if(!oneAffected(result))return json({error:"Setup unavailable"},409);
  return redirect("/");
 }
 if(!await limit(db,"email:"+email,8))return page("login","試行回数の上限です。15分後にお試しください。",429);
 const account=await db.prepare("SELECT id,status,password_hash,role FROM accounts WHERE email=?").bind(email).first();
 const dummy=(pepperReady(env)?"pbkdf2-sha256-hmac-v1$":"pbkdf2-sha256$")+(pepperReady(env)?configuredIterations(env):ITERATIONS)+"$"+"0".repeat(64)+"$"+"0".repeat(64);
 step="password-verify";
 const valid=await verifyPassword(password,account?.password_hash||dummy,env);
 if(!valid||account?.status!=="active"||(account.role==="member"&&(env.PORTAL_TEST_MODE!=="true"||env.PORTAL_MAINTENANCE==="true")))return page("login","メールアドレスまたはパスワードを確認してください。",401);
 await revokeSession(db,cookie(request));
 step="session-create";
 const session=await createSession(db,account.id,account.password_hash);
 try{await audit(db,account.id,"login",account.id);}catch{}
 return redirect("/",sessionCookie(session.token));
 }catch(error){const diagnostic=safeGitDiagnostic(error);console.error("Portal operation failed",step,error?.name||"Error",diagnostic);return json({error:"Service unavailable",step,revision:"release-validation-v23",...(["schedule-read","schedule-publication"].includes(step)?diagnostic:{})},503);}
}};
