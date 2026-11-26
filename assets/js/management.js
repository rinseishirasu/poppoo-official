(async()=>{
"use strict";
const target=document.getElementById("management-team-list");if(!target)return;
const [talents,settings]=await Promise.all([loadData("data/talents.json"),loadData("data/settings.json")]);
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
const empty=message=>target.replaceChildren(make("p","empty-state",message));
if(datasetFailed("data/talents.json")||datasetFailed("data/settings.json")){empty("運営メンバー情報を取得できませんでした。");return}
const members=managementMembers(talents,settings);
if(!members.length){empty("現在、掲載中の運営メンバーはいません。");return}
for(const t of members){
 const card=make("a","management-member");card.href="talent.html?id="+encodeURIComponent(t.id);
 const visual=make("div","management-visual"),fallback=()=>visual.replaceChildren(make("span","management-placeholder",t.name.trim().slice(0,1)));
 const path=typeof t.iconImage==="string"&&/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(t.iconImage)&&!t.iconImage.split("/").includes("..")?t.iconImage:"";
 if(path){const img=make("img");img.src=path;img.alt="";img.loading="lazy";img.addEventListener("error",fallback,{once:true});visual.append(img)}else fallback();
 visual.setAttribute("aria-hidden","true");
 const info=make("div","management-info"),roles=make("div","management-roles");
 const values=(Array.isArray(t.roles)?t.roles:[t.roles]).filter(v=>typeof v==="string"&&v.trim());
 for(const value of [...new Set(values)])roles.append(make("span","management-role",value));
 if(values.length)info.append(roles);
 info.append(make("h3","",t.name),make("span","management-more","プロフィールを見る →"));card.append(visual,info);target.append(card);
}
target.querySelector(".empty-state")?.remove();
})().catch(()=>{const el=document.getElementById("management-team-list");if(el)el.textContent="運営メンバー情報の取得に失敗しました。"});
