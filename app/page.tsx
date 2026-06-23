import { redirect } from "next/navigation";
import { destinoPosLogin } from "@/lib/auth/destino";

/**
 * Rota raiz: sem tela própria. Roteia conforme autenticação/papel —
 * deslogado → /login; admin → /admin; matrícula ativa → /dashboard;
 * senão → /perfil. Reaproveita a lógica homologada de destinoPosLogin.
 */
export default async function Home() {
  redirect(await destinoPosLogin());
}
