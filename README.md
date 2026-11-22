# 架空事務所 ぽっぽー 公式HP

クリーム・オレンジを基調にした、個人運営の架空Vライバー事務所サイトです。GitHub Pagesで公開できる静的サイトとして構成しています。

## ページ
- `index.html` トップ
- `about.html` 事務所紹介
- `talents.html` 所属ライバー一覧
- `talent.html?id=ライバーID` 個別プロフィール
- `schedule.html` 配信予定
- `news.html` お知らせ
- `events.html` イベント・企画
- `audition.html` 所属募集
- `contact.html` お問い合わせ
- `policy.html` プライバシー・サイトポリシー
- `404.html` エラーページ

## GitHub Pagesで公開する手順
1. GitHubで `poppoo-official` という **Public** リポジトリを新規作成します。
2. このZIPの中身をリポジトリ直下へアップロードし、`main` ブランチへコミットします。
3. GitHubの **Settings → Pages** を開き、Build and deployment の Source を **GitHub Actions** にします。
4. Actionsタブで `Deploy static site to GitHub Pages` が完了するのを待ちます。
5. `https://rinseishirasu.github.io/poppoo-official/` を開いて確認します（ユーザー名やリポジトリ名が異なる場合はURLを読み替えてください）。

## 公開データの追加
公開許諾を得た情報だけをJSONへ登録します。

### 所属ライバー (`data/talents.json`)
```json
[
  {
    "id": "sample-talent",
    "published": true,
    "name": "活動名",
    "generation": "所属ライバー",
    "emoji": "🐦",
    "catchphrase": "キャッチコピー",
    "bio": "公開用プロフィール文",
    "tags": ["雑談", "ゲーム"],
    "links": [
      {"label": "X", "url": "https://x.com/example"}
    ]
  }
]
```
プロフィールURLは `talent.html?id=sample-talent` です。`id` は英数字とハイフンを推奨します。

### お知らせ (`data/news.json`)
```json
[
  {
    "published": true,
    "date": "2026-11-22",
    "title": "お知らせタイトル",
    "summary": "お知らせ本文の概要"
  }
]
```

### イベント (`data/events.json`)
```json
[
  {
    "published": true,
    "status": "開催予定",
    "date": "2026-12-01",
    "title": "企画タイトル",
    "description": "企画の紹介"
  }
]
```

### 配信予定 (`data/schedule.json`)
```json
[
  {
    "published": true,
    "date": "2026-12-01",
    "time": "21:00",
    "talent": "活動名",
    "title": "夜の雑談",
    "platform": "REALITY",
    "url": "https://example.com"
  }
]
```

## 注意事項
- 初期データは空です。架空の所属者・予定・実績を実在情報のように掲載していません。
- 問い合わせ・応募フォームは未接続です。公開前に安全な外部フォーム等を用意し、プライバシー説明を整えてください。
- このリポジトリがPublicの場合、登録したJSON・画像・ソースコードは誰でも閲覧できます。応募者情報、住所、個人連絡先、非公開情報、認証情報を絶対に置かないでください。
- Google Fontsの読み込みにはインターネット接続が必要です。接続できない場合は端末の代替フォントで表示します。
- 実際の公開前に、掲載するロゴ・アバター・イラストの利用許諾を確認してください。
