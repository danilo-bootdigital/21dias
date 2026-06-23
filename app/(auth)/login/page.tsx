import Link from "next/link";
import { login, loginGoogle } from "@/lib/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      <h1 className="font-display text-2xl font-semibold">Entrar</h1>
      <p className="mt-1 text-sm text-subtle">Acesse sua jornada.</p>

      {erro ? (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {decodeURIComponent(erro)}
        </p>
      ) : null}

      <form action={login} className="mt-6 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Senha"
          className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-gold px-4 py-2 font-medium text-ground transition hover:bg-gold-strong"
        >
          Entrar
        </button>
      </form>

      <form action={loginGoogle} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-gold"
        >
          Entrar com Google
        </button>
      </form>

      <div className="mt-6 flex justify-between text-sm text-subtle">
        <Link href="/recuperar" className="hover:text-gold">
          Esqueci a senha
        </Link>
        <Link href="/cadastro" className="hover:text-gold">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
