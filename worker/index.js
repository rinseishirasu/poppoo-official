const API_VERSION = "2022-11-28";
const COOKIE = "poppoo_oauth";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function randomString(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function cookieValue(request, name) {
  const header = request.headers.get("Cookie") || "";
  const item = header.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return item ? item.slice(name.length + 1) : "";
}
function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
function htmlPage(message, payload, origin) {
  const nonce = randomString(18);
  const safePayload = JSON.stringify(payload).replace(/</g, "\\u003c");
  const safeOrigin = JSON.stringify(origin);
  const safeMessage = JSON.stringify(message).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ぽっぽー 運営ログイン</title><body style="font-family:system-ui,sans-serif;background:#f4f7fc;color:#203a5e;display:grid;min-height:100vh;place-items:center;margin:0"><main style="max-width:34rem;margin:24px;padding:32px;background:white;border:1px solid #dce5f0;border-radius:18px;text-align:center"><h1 style="font-size:1.3rem">ぽっぽー 運営ログイン</h1><p>このウィンドウは自動的に閉じます。</p></main><script nonce="${nonce}">(()=>{const payload=${safePayload};const target=${safeOrigin};const message=${safeMessage};if(window.opener){window.opener.postMessage({type:"POPPOO_GITHUB_AUTH",...payload},target);window.close();}else{document.querySelector("p").textContent=message+"。このウィンドウを閉じて運営ページに戻ってください。";}})();</script></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`
    }
  });
}
function errorPage(message, origin) {
  return htmlPage("GitHubログインを完了できませんでした", { error: message }, origin);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const frontend = env.FRONTEND_ORIGIN;
    const headers = {
      "Access-Control-Allow-Origin": frontend || "null",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (url.pathname === "/health") {
      return json({ ok: true, configured: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && frontend && env.ADMIN_GITHUB_LOGIN && env.REPOSITORY_ID) });
    }
    if (url.pathname === "/auth/start" && request.method === "GET") {
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !frontend || !env.ADMIN_GITHUB_LOGIN || !env.REPOSITORY_ID) {
        return new Response("Workerの環境変数が未設定です。セットアップ手順を確認してください。", { status: 503 });
      }
      const state = randomString();
      const verifier = randomString(48);
      const challenge = await sha256(verifier);
      const callback = url.origin + "/auth/callback";
      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorize.searchParams.set("redirect_uri", callback);
      authorize.searchParams.set("state", state);
      authorize.searchParams.set("code_challenge", challenge);
      authorize.searchParams.set("code_challenge_method", "S256");
      authorize.searchParams.set("allow_signup", "false");
      return new Response(null, {
        status: 302,
        headers: {
          Location: authorize.toString(),
          "Cache-Control": "no-store",
          "Set-Cookie": `${COOKIE}=${state}.${verifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
        }
      });
    }
    if (url.pathname === "/auth/callback" && request.method === "GET") {
      const cookie = cookieValue(request, COOKIE);
      const [savedState, verifier] = cookie.split(".");
      const state = url.searchParams.get("state") || "";
      const code = url.searchParams.get("code") || "";
      if (!savedState || !verifier || !state || savedState !== state || !code) {
        return new Response("認証情報を確認できませんでした。運営ページから再度ログインしてください。", {
          status: 400, headers: { "Set-Cookie": clearCookie(), "Cache-Control": "no-store" }
        });
      }
      try {
        const callback = url.origin + "/auth/callback";
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: callback,
            code_verifier: verifier,
            repository_id: String(env.REPOSITORY_ID)
          })
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok || !tokenData.access_token) {
          const detail = tokenData.error_description || tokenData.error || `HTTP ${tokenResponse.status}`;
          throw new Error(`GitHubのトークン交換に失敗しました: ${detail}`);
        }
        const ghHeaders = {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${tokenData.access_token}`,
          "X-GitHub-Api-Version": API_VERSION
        };
        const userResponse = await fetch("https://api.github.com/user", { headers: ghHeaders });
        if (!userResponse.ok) throw new Error("GitHubアカウントを確認できませんでした。");
        const user = await userResponse.json();
        if (String(user.login).toLowerCase() !== String(env.ADMIN_GITHUB_LOGIN).toLowerCase()) {
          throw new Error("このGitHubアカウントには運営ページの利用権限がありません。");
        }
        const repoResponse = await fetch(`https://api.github.com/repos/rinseishirasu/poppoo-official`, { headers: ghHeaders });
        if (!repoResponse.ok) throw new Error("対象リポジトリへのアクセスを確認できませんでした。");
        const repository = await repoResponse.json();
        if (String(repository.id) !== String(env.REPOSITORY_ID) || !repository.permissions || repository.permissions.push !== true) {
          throw new Error("対象リポジトリへの書き込み権限がありません。GitHub Appの設定を確認してください。");
        }
        const page = htmlPage("GitHub認証が完了しました", {
          token: tokenData.access_token,
          login: user.login,
          expiresIn: Number(tokenData.expires_in || 28800)
        }, frontend);
        const responseHeaders = new Headers(page.headers);
        responseHeaders.set("Set-Cookie", clearCookie());
        return new Response(page.body, { status: 200, headers: responseHeaders });
      } catch (error) {
        const page = errorPage(error.message || "認証に失敗しました。", frontend);
        const responseHeaders = new Headers(page.headers);
        responseHeaders.set("Set-Cookie", clearCookie());
        return new Response(page.body, { status: 200, headers: responseHeaders });
      }
    }
    if (url.pathname === "/auth/complete" && request.method === "GET") {
      return new Response("認証処理を完了できませんでした。最初からやり直してください。", { status: 400 });
    }
    return new Response("Not found", { status: 404 });
  }
};