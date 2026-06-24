"use client";

import { useRef, useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { registrarImagensProtocolo } from "@/lib/jornada/protocolo-imagens";

const MIME_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const EXT_POR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type CampoImagemView = {
  slot: number;
  titulo: string | null;
  instrucao: string | null;
  obrigatorio: boolean;
};

/** Card de um campo de imagem: mostra envios já feitos e permite enviar mais. */
export function CampoImagemUploader({
  authUserId,
  diaNumero,
  campo,
  enviados,
  podeEnviar,
  retorno,
}: {
  authUserId: string;
  diaNumero: number;
  campo: CampoImagemView;
  enviados: string[];
  podeEnviar: boolean;
  retorno: string;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null);
    const files = Array.from(e.target.files ?? []);
    for (const f of files) {
      if (!MIME_PERMITIDOS.includes(f.type)) {
        setErro("Formato inválido. Use PNG, JPG ou WEBP.");
        e.target.value = "";
        return;
      }
      if (f.size > MAX_BYTES) {
        setErro("Imagem muito grande. O limite é 5MB.");
        e.target.value = "";
        return;
      }
    }
    setArquivos(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function onEnviar() {
    setErro(null);
    if (!arquivos.length) {
      setErro("Selecione ao menos uma imagem.");
      return;
    }
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabase();
        const fd = new FormData();
        fd.set("slot", String(campo.slot));
        fd.set("dia_numero", String(diaNumero));
        fd.set("retorno", retorno);
        for (let i = 0; i < arquivos.length; i++) {
          const arquivo = arquivos[i];
          const ext = EXT_POR_MIME[arquivo.type];
          const caminho = `${authUserId}/${diaNumero}/${campo.slot}/${Date.now()}-${i}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("protocolos")
            .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
          if (upErr) {
            setErro("Falha ao enviar a imagem. Tente novamente.");
            return;
          }
          const { data } = supabase.storage.from("protocolos").getPublicUrl(caminho);
          fd.append("url", data.publicUrl);
        }
        await registrarImagensProtocolo(fd);
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err) {
          const d = String((err as { digest?: string }).digest ?? "");
          if (d.startsWith("NEXT_REDIRECT")) throw err;
        }
        setErro("Não foi possível enviar agora. Tente novamente.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-text">{campo.titulo || `Foto ${campo.slot}`}</p>
        {campo.obrigatorio ? (
          <span className="rounded-full border border-amber-900/60 px-2 py-0.5 text-xs text-amber-300">
            Obrigatório
          </span>
        ) : null}
      </div>
      {campo.instrucao ? <p className="mt-1 text-sm text-subtle">{campo.instrucao}</p> : null}

      {enviados.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {enviados.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Envio ${i + 1}`}
              className="h-20 w-20 rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-subtle">Nenhuma imagem enviada ainda.</p>
      )}

      {podeEnviar ? (
        <div className="mt-3 flex flex-col gap-2">
          {erro ? (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {erro}
            </p>
          ) : null}
          {previews.length ? (
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Prévia ${i + 1}`}
                  className="h-20 w-20 rounded-lg border border-gold/40 object-cover"
                />
              ))}
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={onSelecionar}
            className="hidden"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text transition hover:border-gold disabled:opacity-50"
            >
              Selecionar imagens
            </button>
            <button
              type="button"
              onClick={onEnviar}
              disabled={pending || !arquivos.length}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar"}
            </button>
          </div>
          <p className="text-xs text-subtle">PNG, JPG ou WEBP. Máx. 5MB cada.</p>
        </div>
      ) : null}
    </div>
  );
}
