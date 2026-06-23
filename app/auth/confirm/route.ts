import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { reivindicarEntitlements } from "@/lib/entitlements/claim";

function mensagemErro(code: string | null, desc: string | null) {
  if (code === "otp_expired") return "O link expirou. Solicite um novo.";
  if (code === "access_denied") return "Link inválido ou já utilizado.";
  return desc ? desc.replace(/\+/g, " ") : "Não foi possível validar o link.";
}

/**
 * Verificação de links de e-mail (confirmação de cadastro e recuperação).
 * Alinhado ao fluxo PKCE padrão do Supabase: trata `code` (exchangeCodeForSession),
 * com fallback para `token_hash`+`type` (verifyOtp) e tratamento de erro.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/perfil";
  // erro de recuperação volta p/ /recuperar; demais p/ /login
  const destinoErro = next.startsWith("/redefinir") ? "/recuperar" : "/login";

  // 1) Erro vindo do Supabase (link expirado / já usado)
  const err = searchParams.get("error");
  const errCode = searchParams.get("error_code");
  const errDesc = searchParams.get("error_description");
  if (err || errCode) {
    const msg = mensagemErro(errCode, errDesc);
    return NextResponse.redirect(new URL(`${destinoErro}?erro=${encodeURIComponent(msg)}`, origin));
  }

  const supabase = await createServerSupabase();

  // 2) Fluxo PKCE padrão: ?code=...
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await reivindicarEntitlements();
      return NextResponse.redirect(new URL(next, origin));
    }
    return NextResponse.redirect(
      new URL(`${destinoErro}?erro=${encodeURIComponent(error.message)}`, origin),
    );
  }

  // 3) Fallback: token_hash + type (templates customizados)
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await reivindicarEntitlements();
      return NextResponse.redirect(new URL(next, origin));
    }
    return NextResponse.redirect(
      new URL(`${destinoErro}?erro=${encodeURIComponent(error.message)}`, origin),
    );
  }

  return NextResponse.redirect(new URL(`${destinoErro}?erro=link_invalido`, origin));
}
