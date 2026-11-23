# ぽっぽー運営ページのGitHub直接公開セットアップ

この仕組みは、GitHub Pages上の運営ページからGitHub Appでログインし、選択したJSONデータをリポジトリへ直接コミットするためのものです。GitHub AppのClient SecretはCloudflare WorkerのSecretとして保管し、ブラウザーには置きません。

## 構成
- Webサイト / 運営画面: GitHub Pages
- OAuthコード交換: Cloudflare Worker
- 認証: GitHub Appのユーザーアクセストークン
- 書き込み先: `rinseishirasu/poppoo-official` の `data/*.json` のみ
- 対象アカウント: Workerの `ADMIN_GITHUB_LOGIN` に指定したGitHubログイン名
- トークンは運営画面のメモリー上だけで使用し、localStorageには保存しません。ページを閉じるとログイン状態は終了します。

## 1. Cloudflare Workerを先に作成
Cloudflareアカウントにログインし、Dashboard → Workers & Pages → Create → Worker からWorkerを作成します。名前は例として `poppoo-admin-auth` とします。

作成したWorkerのコードを、このリポジトリの `worker/index.js` の内容に置き換えてDeployします。Worker URL（例: `https://poppoo-admin-auth.example-subdomain.workers.dev`）を控えてください。

## 2. GitHub Appを作成
GitHubで Settings → Developer settings → GitHub Apps → New GitHub App を開きます。

- GitHub App name: `Poppoo Official Site Admin` など任意
- Homepage URL: `https://rinseishirasu.github.io/poppoo-official/`
- Callback URL: `https://<Worker URL>/auth/callback`（Worker URLの末尾に `/auth/callback` を追加）
- Webhook: Activeをオフ
- Repository permissions: **Contents: Read and write**
- Metadata: Read-only（既定）
- 他の権限は追加しない
- Appを自分のアカウントにインストールし、Repository accessは **Only select repositories** を選択して `poppoo-official` だけを指定する

Appを作成したら、App settingsの **Client ID** と **Generate a new client secret** で発行したClient Secretを控えます。Client Secretは公開リポジトリへ絶対に保存しないでください。

## 3. Workerに設定値を登録
Cloudflare Dashboard → Workers & Pages → 作成したWorker → Settings → Variables and Secrets で次を設定します。

| 名前 | 種類 | 値 |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | Text | GitHub AppのClient ID |
| `GITHUB_CLIENT_SECRET` | **Secret** | GitHub AppのClient Secret |
| `FRONTEND_ORIGIN` | Text | `https://rinseishirasu.github.io` |
| `ADMIN_GITHUB_LOGIN` | Text | 運営者のGitHubログイン名 |
| `REPOSITORY_ID` | Text | `1467589467` |

Client Secretは必ず **Secret** として登録します。Text変数やWorkerのソースコードには記載しないでください。設定後にDeployします。

## 4. 運営ページへWorker URLを設定
`admin.html` の次のmetaタグに、末尾のスラッシュを付けずにWorker URLを設定します。

`<meta name="poppoo-auth-api" content="https://<Worker URL>">`

例: `content="https://poppoo-admin-auth.example-subdomain.workers.dev"`

この値は公開情報であり、Secretではありません。変更をGitHubへコミットし、GitHub Pagesの反映を待ちます。

## 5. 動作確認
1. `https://rinseishirasu.github.io/poppoo-official/admin.html` を開く
2. 「GitHubでログイン」を押す
3. GitHub Appの認可画面で内容を確認して許可
4. 運営者アカウントでログイン中になることを確認
5. テスト用のお知らせ等を非公開状態で作成し、公開操作を試す
6. GitHubの `data/` にコミットが作成されたことを確認する

## セキュリティ上の注意
- GitHub AppはContentsのRead and writeだけを要求し、インストール先も対象リポジトリ1つに限定します。
- Workerは許可したGitHubログイン名とリポジトリID・push権限を確認してからトークンを渡します。
- WorkerはOAuthのstateとPKCEを検証します。
- 運営画面はトークンをlocalStorageやファイルに保存しません。通常は8時間で失効し、画面を閉じても破棄されます。
- 公開リポジトリに載せてよい情報だけを登録してください。個人情報や非公開情報は入力しないでください。
- 「ログアウト」はブラウザー上のトークンを破棄します。GitHub App自体の認可を取り消す場合はGitHubの Settings → Applications から行ってください。
- Cloudflare WorkerのClient SecretはSecretとして登録し、コードや通常のText変数に書かないでください。
