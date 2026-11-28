# MEMBER PORTAL 1.0 リリース移行方針
2026-11-28
運営者指示: 認証仕様はv31を維持し、追加の個別試験は省略して正式リリースへ移行。既存の有効なメンバー2件はテストアカウントで削除希望。管理者1件は維持する。
この記録は運営のリリース方針であり、未実施の試験を実測合格とするものではない。v31のCSRF・IP制限は利用者報告で合格。100000回KDFの制約、セッション期限後の実動作、メンバー変更・画像・GitHub実書込等は独立確認未完了。
## 手順
1. 既存Workerを保守モード、テストモード無効、公開・復旧無効とする。D1バックアップ/復旧点を確認する。
2. メンバー件数、関連申請、公開ジョブと外部公開状態を集計。テスト以外のアカウントは削除しない。処理中・公開済みジョブは削除前に照合。関連データの削除は外部公開データを削除しないことに注意。管理者・公開HPデータを保持。
3. 対象を限定した削除処理を実施し、件数と外部キー整合性を確認する。
4. 正式リリース用コード・公開導線を最新mainに対して準備。現在のv31はproductionEnabled=false固定で、公開経路はテストモードに依存するため設定変更だけでは正式版にならない。公開書込経路の残存リスクを明示し、隔離試験または運営のリスク判断を記録する。
5. 正式版デプロイと確認、公式HP導線の公開。障害時は保守モード・公開停止に戻す。
現時点でD1削除・本番デプロイ・mainへの書込は未実施。

## RC1 稼働・公式HP導線
利用者報告: RC1 health productionEnabled=true、memberModeEnabled=true、testModeEnabled=false、publicationEnabled=false、schemaReady=true、passwordKdfProductionReady=false。テストアカウント削除は利用者のOK報告に基づく（削除後の件数は未受領）。main e4911c0732d6230cebc64e334f4a74ca78514fdf に共通ナビ・フッター導線とRC1 Workerソースを反映。既存公開データの変更なし。GitHub Pages配信後の表示確認、公開書込の実動作と安全性は未確認。KDF強度の制約を解消したわけではない。

## 正式運用開始記録（2026-11-28）
利用者報告により、D1アカウント集計は admin active 1 のみ。続いてRC1のhealthで stage=production、productionEnabled=true、memberModeEnabled=true、testModeEnabled=false、maintenanceEnabled=false、publicationEnabled=true、reconciliationEnabled=false、schemaReady=true を確認。運営判断に基づき正式運用開始と記録する。稼働コードの識別子は release-1.0-rc1 のまま。認証仕様はv31を維持し、passwordKdfProductionReady=false（PBKDF2 100000回の制約は未解消）。公開連携の設定有効化は実書き込み成功を証明しない。公式HPでの導線表示、正式メンバー発行、公開書込および省略された個別試験は独立確認していない。障害時はPORTAL_PUBLICATION_ENABLED=false、必要ならPORTAL_MAINTENANCE=trueへ戻す。新規のコード・main・公開データ変更はこの記録では行わない。

## RC7 Discord通知導入記録（2026-11-28）
運営者報告により、0007追加マイグレーション、Discord Webhook作成、Secretと有効化変数設定、Workerデプロイ、Cron Triggers（5分間隔）設定が完了。healthはrevision=release-1.0-rc7、ok=true、schemaReady=true、productionEnabled=true、memberModeEnabled=true、publicationEnabled=true、discordEnabled=true、discordWebhookConfigured=true。模擬・静的回帰試験152/152、運営者による実環境通知試験6/6正常（Discord受信、申請区分・メンバーID、JST、未審査件数、送信済み履歴、審査画面リンク）。RC7を通知機能導入済みとして記録する。実環境での通知全種類、障害時再送・Cronによる補助送信・公開書き込みの試験は今回の報告範囲外。認証仕様およびKDFの残存課題は変更なし。コード・公開データには本記録による変更なし。

## RC8 個別メッセージ・活動状況集計導入記録（2026-11-28）
運営者報告により、healthはrevision=release-1.0-rc8、ok=true、schemaReady=true、productionEnabled=true、memberModeEnabled=true、publicationEnabled=true、discordEnabled=true、discordWebhookConfigured=true、directMessagesEnabled=true、activityReportEnabled=true。模擬・静的回帰試験166/166。運営者による実環境動作試験16/16正常。
- 個別メッセージ8/8：運営からメンバーへの送信、逆方向送信、会話履歴、既読・未読、ダッシュボード未読件数、JST、別メンバー会話の閲覧制限、運営専用画面のアクセス制限。
- 活動状況集計8/8：ページ表示、公開メンバー数、アカウント登録・利用状況、配信予定件数、活動記録件数、対象月切替、審査待ち件数、最終ログイン日時。
RC8の追加機能を導入済みとして記録する。今回の結果は運営者報告に基づき、全機能の負荷・障害復旧・外部連携回帰試験を実施したことを意味しない。既存認証仕様およびKDF残存課題は変更なし。今回の記録に伴うコード・公開データの変更なし。

## RC9・RC9a・RC10導入記録（2026-11-28）
RC9のhealthは運営者報告によりrevision=release-1.0-rc9、schemaReady=true、productionEnabled=true、messageDiscordEnabled=true、operationsTasksEnabled=true、memberDossierEnabled=true。RC9模擬・静的回帰試験181/181。RC9aの活動名によるチャット送信者表示について運営者から正常との報告あり（模擬・静的回帰試験186/186）。RC10は運営ダッシュボードを再設計し、アカウント管理を独立ページに移動。模擬・静的回帰試験196/196、運営者より更新後正常との報告あり。RC9全28項目の実環境試験結果、RC10の個別集計項目・アカウント操作の詳細試験結果およびRC10のhealth JSONは未受領。報告の範囲内で導入確認を記録し、未確認項目を合格とみなさない。今回の記録によるコード・公開データ変更なし。認証仕様・KDF残存課題は変更なし。
