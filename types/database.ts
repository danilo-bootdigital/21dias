/**
 * Tipos do banco.
 *
 * PLACEHOLDER PERMISSIVO — ainda não geramos os tipos reais do schema.
 * O index signature deixa as queries (`.from(...)`) compilarem com Row/Insert
 * frouxos (any). Substituir pelos tipos reais com `npm run db:types` quando
 * tivermos acesso à CLI/projeto.
 */
type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: { [key: string]: LooseTable };
    Views: { [key: string]: { Row: Record<string, unknown> } };
    Functions: { [key: string]: { Args: Record<string, unknown>; Returns: unknown } };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: Record<string, unknown> };
  };
};
