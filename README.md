# 架空事務所 ぽっぽー 公式サイト

「架空事務所 ぽっぽー」の公式サイトです。ブランド名・世界観として「架空事務所」を使用し、活動形態はREALITYを中心とした配信者コミュニティとして案内しています。

## 公開サイト

- https://rinseishirasu.github.io/poppoo-official/

## ページ構成

- `index.html` トップページ
- `about.html` コミュニティについて
- `talents.html` 参加メンバー一覧
- `talent.html?id=メンバーID` 個別プロフィール
- `schedule.html` 配信スケジュール
- `news.html` お知らせ一覧
- `news-detail.html?id=記事ID` お知らせ詳細
- `audition.html` コミュニティ参加案内
- `contact.html` お問い合わせ案内
- `policy.html` プライバシー・サイトポリシー
- `404.html` エラーページ
- `admin.html` 運営者向け管理画面（noindex）

## コンテンツの更新

管理画面から参加メンバー、配信予定、お知らせを作成・編集できます。

1. [管理画面](https://rinseishirasu.github.io/poppoo-official/admin.html)を開き、運営者のGitHubアカウントでログインします。
2. 編集するカテゴリを選び、情報を登録・編集します。
3. 内容と掲載許諾を確認してから、カテゴリごとに公開します。
4. GitHub Pagesへの反映には数分かかる場合があります。

認証サーバーの構成・設定手順は [Worker設定ガイド](worker/README.md) を参照してください。Cloudflare WorkerのソースをGitHub上で変更した場合、Cloudflare側にも反映して再デプロイする必要があります。

## データファイル

- `data/talents.json` 参加メンバー
- `data/schedule.json` 配信予定
- `data/news.json` お知らせ

各データはJSON配列です。初期状態では空配列にしてあり、公開許諾を得た情報だけを登録します。

### 参加メンバーの主な項目

- `id`: プロフィールURLに使う一意のID
- `published`: 公開する場合は `true`
- `name`: 活動名
- `cohort`: 期生表示（複数指定可）
- `generation`: 参加区分（正式所属ライバー、業務提携ライバー、研修生・準所属ライバー）
- `iconImage`: 一覧用プロフィールアイコン
- `avatarImage` / `avatarImages`: プロフィール用アバター画像・ギャラリー
- `bio`, `catchphrase`, `tags`, `links` など: プロフィール情報

プロフィールURLは `talent.html?id=メンバーID` です。画像は管理画面から `assets/images/talents/` にアップロードできます。

### 配信予定の主な項目

- `published`: 公開する場合は `true`
- `date`: 日付（YYYY-MM-DD）
- `time`: 開始時刻（HH:MM）
- `talent`: 参加メンバーの活動名
- `title`: 配信タイトル
- `platform`: 配信プラットフォーム
- `url`: 配信先URL（任意）

### お知らせの主な項目

- `id`: 記事ID
- `published`: 公開する場合は `true`
- `date`: 投稿日（YYYY-MM-DD）
- `title`: 記事タイトル
- `category`: カテゴリ
- `summary`: 一覧用概要
- `body`: 記事本文

## GitHub Pages

GitHub PagesはGitHub Actionsでデプロイします。デプロイワークフローは `.github/workflows/pages.yml` です。サイトは静的ファイルとして公開されます。

## 運用上の注意

- 公開リポジトリのため、登録したJSON・画像・ソースコードは誰でも閲覧できます。住所、個人連絡先、応募者情報、非公開情報、パスワード、アクセストークンなどは絶対に登録しないでください。
- 管理画面自体は静的ページです。GitHub OAuthとCloudflare Workerで公開操作を制御していますが、管理画面のURLを非公開にする仕組みではありません。
- 画像・文章・ロゴ等は、権利者から公開・掲載の許諾を得たものだけを使用してください。
- お問い合わせ・参加申込みフォームは現時点で未接続です。窓口を設置する際は、取得情報や利用目的を明示し、プライバシーポリシーも更新してください。
- 初期データに架空の参加メンバー、配信予定、活動実績は登録していません。
