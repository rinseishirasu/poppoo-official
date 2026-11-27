// Standalone Access capability probe. Deploy only to a new test Worker.
// No database, credentials, session cookies or publication permissions.
export default {
 async fetch(request, env, ctx) {
  const headers = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
  const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
  if(request.method !== "GET" || new URL(request.url).pathname !== "/") return reply({error:"Not found"},404);
  if(!ctx?.access) return reply({ok:false,revision:"access-probe-v30",accessAuthenticated:false},403);
  try {
   const identity = await ctx.access.getIdentity();
   const email = typeof identity?.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email);
   if(!email) return reply({ok:false,revision:"access-probe-v30",accessAuthenticated:true,emailIdentity:false},403);
   return reply({ok:true,revision:"access-probe-v30",accessAuthenticated:true,emailIdentity:true});
  } catch {
   return reply({ok:false,revision:"access-probe-v30",error:"Identity unavailable"},503);
  }
 }
};
