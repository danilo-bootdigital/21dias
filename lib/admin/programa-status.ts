import type { StatusPrograma } from "./programas-data";

/**
 * Fonte única dos rótulos de status de programa, compartilhada entre o card
 * mobile (programa-card.tsx) e o badge desktop/detalhe (programas-ui.tsx).
 * O tipo é apenas para tipagem (apagado em compile), então este módulo é
 * seguro para Client Components — não puxa o `server-only` de programas-data.
 */
export const STATUS_LABEL: Record<StatusPrograma, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};
