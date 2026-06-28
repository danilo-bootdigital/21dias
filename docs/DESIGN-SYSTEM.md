# DESIGN SYSTEM — Código 21

> Biblioteca oficial de componentes. **Obrigatória para toda implementação futura: nenhuma tela pode criar novos padrões visuais fora deste documento.** Mobile-first (99% do uso é celular); desktop é adaptação.
> Faz parte da Constituição do Código 21, junto de: [Experiência](CONSTITUICAO-EXPERIENCIA-GUERREIRO.md) · [Brand Language](BRAND-LANGUAGE.md) · [Motion Language](MOTION-LANGUAGE.md). Status: **v1 — 2026-06-28 (aguardando aprovação)**.

## Regras de uso

1. Toda tela é montada **apenas** com estes componentes e tokens. Precisou de algo novo? Primeiro estende-se este documento.
2. **Mobile-first sempre:** o componente nasce para o polegar; variações `md:`/`lg:` são adaptação.
3. Todo componente respeita as três constituições: hierarquia/emoção (Experiência), texto (Brand Language), movimento (Motion Language).
4. Já existem como base (Fase 1–2, a serem expandidos): `Button`, `Card`, `Screen`, `Eyebrow`, `ScreenTitle` (`components/ui/primitives.tsx`), `BottomNav`, `Avatar`, `AreaSwitch`.

---

# Parte A — Fundações

## Tokens de cor
Definidos em `tailwind.config.ts` + `app/globals.css` (fonte única):
`ground #0D0D0D` · `surface #161513` · `surface-raised #1E1C18` · `border #2A2824` · `line #34302A` · `text #F6F2EA` · `muted #C7C1B4` · `subtle #8C8578` · `gold #C8A45D` · `gold-strong #B89146` · `gold-bright #E4C77E`.
**Semânticas** (separadas do dourado de marca): `success #6FAE7E` · `warning #E0B45A` · `danger #C9755F` · `info #7FA6C9`. Usadas só para estado, nunca como acento decorativo.

## Espaçamento (base 4px)
`2xs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64`. Gutter padrão da tela = `lg (20–24)`. Gap entre cards = `md`. Padding interno de card = `lg`. **Nunca** valores fora da escala.

## Tipografia
Display = Archivo (self-hosted). Utilitários oficiais (globals): `.h-display` (título de tela), `.h-section`, `.h-card`, `.eyebrow`. Corpo = `text-base` (16px mínimo no mobile — nunca <14px para leitura). Escala fluida via `--step-*`. Números de dados: `tabular-nums`.

## Bordas
Hairline padrão `1px solid border`. Divisor sutil usa `line`. Sem bordas duplas. Borda de destaque/ativo = `gold/40`.

## Raio
`sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · full 9999`. Botões/inputs = `xl`. Cards = `2xl`. Chips/badges/avatar = `full`. Bottom sheet = topo `2xl`.

## Sombras
Em fundo quase-preto, a elevação vem mais de **cor de superfície + borda** do que de sombra. Sombras suaves:
- `shadow-sm`: `0 1px 2px rgba(0,0,0,.4)`
- `shadow-md`: `0 8px 24px -12px rgba(0,0,0,.6)`
- `shadow-lg`: `0 20px 48px -20px rgba(0,0,0,.7)`
- `glow-gold` (cerimonial/ativo): `0 0 0 1px rgba(200,164,93,.4), 0 0 20px rgba(200,164,93,.18)`

## Elevação (camadas)
| Nível | Superfície | Sombra | Uso |
|---|---|---|---|
| e0 | `ground` | — | fundo da página |
| e1 | `surface` + borda | — | cards, inputs |
| e2 | `surface-raised` + borda | `shadow-md` | cards em destaque, FAB |
| e3 | `surface-raised` + scrim | `shadow-lg` | bottom sheets, dialogs |
**z-index:** base 0 · sticky header 30 · bottom nav 40 · FAB 45 · scrim/sheet/dialog 50 · toast 60.

## Grid mobile & container
Coluna única. Container `max-w-screen-sm` (640px) centralizado, gutters `px-5`. Conteúdo em `flex flex-col gap-*`. Desktop: mesma coluna centralizada (não esticar largura de leitura); grids `md:` só quando agregam.

## Safe area
Header: `pt-[max(0.75rem,env(safe-area-inset-top))]`. Bottom nav e elementos fixos inferiores: `pb-[env(safe-area-inset-bottom)]`. Conteúdo reserva espaço para a bottom nav (`pb-[calc(76px+env(safe-area-inset-bottom))]`). `viewport-fit=cover` já configurado.

## Sistema de ícones
Estilo **line**, grid 24px, `stroke 1.75`, `currentColor`, cantos/junções arredondados (igual à BottomNav). Tamanhos: `16 / 20 / 24` (nav e ações). **Oficial:** `lucide-react` (instalação futura, self-hosted via npm, sem CDN) — ou SVG inline no mesmo padrão. Sem ícones coloridos/3D/emoji como ícone de UI (emoji só como acento expressivo: 🔥 streak).

## Haptic feedback
Tokens semânticos (acionados em wrapper nativo Capacitor/RN; web é fallback):
| Token | Quando | iOS | Android |
|---|---|---|---|
| `selection` | troca de tab/segment, toggle | `selectionChanged` | `HapticFeedbackConstants.CLOCK_TICK` |
| `impactLight` | press de botão | `UIImpactFeedbackGenerator(.light)` | vibrate 10ms |
| `impactMedium` | check-in salvo, abrir sheet | `.medium` | vibrate 20ms |
| `success` | dia perfeito, conquista | `UINotificationFeedbackGenerator(.success)` | padrão curto |
| `warning` | sequência em risco | `.warning` | vibrate 30ms |
| `error` | falha de ação | `.error` | vibrate [10,40,10] |
**Honestidade técnica:** Safari iOS (web) **não** expõe Vibration API → haptic é no-op no web iOS; só funciona no app nativo. Android web usa `navigator.vibrate`. Helper único `haptic(token)` com detecção de plataforma; nunca disparar haptic em scroll/loop.

---

# Parte B — Componentes

> Cada componente: **finalidade · quando usar · quando NÃO · variantes · estados · mobile · acessibilidade · animação · mensagens**.

## Botões
- **Finalidade:** disparar a ação de uma tela.
- **Usar:** ação primária/secundária clara.
- **NÃO usar:** para navegação entre seções (use Tabs/Nav) nem para muitos itens (use lista).
- **Variantes:** `primary` (ação principal, dourado sólido), `secondary` (superfície + borda), `outline` (só borda dourada), `ghost` (texto, ações terciárias), `danger` (ação destrutiva, `danger`), `success` (confirmação positiva — uso raro).
- **Estados:** default · hover (desktop) · pressed · focus-visible (ring gold-bright) · loading (spinner inline + label) · disabled (opacity 60, sem evento).
- **Mobile:** altura mínima **48px**, `full-width` por padrão; uma ação primária por tela.
- **A11y:** `<button>` real, label descritivo da consequência, `aria-busy` no loading, foco visível.
- **Animação:** press `scale(.98)` em `fast`; loading entra em `fast`.
- **Mensagens (Brand):** o rótulo diz o que acontece — “Fazer check-in de hoje”, “Confirmar”, “Sair da conta”. Nunca “Enviar dados”.

## Inputs (texto)
- **Finalidade:** capturar um dado curto.
- **Usar:** e-mail, nome, números.
- **NÃO usar:** texto longo (Textarea) nem escolha de opções (Select).
- **Variantes:** texto, e-mail, número, senha (com toggle de revelar).
- **Estados:** default · focus (borda gold) · preenchido · erro (borda `danger` + mensagem) · disabled.
- **Mobile:** altura ≥48px, `font-size ≥16px` (evita zoom do iOS), `inputmode`/`autocomplete` corretos, label sempre visível (não só placeholder).
- **A11y:** `<label>` associado, `aria-invalid` + `aria-describedby` no erro.
- **Animação:** borda transiciona em `fast`; mensagem de erro faz fade `base`.
- **Mensagens:** erro orienta — “E-mail inválido. Confira e tente de novo.” Nunca “campo inválido”.

## Textareas
- **Finalidade:** texto livre (post, bio).
- **Usar:** feed, bio do perfil.
- **NÃO usar:** dados estruturados.
- **Estados:** como Input + contador opcional + auto-grow.
- **Mobile:** mínimo 3 linhas, ≥16px, sem resize manual no mobile.
- **A11y:** label + contador anunciado (`aria-live` discreto).
- **Animação:** auto-grow suave em `fast`.
- **Mensagens:** placeholder convida — “Compartilhe algo com a sua turma…”.

## Checkbox & Toggle
- **Finalidade:** seleção booleana — Checkbox (item de lista, ex.: inegociáveis do check-in) e Toggle (liga/desliga, ex.: "check-in público").
- **Usar:** marcar hábitos cumpridos, opções on/off.
- **NÃO usar:** escolha entre opções exclusivas (use Segmented/Select) nem ação (use Button).
- **Variantes:** Checkbox (com label + hint opcional) · Toggle (switch).
- **Estados:** default · checked · focus-visible · disabled.
- **Mobile:** linha de toque ≥44px; nativos (acessíveis); acento dourado.
- **A11y:** `<input>` real com `<label>` associado; Toggle expõe `peer-focus-visible`.
- **Animação:** Toggle desliza o thumb em `fast` `standard`.
- **Mensagens:** rótulo do hábito/opção, direto.

## Selects
- **Finalidade:** escolher 1 de poucas opções.
- **Usar:** estado civil, sexo, filtros.
- **NÃO usar:** >7 opções com busca (use Search/lista) nem 2 opções (use Segmented/Toggle).
- **Mobile:** abrir como **Bottom Sheet** de opções (não dropdown nativo apertado) quando custom; senão `<select>` nativo (melhor a11y).
- **Estados:** default · aberto · selecionado · erro · disabled.
- **A11y:** preferir `<select>` nativo; se custom, `role="listbox"` + teclado.
- **Animação:** sheet sobe em `base` (ver Bottom Sheets).
- **Mensagens:** placeholder “Selecione…”, nunca “-- escolha --”.

## Search
- **Finalidade:** filtrar listas (turmas, guerreiros).
- **Usar:** listas longas.
- **NÃO usar:** listas curtas (≤7).
- **Variantes:** inline (no topo da lista) · em sheet.
- **Estados:** vazio · digitando (debounce) · resultados · sem resultados (estado vazio próprio) · limpar (✕).
- **Mobile:** ícone de lupa, ≥48px, botão limpar, teclado `search`.
- **A11y:** `role="search"`, label, resultados com `aria-live="polite"`.
- **Animação:** resultados em stagger `base`.
- **Mensagens:** vazio de busca — “Nenhum guerreiro encontrado. Tente outro nome.”

## Chips
- **Finalidade:** filtro/seleção rápida e removível.
- **Usar:** filtros de ranking, tags selecionáveis.
- **NÃO usar:** como botão de ação principal nem rótulo estático (use Tag).
- **Variantes:** filtro (toggle), input (removível com ✕), escolha única.
- **Estados:** default · selecionado (gold) · disabled.
- **Mobile:** ≥40px de toque, scroll horizontal sem barra.
- **A11y:** `role` adequado (`button`/`checkbox`), estado `aria-pressed`.
- **Animação:** seleção muda cor em `fast`.
- **Mensagens:** rótulos curtos — “Geral”, “Semanal”, “Presença”.

## Tags
- **Finalidade:** rótulo **estático** de status/categoria (não clicável).
- **Usar:** status (“Oculto”), fase do programa.
- **NÃO usar:** quando precisa de ação (use Chip/Badge).
- **Variantes:** neutra · semântica (success/warning/danger/info).
- **Estados:** estático.
- **Mobile/A11y:** texto legível, contraste AA; é conteúdo, não controle.
- **Animação:** none (ou fade ao aparecer).
- **Mensagens:** uma palavra/curto — “Oculto”, “Fase 2”.

## Badges
- **Finalidade:** contador/indicador anexado a outro elemento.
- **Usar:** notificações não lidas, “novo”.
- **NÃO usar:** para texto longo.
- **Variantes:** ponto (dot) · numérica · rótulo.
- **Estados:** visível/oculto; 99+ trunca.
- **Mobile:** mínimo 16px; posiciona no canto do alvo.
- **A11y:** anunciar contexto (“3 não lidas”), não só o número.
- **Animação:** entra com `scale` `fast`.
- **Mensagens:** número ou “novo”.

## Medalhas
- **Finalidade:** símbolo de conquista (honra).
- **Usar:** perfil, momento de conquista, ao lado do nome.
- **NÃO usar:** como ícone decorativo solto.
- **Variantes:** bronze/prata/ouro (ou faixas de evolução), tamanho `sm` (ao lado do nome) e `lg` (cerimonial). Reaproveita `MedalhaBadge`/`getEvolutionReward`.
- **Estados:** conquistada · bloqueada (silhueta) · recém-conquistada (entrada cerimonial).
- **Mobile:** alvo de detalhe abre sheet com significado.
- **A11y:** `aria-label` com nome e faixa da medalha.
- **Animação (Motion):** conquista = fade+scale `ceremonial` + **um** brilho; nunca loop.
- **Mensagens:** “Medalha conquistada. Seu esforço agora tem forma.”

## Avatares
- **Finalidade:** identidade visual do guerreiro.
- **Usar:** header, feed, ranking, perfil.
- **Variantes:** foto · iniciais (fallback dourado) · tamanhos `24/34/36/72`. Reaproveita `Avatar`.
- **Estados:** com foto · sem foto · (opcional) anel de progresso ao redor.
- **Mobile/A11y:** `alt` com o nome; toque abre perfil quando aplicável.
- **Animação:** fade ao carregar a imagem.
- **Mensagens:** n/a.

## Cards
Container `e1`, raio `2xl`, padding `lg`. **6 tipos:**
1. **Missão** — borda `gold/30`, eyebrow “Missão do dia · +pts”, título, descrição secundária. Ação: abrir/concluir. Reaproveita `MissaoCard`.
2. **Ranking (linha)** — avatar + nome + métrica (`tabular-nums`); destaque do “você”; pódio nos 3 primeiros. **Sem tabela.**
3. **Estatística** — número grande (`h-display`/tabular) + rótulo curto; agrupar em 2-up (nunca 3 apertadas no mobile).
4. **Conquista** — medalha + nome + data; estado bloqueado/desbloqueado.
5. **Conteúdo** — bloco de protocolo/dia (texto, link, mídia).
6. **Estado vazio** — ver “Estados Vazios”.
- **Quando NÃO:** não usar card para item de lista simples (use Lista) nem aninhar card dentro de card.
- **Estados:** estático · pressable (vira `e2` no press) · selecionado (borda gold).
- **Mobile/A11y:** card inteiro clicável quando tem 1 ação; senão ações explícitas. Área ≥48px.
- **Animação:** entrada fade+`translateY` `base`; press `scale(.99)`.
- **Mensagens:** seguem o tipo (Brand).

## Listas
- **Finalidade:** sequência de itens homogêneos.
- **Usar:** comentários, opções, histórico.
- **NÃO usar:** dados tabulares largos (reformatar em cards/linhas).
- **Variantes:** simples · com avatar · com ação à direita · com divisor.
- **Estados:** item default · pressed · selecionado · swipe-action (opcional) · vazio.
- **Mobile:** linha ≥48px, divisor `line`, toque confortável.
- **A11y:** `<ul>/<li>`, ações com label.
- **Animação:** stagger `base` ao carregar.
- **Mensagens:** vazio próprio.

## Divisores
- **Finalidade:** separar grupos.
- **Usar:** entre seções de uma lista/card.
- **NÃO usar:** em excesso (preferir espaçamento).
- **Variantes:** linha `line` 1px · com rótulo central.
- **Mobile/A11y:** decorativo (`role="separator"` quando semântico).
- **Animação:** none. **Mensagens:** rótulo curto quando houver (“Hoje”).

## Tabs
- **Finalidade:** alternar **conteúdo** dentro da mesma tela.
- **Usar:** ranking (Geral/Semanal/Presença).
- **NÃO usar:** navegação entre telas (use Bottom Nav) nem 2 opções (Segmented).
- **Variantes:** pílula (atual) · sublinhado.
- **Estados:** ativa (gold) · inativa · focus.
- **Mobile:** ≥44px, scroll se exceder; ativa sempre visível.
- **A11y:** `role="tablist"/"tab"/"tabpanel"`, setas do teclado, `aria-selected`.
- **Animação:** indicador desliza em `base` (`standard`); conteúdo crossfade `fast`.
- **Mensagens:** rótulos curtos.

## Segmented Controls
- **Finalidade:** escolher 1 entre 2–4 opções **mutuamente exclusivas** que filtram a mesma visão.
- **Usar:** período (Semana/Mês), tipo.
- **NÃO usar:** >4 opções (Tabs/Select) nem ações.
- **Estados:** selecionado (fundo gold sutil) · não selecionado · disabled.
- **Mobile:** largura cheia, ≥44px por segmento, haptic `selection`.
- **A11y:** `role="radiogroup"`.
- **Animação:** thumb desliza `fast` (`standard`).
- **Mensagens:** 1 palavra por segmento.

## Bottom Navigation
- **Finalidade:** navegação principal entre as áreas do app.
- **Usar:** sempre, na zona do polegar. Já implementada (`BottomNav`).
- **NÃO usar:** >5 itens; ações que não são navegação.
- **Itens oficiais:** Hoje · Jornada · Ranking · Feed · Perfil.
- **Estados:** ativo (gold) · inativo (subtle) · (badge opcional).
- **Mobile:** fixa, ≥48px por item, `safe-area` inferior; estável (não anima a cada troca).
- **A11y:** `<nav>`, `aria-current="page"`, labels sempre visíveis.
- **Animação:** só a cor do item muda (`fast`); o conteúdo é que transita.
- **Mensagens:** rótulos de 1 palavra.

## FAB (Floating Action Button)
- **Finalidade:** **uma** ação primária recorrente que flutua.
- **Usar:** “novo post” no Feed (candidato).
- **NÃO usar:** se já há CTA primário claro na tela; nunca >1 FAB; não sobre a Bottom Nav (acima dela, respeitando safe-area).
- **Estados:** default · pressed · oculto ao rolar para baixo (opcional).
- **Mobile:** 56px, canto inferior direito acima da nav.
- **A11y:** label textual (“Novo post”), não só ícone.
- **Animação:** entra `scale` `base`; press `scale(.96)`.
- **Mensagens:** ação clara.

## Progress Bar
- **Finalidade:** progresso linear (evolução, dia X/21).
- **Usar:** barra de evolução, upload.
- **NÃO usar:** para progresso circular curto (use Ring) nem como decoração.
- **Variantes:** determinada · indeterminada (loop sutil).
- **Estados:** 0–100%, com número opcional (`tabular-nums`).
- **Mobile/A11y:** `role="progressbar"` + `aria-valuenow`.
- **Animação (Motion):** preenche `slow` `standard`, número conta junto; **nunca quica**.
- **Mensagens:** “Dia 7 de 21”.

## Progress Ring
- **Finalidade:** progresso do dia/check-in (peça-herói do “Hoje”).
- **Usar:** anel de check-in, % de disciplina.
- **NÃO usar:** para listas/múltiplos valores.
- **Estados:** vazio · parcial · completo (pulso dourado único).
- **Mobile/A11y:** `role="progressbar"`, valor textual no centro.
- **Animação (Motion):** `stroke-dashoffset` `slow` `standard` + um pulso ao completar.
- **Mensagens:** centro mostra o valor; sucesso “Dia perfeito”.

## Skeletons
- **Finalidade:** placeholder de conteúdo carregando.
- **Usar:** quando o layout é previsível (feed, listas, cards).
- **NÃO usar:** ações instantâneas (use estado de botão).
- **Variantes:** linha de texto · card · avatar.
- **Mobile/A11y:** `aria-hidden`, container com `aria-busy`.
- **Animação (Motion):** shimmer `linear` loop ~1.2s, baixo contraste; respeita reduced-motion (sem animar).
- **Mensagens:** n/a (sem texto).

## Loading
- **Finalidade:** espera sem layout previsível.
- **Usar:** ações pontuais, transições.
- **NÃO usar:** onde Skeleton serve melhor (preferir Skeleton).
- **Variantes:** spinner inline (botão) · spinner de tela com microcópia.
- **Mobile/A11y:** `role="status"` + texto para leitor de tela.
- **Animação:** rotação `linear`.
- **Mensagens (Brand):** “Preparando sua jornada…”, “Reunindo a turma…”.

## Toasts
- **Finalidade:** confirmação efêmera, **não bloqueante**, sem ação obrigatória.
- **Usar:** “Check-in salvo”, “Perfil atualizado”.
- **NÃO usar:** erros que exigem decisão (use Dialog/Alerta) nem mensagens longas.
- **Variantes:** neutro · success · warning · danger.
- **Estados:** entra (top ou acima da nav) · auto-dismiss 3–4s · swipe para fechar.
- **Mobile:** acima da Bottom Nav, `safe-area`, largura confortável.
- **A11y:** `role="status"` (`alert` para erro), foco não roubado.
- **Animação:** entra fade+`translateY` `base`; sai `exit`.
- **Mensagens:** “Feito. Mais um dia construído.”

## Snackbars
- **Finalidade:** confirmação efêmera **com uma ação** (ex.: Desfazer).
- **Usar:** “Post excluído · Desfazer”.
- **NÃO usar:** sem ação (use Toast) nem para erros críticos.
- **Estados:** com botão de ação; dismiss por tempo ou ação.
- **Mobile/A11y:** ação ≥48px; `role="status"`.
- **Animação:** igual Toast.
- **Mensagens:** “Post excluído.” + “Desfazer”.

## Alertas (inline)
- **Finalidade:** mensagem persistente **dentro** do fluxo (não efêmera).
- **Usar:** aviso de check-in pendente, erro de formulário.
- **NÃO usar:** confirmação rápida (Toast).
- **Variantes:** info · success · warning · danger (reaproveita padrão do `Aviso`).
- **Estados:** estático · fechável (opcional).
- **Mobile/A11y:** `role="alert"` quando crítico; contraste AA.
- **Animação:** fade `base`.
- **Mensagens:** “Você ainda não fez o check-in de hoje.”

## Banner
- **Finalidade:** comunicado de topo de maior peso/contexto (ex.: estado offline, fim de turma).
- **Usar:** mensagens globais temporárias.
- **NÃO usar:** para cada micro-aviso (use Alerta).
- **Estados:** informativo · de ação (com botão) · fechável.
- **Mobile:** largura cheia, abaixo do header; não cobrir conteúdo.
- **A11y:** `role="region"`/`alert` conforme urgência.
- **Animação:** desliza do topo `base`.
- **Mensagens:** curtas e diretas (Brand).

## Bottom Sheets — **prioridade sobre Modals**
- **Finalidade:** ações/escolhas contextuais subindo da base (zona do polegar).
- **Usar:** check-in, editar perfil, opções de select, menus contextuais, detalhe de medalha.
- **NÃO usar:** decisão crítica curta sim/não (use Dialog) — sheet é para conteúdo/ação rica.
- **Variantes:** ações (lista) · formulário · conteúdo roláável; com handle (puxador).
- **Estados:** entra · arrastável (snap points) · fecha por arraste/scrim/botão.
- **Mobile:** topo arredondado `2xl`, scrim atrás, `safe-area` inferior, conteúdo rolável; foco preso (focus trap).
- **A11y:** `role="dialog"` + `aria-modal`, foco inicial no título, `Esc`/arraste fecha, retorna foco ao gatilho.
- **Animação (Motion):** sobe `base`→`slow` `standard`; scrim faz fade; sai `exit`.
- **Mensagens:** título claro do que se faz ali.

## Dialogs
- **Finalidade:** **decisão crítica** que bloqueia até resposta.
- **Usar:** confirmar ação destrutiva/irreversível (cancelar matrícula, sair).
- **NÃO usar:** conteúdo rico ou opções (use Bottom Sheet) nem confirmação trivial (Toast/Snackbar).
- **Variantes:** confirmação · destrutiva (ação `danger`).
- **Estados:** aberto (scrim) · loading da ação.
- **Mobile:** centralizado, largura confortável, botões empilhados ≥48px (primário embaixo, fácil ao polegar).
- **A11y:** `role="alertdialog"`, foco preso, título+descrição associados.
- **Animação:** fade + leve scale `base` (sem bounce).
- **Mensagens (Brand):** “Tem certeza? A sequência de hoje depende disso.” — botão diz a consequência (“Cancelar matrícula”), não “OK”.

## Timeline
- **Finalidade:** sequência temporal (jornada de 21 dias).
- **Usar:** Jornada/Protocolo; trilha de momentos.
- **NÃO usar:** dados não sequenciais.
- **Variantes:** vertical (mobile padrão) com nós; estado por dia.
- **Estados por nó:** bloqueado 🔒 · hoje ▶ (destaque gold) · concluído ✅ · perdido ⚠️ (digno, sem punição). Reaproveita `ProtocoloTimeline`.
- **Mobile:** linha conectora à esquerda, nós ≥44px, “hoje” em destaque.
- **A11y:** lista ordenada, estado anunciado por texto, não só cor.
- **Animação:** revela em stagger `base`; “hoje” com leve ênfase.
- **Mensagens:** “Dia 7 · Hoje”, “Dia 5 · perdido”.

## Estados Vazios
- **Finalidade:** transformar a ausência de dados em primeiro passo.
- **Usar:** feed/ranking/conquistas/busca sem dados.
- **NÃO usar:** durante carregamento (use Skeleton).
- **Variantes:** com CTA · informativo.
- **Mobile/A11y:** centralizado, ícone discreto opcional, CTA ≥48px.
- **Animação:** fade `base`; sem mascote animado.
- **Mensagens (Brand):** “A primeira conquista está a um check-in de distância.” — nunca “nada por aqui”.

## Estados Offline
- **Finalidade:** comunicar perda de conexão sem assustar.
- **Usar:** quando a rede cai; ações que falham por conexão.
- **Variantes:** Banner global “Sem conexão” · estado em ação (botão volta a habilitar ao reconectar) · fila de reenvio quando possível.
- **Estados:** offline · reconectando · de volta (Toast “Conexão restaurada”).
- **Mobile/A11y:** `aria-live` para mudança de status; não bloquear leitura do que já carregou.
- **Animação:** banner desliza `base`.
- **Mensagens (Brand):** “Sem conexão. Seu progresso está seguro — já voltamos.” Nunca “erro de rede”.

---

# Entrega e governança
- A implementação dos componentes acontece **após aprovação**, em `components/ui/*`, expandindo os primitivos da Fase 1, com tokens centralizados (CSS vars + `tailwind.config`).
- Toda PR de tela referencia este documento; novos padrões exigem atualização versionada aqui antes do uso.

*Documento vivo. Alterações exigem nova versão e aprovação.*
