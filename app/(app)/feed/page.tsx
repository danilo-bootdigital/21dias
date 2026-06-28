import { Aviso } from "@/components/admin/ui";
import { NovoPostForm, PostCard } from "@/components/feed";
import { carregarFeed } from "@/lib/feed/data";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const feed = await carregarFeed();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl text-text">Feed da turma</h1>
        {feed.turmaCodigo ? (
          <p className="text-sm text-subtle">
            {feed.programaNome ? `${feed.programaNome} · ` : ""}Turma {feed.turmaCodigo}
          </p>
        ) : null}
      </header>

      <Aviso ok={ok} erro={erro} />

      {!feed.meuMatriculaId ? (
        <p className="rounded-2xl border border-border bg-surface-raised px-4 py-6 text-sm text-muted">
          Você ainda não está em uma turma ativa. Assim que sua jornada começar, o feed da sua turma
          aparecerá aqui.
        </p>
      ) : (
        <>
          <NovoPostForm />
          {feed.posts.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface-raised px-4 py-6 text-center text-sm text-muted">
              Ainda não há publicações. Seja o primeiro a compartilhar algo com a turma.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {feed.posts.map((post) => (
                <PostCard key={post.id} post={post} podeModear={feed.podeModear} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
