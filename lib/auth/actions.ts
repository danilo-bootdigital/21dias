"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { reivindicarEntitlements } from "@/lib/entitlements/claim";

async function getOrigin() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  await reivindicarEntitlements(); // vincula compras/concessões pendentes por e-mail
  revalidatePath("/", "layout");
  redirect("/perfil");
}

export async function cadastrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const origin = await getOrigin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/perfil` },
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
  redirect("/perfil");
}

export async function loginGoogle() {
  const origin = await getOrigin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/perfil` },
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

  const { error } = await supabase.from("guerreiro_profiles").upsert(
    {
      user_id: domainUser.id,
      nome_guerreiro,
      cidade: String(formData.get("cidade") ?? "").trim() || null,
      foto_url: String(formData.get("foto_url") ?? "").trim() || null,
      bio: String(formData.get("bio") ?? "").trim() || null,
    },
    { onConflict: "user_id" },
  );
  if (error) redirect(`/perfil?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/perfil");
  redirect("/perfil?ok=1");
}
