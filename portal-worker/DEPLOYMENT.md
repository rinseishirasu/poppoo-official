# POPPŌ MEMBER PORTAL v29: 管理者限定の検証導入
2026-11-28 / 正式リリースではない。productionEnabled=false を維持。

旧v21の手順はコミット履歴で参照する。v29の試験結果・残課題は VALIDATION-v29.md を参照。

## 対象と固定ソース
- Cloudflare Worker: poppoo-member-portal
- 既存D1: poppoo-member-portal、binding: DB
- 公式HPのCMS認証Worker poppoo-admin-auth は対象外。
- [v29 Worker](https://github.com/rinseishirasu/poppoo-official/blob/69a230ddd7131b55a74da00c8ce0c4b4ec036af6/portal-worker/index.js)
- [v29 一括SQL](https://github.com/rinseishirasu/poppoo-official/blob/69a230ddd7131b55a74da00c8ce0c4b4ec036af6/portal-worker/install-v1.sql)
- [0006 追加移行](https://github.com/rinseishirasu/poppoo-official/blob/69a230ddd7131b55a74da00c8ce0c4b4ec036af6/portal-worker/migrations/0006_collab_publication.sql)

## 0. 読み取り専用事前確認
既存の https://poppoo-member-portal.rinsei-shirasu.workers.dev/health を確認。現在のrevisionと公開設定を記録する。HTTPエラーがあれば原因調査を先行する。Cloudflare DashboardでWorker名、D1バインディング、現在のデプロイ履歴、D1の復元方法を確認する。秘密値を表示・貼り付けない。正式公開導線は未公開のまま維持する。

D1 Consoleの読み取り専用SQL:
```sql
SELECT name, type FROM sqlite_master
WHERE type IN ('table', 'trigger')
AND name NOT LIKE 'sqlite_%'
AND name NOT LIKE '_cf_%'
ORDER BY type, name;
```
既存のアカウントや申請内容は取得・共有しない。既存管理者が存在する環境向け。新規setupは行わない。

## 1. 保全と停止
既存Workerのバージョンと設定を記録し、D1のバックアップ・Time Travel復元点を確認する。既存DBを削除・初期化しない。
既存Workerの公開停止を確認し、進行中の公開処理の結果を確定させてから更新する。PORTAL_PUBLICATION_ENABLED=false、PORTAL_TEST_MODE=false、PORTAL_MAINTENANCE=true、PORTAL_RECOVERY_ENABLED=false。古いWorkerがこれらを認識するかはrevisionにより異なるため、現在のhealthと処理状態の確認を必須とする。

## 2. SQL
0001〜0005適用済みと確認した場合は0006のみを既存D1に追加する。確認できない場合はスキーマを照合し、欠けた移行を順に適用する。install-v1.sqlは全移行を連結したCREATE IF NOT EXISTS形式だが、同名テーブルの構造差は自動修復しない。SQLエラーで停止する。新設collab_publication_jobsと3トリガーを確認する。

## 3. Worker導入
Workers & Pages → poppoo-member-portal → Edit code で固定版index.jsを使用。既存のD1 bindingを保持し、Variables and Secretsは以下を確認する。

| 項目 | 値 |
| --- | --- |
| DB | 既存D1 binding |
| PORTAL_TEST_MODE | false |
| PORTAL_PUBLICATION_ENABLED | false |
| PORTAL_MAINTENANCE | true |
| PORTAL_RECOVERY_ENABLED | false |
| PASSWORD_KDF_ITERATIONS | 既存値を保持。100000は互換性検証のみ |
| PASSWORD_PEPPER | 既存Secretを保持 |
| GITHUB_PUBLISH_TOKEN | 既存Secretがあっても公開停止。新規設定不要 |
| BOOTSTRAP_SECRET | 既存設定を変更しない |

既存SecretをGitHubやチャットへ送信しない。wrangler.tomlのDB IDはプレースホルダーであり、そのまま本番デプロイしない。

## 4. 導入直後の確認
healthがHTTP 200で revision=release-validation-v29、schemaReady=true、passwordPepperConfigured=true、passwordKdfConfigValid=true、productionEnabled=false、maintenanceEnabled=true、publicationEnabled=false、reconciliationEnabled=false を確認。passwordKdfIterationsは既存設定に依存する。healthはスキーマの存在確認であり、認証や実際のSQL動作を保証しない。
既存管理者のログイン、管理画面、審査画面、運営連絡・申請管理、監査履歴、ログアウトを確認する。メンバーはログインさせない。503または不一致があれば以降の試験を停止。

## 5. 後続の正式公開判定
管理者限定導入に合格してから、隔離検証環境で600000回PBKDF2の性能、招待・権限分離、各種申請、画像、実ブラウザ、GitHub連携を確認する。既存有効メンバー全員にアクセスを開く設定変更を無断で行わない。GitHub公開先は現状main固定のため、テスト書き込みには隔離先の実装が必要。ダミーデータを公式mainに書き込まない。正式公開ゲート、画像検証、分散競合は未完了。mainへの統合および公式HPへのログイン導線の公開は別途判定する。

## 6. 異常時
公開は停止したまま保持。デプロイ履歴から既知の旧版へのロールバックを検討し、追加テーブルを削除しない。GitHubへの反映結果が不明なジョブは再公開禁止。保守モードで復旧照合を行う場合は、公開=false、復旧=trueとして対象コミットを確認する。復旧完了後は復旧=falseに戻す。
