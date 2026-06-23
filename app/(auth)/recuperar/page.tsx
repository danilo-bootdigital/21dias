import Link from "next/link";
import { recuperarSenha } from "@/lib/auth/actions";

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      <h1 className="font-display text-2xl font-semibold">Recuperar senha</h1>
      <p className="mt-1 text-sm text-subtle">Enviaremos um link para seu e-mail.</p>

      {ok ? (
        <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
          Se o e-mail existir, enviamos um link para redefinir a senha.
        </p>
      ) : null}
      {erro ? (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {decodeURIComponent(erro)}
        </p>
      ) : null}

      <form action={recuperarSenha} className="mt-6 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-gold px-4 py-2 font-medium text-ground transition hover:bg-gold-strong"
        >
          Enviar link
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-subtle">
        <Link href="/login" className="hover:text-gold">
          Voltar para entrar
        </Link>
      </div>
    </div>
  );
}
