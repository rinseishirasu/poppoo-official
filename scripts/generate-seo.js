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
