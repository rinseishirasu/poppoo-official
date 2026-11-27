# v30 独自認証強化版（検証用）
Cloudflare Access案は不採用。v29を基点に独立したブランチで改修。既存D1スキーマ、資格情報、公開データは変更しない。
- 100000回のみ設定として許可。600000回はv29実環境で失敗したため拒否する。既存600000回ハッシュがあれば自動変換しない。既存100000回ハッシュを維持。
- IP単位12回/15分（ログイン・初期設定・招待有効化・パスワード変更の合計）、メール単位5回/15分（ログイン）。既存の固定窓を維持。共有IPや標的アカウントのロックアウト、分散攻撃への限界あり。
- 管理者セッションは絶対期限1時間（既存セッションも作成時刻で制限）。メンバー8時間。認証失敗は監査ログへ、入力メール・IP・パスワード・トークンは記録しない。ログ洪水への保持期間・監視は別途設計。
- 80項目の模擬・静的回帰試験合格。実Cloudflare/D1、暗号実行、実ブラウザでの検証は未実施。新たなKDFやMFAは未実装。
- /healthのpasswordKdfProductionReady=false、productionEnabled=falseを維持。正式公開の許可ではない。100000回の制約は未解消。高エントロピーなパスワード（パスワードマネージャで生成）と自前の追加認証を別途検討し、安全性を評価する。
## 管理者限定の導入
既存Workerのロールバック点を確認。maintenance=true、test=false、publication=false、recovery=false、PASSWORD_KDF_ITERATIONS=100000、既存PASSWORD_PEPPERとD1 bindingを維持。追加SQL不要。固定Worker: https://raw.githubusercontent.com/rinseishirasu/poppoo-official/07d226f758d03ef93a6bdc6893482e7280a2ee30/portal-worker/index.js
healthのrevision=release-validation-v30、schemaReady=true、passwordKdfConfigValid=true、passwordKdfProductionReady=false、adminSessionMaxSeconds=3600、memberSessionMaxSeconds=28800、authIpLimitPer15Minutes=12、authEmailLimitPer15Minutes=5、productionEnabled=false、maintenanceEnabled=true、publicationEnabled=falseを確認。
管理者ログイン、通常の認証拒否、監査、ログアウト、期限、試行制限を実環境で確認。既存有効アカウントのロックアウトを避け、未登録アドレスで試行制限を検証する。メンバー開放やmainへの公開はまだ行わない。

## 実環境確認記録（2026-11-28）
利用者の報告: v30 health正常、管理者ログイン、アカウント管理、アカウント設定、ログアウト、ログアウト後アクセス制限、未登録メールアドレスの認証拒否、login.failure監査記録の7項目すべて正常。
管理者セッションの保存期限と実際の失効、メール/IP試行制限の境界、新規パスワード作成、メンバー動作、画像とGitHub公開は未検証。正式公開は未承認。現行の保守・公開停止を維持する。
