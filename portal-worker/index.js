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
 const form=mode==="activate"?content:mode==="admin"?content+'<form method="post" action="/logout"><button>ログアウト</button></form>':home?'<p>ログインしました。メンバー機能は準備中です。</p><form method="post" action="/logout"><button>ログアウト</button></form>':'<form method="post" action="'+(setup?"/setup":"/login")+'">'+(setup?'<label>初期設定Secret<input name="secret" type="password" required autocomplete="off" maxlength="1024"></label>':'')+'<label>メールアドレス<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label>パスワード<input name="password" type="password" required '+(setup?'minlength="16" autocomplete="new-password"':'autocomplete="current-password"')+' maxlength="1024"></label><button>'+(setup?"初期管理者を登録":"ログイン")+'</button></form>';
 return new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>POPPŌ MEMBER PORTAL</title><style nonce="'+nonce+'">*{box-sizing:border-box}body{margin:0;background:#edf5fc;color:#142f56;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:20px}main{background:white;border:1px solid #dbe8f4;border-radius:20px;padding:32px;width:min(100%,'+(mode==="admin"?"840px":"440px")+')}h1{font-size:1.3rem}h2{font-size:1.1rem}label{display:grid;gap:6px;margin:18px 0}input,select,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #b8cde1;width:100%}button{background:#176bb2;color:white;border:0;cursor:pointer}p{line-height:1.7}small{color:#536b83}article{border-top:1px solid #dbe8f4;padding:12px 0;overflow-wrap:anywhere}article form{margin-top:8px}a{color:#176bb2}</style><main><small>POPPŌ MEMBER PORTAL</small><h1>'+(setup?"初期管理者登録":mode==="admin"?"アカウント管理":mode==="activate"?"初回パスワード設定":home?"メンバーポータル":"ログイン")+'</h1><p role="status">'+message+'</p>'+form.replace(/(<form[^>]*>)/g,'$1<input type="hidden" name="csrf" value="'+csrf+'">')+'</main></html>',{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Set-Cookie":"__Host-poppoo_csrf="+csrf+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=900","Referrer-Policy":"same-origin","Content-Security-Policy":"default-src 'none'; style-src 'nonce-"+nonce+"'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
async function publishedMembers(){
 const response=await fetch("https://rinseishirasu.github.io/poppoo-official/data/talents.json",{headers:{"Accept":"application/json"},cache:"no-store"});
 if(!response.ok)throw Error("Member registry unavailable");
 const data=await response.json();if(!Array.isArray(data))throw Error("Member registry invalid");
 return data.filter(t=>t&&t.published===true&&typeof t.id==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(t.id)&&typeof t.name==="string");
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
 if(request.method==="GET"&&path==="/health"){await db.prepare("SELECT id FROM accounts LIMIT 0").all();return json({ok:true,stage:"authentication",authenticationEnabled:true,revision:"member-invite-v7"});}
 if(request.method==="GET"&&path==="/setup"){
  if(!env.BOOTSTRAP_SECRET||await db.prepare("SELECT id FROM accounts WHERE role='admin' LIMIT 1").first())return json({error:"Setup unavailable"},404);
  return page("setup");
 }
 if(request.method==="GET"&&path==="/"){const session=await readSession(db,cookie(request));return session?.role==="admin"?redirect("/admin"):session&&env.PORTAL_TEST_MODE==="true"?page("home"):page("login");}
 if(request.method==="GET"&&path==="/activate"){if(env.PORTAL_TEST_MODE!=="true")return json({error:"Activation disabled"},404);return activationPage();}
 if(request.method==="GET"&&path==="/admin"){const session=await readSession(db,cookie(request));if(!session)return redirect("/");if(session.role!=="admin")return json({error:"Forbidden"},403);return await adminPage(db,"",200,env.PORTAL_TEST_MODE==="true"); }
 if(request.method!=="POST"||!["/setup","/login","/logout","/admin/accounts","/admin/suspend","/admin/invite","/activate"].includes(path))return json({error:"Not found"},404);
 const origin=request.headers.get("Origin");
 if((origin&&origin!=="null"&&origin!==url.origin)||request.headers.get("Sec-Fetch-Site")==="cross-site")return json({error:"Cross-origin request rejected"},403);

 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 if(!await limit(db,"ip:"+ip,20))return page(path==="/setup"?"setup":"login","試行回数の上限です。15分後にお試しください。",429);
 if(!request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded"))return json({error:"Invalid request"},400);
 const reader=request.body?.getReader();let size=0;const chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return json({error:"Request too large"},413);}chunks.push(value);}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const form=new URLSearchParams(new TextDecoder().decode(bytes)),email=(form.get("email")||"").trim().toLowerCase(),password=form.get("password")||"";
 const csrfCookie=(request.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-poppoo_csrf=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!csrfCookie||!await equalSecret(form.get("csrf"),csrfCookie))return json({error:"CSRF token invalid; reopen the form"},403);
 if(path==="/logout"){await revokeSession(db,cookie(request));return redirect("/",clearSessionCookie());}
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
 }catch(error){console.error("Portal operation failed",step,error?.name||"Error");return json({error:"Service unavailable",step,revision:"member-invite-v7"},503);}
}};
