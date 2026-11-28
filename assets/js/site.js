// Public UI language foundation (M1). Content and CMS data remain in Japanese.
const PUBLIC_LANGUAGES={ja:"日本語",en:"English"};
const PUBLIC_UI={
 ja:{members:"メンバー",schedule:"配信予定",news:"お知らせ",about:"ぽっぽーについて",join:"参加案内",home:"ぽっぽー トップページ",search:"検索",siteSearch:"サイト内検索",menuOpen:"メニューを開く",menuClose:"メニューを閉じる",navigation:"メインナビゲーション",language:"表示言語",skip:"本文へ移動",contents:"コンテンツ",guide:"ご案内",community:"コミュニティについて",memberList:"参加メンバー",anniversary:"記念日カレンダー",activity:"メンバーの活動実績",contact:"お問い合わせ",policy:"プライバシー・サイトポリシー",memberLogin:"メンバーログイン",footerLogin:"メンバー専用ログイン",backTop:"ページ上部へ",footerLine1:"「好き」を配信に。「個性」を輝きに。",footerLine2:"一人ひとりの個性と、自分らしい配信活動を応援します。"},
 en:{members:"Members",schedule:"Schedule",news:"News",about:"About",join:"Join us",home:"Poppoo home",search:"Search",siteSearch:"Site search",menuOpen:"Open menu",menuClose:"Close menu",navigation:"Main navigation",language:"Display language",skip:"Skip to content",contents:"Explore",guide:"Information",community:"About our community",memberList:"Our members",anniversary:"Anniversaries",activity:"Member achievements",contact:"Contact",policy:"Privacy & site policy",memberLogin:"Member login",footerLogin:"Member login (Japanese)",backTop:"Back to top",footerLine1:"Turn your passion into streams. Let your individuality shine.",footerLine2:"We support every member’s individuality and creative journey."}
};
const PUBLIC_LANGUAGE_KEY="poppoo-public-language-v1";
function supportedPublicLanguage(value){return typeof value==="string"&&Object.prototype.hasOwnProperty.call(PUBLIC_LANGUAGES,value)}
function resolvePublicLanguage(requested,saved,enabled=true){return !enabled?"ja":supportedPublicLanguage(requested)?requested:supportedPublicLanguage(saved)?saved:"ja"}
function publicUiText(key,lang){return PUBLIC_UI[lang]?.[key]??PUBLIC_UI.ja[key]??key}
function readPublicLanguage(url,storage,enabled){if(!enabled)return "ja";let saved=null;try{saved=storage?.getItem(PUBLIC_LANGUAGE_KEY)}catch{}const lang=resolvePublicLanguage(url.searchParams.get("lang"),saved,true);if(supportedPublicLanguage(url.searchParams.get("lang")))try{storage?.setItem(PUBLIC_LANGUAGE_KEY,lang)}catch{}return lang}
function publicLanguageUrl(url,lang){const result=new URL(url.href);if(supportedPublicLanguage(lang))result.searchParams.set("lang",lang);return result}
const navItems = [
 ["members","talents.html"],["schedule","schedule.html"],["news","news.html"],["about","about.html"],["join","audition.html"]
];
// Dedicated member login; keep separate from public membership applications and CMS.
const MEMBER_PORTAL_URL="https://poppoo-member-portal.rinsei-shirasu.workers.dev/";
const memberPortalLink=(placement)=>placement==="nav"
 ?'<a class="pop-member-portal-link" href="'+MEMBER_PORTAL_URL+'" referrerpolicy="no-referrer"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>'+ui("memberLogin")+'</span></a>'
 :'<a class="pop-footer-member-portal" href="'+MEMBER_PORTAL_URL+'" referrerpolicy="no-referrer">'+ui("footerLogin")+'</a>';
const pageFile=location.pathname.split("/").pop()||"index.html";
const shareRoute=pageFile.match(/^share-(member|news)-([A-Za-z0-9_-]+)\.html$/);
const current=shareRoute?(shareRoute[1]==="member"?"talent.html":"news-detail.html"):pageFile;
const publicDetailId=()=>shareRoute?shareRoute[2]:new URLSearchParams(location.search).get("id");
const publicLanguageEnabled=current!=="admin.html"&&window.parent===window&&!new URLSearchParams(location.search).has("cmsPreview");
let publicLanguageStorage=null;try{if(publicLanguageEnabled)publicLanguageStorage=window.localStorage}catch{}
const publicLanguage=readPublicLanguage(new URL(location.href),publicLanguageStorage,publicLanguageEnabled);
const ui=key=>publicUiText(key,publicLanguage);
// M2: translate authored interface text only, before CMS content is loaded.
const PUBLIC_EN_TEXT={
 "REALITY配信者コミュニティ": "REALITY Creator Community",
 "「好き」を配信に。": "Turn your passion into streams.",
 "「個性」を輝きに。": "Let your individuality shine.",
 "ぽっぽーは、配信を楽しむ仲間が集い、それぞれの個性と活動を応援し合うコミュニティです。": "Poppoo brings together creators who enjoy streaming and support one another.",
 "メンバーを見る": "Meet our members",
 "配信予定を見る": "View schedule",
 "お気に入り": "Favorites",
 "ぽっぽーの仲間たち": "Meet the Poppoo community",
 "メンバー": "Members",
 "全員を見る →": "View all members →",
 "読み込み中...": "Loading...",
 "お知らせ": "News",
 "すべて見る →": "View all →",
 "配信予定": "Schedule",
 "一覧を見る →": "View list →",
 "ぽっぽーについて": "About Poppoo",
 "一人ひとりの個性と活動ペースを尊重し、情報交換や交流を通じて互いの活動を応援します。": "We respect each member's individuality and pace, supporting one another through conversation and information sharing.",
 "私たちについて": "About us",
 "参加案内": "Join us",
 "REALITYで活動する方へ。参加条件・費用・応募窓口をご案内します。": "For REALITY creators: learn about eligibility, costs and how to apply.",
 "参加案内を見る": "How to join",
 "ぽっぽー公式アイコン": "Poppoo official icon",
 "参加メンバー一覧": "Member directory",
 "ホーム": "Home",
 "REALITYを中心に活動する配信者コミュニティです。": "A community of creators active primarily on REALITY.",
 "架空事務所 ぽっぽーは、REALITYで活動するVライバーが交流し、互いの活動を応援するコミュニティです。": "Poppoo is a community where virtual streamers on REALITY connect and support one another.",
 "「架空事務所」はコミュニティの名称です。芸能事務所として専属マネジメントを行う組織ではなく、活動の主体は一人ひとりのメンバーです。": "“Fictional agency” is part of our community name. We are not a talent agency providing exclusive management; each member directs their own activities.",
 "名前の由来": "Our name",
 "「ぽっぽー」は汽車の汽笛をイメージした名前です。自分らしい活動へ踏み出すきっかけとなり、その歩みを応援し合える場所でありたいという想いを込めています。": "The name Poppoo evokes a steam train's whistle. We hope to be a place where creators take their first steps in their own way and support one another along the journey.",
 "活動方針": "Community principles",
 "一人ひとりの個性と活動ペースを尊重し、互いに情報交換や交流ができる関係づくりを大切にします。": "We respect each person's individuality and pace, and value relationships that encourage conversation and information sharing.",
 "自分らしく活動する": "Create in your own way",
 "学業や仕事、生活とのバランスを大切にし、活動の内容やペースは本人が決めます。": "Members decide what they create and how often, while balancing study, work and everyday life.",
 "仲間と交流する": "Connect with other creators",
 "参加メンバー全員が交流の場に参加し、情報交換や自主的なコラボを通じて互いの活動を応援します。": "All members participate in a shared space for communication and support one another through information sharing and voluntary collaborations.",
 "参加・活動の自由": "Freedom to participate and create",
 "コミュニティ主催のイベントは行わず、メンバーの自主的な活動を尊重します。活動の休止・退会は随時申請できます。": "The community does not organize its own events and respects members' independent activities. Members may request a break or withdrawal at any time.",
 "参加費用・配信収益について →": "Costs and streaming revenue →",
 "コミュニティ概要": "Community overview",
 "名称": "Name",
 "架空事務所 ぽっぽー": "Poppoo (架空事務所 ぽっぽー)",
 "運営者名": "Operator",
 "ぽっぽー運営": "Poppoo management",
 "代表者": "Representative",
 "盛り上げ会長": "Community engagement chair",
 "設立・活動開始": "Founded",
 "2026年11月25日": "November 25, 2026",
 "活動拠点": "Location",
 "日本国内・オンライン": "Japan / Online",
 "活動形態": "Community type",
 "REALITYを中心とした配信者コミュニティ": "Creator community focused on REALITY",
 "参加メンバーを見る →": "Meet our members →",
 "参加案内を見る →": "How to join →",
 "REALITYで活動する方の参加条件・費用・応募方法をご案内します。": "Information on eligibility, costs and how to apply for REALITY creators.",
 "ぽっぽーは、配信者同士の交流を目的としたコミュニティです。参加は芸能事務所への専属所属を意味するものではありません。": "Poppoo is a community for creators to connect. Joining does not mean exclusive affiliation with a talent agency.",
 "活動方針を確認する →": "Read our community principles →",
 "参加申込み": "Applications",
 "応募窓口を準備中です。": "Applications are being prepared.",
 "現在、このページから応募を送信することはできません。受付方法は決まり次第お知らせします。": "Applications cannot currently be submitted from this page. We will announce the application process once it is ready.",
 "参加条件": "Eligibility",
 "REALITYで配信活動を行いたい方": "People who wish to stream on REALITY",
 "REALITYの利用条件を満たし、別途審査を受けられる方（コミュニティ独自の応募年齢制限はありません）": "People who meet REALITY's terms of use and can undergo a separate review (the community has no additional application age limit).",
 "コミュニティの活動方針やルールを理解し、責任をもって活動できる方": "People who understand the community's principles and rules and can act responsibly.",
 "費用・配信収益": "Costs and streaming revenue",
 "参加費・月額費用": "Joining and monthly fees",
 "無料": "Free",
 "配信収益": "Streaming revenue",
 "原則、本人に帰属": "In principle, belongs to the individual creator",
 "他の事務所に所属している場合は、所属事務所との契約内容に従います。": "If you belong to another agency, the terms of your agreement with that agency apply.",
 "よくある質問": "Frequently asked questions",
 "他の事務所に所属していても参加できますか？": "Can I join if I belong to another agency?",
 "他の事務所に所属している方も参加できます。事前に所属事務所との契約やルールをご確認ください。": "Yes. Please check your agency's agreement and rules in advance.",
 "活動を休止・退会できますか？": "Can I take a break or leave?",
 "休止・退会は随時申請できます。": "You may request a break or withdrawal at any time.",
 "メンバー同士で交流やコラボはできますか？": "Can members connect and collaborate?",
 "メンバー全員が参加する交流の場があり、自主的なコラボも可能です。": "All members have a shared space for communication, and voluntary collaborations are possible.",
 "活動方針を見る": "Community principles",
 "お問い合わせについて →": "Contact information →",
 "お問い合わせ": "Contact",
 "ぽっぽー運営へのご連絡・ご相談についてご案内します。": "Information on contacting and consulting Poppoo management.",
 "受付窓口": "Contact channel",
 "お問い合わせ窓口を準備中です。": "Our contact channel is being prepared.",
 "現在、このページからお問い合わせを送信することはできません。受付方法は決まり次第お知らせします。": "Inquiries cannot currently be submitted from this page. We will announce the contact process once it is ready.",
 "お問い合わせ内容": "Types of inquiries",
 "コミュニティ・参加について": "Community and membership",
 "活動方針、運営、参加条件など。": "Community principles, management, eligibility and related topics.",
 "交流・コラボについて": "Connections and collaborations",
 "コミュニティに関する交流やコラボのご相談。個々のメンバーへの依頼は、本人の連絡先をご確認ください。": "Inquiries about community connections or collaborations. For requests to individual members, please use their own contact channels.",
 "公式サイトについて": "Official website",
 "掲載情報、権利に関するご連絡、表示やリンクの不具合など。": "Published information, rights-related inquiries, display or link problems and similar matters.",
 "ご連絡の際のお願い": "When contacting us",
 "受付窓口が公開された後は、ご相談の内容を具体的にお知らせください。サイトの不具合については、対象ページのURLや発生状況をお伝えいただけると確認しやすくなります。": "Once the contact channel is available, describe your inquiry in detail. For website issues, include the affected URL and circumstances to help us investigate.",
 "個人情報や非公開情報は、SNSの公開投稿など第三者が閲覧できる場所へ送らないでください。": "Do not send personal or non-public information through publicly visible channels such as public social media posts.",
 "個人の配信や活動に関するご質問は、各メンバーのプロフィールや本人のSNS・配信先をご確認ください。": "For questions about individual streams or activities, please check each member's profile, social media or streaming channels.",
 "メンバー一覧 →": "Member directory →",
 "プライバシー・サイトポリシー →": "Privacy & site policy →",
 "プライバシー・サイトポリシー": "Privacy & site policy",
 "本サイトでの情報の取り扱いと利用上の基本事項をご案内します。": "How this site handles information and the basic terms of its use.",
 "目次": "Contents",
 "基本方針": "Basic principles",
 "個人情報の取り扱い": "Personal information",
 "掲載情報": "Published information",
 "アクセス情報": "Access information",
 "外部サービス・リンク": "External services and links",
 "著作権・掲載素材": "Copyright and published materials",
 "禁止事項": "Prohibited activities",
 "免責事項": "Disclaimer",
 "改定について": "Revisions",
 "架空事務所 ぽっぽーの運営者（以下「ぽっぽー運営」）は、公式サイト（以下「本サイト」）の運営にあたり、利用者および掲載対象者のプライバシーと権利に配慮します。本ポリシーは、本サイトにおける情報の取り扱いと利用上の基本事項を定めるものです。": "The operators of Poppoo (“Poppoo management”) respect the privacy and rights of visitors and persons featured on this official website (“the Site”). This policy sets out how information is handled and the basic terms of use.",
 "一般閲覧者向けの公開ページには、お問い合わせ・応募情報を直接送信するフォームを設置していません。外部受付窓口を案内する場合は、リンク先で情報の取り扱いをご確認ください。": "Public pages do not contain forms for directly submitting inquiries or applications. If an external contact channel is provided, please check its information handling practices.",
 "今後、ぽっぽー運営が応募・お問い合わせ等により個人情報を取得する場合は、受付時に取得する情報、利用目的、管理方法および問い合わせ方法を案内し、必要に応じて本ポリシーを更新します。": "If Poppoo management collects personal information through applications or inquiries in the future, it will explain the information collected, its purpose, management practices and contact methods at the time of collection, and update this policy as needed.",
 "公開プロフィール・掲載情報": "Public profiles and published information",
 "メンバーの活動名、プロフィール、配信予定、活動実績等は、活動の紹介を目的に掲載します。外部コラボ相手の情報は、掲載許諾を確認したうえで掲載する運用とします。": "Members' creator names, profiles, schedules and achievements are published to introduce their activities. Information about external collaborators is published after permission is confirmed.",
 "本サイトは公開リポジトリを利用しているため、登録された公開用データはページ上で非表示にしても閲覧される可能性があります。非表示設定は機密情報の保護を目的とするものではありません。": "The Site uses a public repository. Data intended for publication may remain accessible even if hidden on a page. Visibility settings are not intended to protect confidential information.",
 "掲載内容の訂正・削除に関するご相談は、": "For requests to correct or remove published information, please check the availability of our",
 "お問い合わせページ": "contact page",
 "で受付状況をご確認ください。": ".",
 "アクセス情報について": "Access information",
 "本サイトの公開・運用に利用するホスティングサービス等において、アクセス日時、接続元情報、ブラウザ情報などがサービス提供者により記録される場合があります。": "Service providers used to host and operate the Site may record access times, connection information and browser information.",
 "これらの情報の取得・利用・保存については、各サービス提供者の規約およびプライバシーポリシーをご確認ください。ぽっぽー運営が独自にアクセス解析ツール等を導入する場合は、その内容に応じて本ページで案内します。": "Please review each provider's terms and privacy policy for details of collection, use and storage. If Poppoo management introduces its own analytics tools, information will be provided here as appropriate.",
 "お気に入り機能は、登録したメンバーのIDを利用者のブラウザー内のローカルストレージに保存します。この機能自体はお気に入りの登録内容を運営側のサーバーへ送信しません。登録解除またはブラウザーのサイトデータ削除により消去できます。端末間の同期は行いません。": "Favorites stores selected member IDs in your browser's local storage. The feature itself does not send selections to management servers. You can remove selections or clear your browser's site data. Favorites do not sync across devices.",
 "外部サービス・リンクについて": "External services and links",
 "本サイトでは、配信プラットフォームやSNSなど、外部サービスへのリンクを掲載する場合があります。リンク先での情報の取り扱い、提供内容および利用条件については、各サービスの運営者が定める規約・プライバシーポリシーをご確認ください。": "The Site may link to external services such as streaming platforms and social media. Please consult each service operator's terms and privacy policy for information handling, content and conditions of use.",
 "外部サービスの利用は、利用者ご自身の判断と責任でお願いいたします。": "Use external services at your own discretion and responsibility.",
 "著作権・掲載素材について": "Copyright and published materials",
 "本サイトに掲載する文章、画像、ロゴ、音声、その他の素材に関する権利は、ぽっぽー運営または正当な権利を有する権利者に帰属します。法令上認められる場合を除き、権利者の許可なく転載、複製、改変、再配布等を行うことを禁止します。": "Rights to text, images, logos, audio and other materials on the Site belong to Poppoo management or their legitimate rights holders. Except as permitted by law, reproduction, copying, modification and redistribution without the rights holder's permission are prohibited.",
 "権利上の問題や掲載内容に関する連絡窓口については、": "For rights-related issues or published content, please see our",
 "をご確認ください。": ".",
 "本サイトの利用にあたり、次の行為を禁止します。": "The following activities are prohibited when using the Site:",
 "法令または公序良俗に反する行為": "Activities contrary to laws or public order and morals",
 "ぽっぽー運営または第三者の権利・利益を侵害する行為": "Infringement of the rights or interests of Poppoo management or third parties",
 "本サイトの運営やサーバーに過度な負荷を与える行為、または運営を妨げる行為": "Excessive load on the Site or its servers, or interference with its operation",
 "その他、ぽっぽー運営が不適切と判断する行為": "Other activities deemed inappropriate by Poppoo management",
 "ぽっぽー運営は、本サイトに掲載する情報について、正確性や最新性に配慮しますが、その完全性、正確性、有用性等を保証するものではありません。掲載内容は、必要に応じて予告なく変更または削除する場合があります。": "Poppoo management takes care to keep information accurate and current, but does not guarantee its completeness, accuracy or usefulness. Content may be changed or removed without notice as needed.",
 "本サイトまたは外部リンク先の利用に関連して利用者に生じた損害について、ぽっぽー運営は法令上認められる範囲で責任を負いません。": "To the extent permitted by law, Poppoo management is not liable for damages arising from use of the Site or external links.",
 "本ポリシーの改定": "Policy revisions",
 "本サイトの運営状況や関連する法令・サービス内容の変更等に応じて、本ポリシーを改定する場合があります。改定した内容は本ページに掲載します。": "This policy may be revised in response to changes in site operations, applicable laws or services. Revisions will be published on this page.",
 "制定日：2026年11月23日": "Established: November 23, 2026",
 "改定日：2026年11月27日": "Revised: November 27, 2026",
 "お問い合わせページへ": "Go to contact page",
 "ポリシー目次": "Policy contents",
 "それぞれの個性と活動をご紹介します。": "Discover each member's individuality and activities.",
 "気になるメンバーを登録すると、配信予定や記念日をまとめて確認できます。": "Save your favorite members to see their schedules and anniversaries in one place.",
 "♡ お気に入り一覧": "♡ My favorites",
 "キーワード検索": "Keyword search",
 "絞り込み・並べ替え": "Filters and sorting",
 "期生": "Generation",
 "すべての期生": "All generations",
 "役職": "Role",
 "すべての役職": "All roles",
 "活動状況": "Activity status",
 "すべての活動状況": "All statuses",
 "活動ジャンル": "Content genres",
 "すべてのジャンル": "All genres",
 "表示順": "Sort by",
 "登録順": "Registration order",
 "名前順": "Name",
 "期生順": "Generation",
 "加入日が新しい順": "Newest join date",
 "条件をクリア": "Clear filters",
 "カード": "Cards",
 "リスト": "List",
 "参加メンバー情報を読み込み中...": "Loading members...",
 "記念日カレンダー": "Anniversary calendar",
 "メンバーの活動実績": "Member achievements",
 "※本人の掲載許可を得た公開プロフィールのみ表示しています。": "Only public profiles authorized by their members are displayed.",
 "名前・趣味・活動ジャンルなど": "Name, hobbies, genres, etc.",
 "表示形式": "View mode",
 "適用中の絞り込み条件": "Active filters",
 "メンバー関連情報": "Member information",
 "プロフィールを読み込み中...": "Loading profile...",
 "コミュニティからのお知らせや参加メンバーの活動情報をお届けします。": "News from the community and updates on our members' activities.",
 "キーワード": "Keyword",
 "関連メンバー": "Related members",
 "すべてのお知らせ": "All news",
 "カテゴリー": "Category",
 "すべてのカテゴリー": "All categories",
 "掲載年": "Publication year",
 "すべての年": "All years",
 "新しい順": "Newest first",
 "古い順": "Oldest first",
 "お知らせを読み込み中...": "Loading news...",
 "さらに表示": "Show more",
 "お知らせを検索": "Search news",
 "記事を読み込み中...": "Loading article...",
 "参加メンバーの配信予定を一覧でご案内します。": "Browse upcoming streams from our members.",
 "今後すべて": "All upcoming",
 "本日": "Today",
 "今日": "Today",
 "明日": "Tomorrow",
 "7日間": "7 days",
 "メンバー・配信形式などで絞り込む": "Filter by member, format and more",
 "すべてのメンバー": "All members",
 "日付": "Date",
 "すべての日付": "All dates",
 "配信形式": "Stream format",
 "すべての形式": "All formats",
 "ソロ配信": "Solo",
 "コラボ配信": "Collaboration",
 "配信媒体": "Platform",
 "すべての媒体": "All platforms",
 "本日以降の予定を掲載しています。変更・休止や配信中かどうかは各配信先でご確認ください。": "Schedules from today onward are displayed. Check each streaming channel for changes, cancellations or live status.",
 "配信予定を読み込み中...": "Loading schedule...",
 "※時刻は日本時間（JST）を基準に掲載します。": "All times are Japan Standard Time (JST).",
 "表示期間": "Date range",
 "今後7日間の日付別配信予定": "Upcoming seven-day schedule",
 "配信タイトルなど": "Stream title, etc.",
 "配信予定一覧": "Stream schedule",
 "一人ひとりの大切な日を、みんなでお祝いしよう。": "Celebrate each member's special days together.",
 "すべて": "All",
 "記念日の種類": "Anniversary type",
 "誕生日": "Birthday",
 "デビュー周年": "Debut anniversary",
 "加入周年": "Joining anniversary",
 "その他の記念日": "Other anniversaries",
 "設立記念日": "Founding anniversary",
 "記念日を読み込み中...": "Loading anniversaries...",
 "以下の記念日一覧とカレンダーに適用します。": "Applies to the upcoming dates and calendar below.",
 "これからの記念日": "Upcoming anniversaries",
 "直近3日分の記念日を日付ごとに紹介します。": "The next three dates with anniversaries, grouped by date.",
 "月別カレンダー": "Monthly calendar",
 "今月": "This month",
 "デビュー": "Debut",
 "加入": "Joined",
 "その他": "Other",
 "設立": "Founded",
 "選択月の記念日": "Anniversaries this month",
 "日付は日本時間です。公開プロフィールとコミュニティ情報をもとに表示します。2月29日の記念日は、うるう年は2月29日、平年は3月1日に表示します。": "Dates are in Japan Standard Time and based on public profiles and community information. February 29 anniversaries are observed on February 29 in leap years and March 1 in other years.",
 "前月": "Previous month",
 "翌月": "Next month",
 "それぞれの「好き」から生まれた、活動の歩み。": "Milestones born from each creator's passions.",
 "メンバー個人の活動実績を紹介しています。": "Explore our members' individual achievements.",
 "年": "Year",
 "活動実績を読み込み中...": "Loading achievements...",
 "活動実績を表示するにはJavaScriptを有効にしてください。": "Enable JavaScript to view achievements.",
 "活動名・メンバー名など": "Activity or member name, etc.",
 "お気に入りメンバー": "Favorite members",
 "気になるメンバーの活動を、まとめてチェック。": "Keep up with your favorite creators in one place.",
 "お気に入りはこのブラウザー内に保存されます。ログイン不要・端末間の同期はありません。": "Favorites are saved in this browser. No login is required and selections do not sync across devices.",
 "今後の配信予定": "Upcoming streams",
 "全体の配信予定 →": "Full schedule →",
 "カレンダー →": "Calendar →",
 "関連するお知らせ": "Related news",
 "お知らせ一覧 →": "All news →",
 "お気に入り機能を使うにはJavaScriptを有効にしてください。": "Enable JavaScript to use favorites.",
 "サイト内検索": "Site search",
 "メンバーや活動情報、お知らせなどをまとめて探せます。": "Find members, activities, news and more in one place.",
 "検索": "Search",
 "複数のキーワードをスペースで区切って検索できます。": "Separate multiple keywords with spaces.",
 "ニュース": "News",
 "記念日": "Anniversaries",
 "活動実績": "Achievements",
 "基本情報": "Information",
 "検索データを読み込み中...": "Loading search data...",
 "サイト内検索にはJavaScriptが必要です。各ページの一覧から情報をご確認ください。": "Site search requires JavaScript. Browse individual pages to find information.",
 "メンバー名・配信タイトル・誕生日など": "Member name, stream title, birthday, etc.",
 "検索対象": "Search categories",
 "ページが見つかりません": "Page not found",
 "アクセスしようとしたページは、移動または削除されたか、URLが間違っている可能性があります。": "The requested page may have moved or been removed, or the URL may be incorrect.",
 "お手数ですが、URLをご確認いただくか、トップページから目的のページをお探しください。": "Please check the URL or use the homepage to find the page you need.",
 "トップページへ戻る": "Back to home",
 "参加メンバーを見る": "Meet our members",
 "/ ぽっぽーについて": "/ About Poppoo",
 "/ 参加案内": "/ Join us",
 "/ お問い合わせ": "/ Contact",
 "/ プライバシー・サイトポリシー": "/ Privacy & site policy",
 "/ メンバー": "/ Members",
 "/ お知らせ": "/ News",
 "/ 配信予定": "/ Schedule",
 "/ 記念日カレンダー": "/ Anniversary calendar",
 "/ メンバーの活動実績": "/ Member achievements",
 "/ お気に入り": "/ Favorites",
 "/ サイト内検索": "/ Site search"
};
const publicEnglish=publicLanguage==="en";
function publicText(value){return publicEnglish&&typeof value==="string"&&Object.prototype.hasOwnProperty.call(PUBLIC_EN_TEXT,value)?PUBLIC_EN_TEXT[value]:value}
function translateStaticPublic(root){
 if(!publicEnglish||!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){const value=node.nodeValue,trim=value.trim(),next=publicText(trim);if(trim&&next!==trim&&!node.parentElement.closest("script,style,textarea")){const el=node.parentElement;if(el.tagName==="OPTION"&&!el.hasAttribute("value"))el.value=el.value;node.nodeValue=value.replace(trim,()=>next);el.lang="en"}}
 for(const el of root.querySelectorAll("[aria-label],[placeholder],[title],[alt]"))for(const attr of ["aria-label","placeholder","title","alt"]){const value=el.getAttribute(attr);if(value&&publicText(value)!==value)el.setAttribute(attr,publicText(value))}
}
const publicLanguagePicker=()=>publicLanguageEnabled?`<label class="pop-language-control"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a16 16 0 0 1 0 18M12 3a16 16 0 0 0 0 18"/></svg><select id="pop-language-select" aria-label="${ui("language")}">${Object.entries(PUBLIC_LANGUAGES).map(([code,label])=>`<option value="${code}" lang="${code}" ${code===publicLanguage?"selected":""}>${label}</option>`).join("")}</select></label>`:"";
const navCurrent = ({ "talent.html":"talents.html", "news-detail.html":"news.html" })[current] || current;
const sharedStyle=document.createElement("link");sharedStyle.rel="stylesheet";sharedStyle.href="assets/css/shared-renewal.css";document.head.append(sharedStyle);
const mainContent=document.querySelector("main");
if(publicLanguageEnabled)translateStaticPublic(mainContent);
if(current!=="admin.html"){const theme=document.querySelector('meta[name="theme-color"]');if(theme)theme.content="#f6f6f6";}
if(mainContent){
 if(!mainContent.id)mainContent.id="main-content";
 mainContent.setAttribute("tabindex","-1");
 const skip=document.createElement("a");skip.className="pop-skip-link";skip.href="#"+mainContent.id;skip.textContent=ui("skip");skip.lang=publicLanguage;
 document.body.prepend(skip);
}
const header = document.querySelector("#site-header");
if (header) {
  header.innerHTML = `<div class="container header-inner pop-header"><a class="brand" href="index.html" aria-label="${ui("home")}"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name" lang="ja">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><a class="pop-search-link" href="search.html" aria-label="${ui("siteSearch")}" title="${ui("siteSearch")}" ${current==="search.html"?'aria-current="page"':""}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>${ui("search")}</span></a>${publicLanguagePicker()}<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-navigation" aria-label="${ui("menuOpen")}">☰</button><nav class="nav" id="main-navigation" aria-label="${ui("navigation")}">${navItems.map(([n,u])=>`<a href="${u}" ${navCurrent===u?'aria-current="page"':u==="talents.html"&&["anniversary.html","activity.html","favorites.html"].includes(current)?'aria-current="location"':""}>${ui(n)}</a>`).join("")}${memberPortalLink("nav")}</nav></div>`;
  header.lang=publicLanguage;
  const languageSelect=header.querySelector("#pop-language-select");
  languageSelect?.addEventListener("change",()=>{const lang=languageSelect.value;if(!supportedPublicLanguage(lang)||lang===publicLanguage)return;try{publicLanguageStorage?.setItem(PUBLIC_LANGUAGE_KEY,lang)}catch{}location.assign(publicLanguageUrl(new URL(location.href),lang).href)});
  const btn = header.querySelector(".menu-toggle"), nav = header.querySelector(".nav");
  const setMenu=(open)=>{nav.classList.toggle("open",open);btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰";btn.setAttribute("aria-label",ui(open?"menuClose":"menuOpen"));};
  btn.addEventListener("click",()=>setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click",e=>{if(e.target.closest("a"))setMenu(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("open")){setMenu(false);btn.focus()}});
  const desktop=matchMedia("(min-width:1281px)");
  desktop.addEventListener("change",()=>setMenu(false));
  const syncHeaderHeight=()=>document.documentElement.style.setProperty("--public-header-height",Math.ceil(header.getBoundingClientRect().height)+"px");
  syncHeaderHeight();if(typeof ResizeObserver==="function"){const observer=new ResizeObserver(syncHeaderHeight);observer.observe(header)}else window.addEventListener("resize",syncHeaderHeight,{passive:true});
  document.addEventListener("pointerdown",e=>{if(!header.contains(e.target)&&nav.classList.contains("open"))setMenu(false)});
  header.addEventListener("focusout",e=>{if(e.relatedTarget&&!header.contains(e.relatedTarget))setMenu(false)});
  const updateHeader=()=>header.classList.toggle("pop-header-scrolled",window.scrollY>12);
  window.addEventListener("scroll",updateHeader,{passive:true});updateHeader();
}
const footer = document.querySelector("#site-footer");
if (footer) footer.innerHTML = `<div class="container pop-footer"><div class="footer-grid"><div><a class="brand" href="index.html"><img class="brand-logo" src="assets/image/poppoo-icon.png" alt=""><span class="pop-brand-name" lang="ja">ぽっぽー<small>CREATOR COMMUNITY</small></span></a><p>${ui("footerLine1")}<br>${ui("footerLine2")}</p></div><div><strong>${ui("contents")}</strong><div class="footer-links"><a href="about.html">${ui("community")}</a><a href="talents.html">${ui("memberList")}</a><a href="schedule.html">${ui("schedule")}</a><a href="anniversary.html">${ui("anniversary")}</a><a href="activity.html">${ui("activity")}</a><a href="news.html">${ui("news")}</a></div></div><div><strong>${ui("guide")}</strong><div class="footer-links"><a href="audition.html">${ui("join")}</a><a href="contact.html">${ui("contact")}</a><a href="search.html">${ui("siteSearch")}</a><a href="policy.html">${ui("policy")}</a>${memberPortalLink("footer")}</div></div></div><div class="pop-footer-bottom"><button type="button" class="pop-back-top">${ui("backTop")} <span aria-hidden="true">↑</span></button><div class="copyright">© ${new Date().getFullYear()} 架空事務所 ぽっぽー. All rights reserved.</div></div></div>`;

if(footer){footer.lang=publicLanguage;footer.querySelector(".pop-back-top")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}));footer.querySelectorAll(".footer-links a").forEach(a=>{if(a.getAttribute("href")===navCurrent)a.setAttribute("aria-current","page")})}

// Keep mixed-language content honest until the page translations are complete.
if(publicLanguageEnabled&&publicLanguage==="en"&&mainContent){const note=document.createElement("p");note.className="pop-language-notice";note.lang="en";note.textContent="English interface. Member-provided information and articles may remain in Japanese.";mainContent.prepend(note)}
// When storage is unavailable, keep explicit language selection on ordinary internal navigation.
if(publicLanguageEnabled){document.addEventListener("click",e=>{if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const a=e.target.closest?.("a[href]");if(!a||a.target&&a.target!=="_self"||a.hasAttribute("download"))return;const href=a.getAttribute("href");if(!href||href.startsWith("#"))return;try{const url=new URL(href,location.href),here=new URL(location.href);if(url.origin!==here.origin||url.pathname.slice(0,url.pathname.lastIndexOf("/")+1)!==here.pathname.slice(0,here.pathname.lastIndexOf("/")+1)||!url.pathname.endsWith(".html")||url.pathname.endsWith("/admin.html")||url.searchParams.has("cmsPreview")||url.searchParams.has("lang"))return;let saved=null;try{saved=publicLanguageStorage?.getItem(PUBLIC_LANGUAGE_KEY)}catch{}if(saved!==publicLanguage){e.preventDefault();location.assign(publicLanguageUrl(url,publicLanguage).href)}}catch{}})}
const previewData=(()=>{try{if(window.parent===window||!new URLSearchParams(location.search).has("cmsPreview"))return null;const frame=window.frameElement;if(!frame||frame.id!=="cms-preview-frame"||!window.parent.location.pathname.endsWith("/admin.html"))return null;const snapshot=JSON.parse(sessionStorage.getItem("poppoo-cms-preview")||"null");return snapshot&&typeof snapshot==="object"?snapshot:null}catch{return null}})();
if(previewData){const note=document.createElement("div");note.textContent="公開前プレビュー（ブラウザー内の編集データ）";note.style.cssText="padding:10px;background:#282828;color:white;text-align:center;font-size:13px";document.body.prepend(note);document.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&!a.getAttribute("href")?.startsWith("#"))e.preventDefault()},true)}
// Static Open Graph detail pages. The CMS uses the same generator at publication.
const SHARE_BASE="https://rinseishirasu.github.io/poppoo-official/";
// A summary is optional: derive excerpts for listings/SEO, not extra text for the article.
function newsCategory(value){
 const s=typeof value==="string"?value.trim():"";
 return !s||/^(information|news|お知らせ)$/i.test(s)?"お知らせ":s;
}
function newsExcerpt(item,max=100){
 const text=String(item?.summary||"").trim()||String(item?.body||"").trim();
 const compact=text.replace(/\s+/g," ").trim(),chars=Array.from(compact);
 return chars.length>max?chars.slice(0,max-1).join("")+"…":compact;
}
function newsLead(item){
 const summary=String(item?.summary||"").trim(),body=String(item?.body||"").trim();
 const normalize=s=>s.replace(/\s+/g,"").trim();
 return summary&&!normalize(body).startsWith(normalize(summary))?summary:"";
}

// Participation is independent of editing ownership. Legacy schedules remain readable.
function scheduleParticipantIds(s,members=[]){
 const ids=Array.isArray(s?.memberIds)?s.memberIds:s?.memberId?[s.memberId]:[];
 const valid=[...new Set(ids.filter(id=>typeof id==="string"&&/^[A-Za-z0-9_-]+$/.test(id)))];
 if(valid.length||Array.isArray(s?.memberIds)||s?.memberId)return valid;
 const matches=members.filter(t=>t?.id&&t.name===s?.talent);return matches.length===1?[matches[0].id]:[];
}
function scheduleGuestUrl(value){if(typeof value!=="string"||!/^https?:\/\/[^/\s\\]/i.test(value)||/[\s\\]/.test(value))return "";try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:""}catch{return ""}}
function scheduleGuests(s){return (Array.isArray(s?.guests)?s.guests:[]).filter(g=>g&&typeof g.name==="string"&&g.name.trim()).map(g=>({name:g.name.trim(),url:scheduleGuestUrl(g.url)}))}
function scheduleFormat(s){return s?.format==="collab"||scheduleParticipantIds(s).length+scheduleGuests(s).length>1?"collab":"solo"}
function scheduleParticipants(s,members=[],publicOnly=true){
 const ids=scheduleParticipantIds(s,members),people=ids.map(id=>members.find(t=>t?.id===id)).filter(t=>t&&(!publicOnly||t.published===true)).map(t=>({id:t.id,name:t.name||t.id,url:""}));
 if(!ids.length&&!s?.memberId&&!Array.isArray(s?.memberIds)&&typeof s?.talent==="string"&&s.talent.trim()&&!members.some(t=>t?.name===s.talent))people.push({id:"",name:s.talent.trim(),url:""});
 return [...people,...scheduleGuests(s).map(g=>({...g,id:"",guest:true}))];
}
function scheduleIsPublic(s,members=[]){return s?.published===true&&scheduleParticipants(s,members).some(p=>!p.guest)}
function scheduleParticipantError(s,members){
 if(s.memberIds===undefined&&s.guests===undefined&&s.format===undefined)return "";
 if(!Array.isArray(s.memberIds)||!s.memberIds.length||s.memberIds.some(id=>typeof id!=="string"||!/^[A-Za-z0-9_-]+$/.test(id))||new Set(s.memberIds).size!==s.memberIds.length||s.memberId!==s.memberIds[0])return "参加メンバーを1名以上選択してください。";
 if(members&&s.memberIds.some(id=>!members.some(t=>t?.id===id)))return "登録済みの参加メンバーを選択してください。";
 if(!Array.isArray(s.guests)||s.guests.some(g=>!g||typeof g.name!=="string"||!g.name.trim()||typeof g.url!=="string"||g.url&&!scheduleGuestUrl(g.url)))return "外部コラボ相手の活動名・公式リンクを確認してください。";
 const total=s.memberIds.length+s.guests.length;
 if(!["solo","collab"].includes(s.format)||s.format==="solo"&&total!==1||s.format==="collab"&&total<2)return "ソロ配信は1名、コラボ配信は合計2名以上を登録してください。";
 if(s.scheduleSource==="member"&&s.format==="collab")return "コラボ配信は運営管理で登録してください。";
 return "";
}

// Read old profiles without rewriting their saved data or exposing hidden legacy fields.
const VOICE_SLOTS=[["voiceIntro","自己紹介ボイス","voiceIntroText"],["voiceGreeting","挨拶ボイス","voiceGreetingText"]];
function validVoicePath(id,path){return typeof id==="string"&&/^[A-Za-z0-9_-]+$/.test(id)&&typeof path==="string"&&path.startsWith("assets/audio/talents/"+id+"/")&&/^[A-Za-z0-9_-]+\.(mp3|m4a|wav)$/.test(path.slice(("assets/audio/talents/"+id+"/").length))}
function memberVoiceError(t){
 for(const [key,label,transcript] of VOICE_SLOTS){if(t[key]!==undefined&&t[key]!==""&&!validVoicePath(t.id,t[key]))return label+"の保存先が正しくありません。";if(t[transcript]!==undefined&&(typeof t[transcript]!=="string"||t[transcript].length>2000))return label+"の文字起こしは2000文字以内で入力してください。";}return "";
}
function publicMemberVoices(t){if(!t||t.published!==true||t.hiddenSections?.includes?.("voice"))return [];return VOICE_SLOTS.filter(([key])=>validVoicePath(t.id,t[key])).map(([key,label,transcript])=>({label,path:t[key],text:typeof t[transcript]==="string"?t[transcript].trim():""}))}
function normalizedMemberProfile(t){
 if(!t||typeof t!=="object")return t;
 const hidden=new Set(Array.isArray(t.hiddenSections)?t.hiddenSections:[]);
 const value=v=>typeof v==="string"?v.trim():"";
 const combine=items=>{const seen=new Set();return items.filter(([v])=>{const s=value(v);if(!s||seen.has(s))return false;seen.add(s);return true}).map(([v,label])=>label?label+"："+value(v):value(v)).join("\n\n")};
 const images=(Array.isArray(t.avatarImages)?t.avatarImages:[t.avatarImages]).filter(v=>typeof v==="string"&&v.trim());
 const avatarImages=[...new Set(images.length||t.profileFormat===2?images:[value(t.avatarImage)].filter(Boolean))];
 if(t.profileFormat===2)return {...t,avatarImages};
 const bio=combine([[t.bio,""],[t.greeting,"配信の挨拶"],[hidden.has("message")?"":t.message,""],[hidden.has("activity")?"":t.activityGoal,"活動目標"],[hidden.has("personality")?"":t.skills,"特技"],[hidden.has("credit")?"":t.illustrator,"キャラクターデザイン"],[hidden.has("credit")?"":t.modeler,"Live2Dモデラー"]]);
 const likes=combine([[t.likes,""],[t.hobbies,"趣味"],[t.favoriteFood,"好きな食べ物"],[t.favoriteWorks,"好きな作品"]]);
 return {...t,bio,likes,avatarImages};
}

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
function homepageSeo(html,settings){
 const s=(Array.isArray(settings)?settings:[]).find(x=>x?.published===true)||{};
 const text=(v,defaultValue,max)=>typeof v==="string"&&v.trim()?v.trim().replace(/\s+/g," ").slice(0,max):defaultValue;
 const title=text(s.seoTitle,"架空事務所 ぽっぽー | REALITY配信者コミュニティ公式サイト",100),desc=text(s.seoDescription,"架空事務所 ぽっぽーは、REALITYを中心に活動する配信者コミュニティです。参加メンバー、配信予定、活動実績、記念日、お知らせを掲載しています。",180);
 const image=typeof s.seoImage==="string"&&/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(s.seoImage)&&!s.seoImage.split("/").includes("..")?SHARE_BASE+s.seoImage:SHARE_BASE+"assets/image/poppoo-icon.png";
 const e=v=>String(v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 let out=html.replace(/<title>[\s\S]*?<\/title>/i,()=>"<title>"+e(title)+"</title>");
 for(const [key,value] of [["description",desc],["og:title",title],["og:description",desc],["og:image",image],["twitter:title",title],["twitter:description",desc],["twitter:image",image],["twitter:card",image===SHARE_BASE+"assets/image/poppoo-icon.png"?"summary":"summary_large_image"]]){
 const re=new RegExp('<meta\\s+(?:name|property)="'+key+'"\\s+content="[^"]*"\\s*/?>',"i");
 if(!re.test(out))throw Error("TOPのSEOタグが見つかりません: "+key);
 out=out.replace(re,()=>'<meta '+(key.startsWith("og:")?"property":"name")+'="'+key+'" content="'+e(value)+'">');
 }
 const schema='<script type="application/ld+json" id="pop-home-schema">'+jsonLd({"@context":"https://schema.org","@graph":[organizationSchema(),{"@type":"WebSite","@id":SHARE_BASE+"#website",name:"架空事務所 ぽっぽー",url:SHARE_BASE,publisher:{"@id":SHARE_BASE+"#community"},inLanguage:"ja"}]})+'</script>';
 return /<script type="application\/ld\+json" id="pop-home-schema">[\s\S]*?<\/script>/.test(out)?out.replace(/<script type="application\/ld\+json" id="pop-home-schema">[\s\S]*?<\/script>/,()=>schema):out.replace("</head>",()=>schema+"\n</head>");
}
function setDetailCanonical(kind,id){
 const path=shareDetailPath(kind,id);if(!path||previewData)return;
 let tag=document.querySelector('link[rel="canonical"]');if(!tag){tag=document.createElement("link");tag.rel="canonical";document.head.append(tag)}tag.href=SHARE_BASE+path;
}
function shareDetailPath(kind,id){
 if(!["talents","news"].includes(kind)||typeof id!=="string"||!/^[A-Za-z0-9_-]+$/.test(id))return "";
 return "share-"+(kind==="talents"?"member":"news")+"-"+id+".html";
}
function sharePageHtml(kind,item){
 const path=shareDetailPath(kind,item?.id);
 if(!path||item.published!==true)return null;
 const member=kind==="talents",name=String(member?item.name:item.title||"").trim();
 if(!name)return null;
 const title=name+" | 架空事務所 ぽっぽー",description=member?item.catchphrase:newsExcerpt(item,180),defaultDesc=member?"架空事務所 ぽっぽーの参加メンバー、"+name+"のプロフィールです。":"架空事務所 ぽっぽーからのお知らせです。",desc=(typeof description==="string"&&description.trim()?description:defaultDesc).replace(/\s+/g," ").trim().slice(0,180);
 const hidden=Array.isArray(item.hiddenSections)&&item.hiddenSections.includes("gallery");
 const avatars=member?normalizedMemberProfile(item).avatarImages:[];
 const candidates=member?[...(!hidden?avatars:[]),item.iconImage]:[item.thumbnailImage];
 const imagePath=candidates.find(x=>typeof x==="string"&&/^assets\/(?:image|images)\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif)$/i.test(x)&&!x.split("/").includes(".."))||"assets/image/poppoo-icon.png";
 const url=SHARE_BASE+path,image=SHARE_BASE+imagePath;
 const e=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const meta=(key,value,property=false)=>'<meta '+(property?"property":"name")+'="'+key+'" content="'+e(value)+'">';
 const heading=member?"MEMBERS":"NEWS",list=member?"talents.html":"news.html",detail=member?"talent-profile":"news-detail",klass=member?"pop-profile":"pop-info pop-news-detail";
 const person={"@type":"Person",name,identifier:item.id,url,...(imagePath!=="assets/image/poppoo-icon.png"?{image}:{}),...(item.catchphrase?{description:String(item.catchphrase)}:{})};
 const schema=member?{"@context":"https://schema.org","@type":"ProfilePage",url,mainEntity:person,inLanguage:"ja"}:{"@context":"https://schema.org","@type":"Article",headline:name,description:desc,url,mainEntityOfPage:url,publisher:organizationSchema(),...(imagePath!=="assets/image/poppoo-icon.png"?{image}:{}),...(typeof item.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&Number.isFinite(Date.parse(item.date))&&new Date(item.date).toISOString().slice(0,10)===item.date?{datePublished:item.date}:{}),inLanguage:"ja"};
 const structured='<script type="application/ld+json">'+jsonLd(schema)+'</script>';
 const tags=[meta("description",desc),meta("og:title",title,true),meta("og:description",desc,true),meta("og:type",member?"website":"article",true),meta("og:url",url,true),meta("og:image",image,true),meta("og:image:alt",imagePath==="assets/image/poppoo-icon.png"?"ぽっぽー公式アイコン":name+"の掲載画像",true),meta("og:site_name","架空事務所 ぽっぽー",true),meta("og:locale","ja_JP",true),meta("twitter:card",member||imagePath==="assets/image/poppoo-icon.png"?"summary":"summary_large_image"),meta("twitter:title",title),meta("twitter:description",desc),meta("twitter:image",image),meta("twitter:image:alt",imagePath==="assets/image/poppoo-icon.png"?"ぽっぽー公式アイコン":name+"の掲載画像")].join("\n");
 return {path,content:'<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f6f6"><title>'+e(title)+'</title>\n'+tags+'\n'+structured+'\n<link rel="canonical" href="'+e(url)+'"><link rel="icon" href="assets/image/poppoo-icon.png"><link rel="stylesheet" href="assets/css/style.css"><link rel="stylesheet" href="assets/css/renewal.css"></head><body><header id="site-header"></header><main class="'+klass+'"><section class="page-hero detail-breadcrumb"><div class="container"><div class="breadcrumbs"><a href="index.html">TOP</a> / <a href="'+list+'">'+heading+'</a></div></div></section><section class="content"><div class="container"><div id="'+detail+'"><article class="detail-article"><h1>'+e(name)+'</h1><p>'+e(desc)+'</p><p class="small">詳細情報を読み込み中...</p><noscript><p>詳しい情報を表示するにはJavaScriptを有効にしてください。</p></noscript></article></div></div></section></main><footer id="site-footer" class="site-footer"></footer><script src="assets/js/site.js"></script><script src="assets/js/pages.js"></script></body></html>\n'};
}
// Share public URLs only; no third-party widgets or tracking scripts.
function publicShareLinks(url,title){
 const q=encodeURIComponent, text=title+"\n"+url;
 return [
 ["X","x","https://twitter.com/intent/tweet?text="+q(title)+"&url="+q(url)],
 ["LINE","line","https://social-plugins.line.me/lineit/share?url="+q(url)+"&text="+q(title)],
 ["Threads","threads","https://www.threads.com/intent/post?text="+q(text)],
 ["Facebook","facebook","https://www.facebook.com/sharer/sharer.php?u="+q(url)],
 ["Bluesky","bluesky","https://bsky.app/intent/compose?text="+q(text)],
 ["WhatsApp","whatsapp","https://wa.me/?text="+q(text)],
 ["Telegram","telegram","https://t.me/share/url?url="+q(url)+"&text="+q(title)]
 ];
}
function mountPublicShare(target,{page,id,member,title,label="このページをシェア"}){
 if(!target)return;
 // Do not expose draft titles or activate copy/share in preview or embedded pages.
 if(window.parent!==window||new URLSearchParams(location.search).has("cmsPreview")){target.hidden=true;return}
 const allowed=["index.html","talents.html","talent.html","news.html","news-detail.html","schedule.html","anniversary.html","activity.html","about.html","audition.html"];
 if(!allowed.includes(page))return;
 const url=new URL(page,"https://rinseishirasu.github.io/poppoo-official/");
 if(page==="index.html")url.pathname="/poppoo-official/";
 if(id&&["talent.html","news-detail.html"].includes(page)){const path=shareDetailPath(page==="talent.html"?"talents":"news",id);if(path)url.pathname="/poppoo-official/"+path;else url.searchParams.set("id",id)}
 if(member&&["news.html","schedule.html"].includes(page))url.searchParams.set("member",member);
 const href=url.href,heading=String(title||"架空事務所 ぽっぽー").trim();
 target.classList.add("pop-share-panel");target.setAttribute("role","group");target.setAttribute("aria-label",label);
 const titleEl=document.createElement("strong");titleEl.className="pop-share-heading";titleEl.textContent=label;
 const buttons=document.createElement("div");buttons.className="pop-share-buttons";
 for(const [name,kind,link] of publicShareLinks(href,heading)){
  const a=document.createElement("a");a.className="pop-share-button pop-share-"+kind;a.href=link;a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="no-referrer";a.textContent=name;a.setAttribute("aria-label",name+"で共有（新しい画面）");buttons.append(a);
 }
 const status=document.createElement("p");status.className="pop-share-status";status.setAttribute("role","status");
 const fallback=document.createElement("input");fallback.className="pop-share-url";fallback.type="text";fallback.readOnly=true;fallback.value=href;fallback.hidden=true;fallback.setAttribute("aria-label","共有用URL");
 const showFallback=()=>{fallback.hidden=false;fallback.focus();fallback.select();status.textContent="表示されたURLをコピーしてください。"};
 const copy=document.createElement("button");copy.type="button";copy.className="pop-share-button pop-share-copy";copy.textContent="URLコピー";
 copy.addEventListener("click",async()=>{try{if(!navigator.clipboard?.writeText){showFallback();return}await navigator.clipboard.writeText(href);status.textContent="URLをコピーしました。"}catch{showFallback()}});
 buttons.append(copy);
 if(typeof navigator.share==="function"){const native=document.createElement("button");native.type="button";native.className="pop-share-button pop-share-native";native.textContent="その他の共有";native.addEventListener("click",async()=>{try{await navigator.share({title:heading,url:href});status.textContent="共有操作が完了しました。"}catch(e){if(e.name!=="AbortError"){status.textContent="共有できませんでした。URLコピーをご利用ください。"}}});buttons.append(native)}
 target.replaceChildren(titleEl,buttons,status,fallback);
}
// Consistent share controls on the main public landing and listing pages.
const sharePageTitles={"index.html":"架空事務所 ぽっぽー 公式サイト","talents.html":"参加メンバー | 架空事務所 ぽっぽー","news.html":"お知らせ | 架空事務所 ぽっぽー","schedule.html":"配信予定 | 架空事務所 ぽっぽー","anniversary.html":"記念日カレンダー | 架空事務所 ぽっぽー","activity.html":"メンバーの活動実績 | 架空事務所 ぽっぽー","about.html":"コミュニティについて | 架空事務所 ぽっぽー","audition.html":"参加案内 | 架空事務所 ぽっぽー"};
if(sharePageTitles[current]&&mainContent&&window.parent===window&&!new URLSearchParams(location.search).has("cmsPreview")){
 const section=document.createElement("section");section.className="container pop-page-share-wrap";
 const disclosure=document.createElement("details");disclosure.className="pop-page-share-disclosure";const summary=document.createElement("summary");summary.textContent="このページをシェア";const target=document.createElement("div");disclosure.append(summary,target);section.append(disclosure);mainContent.append(section);
 mountPublicShare(target,{page:current,title:sharePageTitles[current]});
}
// Annual dates from visible public profile fields and published site settings.
function anniversaryRecords(talents,settings){
 const records=[],seen=new Set();
 const add=(value,kind,label,name,id)=>{
 if(typeof value!=="string"||typeof label!=="string"||!label.trim())return;
 const m=value.trim().match(/^(?:(\d{4})(?:年|[-/]))?(\d{1,2})(?:月|[-/])(\d{1,2})日?$/);if(!m)return;
 const year=m[1]?Number(m[1]):null,month=Number(m[2]),day=Number(m[3]),check=new Date(Date.UTC(year||2000,month-1,day));
 if(month<1||month>12||day<1||check.getUTCMonth()!==month-1||check.getUTCDate()!==day||year!==null&&(year<1900||year>9998))return;
 const key=[id,kind,month,day,label].join("|");if(seen.has(key))return;seen.add(key);
 records.push({kind,label,name,id,month,day,year:kind==="birthday"?null:year,href:id?"talent.html?id="+encodeURIComponent(id):"about.html#about-overview"});
 };
 for(const t of Array.isArray(talents)?talents:[]){
 if(!t||t.published!==true||typeof t.id!=="string"||!/^[A-Za-z0-9_-]+$/.test(t.id)||typeof t.name!=="string"||!t.name.trim()||(Array.isArray(t.hiddenSections)&&t.hiddenSections.includes("facts")))continue;
 add(t.birthday,"birthday","誕生日",t.name,t.id);add(t.debutDate,"debut","デビュー周年",t.name,t.id);add(t.joinDate,"join","加入周年",t.name,t.id);
 const extra=Array.isArray(t.anniversaries)?t.anniversaries:[];for(const a of extra)if(a)add(a.date,"other",a.title,t.name,t.id);
 if(!extra.length)add(t.anniversary,"other","活動記念日",t.name,t.id);
 }
 const config=(Array.isArray(settings)?settings:[]).find(x=>x?.published===true);
 add(typeof config?.founded==="string"&&config.founded.trim()?config.founded:"2026年11月25日","community","設立記念日","ぽっぽー","");
 return records;
}
function anniversaryOccurrence(record,year){
 if(record.year!==null&&year<record.year+Number(["debut","join","community"].includes(record.kind)))return null;
 const d=new Date(Date.UTC(year,record.month-1,record.day));
 // February 29 anniversaries are observed on March 1 in common years only.
 const shifted=record.month===2&&record.day===29&&d.getUTCMonth()===2&&d.getUTCDate()===1;
 if(!shifted&&(d.getUTCMonth()!==record.month-1||d.getUTCDate()!==record.day))return null;
 return {...record,month:d.getUTCMonth()+1,day:d.getUTCDate(),shifted,date:d.toISOString().slice(0,10),title:record.name+"の"+(record.year!==null&&["debut","join","community"].includes(record.kind)?(record.kind==="debut"?"デビュー":record.kind==="join"?"加入":"設立")+(year-record.year)+"周年":record.label)};
}
function nextAnniversaryEvents(records,today){
 const start=Number(today.slice(0,4)),out=[];
 for(const record of records)for(let year=Math.max(start,record.year||start);year<=Math.max(start,record.year||start)+8&&year<10000;year++){const event=anniversaryOccurrence(record,year);if(event&&event.date>=today){out.push(event);break}}
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name,"ja"));
}
// Shared public activity records: preserve existing CMS fields and visibility.
function activityDateKey(value){
 const raw=typeof value==="string"?value.trim():"",m=raw.match(/^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?$/);
 if(!m)return "";
 const y=Number(m[1]),month=m[2]?Number(m[2]):1,day=m[3]?Number(m[3]):1;
 if(y<1900||y>9998||month<1||month>12||day<1)return "";
 const d=new Date(Date.UTC(y,month-1,day));if(d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return "";
 return m[1]+(m[2]?"-"+String(month).padStart(2,"0"):"-00")+(m[3]?"-"+String(day).padStart(2,"0"):"-00");
}
function publicActivityRecords(talents){
 const rows=[];
 for(const t of Array.isArray(talents)?talents:[]){
 if(!t||t.published!==true||typeof t.id!=="string"||!/^[A-Za-z0-9_-]+$/.test(t.id)||typeof t.name!=="string"||!t.name.trim()||t.hiddenSections?.includes?.("achievements"))continue;
 for(const a of Array.isArray(t.achievements)?t.achievements:[]){
 if(!a||typeof a.title!=="string"||!a.title.trim())continue;
 const date=typeof a.date==="string"?a.date.trim():"";
 rows.push({memberId:t.id,name:t.name,title:a.title.trim(),description:typeof a.description==="string"?a.description.trim():"",date,dateKey:activityDateKey(date),href:"talent.html?id="+encodeURIComponent(t.id)+"#activity-achievements"});
 }
 }
 return rows.sort((a,b)=>b.dateKey.localeCompare(a.dateKey)||a.name.localeCompare(b.name,"ja"));
}
// Default order follows the explicitly agreed initial management team.
const DEFAULT_MANAGEMENT_IDS=["itsumin","yu_zi_n_pecorino","dondoko","rinsei_shirasu"];
function managementMembers(talents,settings){
 const config=(Array.isArray(settings)?settings:[]).find(x=>x?.published===true);
 const ids=Array.isArray(config?.managementIds)?config.managementIds:DEFAULT_MANAGEMENT_IDS;
 const members=(Array.isArray(talents)?talents:[]).filter(t=>t?.published===true&&typeof t.id==="string"&&/^[A-Za-z0-9_-]+$/.test(t.id)&&typeof t.name==="string"&&t.name.trim());
 return [...new Set(ids)].map(id=>members.find(t=>t.id===id)).filter(Boolean);
}
// Member palette: retain the exact registered color for decoration; derive readable text.
function memberPalette(value){
 const base=typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():"#666666";
 const rgb=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16));
 const hex=v=>"#"+v.map(n=>Math.round(n).toString(16).padStart(2,"0")).join("");
 const mix=(target,f)=>rgb.map((n,i)=>Math.round(n*(1-f)+target[i]*f));
 const luminance=v=>v.map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
 const soft=mix([255,255,255],.88),surface=mix([255,255,255],.96),border=mix([255,255,255],.68);
 // Use the darkest required variant across white and the most saturated text background.
 const backgroundL=Math.min(luminance(soft),luminance(surface)),contrast=v=>(backgroundL+.05)/(luminance(v)+.05);
 let ink=rgb.slice();
 for(let i=1;contrast(ink)<4.5&&i<=20;i++)ink=mix([0,0,0],i/20);
 return {base,soft:hex(soft),surface:hex(surface),border:hex(border),ink:hex(ink),strong:hex(mix([0,0,0],.18))};
}
function applyMemberPalette(el,value){
 const p=memberPalette(value);
 for(const [key,color] of Object.entries(p))el.style.setProperty("--member-"+(key==="base"?"color":key),color);
 return p;
}
// Keep the array return contract for static defaults and CMS preview.
const failedDatasets=new Set();
async function loadData(file){
 if(previewData&&Object.prototype.hasOwnProperty.call(previewData,file)&&Array.isArray(previewData[file])){failedDatasets.delete(file);return previewData[file]}
 try{
  const r=await fetch(file,{cache:"no-cache"});if(!r.ok)throw new Error("data");
  const data=await r.json();if(!Array.isArray(data))throw new Error("Invalid dataset");
  failedDatasets.delete(file);return data;
 }catch{failedDatasets.add(file);return []}
}
function datasetFailed(file){return failedDatasets.has(file)}
function cardTalent(t){return `<article class="card"><div class="talent-art">${escapeHtml(t.name?.slice(0,1)||"P")}</div><div class="card-body"><h3>${escapeHtml(t.name)}</h3><p>${escapeHtml(t.catchphrase||(!t.hiddenSections?.includes?.("bio")?normalizedMemberProfile(t).bio:"")||"プロフィール準備中です。")}</p><p style="margin-top:14px"><a class="text-link" href="talent.html?id=${encodeURIComponent(t.id)}">プロフィールを見る →</a></p></div></article>`}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

/* Reveal only once, when a section enters the viewport. Never hide content. */
(()=>{
 const main=document.querySelector("main");
 if(!main||current==="admin.html"||!window.IntersectionObserver||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const selector=".pop-section,.pop-brand-panel,.pop-brand-intro,.audition-section,.contact-section,.profile-section,.pop-day-group,.news-card,.pop-member-card";
 const seen=new WeakSet();
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);entry.target.classList.add("pop-reveal-active");entry.target.addEventListener("animationend",()=>entry.target.classList.remove("pop-reveal-active"),{once:true})}},{threshold:0,rootMargin:"0px 0px -24px 0px"});
 const scan=root=>{if(root.nodeType!==1)return;const nodes=[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];for(const node of nodes){if(seen.has(node))continue;seen.add(node);if(node.closest(".pop-section")&& !node.matches(".pop-section"))continue;observer.observe(node)}};
 scan(main);
 if(window.MutationObserver)new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)scan(node)}).observe(main,{childList:true,subtree:true});
})();

/* Optional public site settings; static content remains the default. */
(async()=>{
 if(current==="admin.html")return;
 const s=(await loadData("data/settings.json")).find(x=>x?.published===true);if(!s)return;
 const set=(selector,key)=>{const el=document.querySelector(selector);if(el&&typeof s[key]==="string"&&s[key].trim()){el.textContent=s[key];el.lang="ja";el.style.whiteSpace="pre-line"}};
 if(current==="about.html"){
 const fields={"運営者名":"operator","代表者":"representative","盛り上げ会長":"chair","設立・活動開始":"founded","活動拠点":"base"};
 document.querySelectorAll(".about-overview .info-box").forEach(el=>{const label=el.querySelector("strong"),key=Object.keys(fields).find(k=>publicText(k)===label?.textContent),field=fields[key];if(field&&typeof s[field]==="string"&&s[field].trim())el.replaceChildren(label,document.createTextNode(s[field]))});
 set(".about-lead","aboutLead");
 set("#about-community .about-policy-intro","communityPolicy");
 }
 const url=key=>{try{const u=new URL(s[key]);return u.protocol==="https:"&&!u.username&&!u.password?u.href:""}catch{return ""}};
 const link=(el,href,label)=>{const a=document.createElement("a");a.className="pop-link";a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label;el.append(a)};
 if(current==="audition.html"){
 set(".audition-lead p","joinIntro");
 const list=document.querySelector(".audition-checklist");if(list&&s.requirements?.trim()){list.replaceChildren(...s.requirements.split(/\r?\n/).filter(v=>v.trim()).map(v=>{const li=document.createElement("li");li.textContent=v;return li}))}
 const href=url("applicationUrl"),box=document.querySelector(".audition-status");if(href&&box){const p=document.createElement("p");p.textContent="参加申込みは下記の外部窓口からご確認ください。";box.replaceChildren(p);link(box,href,"応募窓口へ");}
 }
 if(current==="contact.html"){const href=url("contactUrl"),box=document.querySelector(".contact-status");if(href&&box){const p=document.createElement("p");p.textContent="お問い合わせは下記の外部窓口をご利用ください。";box.replaceChildren(p);link(box,href,"お問い合わせ窓口へ");}}
 set(".pop-footer .footer-grid>div:first-child p","footerText");if(s.footerText?.trim()){const customFooter=document.querySelector(".pop-footer .footer-grid>div:first-child p");if(customFooter)customFooter.lang="ja"}
})();
