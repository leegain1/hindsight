import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth·매직링크가 돌아오는 자리.
 *
 * 전에는 실패하면 `?error=auth_failed` 하나만 붙여 로그인 화면으로 보냈고,
 * 그 화면은 error 파라미터를 읽지 않았다. 결과적으로 구글 로그인이 안 될 때
 * 아무 말 없이 로그인 화면으로 되돌아왔다 — 뭘 잘못했는지 알 수가 없었다.
 * 이제 원인을 구분해 넘기고, 실제 메시지는 서버 로그에 남긴다.
 *
 * next 는 URL 로 만들어 붙인다. 전에는 `${origin}${next}` 로 문자열을
 * 이어서, 외부로 나가지는 않았지만 검증 없이 경로를 신뢰하고 있었다.
 */

/** 로그인 화면이 알아듣는 실패 사유 */
type Reason = "denied" | "no_code" | "exchange_failed" | "not_configured";

/** 내부 경로만 허용한다 — `//evil.com` 같은 값이 그대로 흘러가지 않게 */
function safeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function backToLogin(origin: string, reason: Reason, next: string) {
  const url = new URL("/auth/login", origin);
  url.searchParams.set("error", reason);
  const target = safeNext(next);
  if (target !== "/") url.searchParams.set("next", target);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // 구글 동의 화면에서 취소하면 code 대신 error 가 붙어서 돌아온다
  const providerError = searchParams.get("error");
  if (providerError) {
    console.warn(
      `[auth/callback] provider error: ${providerError}`,
      searchParams.get("error_description") ?? "",
    );
    return backToLogin(
      origin,
      providerError === "access_denied" ? "denied" : "exchange_failed",
      next,
    );
  }

  if (!code) {
    return backToLogin(origin, "no_code", next);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return backToLogin(origin, "not_configured", next);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // 여기서 막히면 대개 Supabase 의 Redirect URLs 에 이 주소가 없거나,
    // Google Provider 의 Client ID/Secret 이 짝이 안 맞는 경우다.
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return backToLogin(origin, "exchange_failed", next);
  }

  return NextResponse.redirect(new URL(safeNext(next), origin));
}
