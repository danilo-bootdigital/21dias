"use server";

import { redirect } from "next/navigation";
import {
  cancelarMatricula,
  reativarMatricula,
  transferirMatricula,
  concederAcessoManual,
} from "@/lib/admin/access";

type Origem = "cortesia" | "convite" | "offline" | "interno" | "teste";

function voltar(formData: FormData, r: { ok?: boolean; error?: string; aviso?: string }) {
  const back = String(formData.get("back") || "/admin/matriculas");
  const msg = r.error
    ? `erro=${encodeURIComponent(r.error)}`
    : `ok=${encodeURIComponent(r.aviso || "feito")}`;
  redirect(`${back}?${msg}`);
}

export async function formCancelar(formData: FormData) {
  voltar(formData, await cancelarMatricula(String(formData.get("matriculaId"))));
}

export async function formReativar(formData: FormData) {
  voltar(formData, await reativarMatricula(String(formData.get("matriculaId"))));
}

export async function formTransferir(formData: FormData) {
  voltar(
    formData,
    await transferirMatricula(
      String(formData.get("matriculaId")),
      String(formData.get("novaTurmaId")),
    ),
  );
}

export async function formConceder(formData: FormData) {
  voltar(
    formData,
    await concederAcessoManual({
      email: String(formData.get("email") ?? ""),
      programaId: String(formData.get("programaId") ?? ""),
      turmaId: String(formData.get("turmaId") ?? "") || null,
      origem: String(formData.get("origem") ?? "cortesia") as Origem,
      motivo: String(formData.get("motivo") ?? ""),
    }),
  );
}
