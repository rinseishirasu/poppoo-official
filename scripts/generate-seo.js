"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content, "utf8");
const source = read("assets/js/site.js");
// Use the browser CMS's pure functions, without running any DOM code.
const start = source.indexOf("const SHARE_BASE=");
const end = source.indexOf("// Share public URLs only;");
if (start < 0 || end <= start) throw Error("SEO generator boundaries not found");
const {sitemapXml, homepageSeo, sharePageHtml} = new Function(source.slice(start, end) + "\nreturn {sitemapXml, homepageSeo, sharePageHtml};")();
const load = kind => {
  const items = JSON.parse(read("data/" + kind + ".json"));
  if (!Array.isArray(items)) throw Error("Invalid dataset: " + kind);
  return items;
};
const talents = load("talents"), news = load("news"), settings = load("settings");
const generated = new Map();
for (const [kind, items] of [["talents", talents], ["news", news]]) {
  for (const item of items) {
    if (item?.published !== true) continue;
    const entry = sharePageHtml(kind, item);
    if (!entry || generated.has(entry.path)) throw Error("Invalid public ID/name: " + kind);
    generated.set(entry.path, entry.content);
  }
}
const home = homepageSeo(read("index.html"), settings);
const sitemap = sitemapXml(talents, news);
// Validate all inputs before touching any output.
for (const [file, content] of generated) write(file, content);
for (const file of fs.readdirSync(root)) {
  if (/^share-(member|news)-[A-Za-z0-9_-]+\.html$/.test(file) && !generated.has(file)) fs.unlinkSync(path.join(root, file));
}
write("index.html", home);
write("sitemap.xml", sitemap);
write("robots.txt", "User-agent: *\nDisallow: /poppoo-official/admin.html\nDisallow: /admin.html\nSitemap: https://rinseishirasu.github.io/poppoo-official/sitemap.xml\n");
console.log("Generated " + generated.size + " public detail pages.");

 // M7-5: publish crawlable localized homepages at stable, root-level URLs.
const vm = require("node:vm");
const ctx = vm.createContext({location:new URL("https://example.invalid/index.html"),window:{},URL,URLSearchParams,Intl});
vm.runInContext("window.parent=window",ctx);
vm.runInContext(source.slice(0,source.indexOf("function translateStaticPublic(root)")),ctx,{timeout:3000});
const dictionaries=vm.runInContext("({en:PUBLIC_EN_TEXT,...PUBLIC_OTHER_TEXT})",ctx);
const base="https://rinseishirasu.github.io/poppoo-official/";
const descriptions={
 en:["Poppoo | REALITY creator community","Meet the members of Poppoo, a REALITY creator community. Discover streams, announcements and our community."],
 ko:["Poppoo | REALITY 크리에이터 커뮤니티","REALITY 크리에이터 커뮤니티 Poppoo의 멤버, 방송 일정, 공지사항을 만나보세요."],
 "zh-Hant":["Poppoo｜REALITY 創作者社群","認識 REALITY 創作者社群 Poppoo 的成員，探索直播行程及最新消息。"],
 "zh-Hans":["Poppoo｜REALITY 创作者社区","认识 REALITY 创作者社区 Poppoo 的成员，探索直播日程及最新消息。"],
 id:["Poppoo | Komunitas kreator REALITY","Kenali anggota komunitas kreator REALITY Poppoo, jadwal siaran, dan pengumuman terbaru."],
 th:["Poppoo | ชุมชนครีเอเตอร์ REALITY","ทำความรู้จักสมาชิกชุมชนครีเอเตอร์ REALITY Poppoo พร้อมตารางไลฟ์และประกาศล่าสุด"]
};
const locales={ja:"ja_JP",en:"en_US",ko:"ko_KR","zh-Hant":"zh_TW","zh-Hans":"zh_CN",id:"id_ID",th:"th_TH"};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const urls={ja:base,...Object.fromEntries(Object.keys(descriptions).map(lang=>[lang,base+"lang-"+lang+".html"]))};
const alternates=Object.entries({...urls,"x-default":base}).map(([lang,url])=>'<link rel="alternate" hreflang="'+lang+'" href="'+url+'">').join("\n");
const clearAlternates=html=>html.replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">\s*/g,"");
const withAlternates=html=>clearAlternates(html).replace("</head>",alternates+"\n</head>");
const settingsRow=settings.find(x=>x?.published===true);
for(const [lang,defaults] of Object.entries(descriptions)){
 const dict=dictionaries[lang],entry=settingsRow?.translations?.[lang]||{};
 const title=typeof entry.seoTitle==="string"&&entry.seoTitle.trim()?entry.seoTitle.trim():defaults[0];
 const desc=typeof entry.seoDescription==="string"&&entry.seoDescription.trim()?entry.seoDescription.trim():defaults[1];
 const translate=v=>{const trimmed=v.trim();return Object.hasOwn(dict,trimmed)?v.replace(trimmed,()=>esc(dict[trimmed])):v};
 let html=clearAlternates(home).replace('<html lang="ja">','<html lang="'+lang+'">');
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+esc(title)+'</title>');
 const values={"description":desc,"og:title":title,"og:description":desc,"og:locale":locales[lang],"og:url":urls[lang],"twitter:title":title,"twitter:description":desc};
 for(const [key,value] of Object.entries(values)){
  const pattern=new RegExp('<meta (?:name|property)="'+key+'" content="[^"]*">');
  html=html.replace(pattern,()=>'<meta '+(key.startsWith("og:")?"property":"name")+'="'+key+'" content="'+esc(value)+'">');
 }
 html=html.replace(/<link rel="canonical" href="[^"]+">/,'<link rel="canonical" href="'+urls[lang]+'">');
 html=html.replace(/<script type="application\/ld\+json" id="pop-home-schema">[\s\S]*?<\/script>/,()=>'<script type="application/ld+json" id="pop-home-schema">'+JSON.stringify({"@context":"https://schema.org","@type":"WebSite",name:"Poppoo",url:urls[lang],inLanguage:lang}).replace(/</g,"\\u003c")+'</script>');
 html=html.replace(/<body>[\s\S]*<\/body>/,body=>body.replace(/<[^>]+>|[^<]+/g,part=>part.startsWith("<")?part.replace(/\b(alt|aria-label|title|placeholder)="([^"]*)"/g,(_,attr,value)=>attr+'="'+translate(value)+'"'):translate(part)));
 write("lang-"+lang+".html",withAlternates(html));
}
write("index.html",withAlternates(home));
write("sitemap.xml",sitemap.replace("</urlset>",Object.keys(descriptions).map(lang=>"  <url><loc>"+urls[lang]+"</loc></url>\n").join("")+"</urlset>"));
console.log("Generated six localized homepages with reciprocal hreflang.");
