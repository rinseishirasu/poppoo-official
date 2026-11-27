# POPPŌ MEMBER PORTAL 1.0 / v21 一括検証導入手順
2026-11-26 / 正式公開の承認ではなく、既存管理者だけで開始する検証用手順。

## 固定版
- Worker: https://github.com/rinseishirasu/poppoo-official/blob/37eb59eae8d21e849fb445b5d16375de7283d507/portal-worker/index.js
- 一括SQL: https://github.com/rinseishirasu/poppoo-official/blob/37eb59eae8d21e849fb445b5d16375de7283d507/portal-worker/install-v1.sql
- 模擬回帰試験: https://github.com/rinseishirasu/poppoo-official/blob/e94e22a5c2070af433fc73f5a4dabeb3b5acf7ea/portal-worker/tests/regression.mjs
- 既存の poppoo-admin-auth Worker には触れない。対象は poppoo-member-portal のみ。mainへの統合は別工程。

## 1. 事前保全
既存Workerのデプロイ履歴・コード・バインディング設定を確認し、既存D1のバックアップ/復元方法を確保する。DB名は poppoo-member-portal、bindingは DB。既存DBを削除・作り直さない。管理者アカウントが既に作成済みの場合、新規setupを行わない。秘密値を表示、共有、GitHubへ登録しない。作業中は新規公開を行わず、進行中の処理が完了していることを確認する。

## 2. 一括更新
既存D1に上記のinstall-v1.sql全体を一回適用。既存テーブルを保持するCREATE IF NOT EXISTS形式で、繰り返し実行可能。スキーマの異なる同名テーブルが既に存在する場合は修復されないため、エラー時は進まず構造を確認する。
Workerに上記固定版index.js全体を登録。実際のバインディングはCloudflare側で設定する（wrangler.tomlのDB IDはプレースホルダー）。最初のデプロイは次の設定で管理者専用に限定する。

| 名前 | 種類 | 初期値 |
| --- | --- | --- |
| DB | D1 binding | 既存 poppoo-member-portal |
| PASSWORD_PEPPER | Secret | 既存値を保持。未設定の場合のみ安全な乱数32バイトの64桁hex |
| PASSWORD_KDF_ITERATIONS | Variable | 100000（互換性検証用） |
| PORTAL_TEST_MODE | Variable | false |
| PORTAL_PUBLICATION_ENABLED | Variable | false |
| PORTAL_MAINTENANCE | Variable | true |
| PORTAL_RECOVERY_ENABLED | Variable | false |
| GITHUB_PUBLISH_TOKEN | Secret | 初期導入では設定しない。既存値があっても公開は無効 |
| BOOTSTRAP_SECRET | Secret | 既存管理者がログインできることを確認後、不要なら削除 |

値は文字列として設定する。既存のpepperを置換すると新方式の認証が失敗する。pepperは安全なローカル保管先にバックアップする。必要な場合のみ信頼できるPCで暗号学的乱数を生成する。チャットに秘密値を貼らない。

## 3. 管理者限定の検証
https://poppoo-member-portal.rinsei-shirasu.workers.dev/health で revision=release-validation-v21、schemaReady=true、passwordPepperConfigured=true、passwordKdfConfigValid=true、productionEnabled=false、maintenanceEnabled=true、publicationEnabled=false、reconciliationEnabled=false を確認。HTTP 503やschemaReady=falseなら先へ進まない。
既存管理者でログイン、管理画面、審査・監査履歴、ログアウトを確認。既存メンバーのログイン・編集・公開は停止。保守中のパスワード変更は不可。初期設定ページも停止するため、この手順は既存管理者がいる環境用。

## 4. 検証の順番（設定変更は確認後に実施）
- 管理者限定の状態を確認後、保守モード解除・公開停止を維持したまま認証の実行時間を計測。600000回の設定は無料枠で検証し、失敗時は復旧手順を使用して認証方式を再検討。既存100000回を正式公開の強度と認定しない。設定値の変更は既存ハッシュの回数を書き換えない。
- 管理されたテストアカウントだけに招待を発行し、初回設定、ログイン、期限切れ、再招待、停止、権限分離、各申請の保存と差し戻し、スマホ操作、画像の提出・閲覧・非公開性を検証。PORTAL_TEST_MODE=trueは既存の有効メンバー全員にアクセスを開くため、実際に有効なアカウントを確認してから使用する。実データを用いない。
- 公開連携の検証は別途許可後。mainにCMSのscheduleSource対応を取り込んだこと、最小権限トークン、公開対象・競合・復旧を確認してから実施。Workerの公開先は公式リポジトリmainに固定されているため、公開テストは実サイトに影響する。ダミーデータを無断で公開しない。画像の完全デコード、認証強度、D1とGitHubの分散処理は本番前の残課題。
- 正式公開判定は実環境の結果、安全性、無料枠の性能を確認した後。v21には正式公開を有効化する機能はなく、productionEnabled=falseを維持。

## 5. 復旧
不明な承認結果の再公開は禁止。保守モード=true、公開=false、復旧=trueとし、実行中の要求が全て終了していることを確認。運営専用審査画面からコミット到達確認を実施できる。復旧モードはGitHub compareのGETのみを許可し、GitHubの書き込みは禁止。SHA不明・main未到達の場合はロックを維持し個別に調査する。復旧後は復旧=falseに戻す。既存管理者の認証復旧にはtools/recover-admin.pyを信頼できるPCで使用し、Worker停止・D1保全・対象確認を必須とする。旧デプロイへ戻す場合にも追加テーブルを削除しない。

## 検証済みと未検証
47項目の模擬・静的回帰試験（tests/regression.mjs、Node.jsで実行可能）。取得した一括SQLと同じ8169バイト、Git blob SHA 296e68146a58da86095b3afcf95b697417553defのDDLをローカルSQLiteで実行し、10項目（12テーブル/11トリガー、旧管理者保持、再招待/再実行、processingロック、誤コミット拒否、公開確定/二重確定、監査、外部キー）を確認。実Cloudflare・D1、実暗号負荷、実画像デコード、実GitHub書き込み、実ブラウザは未検証。実環境導入は未実施。
