# MOTION LANGUAGE

> O padrão oficial das animações do Código 21. Faz parte da Constituição do Código 21 e deve ser respeitado em qualquer tela futura.
> Complementa: [Constituição da Experiência](CONSTITUICAO-EXPERIENCIA-GUERREIRO.md) e [Brand Language](BRAND-LANGUAGE.md). Status: **v1 — 2026-06-28**.

## Princípio

Toda animação transmite **sensação de evolução** — algo avança, se conquista, se constrói. O movimento é **premium, elegante e minimalista**: rápido onde é funcional, cerimonial só onde há conquista real.

**Nunca:** exagero, salto/bounce chamativo, brilho gamer, mascotes, animação infantil, loop que distrai. Referências de sensação: **Apple, Nike Run Club, Strava, Duolingo** (a retenção do Duolingo, não o estilo visual).

Regra de ouro: se a animação não comunica progresso, estado ou hierarquia, ela não existe.

---

## Tokens

### Duração

| Token | Valor | Uso |
|---|---|---|
| `instant` | **80ms** | toggles de estado, troca de cor/opacidade |
| `fast` | **160ms** | toques, hover, press, ícones |
| `base` | **240ms** | maioria das transições e entradas de elemento |
| `slow` | **400ms** | transições de tela/seção, reveals, contagens |
| `ceremonial` | **700–900ms** | medalha, evolução de nível, conclusão |

### Easing

| Token | Curva | Uso |
|---|---|---|
| `standard` (entrada) | `cubic-bezier(0.2, 0, 0, 1)` | entradas, a maioria dos casos (desacelera ao chegar) |
| `exit` (saída) | `cubic-bezier(0.4, 0, 1, 1)` | saídas, elementos que desaparecem (acelera) |
| `emphasized` | `cubic-bezier(0.2, 0, 0, 1)` + duração maior | momentos cerimoniais |
| `celebrate` | `cubic-bezier(0.34, 1.2, 0.64, 1)` | conquista — overshoot **mínimo**, nunca elástico |
| `linear` | `linear` | só movimento contínuo (progresso, shimmer) |

### Geometria do movimento

- **Translação:** 8–16px (entradas via `translateY`). Nunca grandes deslocamentos.
- **Escala:** press `0.98`; celebração no máximo `1.03`. Nada de “pop” grande.
- **Opacidade:** entradas combinam `opacity 0→1` + pequeno `translateY`.
- **Stagger de listas:** 40–60ms entre itens.
- **Origem:** o movimento nasce de onde a ação aconteceu (o card que mudou, o botão tocado).

### Acessibilidade

`prefers-reduced-motion: reduce` → trocar todo deslocamento/escala por **opacidade ou troca instantânea**. Sem parallax, sem contagens longas, sem shimmer. Nada de movimento decorativo.

---

## Microinterações e feedbacks

- **Toque / press:** `scale(0.98)` em `fast` (160ms), volta em `base`. Feedback imediato, discreto.
- **Toggle de inegociável (check-in):** o check desenha + preenchimento dourado sutil em `fast`. Sensação tátil por escala rápida, sem som infantil.
- **Hover (desktop, adaptação):** apenas cor/borda em `fast`. Sem crescer elementos.

## Animações por contexto

### Check-in (a animação mais importante)
O anel/medidor do dia **preenche** (`stroke-dashoffset`) em `slow` (600–800ms, `standard`), seguido de **um único** pulso dourado calmo. Os pontos do dia **contam para cima** (tabular-nums) em `slow`. Sem confete, sem explosão. A sensação é de “mais um tijolo assentado”.

### Streak (sequência)
No incremento: a chama 🔥 dá um leve `scale` + flicker em `fast`, e o número conta `+1`. **Na quebra:** nada de quebrar/estilhaçar — apenas um *dim* silencioso da chama em `base`. A honestidade emocional vale também para o movimento.

### Medalha (cerimonial)
Entrada `opacity + scale(0.9→1)` em `ceremonial` com `emphasized`, atravessada por **um** brilho dourado (shimmer sweep) que ocorre **uma vez**. Pausa respeitosa depois. Nunca em loop.

### Evolução de nível
O rótulo do nível faz crossfade e uma **linha dourada** varre por baixo em `slow`. Contido — afirmação de identidade, não fogos.

### Ranking
Mudanças de posição animam por **FLIP** (linhas deslizam para a nova ordem) em `slow` (300–400ms, `standard`). A sua linha recebe um **realce dourado** breve. O chip “subiu X” faz fade-in. Nunca embaralhar de forma caótica.

### Barras de progresso
Preenchem por `transform`/`width` em `slow` (`standard`), com o número contando junto. **Nunca** estouram/quicam — progresso é firme e constante.

### Carregamentos
Preferir **skeleton shimmer** (linear, loop ~1.2s, baixo contraste, leve tom dourado) a spinners. Calmo, com a microcópia da Brand Language (“Preparando sua jornada…”). Spinner só quando não há layout a prever.

### Transições de tela/seção
Fade + `translateY` de 8–12px em `base`→`slow` (`standard`). Onde fizer sentido, **elemento compartilhado** (o card que vira tela). A barra inferior (navegação) não anima a cada troca — ela é estável; o conteúdo é que transita.

### Estados vazios
Fade-in suave (`base`). Sem mascotes, sem ilustrações animadas. O texto convida (Brand Language), o movimento só acompanha.

---

## Implementação (referência futura — não implementar agora)

- Centralizar tokens em CSS vars (`--dur-fast`, `--ease-standard`, …) e/ou no `tailwind.config` (`transitionDuration`, `transitionTimingFunction`).
- Entradas no scroll com `IntersectionObserver` + `prefers-reduced-motion` (padrão já usado nos artifacts).
- Contagens numéricas e FLIP em componentes client dedicados, reutilizáveis.

*Documento vivo. Alterações exigem nova versão e aprovação.*
