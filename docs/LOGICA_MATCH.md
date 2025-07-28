# Lógica de Pontuação e Match de Psicólogas

Este documento detalha o sistema de pontuação e match utilizado no projeto "Gestor de Horários PSIs" para recomendar a psicóloga mais compatível ao usuário. A lógica principal reside no componente `src/components/QuestionarioMatch.jsx`, especificamente na função `finalizarMatch`.

## Componentes da Lógica de Match

O sistema de match considera três fatores principais para calcular um score para cada psicóloga candidata:

1.  **Respostas do Questionário:** Preferências explícitas do usuário.
2.  **Seleção de Horários:** Disponibilidade da psicóloga.
3.  **Análise de Texto Livre (IA):** Uma camada opcional para refinar a compatibilidade com base na descrição textual do usuário.

## Processo Detalhado de Pontuação e Seleção

### 1. Inicialização e Filtragem por Horários

*   **Candidatas Iniciais:** A lista de `psicologas` (com seus perfis e horários já carregados da API externa) é o ponto de partida.
*   **Filtragem por Horários (Opcional):**
    *   Se o usuário selecionou horários preferidos (`horariosSelecionados`):
        *   O sistema filtra a lista de psicólogas para criar um subconjunto (`candidatasParaMatch`) que inclui apenas aquelas cujos `horarios_disponiveis` coincidem com pelo menos um dos horários selecionados pelo usuário.
        *   Os `horarios_disponiveis` de cada psicóloga são uma estrutura de objeto como `{ dia_abreviado: ['HH:MM', 'HH:MM'], ... }`.
    *   **Fallback (Sem Match de Horário):** Se nenhuma psicóloga for encontrada com os horários selecionados, o filtro de horário é efetivamente ignorado. Todas as psicólogas da lista original são consideradas `candidatasParaMatch`, e uma flag `avisoHorario` é ativada. Este aviso será usado para informar ao usuário que a recomendação final pode não ter disponibilidade nos horários solicitados, mas é a melhor com base em outros critérios.
    *   Se o usuário não selecionou nenhum horário, todas as psicólogas são consideradas `candidatasParaMatch` desde o início.

### 2. Cálculo de Score Base (Respostas do Questionário)

*   **Inicialização dos Scores:** Um objeto `scores` é criado, onde cada `id` de uma psicóloga em `candidatasParaMatch` é uma chave com valor inicial `0`.
    *   Exemplo: `scores = { 1: 0, 3: 0, 5: 0 }`
*   **Processamento das Respostas:**
    *   O sistema itera sobre cada `resposta` fornecida pelo usuário (armazenada no estado `respostas` do `QuestionarioMatch.jsx`).
    *   Cada `resposta` é um objeto contendo:
        *   `texto` (String): O texto da opção de resposta.
        *   `tag` (String): Uma tag padronizada (kebab-case, ex: `"ansiedade"`, `"terapia-cognitivo-comportamental-tcc"`). Estas tags são definidas em `src/data.js` dentro de `perguntasMatch`.
        *   `peso` (Number): Um valor numérico que indica a importância/relevância dessa resposta/tag.
    *   Para cada `resposta` do usuário:
        *   O sistema verifica cada psicóloga (`psi`) na lista de `candidatasParaMatch`.
        *   Se o array `psi.tagsParaMatch` (definido para cada psicóloga em `src/data.js -> psicologasData`) contiver a `tag` da `resposta` atual:
            *   O `peso` dessa `resposta` é adicionado ao score da psicóloga: `scores[psi.id] += resposta.peso;`.
*   **Exemplo de Pontuação do Questionário:**
    *   Usuário seleciona: "Sinto ansiedade constante." (`tag: 'ansiedade'`, `peso: 2`)
    *   Usuário seleciona: "Quero ferramentas práticas." (`tag: 'terapia-cognitivo-comportamental-tcc'`, `peso: 3`)
    *   Se a Psicóloga A tem `['ansiedade', 'terapia-cognitivo-comportamental-tcc']` em suas `tagsParaMatch`, seu score do questionário será `2 + 3 = 5`.
    *   Se a Psicóloga B tem apenas `['ansiedade']`, seu score será `2`.

### 3. Pontuação Adicional (Análise de Texto Livre via IA - Google Gemini)

Esta etapa é executada apenas se o usuário fornecer uma descrição no campo de texto livre (`textoLivre`).

*   **Coleta de Tags para a IA:**
    *   Uma lista única de todas as `tagsParaMatch` das psicólogas atualmente em `candidatasParaMatch` é compilada. Isso forma o vocabulário (`tagsParaIA`) que a IA usará para identificar temas relevantes.
*   **Interação com a API Gemini (`analisarTextoComIA`):**
    *   **Prompt:** Um prompt é construído, instruindo a API Gemini (modelo `gemini-2.0-flash`) a analisar o `textoLivre` do usuário e identificar as 3 tags mais relevantes da lista `tagsParaIA`.
    *   **Formato da Resposta Esperada:** A API é configurada para responder em `application/json` e seguir um schema específico: um array de objetos, onde cada objeto tem uma chave `"tag"` (string) e uma chave `"confianca"` (um número de 0 a 1). Ex: `[{ "tag": "ansiedade", "confianca": 0.9 }, ...]`
    *   A chave da API (`VITE_GEMINI_API_KEY`) é usada para autenticação.
*   **Atribuição de Pontos da IA:**
    *   Para cada `item` (objeto `{tag, confianca}`) retornado pela IA:
        *   O sistema verifica novamente cada psicóloga (`psi`) em `candidatasParaMatch`.
        *   Se `psi.tagsParaMatch` incluir a `item.tag` identificada pela IA:
            *   Os pontos da IA são calculados: `pontosIA = Math.round(7 * (item.confianca || 0.5));`
                *   `item.confianca`: O nível de confiança (0-1) retornado pela IA para aquela tag.
                *   `|| 0.5`: Um valor de fallback para a confiança. Se a IA não retornar confiança ou retornar 0, usa-se 0.5 para ainda dar algum peso se a tag for relevante.
                *   `* 7`: Um multiplicador fixo (hardcoded) para dar um peso significativo à análise da IA. Este valor pode ser ajustado para balancear a influência da IA versus as respostas diretas do questionário.
            *   Esses `pontosIA` são somados ao score da psicóloga: `scores[psi.id] += pontosIA;`.
*   **Exemplo de Pontuação da IA:**
    *   Texto do usuário: "Tenho me sentido muito ansioso e com dificuldade de relacionamento."
    *   IA retorna: `[{ "tag": "ansiedade", "confianca": 0.9 }, { "tag": "relacionamentos", "confianca": 0.7 }]`.
    *   Se a Psicóloga A (score anterior: 5) tem `['ansiedade', 'relacionamentos']` em `tagsParaMatch`:
        *   Pontos por 'ansiedade': `Math.round(7 * 0.9) = 6`. Score da Psicóloga A: `5 + 6 = 11`.
        *   Pontos por 'relacionamentos': `Math.round(7 * 0.7) = 5`. Score da Psicóloga A: `11 + 5 = 16`.

### 4. Seleção da Melhor Psicóloga

Após o cálculo de todos os scores (combinando pontos do questionário e da IA):

*   **Identificação do Maior Score:** O sistema encontra o `maiorScore` entre todos os valores no objeto `scores`.
*   **Caso Especial: Score Máximo é Zero:**
    *   Se o `maiorScore` for `0` (nenhuma tag correspondeu, ou todas as psicólogas candidatas tiveram seus scores zerados por algum motivo), considera-se que o match direto falhou em encontrar uma preferência clara.
    *   Neste cenário, uma psicóloga é selecionada **aleatoriamente** da lista de `candidatasParaMatch`. O objetivo é ainda fornecer uma sugestão, mesmo que menos direcionada.
*   **Caso Padrão (Score Máximo > 0):**
    *   Uma lista `melhoresMatches` é criada, contendo todas as psicólogas de `candidatasParaMatch` cujo `scores[psi.id]` é igual ao `maiorScore`.
    *   **Desempate:** Se houver múltiplas psicólogas com o mesmo `maiorScore` (empate), uma delas é selecionada **aleatoriamente** da lista `melhoresMatches`. Isso introduz variedade em caso de empate.
    *   Se houver apenas uma psicóloga com o `maiorScore`, ela é a selecionada.
*   **Manuseio do Aviso de Horário:**
    *   Se a flag `avisoHorario` foi ativada anteriormente (nenhuma psicóloga encontrada para os horários selecionados), uma mensagem adicional é anexada à `mensagemResultado` da psicóloga selecionada. Isso informa ao usuário que, embora a psicóloga seja uma boa combinação para suas necessidades temáticas, pode não haver disponibilidade nos horários exatos que ele pediu.

### 5. Resultado Final

*   A psicóloga selecionada (`melhorMatch`) é então passada para o componente `App.jsx` através da callback `onMatchComplete`.
*   `App.jsx` exibe as informações da psicóloga recomendada e sua `mensagemResultado` personalizada (possivelmente com o aviso de horário).

## Resumo da Fórmula de Score (Conceitual)

Para cada psicóloga:
`Score Total = (Soma dos pesos das respostas do questionário cujas tags correspondem) + (Soma dos pontos_IA para cada tag da IA que corresponde)`

Onde:
`pontos_IA_por_tag = Math.round(7 * (confianca_da_IA_para_a_tag || 0.5))`

Este sistema multifatorial visa fornecer recomendações relevantes, equilibrando as preferências diretas do usuário com uma análise mais profunda de suas necessidades, e considerando a disponibilidade prática das profissionais.
