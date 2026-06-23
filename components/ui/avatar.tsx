import Image from "next/image";

/** Iniciais a partir do nome (até 2 letras) para o fallback sem foto. */
function iniciais(nome?: string | null): string {
  const limpo = (nome ?? "").trim();
  if (!limpo) return "?";
  const partes = limpo.split(/\s+/);
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
}

/**
 * Avatar circular do guerreiro. Mostra a foto quando houver; caso contrário,
 * um fallback dourado com as iniciais. Usado no header e na página de perfil.
 */
export function Avatar({
  src,
  nome,
  size = 40,
  className = "",
}: {
  src?: string | null;
  nome?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  const base = "relative shrink-0 overflow-hidden rounded-full border border-border bg-surface";

  if (src) {
    return (
      <span className={`${base} ${className}`} style={dim}>
        <Image
          src={src}
          alt={nome ? `Foto de ${nome}` : "Foto do guerreiro"}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`${base} flex items-center justify-center font-display font-semibold text-gold ${className}`}
      style={{ ...dim, fontSize: Math.max(12, Math.round(size * 0.4)) }}
      aria-label={nome ? `Foto de ${nome}` : "Sem foto"}
    >
      {iniciais(nome)}
    </span>
  );
}
