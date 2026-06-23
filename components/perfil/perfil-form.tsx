"use client";

import { useRef, useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { salvarPerfil } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/avatar";

const ESTADO_CIVIL_OPCOES = [
  "Solteiro",
  "Casado",
  "União estável",
  "Divorciado",
  "Viúvo",
  "Prefiro não informar",
];
const SEXO_OPCOES = ["Masculino", "Feminino", "Prefiro não informar"];

const MIME_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const EXT_POR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type PerfilInicial = {
  nome_guerreiro: string;
  idade: number | null;
  peso: number | null;
  estado_civil: string | null;
  sexo: string | null;
  profissao: string | null;
  cidade: string | null;
  bio: string | null;
  foto_url: string | null;
};

const inputCls =
  "rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";
const labelCls = "flex flex-col gap-1 text-sm text-muted";

export function PerfilForm({
  inicial,
  authUserId,
  desabilitado,
}: {
  inicial: PerfilInicial;
  authUserId: string;
  desabilitado?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(inicial.foto_url);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nome, setNome] = useState(inicial.nome_guerreiro);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  function onSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!MIME_PERMITIDOS.includes(file.type)) {
      setErro("Formato inválido. Use PNG, JPG ou WEBP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setErro("Imagem muito grande. O limite é 5MB.");
      e.target.value = "";
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setArquivo(file);
    setPreview(url);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const form = e.currentTarget;

    if (!nome.trim()) {
      setErro("Nome de guerreiro é obrigatório.");
      return;
    }

    const fd = new FormData(form);

    startTransition(async () => {
      try {
        let fotoUrl = inicial.foto_url ?? "";

        if (arquivo) {
          const supabase = createBrowserSupabase();
          const ext = EXT_POR_MIME[arquivo.type];
          const caminho = `${authUserId}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("avatars")
            .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
          if (upErr) {
            setErro("Falha ao enviar a foto. Tente novamente.");
            return;
          }
          const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
          fotoUrl = data.publicUrl;
        }

        fd.set("foto_url", fotoUrl);
        await salvarPerfil(fd); // persiste e redireciona para /perfil?ok=1
      } catch (err) {
        // NEXT_REDIRECT é o fluxo de sucesso do server action — não é erro real.
        if (err && typeof err === "object" && "digest" in err) {
          const d = String((err as { digest?: string }).digest ?? "");
          if (d.startsWith("NEXT_REDIRECT")) throw err;
        }
        setErro("Não foi possível salvar agora. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
      {erro ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300 md:col-span-2">
          {erro}
        </p>
      ) : null}

      {/* Coluna esquerda: foto */}
      <div className="flex flex-col items-center gap-3 md:items-start">
        <span className="text-sm text-muted">Foto do guerreiro</span>
        <Avatar src={preview} nome={nome} size={160} />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onSelecionarArquivo}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={desabilitado || pending}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text transition hover:border-gold disabled:opacity-50"
        >
          Alterar foto
        </button>
        <p className="text-center text-xs text-subtle md:text-left">PNG, JPG ou WEBP. Máx. 5MB.</p>
      </div>

      {/* Coluna direita: campos */}
      <div className="flex flex-col gap-4">
        <label className={labelCls}>
          Nome de guerreiro
          <input
            name="nome_guerreiro"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputCls}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Idade
            <input
              name="idade"
              type="number"
              min={13}
              max={120}
              defaultValue={inicial.idade ?? ""}
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            Peso (kg)
            <input
              name="peso"
              type="number"
              min={30}
              max={300}
              step="0.1"
              defaultValue={inicial.peso ?? ""}
              className={inputCls}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Estado civil
            <select name="estado_civil" defaultValue={inicial.estado_civil ?? ""} className={inputCls}>
              <option value="">—</option>
              {ESTADO_CIVIL_OPCOES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Sexo
            <select name="sexo" defaultValue={inicial.sexo ?? ""} className={inputCls}>
              <option value="">—</option>
              {SEXO_OPCOES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelCls}>
          Profissão
          <input
            name="profissao"
            maxLength={100}
            defaultValue={inicial.profissao ?? ""}
            className={inputCls}
          />
        </label>

        <label className={labelCls}>
          Cidade
          <input
            name="cidade"
            maxLength={100}
            defaultValue={inicial.cidade ?? ""}
            className={inputCls}
          />
        </label>

        <label className={labelCls}>
          Bio
          <textarea
            name="bio"
            rows={3}
            maxLength={500}
            defaultValue={inicial.bio ?? ""}
            className={inputCls}
          />
        </label>

        <button
          type="submit"
          disabled={desabilitado || pending}
          className="self-start rounded-lg bg-gold px-5 py-2 font-medium text-ground transition hover:bg-gold-strong disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}
