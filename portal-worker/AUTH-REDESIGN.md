# v29 認証負荷試験結果と v30 認証再設計案
2026-11-28

## 実環境の結果
- v29への移行、D1の13テーブル・14トリガーの存在確認、管理者画面試験9項目は利用者報告で合格。
- 600000回設定の未登録メールアドレスによるログイン試験は {"error":"Service unavailable","step":"password-verify","revision":"release-validation-v29"}。例外の詳細は未確認。CPU制限またはWeb Crypto実装制約が候補であり、確定原因ではない。
- 100000回に戻し、healthでmaintenanceEnabled=true、publicationEnabled=false、productionEnabled=falseを確認。実ログインの復旧確認は別途。
- 有効な管理者1件・メンバー2件、processing公開ジョブ0件（試験前の集計）。
- 100000回を正式公開適合とは判定しない。

## 提案: Cloudflare Accessへの認証委譲
公式資料:
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/

対象はpoppoo-member-portalのみ。公式サイト・poppoo-admin-authへの一括保護はしない。登録メールアドレス単位の許可と、Accessが検証したIDをWorker内のaccountsに照合する方式を検討する。管理者はMFAを推奨。メールOTPはメールアカウントの安全性に依存し、単独でフィッシング耐性MFAとはみなさない。

段階1: 現在のメンテナンス・公開停止を維持。Zero Trust利用可否・プランとWorker単位のAccess設定の存在を確認する。実際の保護切替はまだ行わない。
段階2: 隔離された検証Worker・D1で、まずAccessの認証済みIDを検証する。ctx.accessと想定アプリAUDを確認し、メールを厳格に照合。未登録・停止・異なるアプリ・未認証・偽造ヘッダーは拒否する。ログアウト・失効・CSRF・管理者権限の再確認を実装試験する。
段階3: D1の既存アカウントと紐付ける。初回承認・招待・停止・メール変更手順を設計し、従来のパスワード経路との併用や迂回を防ぐ。移行時に旧ハッシュを削除せず、ロールバック手順を用意する。
段階4: メンバー実環境試験・隔離GitHub公開試験・画像安全性・正式公開ゲートを検証。正式リリースは全条件合格後。

本書は設計提案であり、v30コード・Cloudflare設定変更・本番公開は未実施。Accessの利用可否と認証方式の選択を確認してから実装する。
