// Portal authentication: initial administrator and login.
const encoder = new TextEncoder();
const ITERATIONS = 600000;
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join("");
function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
async function digest(value){return hex(await crypto.subtle.digest("SHA-256",encoder.encode(value)));}
async function derive(password,salt){
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:ITERATIONS},key,256));
}
export async function hashPassword(password){
 if(typeof password!=="string" || password.length<12 || encoder.encode(password).length>1024) throw new Error("Invalid password length");
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
function page(mode,message="",status=200){
 const nonce=randomToken();
 const setup=mode==="setup",home=mode==="home";
 const form=home?'<p>ログインしました。メンバー機能は準備中です。</p><form method="post" action="/logout"><button>ログアウト</button></form>':'<form method="post" action="'+(setup?"/setup":"/login")+'">'+(setup?'<label>初期設定Secret<input name="secret" type="password" required autocomplete="off" maxlength="1024"></label>':'')+'<label>メールアドレス<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label>パスワード<input name="password" type="password" required '+(setup?'minlength="12" autocomplete="new-password"':'autocomplete="current-password"')+' maxlength="1024"></label><button>'+(setup?"初期管理者を登録":"ログイン")+'</button></form>';
 return new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>POPPŌ MEMBER PORTAL</title><style nonce="'+nonce+'">*{box-sizing:border-box}body{margin:0;background:#edf5fc;color:#142f56;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:20px}main{background:white;border:1px solid #dbe8f4;border-radius:20px;padding:32px;width:min(100%,440px)}h1{font-size:1.3rem}h2{font-size:1.1rem}label{display:grid;gap:6px;margin:18px 0}input,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #b8cde1;width:100%}button{background:#176bb2;color:white;border:0;cursor:pointer}p{line-height:1.7}small{color:#536b83}</style><main><small>POPPŌ MEMBER PORTAL</small><h1>'+(setup?"初期管理者登録":home?"メンバーポータル":"ログイン")+'</h1><p role="status">'+message+'</p>'+form+'</main></html>',{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; style-src 'nonce-"+nonce+"'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
function redirect(path,setCookie){const headers=new Headers({"Location":path,"Cache-Control":"no-store"});if(setCookie)headers.set("Set-Cookie",setCookie);return new Response(null,{status:303,headers});}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,db=env.DB;
 try{
 if(request.method==="GET"&&path==="/health"){await db.prepare("SELECT id FROM accounts LIMIT 0").all();return json({ok:true,stage:"authentication",authenticationEnabled:true});}
 if(request.method==="GET"&&path==="/setup"){
  if(!env.BOOTSTRAP_SECRET||await db.prepare("SELECT id FROM accounts WHERE role='admin' LIMIT 1").first())return json({error:"Setup unavailable"},404);
  return page("setup");
 }
 if(request.method==="GET"&&path==="/"){return await readSession(db,cookie(request))?page("home"):page("login");}
 if(request.method!=="POST"||!["/setup","/login","/logout"].includes(path))return json({error:"Not found"},404);
 if(request.headers.get("Origin")!==url.origin)return json({error:"Forbidden"},403);
 if(path==="/logout"){await revokeSession(db,cookie(request));return redirect("/",clearSessionCookie());}
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 if(!await limit(db,"ip:"+ip,20))return page(path==="/setup"?"setup":"login","試行回数の上限です。15分後にお試しください。",429);
 if(!request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded"))return json({error:"Invalid request"},400);
 const reader=request.body?.getReader();let size=0;const chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return json({error:"Request too large"},413);}chunks.push(value);}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const form=new URLSearchParams(new TextDecoder().decode(bytes)),email=(form.get("email")||"").trim().toLowerCase(),password=form.get("password")||"";
 if(!validEmail(email)||encoder.encode(password).length>1024)return page(path==="/setup"?"setup":"login","入力内容を確認してください。",400);
 if(path==="/setup"){
  if(!await equalSecret(form.get("secret"),env.BOOTSTRAP_SECRET))return page("setup","登録できませんでした。",403);
  if(password.length<12)return page("setup","パスワードは12文字以上にしてください。",400);
  const hash=await hashPassword(password);
  const result=await db.prepare("INSERT INTO accounts(id,email,role,status,password_hash) SELECT ?,?,'admin','active',? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE role='admin')").bind(crypto.randomUUID(),email,hash).run();
  if(result.meta.changes!==1)return json({error:"Setup unavailable"},409);
  return redirect("/");
 }
 if(!await limit(db,"email:"+email,8))return page("login","試行回数の上限です。15分後にお試しください。",429);
 const account=await db.prepare("SELECT id,status,password_hash FROM accounts WHERE email=?").bind(email).first();
 const dummy="pbkdf2-sha256$600000$"+"0".repeat(64)+"$"+"0".repeat(64);
 const valid=await verifyPassword(password,account?.password_hash||dummy);
 if(!valid||account?.status!=="active")return page("login","メールアドレスまたはパスワードを確認してください。",401);
 await revokeSession(db,cookie(request));
 const session=await createSession(db,account.id);
 return redirect("/",sessionCookie(session.token));
 }catch{return json({error:"Service unavailable"},503);}
}};
