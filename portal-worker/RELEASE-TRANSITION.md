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
