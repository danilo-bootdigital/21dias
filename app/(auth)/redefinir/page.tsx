import { redefinirSenha } from "@/lib/auth/actions";

export default async function RedefinirPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      <h1 className="font-display text-2xl font-semibold">Nova senha</h1>
      <p className="mt-1 text-sm text-subtle">Defina sua nova senha de acesso.</p>

      {erro ? (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {decodeURIComponent(erro)}
        </p>
      ) : null}

      <form action={redefinirSenha} className="mt-6 flex flex-col gap-3">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Nova senha (mín. 8 caracteres)"
          className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-gold px-4 py-2 font-medium text-ground transition hover:bg-gold-strong"
        >
          Salvar nova senha
        </button>
      </form>
    </div>
  );
}
