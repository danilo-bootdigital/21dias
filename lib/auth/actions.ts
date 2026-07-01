"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { reivindicarEntitlements } from "@/lib/entitlements/claim";
import { destinoPosLogin } from "@/lib/auth/destino";

async function getOrigin() {
  // A URL canônica do app é a fonte de verdade para links enviados por e-mail
  // (recuperação/confirmação de conta). NÃO dependemos do header `origin` da
  // requisição, que varia por domínio de preview e jamais deve montar URLs de
  // auth em produção. Em produção, defina NEXT_PUBLIC_APP_URL na Vercel.
  const configurada = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (configurada) return configurada;
  const h = await headers();
  return h.get("origin") ?? "http://localhost:3000";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  await reivindicarEntitlements(); // vincula compras/concessões pendentes por e-mail
  revalidatePath("/", "layout");
  redirect(await destinoPosLogin());
}

export async function cadastrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const origin = await getOrigin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/inicio` },
  });
  if (error) redirect(`/cadastro?erro=${encodeURIComponent(error.message)}`);
  redirect("/cadastro?ok=1");
}

export async function recuperarSenha(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const origin = await getOrigin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir`,
  });
  if (error) redirect(`/recuperar?erro=${encodeURIComponent(error.message)}`);
  redirect("/recuperar?ok=1");
}

export async function redefinirSenha(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/redefinir?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect(await destinoPosLogin());
}

export async function loginGoogle() {
  const origin = await getOrigin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/inicio` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  if (data?.url) redirect(data.url);
}

export async function sair() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

const ESTADO_CIVIL_OPCOES = [
  "Solteiro",
  "Casado",
  "União estável",
  "Divorciado",
  "Viúvo",
  "Prefiro não informar",
];
const SEXO_OPCOES = ["Masculino", "Feminino", "Prefiro não informar"];

/** Extrai o caminho do objeto dentro do bucket `avatars` a partir da URL pública. */
function caminhoAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  const marcador = "/storage/v1/object/public/avatars/";
  const i = url.indexOf(marcador);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marcador.length));
}

/** Cria ou atualiza o Perfil do Guerreiro do usuário autenticado. */
export async function salvarPerfil(formData: FormData) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: domainUserRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  const domainUser = domainUserRow as { id: string } | null;
  if (!domainUser) redirect("/perfil?erro=usuario_nao_sincronizado");

  const nome_guerreiro = String(formData.get("nome_guerreiro") ?? "").trim();
  if (!nome_guerreiro) redirect("/perfil?erro=nome_obrigatorio");

  // ---- Campos opcionais + validação defensiva (a UI também valida) ----------
  const idadeRaw = String(formData.get("idade") ?? "").trim();
  let idade: number | null = null;
  if (idadeRaw) {
    idade = Number.parseInt(idadeRaw, 10);
    if (!Number.isInteger(idade) || idade < 13 || idade > 120)
      redirect("/perfil?erro=Idade%20deve%20estar%20entre%2013%20e%20120.");
  }

  const pesoRaw = String(formData.get("peso") ?? "").replace(",", ".").trim();
  let peso: number | null = null;
  if (pesoRaw) {
    peso = Number.parseFloat(pesoRaw);
    if (!Number.isFinite(peso) || peso < 30 || peso > 300)
      redirect("/perfil?erro=Peso%20deve%20estar%20entre%2030%20e%20300%20kg.");
  }

  const estado_civil = String(formData.get("estado_civil") ?? "").trim() || null;
  if (estado_civil && !ESTADO_CIVIL_OPCOES.includes(estado_civil))
    redirect("/perfil?erro=Estado%20civil%20inv%C3%A1lido.");

  const sexo = String(formData.get("sexo") ?? "").trim() || null;
  if (sexo && !SEXO_OPCOES.includes(sexo)) redirect("/perfil?erro=Sexo%20inv%C3%A1lido.");

  const profissao = String(formData.get("profissao") ?? "").trim().slice(0, 100) || null;
  const cidade = String(formData.get("cidade") ?? "").trim().slice(0, 100) || null;
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 500) || null;
  const foto_url = String(formData.get("foto_url") ?? "").trim() || null;

  // Foto anterior (para remover do Storage após troca bem-sucedida).
  const { data: anteriorRow } = await supabase
    .from("guerreiro_profiles")
    .select("foto_url")
    .eq("user_id", domainUser.id)
    .maybeSingle();
  const fotoAnterior = (anteriorRow as { foto_url?: string } | null)?.foto_url ?? null;

  const { error } = await supabase.from("guerreiro_profiles").upsert(
    {
      user_id: domainUser.id,
      nome_guerreiro,
      idade,
      peso,
      estado_civil,
      sexo,
      profissao,
      cidade,
      foto_url,
      bio,
    },
    { onConflict: "user_id" },
  );
  if (error) redirect(`/perfil?erro=${encodeURIComponent(error.message)}`);

  // Best-effort: remove a foto antiga do Storage se foi trocada e era do bucket
  // `avatars`. A policy de Storage só deixa o dono apagar a própria pasta.
  if (fotoAnterior && fotoAnterior !== foto_url) {
    const caminho = caminhoAvatar(fotoAnterior);
    if (caminho) await supabase.storage.from("avatars").remove([caminho]);
  }

  revalidatePath("/", "layout"); // atualiza o avatar exibido no header
  redirect("/perfil?ok=1");
}
