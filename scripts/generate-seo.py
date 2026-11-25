import json, re
from pathlib import Path
from html import escape
from urllib.parse import urlencode
from xml.sax.saxutils import escape as xml_escape

BASE = "https://rinseishirasu.github.io/poppoo-official/"
settings = next((x for x in json.loads(Path("data/settings.json").read_text()) if x.get("published") is True), {})
p = Path("index.html")
html = p.read_text()
title = str(settings.get("seoTitle") or "架空事務所 ぽっぽー | 公式サイト")
description = str(settings.get("seoDescription") or "架空事務所 ぽっぽーは、一人ひとりの個性と活動ペースを大切にするVライバーコミュニティです。")
image = str(settings.get("seoImage") or "assets/image/poppoo-icon.png")
if not re.fullmatch(r"assets/(?:image|images)/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp|gif)", image, re.I) or ".." in image.split("/") or not Path(image).is_file():
    image = "assets/image/poppoo-icon.png"
html = re.sub(r"<title>.*?</title>", lambda _: "<title>"+escape(title)+"</title>", html, count=1, flags=re.S)
for attr, key, value in [
    ("name","description",description), ("property","og:title",title),
    ("property","og:description",description), ("property","og:image",BASE+image),
    ("property","og:url",BASE), ("property","og:site_name","架空事務所 ぽっぽー"),
    ("property","og:locale","ja_JP"), ("name","twitter:title",title),
    ("name","twitter:description",description), ("name","twitter:image",BASE+image),
    ("name","twitter:card","summary_large_image" if image != "assets/image/poppoo-icon.png" else "summary")]:
    tag = f'<meta {attr}="{key}" content="{escape(value, quote=True)}">'
    pattern = r'<meta\s+'+attr+r'="'+re.escape(key)+r'"[^>]*>'
    html = re.sub(pattern, lambda _: tag, html, count=1) if re.search(pattern,html) else html.replace("</head>",tag+"\n</head>",1)
if 'rel="canonical"' not in html:
    html = html.replace("</head>",f'<link rel="canonical" href="{BASE}">\n</head>',1)
p.write_text(html)
urls = [BASE]+[BASE+x for x in ["about.html","talents.html","schedule.html","news.html","audition.html","contact.html","policy.html"]]
for file,page in [("talents","talent.html"),("news","news-detail.html")]:
    for item in json.loads(Path("data/"+file+".json").read_text()):
        if item.get("published") is True and item.get("id"):
            urls.append(BASE+page+"?"+urlencode({"id":item["id"]}))
Path("sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join("<url><loc>"+xml_escape(u)+"</loc></url>\n" for u in dict.fromkeys(urls))+"</urlset>\n")
Path("robots.txt").write_text("User-agent: *\nDisallow: /poppoo-official/admin.html\nSitemap: "+BASE+"sitemap.xml\n")
