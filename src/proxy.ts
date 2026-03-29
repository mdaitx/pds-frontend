import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isMiddlewareGuestSuccessRedirectPath } from '@/lib/auth-routes';

/**
 * Copia cookies definidos na resposta “next” (ex.: refresh de sessão) para uma `redirect`.
 * Evita perder tokens atualizados ao redirecionar antes de devolver a resposta ao browser.
 */
function forwardAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

/**
 * Proxy “best effort” (Next.js `proxy.ts`):
 * - Atualiza sessão Supabase em cookies (`getUser()` dispara refresh quando necessário).
 * - Sem usuário válido em rotas `/dashboard/*` → `/login` (com `?next=` para retorno opcional).
 * - Com usuário em login/signup/forgot → `/dashboard` (exceto `/reset-password`; ver `auth-routes`).
 *
 * **Não** substitui: validação de papel (OWNER/ADMIN/DRIVER) — isso exige `/auth/me` no cliente
 * (`DashboardRouteGuard`). A API Nest continua sendo a barreira definitiva.
 *
 * Detalhes: `docs/AUTH-ROTAS.md`
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && pathname.startsWith('/dashboard')) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(login);
    forwardAuthCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (user && isMiddlewareGuestSuccessRedirectPath(pathname)) {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    forwardAuthCookies(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Executa em todas as rotas exceto assets estáticos (recomendação Supabase + Next).
     * Assim o refresh de sessão roda nas navegações que importam para auth.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
