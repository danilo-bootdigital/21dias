import { Avatar } from "@/components/ui/avatar";
import { criarPost, curtir, comentar, excluirPost, excluirComentario, moderarPost } from "@/lib/feed/actions";
import type { PostVM, ComentarioVM } from "@/lib/feed/data";

const fmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const quando = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : fmt.format(d);
};

const linkBtn = "text-xs text-subtle transition hover:text-gold";

/** Caixa de novo post (texto). */
export function NovoPostForm() {
  return (
    <form
      action={criarPost}
      className="mb-6 rounded-2xl border border-border bg-surface-raised px-4 py-4"
    >
      <textarea
        name="conteudo"
        rows={3}
        maxLength={2000}
        required
        placeholder="Compartilhe algo com a sua turma…"
        className="w-full resize-none rounded-lg border border-border bg-ground px-3 py-2 text-sm text-text outline-none placeholder:text-subtle focus:border-gold"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
        >
          Publicar
        </button>
      </div>
    </form>
  );
}

function Comentario({ c }: { c: ComentarioVM & { podeModerar: boolean } }) {
  return (
    <li className="flex items-start gap-2">
      <Avatar src={c.autorFoto} nome={c.autorNome} size={24} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text">
          <span className="font-medium">{c.autorNome}</span>{" "}
          <span className="whitespace-pre-wrap break-words text-muted">{c.texto}</span>
        </p>
      </div>
      {c.meu || c.podeModerar ? (
        <form action={excluirComentario}>
          <input type="hidden" name="comentario_id" value={c.id} />
          <button type="submit" className={linkBtn} aria-label="Excluir comentário">
            Excluir
          </button>
        </form>
      ) : null}
    </li>
  );
}

const STATUS_LABEL: Record<PostVM["status"], string> = {
  publicado: "",
  oculto: "Oculto",
  removido: "Removido",
};

export function PostCard({ post, podeModear }: { post: PostVM; podeModear: boolean }) {
  const oculto = post.status !== "publicado";
  return (
    <article
      className={`rounded-2xl border border-border bg-surface-raised px-4 py-4 ${oculto ? "opacity-60" : ""}`}
    >
      <header className="mb-2 flex items-center gap-3">
        <Avatar src={post.autorFoto} nome={post.autorNome} size={36} />
        <div className="flex-1 leading-tight">
          <p className="text-sm font-medium text-text">{post.autorNome}</p>
          <p className="text-xs text-subtle">{quando(post.createdAt)}</p>
        </div>
        {oculto ? (
          <span className="rounded-full border border-amber-700/50 px-2 py-0.5 text-xs text-amber-300">
            {STATUS_LABEL[post.status]}
          </span>
        ) : null}
      </header>

      <p className="mb-3 whitespace-pre-wrap break-words text-sm text-text">{post.conteudo}</p>

      <div className="flex items-center gap-4">
        <form action={curtir}>
          <input type="hidden" name="post_id" value={post.id} />
          <button
            type="submit"
            className={`flex items-center gap-1 text-sm transition ${post.euCurti ? "text-gold" : "text-subtle hover:text-gold"}`}
            aria-pressed={post.euCurti}
          >
            <span aria-hidden>{post.euCurti ? "♥" : "♡"}</span>
            {post.curtidas > 0 ? post.curtidas : ""} Curtir
          </button>
        </form>
        <span className="text-sm text-subtle">
          {post.comentarios.length} comentário{post.comentarios.length === 1 ? "" : "s"}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {podeModear ? (
            <form action={moderarPost}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="acao" value={oculto ? "republicar" : "ocultar"} />
              <button type="submit" className={linkBtn}>
                {oculto ? "Republicar" : "Ocultar"}
              </button>
            </form>
          ) : null}
          {post.meuPost || podeModear ? (
            <form action={excluirPost}>
              <input type="hidden" name="post_id" value={post.id} />
              <button type="submit" className={linkBtn}>
                Excluir
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {post.comentarios.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {post.comentarios.map((c) => (
            <Comentario key={c.id} c={{ ...c, podeModerar: podeModear }} />
          ))}
        </ul>
      ) : null}

      <form action={comentar} className="mt-3 flex items-center gap-2">
        <input type="hidden" name="post_id" value={post.id} />
        <input
          name="texto"
          maxLength={1000}
          required
          placeholder="Escreva um comentário…"
          className="flex-1 rounded-lg border border-border bg-ground px-3 py-2 text-sm text-text outline-none placeholder:text-subtle focus:border-gold"
        />
        <button type="submit" className="text-sm text-gold transition hover:text-gold-strong">
          Enviar
        </button>
      </form>
    </article>
  );
}
