import { redirect } from "next/navigation";
import { destinoPosLogin } from "@/lib/auth/destino";

/** Roteador de pouso: envia o usuário ao destino certo conforme papel/matrícula. */
export default async function InicioPage() {
  redirect(await destinoPosLogin());
}
