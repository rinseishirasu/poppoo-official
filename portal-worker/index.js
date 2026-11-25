// Authentication foundation only. No public account creation or login endpoints yet.
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
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(request.method==="GET" && url.pathname==="/health"){
  try{
   await env.DB.prepare("SELECT id FROM accounts LIMIT 0").all();
   return json({ok:true,stage:"foundation",authenticationEnabled:false});
  }catch{return json({ok:false,stage:"foundation",authenticationEnabled:false},503);}
 }
 return json({error:"Portal not yet available"},404);
}};
