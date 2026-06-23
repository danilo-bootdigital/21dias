import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// NOTA: client sem generic <Database> por ora (tipos reais via `npm run db:types`).

// /redefinir fora: o link de recuperação cria sessão e PRECISA chegar nessa página.
const AUTH_PATHS = ["/login", "/cadastro", "/recuperar"];
// Área autenticada (expandir conforme novos blocos: dashboard, ranking, feed...).
// /admin: barreira de navegação (auth); o papel admin é checado no layout (is_admin).
const PROTECTED_PATHS = ["/perfil", "/admin"];

/**
 * Renova a sessão (cookies) e aplica proteção básica de rotas.
 * Chamado pelo middleware raiz.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() valida o token no servidor (não confie só no cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = AUTH_PATHS.some((p) => path.startsWith(p));
  const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/perfil";
    return NextResponse.redirect(url);
  }

  return response;
}
