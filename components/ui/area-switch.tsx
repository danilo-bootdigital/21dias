import Link from "next/link";

/**
 * Botão de navegação entre as áreas (Guerreiro ⇄ Administrativa).
 * Fonte única do visual "premium" (pílula com borda/texto dourado) usado nos
 * dois layouts — não duplicar estas classes em outro lugar.
 */
export function AreaSwitch({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border border-gold/40 px-3 py-1 text-sm text-gold transition hover:bg-gold/10 ${className}`}
    >
      {children}
    </Link>
  );
}
