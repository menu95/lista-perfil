# Documentação Técnica: Gestor de Horários PSIs

## 1. Visão Geral do Projeto

O projeto "Gestor de Horários PSIs" é uma aplicação web desenvolvida em React com Vite, projetada para ajudar usuários a encontrar uma psicóloga compatível com suas necessidades e preferências. A aplicação apresenta um catálogo de psicólogas, informações detalhadas sobre cada uma, e um sistema de "match" inteligente. Este sistema utiliza um questionário e, opcionalmente, análise de texto livre por Inteligência Artificial (Google Gemini) para recomendar a profissional mais adequada. Adicionalmente, a aplicação busca e exibe os horários de atendimento dinamicamente através de uma API externa.

## 2. Estrutura do Projeto e Tecnologias

### 2.1. Estrutura de Pastas e Arquivos Principais

*   **`public/`**: Contém arquivos estáticos.
    *   `favicon.svg`: Ícone da aplicação.
    *   `psicologas_fotos/`: Armazena as imagens das psicólogas.
*   **`src/`**: Código-fonte da aplicação React.
    *   **`assets/`**: Recursos estáticos como SVGs.
    *   **`components/`**: Componentes React reutilizáveis.
        *   `App.jsx`: Componente raiz que gerencia o estado principal.
        *   `Catalogo.jsx`: Exibe a lista de todas as psicólogas.
        *   `QuestionarioMatch.jsx`: Conduz o usuário pelo quiz de match.
        *   `Horarios.jsx`: Exibe os horários de uma psicóloga.
        *   `CalendarIcon.jsx`: Ícone de calendário (SVG).
    *   **`__tests__/`**: Arquivos de teste (Vitest/React Testing Library).
    *   `data.js`: Contém dados estáticos (perfis de psicólogas, perguntas do questionário).
    *   `main.jsx`: Ponto de entrada da aplicação React.
    *   `App.css`, `index.css`: Arquivos de estilização CSS.
    *   **`utils/`**: Módulos utilitários.
        *   `logger.js`: Utilitário de logging com integração Grafana Faro.
*   `package.json`: Define metadados do projeto, scripts e dependências.
*   `vite.config.js`: Configuração do Vite e Vitest.
*   `index.html`: Ponto de entrada HTML.

### 2.2. Tecnologias e Bibliotecas

*   **Frontend:** React (v19.1.0)
*   **Build Tool:** Vite (v6.3.5)
*   **Linguagem:** JavaScript (ES6+)
*   **Estilização:** CSS
*   **Testes:** Vitest, React Testing Library, JSDOM
*   **Linting:** ESLint
*   **Logging/Monitoramento:** Grafana Faro (integrado via `src/utils/logger.js`)
*   **APIs Externas:**
    *   Horários: `https://lista-psis-api.onrender.com/api/horarios`
    *   Análise de Texto (IA): Google Gemini (`https://generativelanguage.googleapis.com/`)

## 3. Fluxo de Dados Principal

1.  **Inicialização (`App.jsx`):**
    *   Carrega dados estáticos das psicólogas de `src/data.js`.
    *   Busca horários da API externa e os mescla aos dados das psicólogas.
    *   Popula `horariosGerais` para uso no questionário.
2.  **Visualização Inicial:**
    *   Renderiza `Catalogo.jsx` com todas as psicólogas.
    *   Oferece a opção de iniciar o questionário de match.
3.  **Questionário (`QuestionarioMatch.jsx`):**
    *   Usuário responde perguntas, seleciona horários (opcional) e pode fornecer texto livre.
4.  **Processamento do Match (em `QuestionarioMatch.jsx`):**
    *   Filtra psicólogas por horário (se selecionado).
    *   Calcula scores com base nas respostas do questionário (tags e pesos).
    *   Se houver texto livre, envia para a API Gemini; tags retornadas adicionam pontos aos scores.
    *   Seleciona a psicóloga com o maior score (desempate aleatório).
5.  **Exibição do Resultado (`App.jsx`):**
    *   Mostra a psicóloga recomendada e permite agendamento via WhatsApp.
6.  **Reset:** Permite ao usuário retornar ao catálogo.

## 4. Componentes Principais e Utilitários

### 4.1. `src/App.jsx`

*   **Responsabilidade:** Orquestrador principal da aplicação. Gerencia o estado de qual tela exibir (catálogo, questionário, resultado), os dados das psicólogas, horários e os resultados do match.
*   **Estado Chave:** `psicologasList`, `iniciarMatch`, `resultadoMatch`, `horariosGerais`, `isLoadingHorarios`.
*   **Funções Importantes:**
    *   `fetchHorarios()`: Busca e processa horários da API.
    *   `handleStartMatch()`: Inicia o questionário.
    *   `handleMatchComplete()`: Recebe o resultado do `QuestionarioMatch`.
    *   `resetApp()`: Volta ao estado inicial.
    *   `renderContent()`: Decide qual componente principal renderizar.

### 4.2. `src/components/QuestionarioMatch.jsx`

*   **Responsabilidade:** Guia o usuário pelo questionário interativo, coleta respostas, horários e texto livre, e executa a lógica de match para encontrar a psicóloga mais compatível.
*   **Props Recebidas:** `onMatchComplete` (callback), `psicologas`, `horariosGerais`, `isLoadingHorarios`.
*   **Estado Chave:** `perguntaAtual`, `respostas`, `horariosSelecionados`, `textoLivre`, `isLoadingMatch`.
*   **Lógica de Match Detalhada:** Ver Seção 6.
*   **Funções Importantes:**
    *   `finalizarMatch()`: Orquestra todo o processo de cálculo de score e seleção.
    *   `analisarTextoComIA()`: Interage com a API do Gemini.
    *   `renderEtapaAtual()`: Controla a exibição das etapas do questionário.

### 4.3. `src/components/Catalogo.jsx`

*   **Responsabilidade:** Exibe a lista de todas as psicólogas em formato de cards, permitindo expansão para mais detalhes e agendamento direto.
*   **Props Recebidas:** `psicologas`, `isLoadingHorarios`.
*   **Funcionalidade:**
    *   Cards expansíveis com informações da psicóloga.
    *   Scroll suave para o card expandido.
    *   Integração com o componente `Horarios.jsx` para mostrar disponibilidade.

### 4.4. `src/components/Horarios.jsx`

*   **Responsabilidade:** Exibe os horários disponíveis de uma psicóloga específica ou mensagens de status (carregando, indisponível).
*   **Props Recebidas:** `horarios`, `isLoading`.

### 4.5. `src/utils/logger.js`

*   **Responsabilidade:** Utilitário de logging que envia logs para o console (em desenvolvimento) e para o Grafana Faro (se configurado via `VITE_GRAFANA_FARO_URL`).
*   **Métodos:** `log()`, `info()`, `warn()`, `error()`.

### 4.6. `src/components/CalendarIcon.jsx`

*   **Responsabilidade:** Componente SVG simples que renderiza um ícone de calendário.

## 5. Estrutura de Dados (`src/data.js`)

Este arquivo é crucial, pois define os perfis das psicólogas e a estrutura do questionário.

### 5.1. `psicologasData`

Array de objetos, cada um representando uma psicóloga.
*   **Campos Notáveis:**
    *   `id` (Number): Identificador único.
    *   `nome` (String): Nome da psicóloga.
    *   `fotoUrl`, `abordagem`, `bio`, `crp` (Strings): Informações do perfil.
    *   `especialidades` (Array de Strings): Para exibição.
    *   `tagsParaMatch` (Array de Strings): **Essencial para o match.** Tags padronizadas (kebab-case) que conectam com as respostas do questionário e a análise da IA.
    *   `mensagemResultado` (String): Mensagem personalizada para o resultado do match.
    *   `horariosDisponiveis` (Array de Strings): **Placeholder estático.** Os horários reais são carregados dinamicamente pela API em `App.jsx` e associados à psicóloga pelo `id`. A estrutura dinâmica é `{ dia_abreviado: ['HH:MM', ...] }`.

### 5.2. `perguntasMatch`

Array de objetos, cada um definindo uma pergunta do questionário.
*   **Campos da Pergunta:**
    *   `pergunta` (String): Texto da pergunta.
    *   `respostas` (Array de Objetos): Opções de resposta.
        *   **Campos da Resposta:**
            *   `texto` (String): Texto da opção.
            *   `tag` (String): **Link com `tagsParaMatch` das psicólogas.**
            *   `peso` (Number): Importância da resposta para o score.

**Relação `tagsParaMatch` vs `tag` da Resposta:** O match ocorre quando a `tag` de uma resposta selecionada corresponde a uma das `tagsParaMatch` da psicóloga, somando o `peso` da resposta ao score da psicóloga.

## 6. Lógica de Pontuação das PSIs (Sistema de Match)

A lógica de pontuação para recomendar a psicóloga mais compatível é um aspecto central do sistema e é implementada primariamente no componente `src/components/QuestionarioMatch.jsx`. Ela considera as respostas do usuário a um questionário, a seleção opcional de horários de preferência e uma análise opcional de texto livre por Inteligência Artificial (Google Gemini).

O processo envolve:
1.  **Filtragem Inicial por Horários:** As psicólogas candidatas podem ser filtradas com base na disponibilidade de horário informada pelo usuário.
2.  **Cálculo de Score Base:** As respostas do questionário, que possuem `tags` e `pesos` associados, contribuem para o score de cada psicóloga.
3.  **Pontuação Adicional por IA:** O texto livre fornecido pelo usuário é analisado pela API Gemini, que identifica tags relevantes. Essas tags, com seus níveis de confiança, adicionam pontos aos scores das psicólogas.
4.  **Seleção Final:** A psicóloga com o maior score total é selecionada, com mecanismos de desempate aleatório e tratamento para casos de score zero ou não correspondência de horários.

**Para uma descrição detalhada e completa de todo o processo de pontuação, incluindo exemplos e o tratamento de casos específicos, por favor, consulte o documento dedicado: [`docs/LOGICA_MATCH.md`](./docs/LOGICA_MATCH.md).**

## 7. Detalhamento por Arquivo

Esta seção aprofunda a responsabilidade e funcionamento de cada arquivo chave do projeto.

### 7.1. Arquivos de Configuração (Raiz do Projeto)

*   **`.gitignore`**
    *   **Propósito:** Especifica intencionalmente arquivos e pastas não rastreados que o Git deve ignorar.
    *   **Funcionamento:** Contém padrões (ex: `node_modules/`, `dist/`, `.env`) que o Git usa para excluir arquivos de serem adicionados ao repositório. Essencial para manter o repositório limpo e focado no código-fonte.

*   **`eslint.config.js`**
    *   **Propósito:** Arquivo de configuração para o ESLint, uma ferramenta de linting para JavaScript.
    *   **Funcionamento:** Define regras de estilo de código, identifica potenciais erros e impõe boas práticas. Ajuda a manter a consistência e qualidade do código em todo o projeto.
    *   **Configurações Relevantes:** Pode incluir plugins (ex: para React, hooks), regras específicas (ex: indentação, uso de aspas) e ambientes (ex: browser, node).

*   **`index.html`**
    *   **Propósito:** Ponto de entrada HTML da Single Page Application (SPA).
    *   **Funcionamento:** É o arquivo HTML principal servido ao navegador. Contém o elemento raiz (geralmente um `<div id="root">`) onde a aplicação React será montada. O Vite injeta automaticamente as tags `<script>` necessárias durante o desenvolvimento e build.

*   **`package.json`**
    *   **Propósito:** Arquivo fundamental em projetos Node.js e JavaScript. Contém metadados sobre o projeto e gerencia suas dependências e scripts.
    *   **Funcionamento:**
        *   `name`, `version`, `private`: Metadados básicos.
        *   `type: "module"`: Indica que o projeto usa módulos ES.
        *   `scripts`: Define comandos para tarefas comuns (ex: `dev` para iniciar o servidor de desenvolvimento Vite, `build` para criar a versão de produção, `lint` para rodar o ESLint, `test` para executar testes com Vitest).
        *   `dependencies`: Lista as bibliotecas necessárias para a aplicação em produção (ex: `react`, `react-dom`).
        *   `devDependencies`: Lista as bibliotecas usadas apenas durante o desenvolvimento e teste (ex: `vite`, `eslint`, `vitest`).
    *   **Interação:** Usado pelo `npm` ou `yarn` para instalar dependências e executar scripts.

*   **`package-lock.json`**
    *   **Propósito:** Registra as versões exatas de cada dependência instalada, incluindo suas sub-dependências.
    *   **Funcionamento:** Garante que as instalações sejam consistentes em diferentes ambientes e momentos, prevenindo problemas causados por atualizações inesperadas de pacotes. Gerado e atualizado automaticamente pelo `npm`.

*   **`vite.config.js`**
    *   **Propósito:** Arquivo de configuração para o Vite, o build tool e servidor de desenvolvimento do projeto.
    *   **Funcionamento:**
        *   Importa `defineConfig` do Vite e o plugin `@vitejs/plugin-react`.
        *   `plugins: [react()]`: Habilita o suporte para React, incluindo Fast Refresh.
        *   `test`: Configura o Vitest para testes unitários e de componentes.
            *   `globals: true`: Permite usar APIs do Vitest globalmente nos testes.
            *   `environment: 'jsdom'`: Simula um ambiente de navegador para testes de componentes React.
            *   `setupFiles`: Especifica arquivos de setup para testes (ex: `./src/__tests__/setup.js`).
            *   `env`: Permite definir variáveis de ambiente específicas para o ambiente de teste (ex: mock de `VITE_GEMINI_API_KEY`).
    *   **Interação:** Lido pelo Vite ao iniciar o servidor de desenvolvimento ou ao construir o projeto.

### 7.2. Código Fonte (`src/`)

*   **`src/main.jsx`**
    *   **Propósito:** Ponto de entrada da aplicação React.
    *   **Funcionamento:**
        *   Importa `React`, `ReactDOM`, o componente principal `App` e os arquivos CSS globais (`App.css`, `index.css`).
        *   Usa `ReactDOM.createRoot()` para obter o elemento DOM raiz (com `id="root"` em `index.html`).
        *   Renderiza o componente `App` dentro de `<React.StrictMode>` nesse elemento raiz. `StrictMode` ativa verificações e avisos adicionais em desenvolvimento.
    *   **Interação:** É o primeiro arquivo JavaScript da aplicação a ser executado, iniciando a renderização da interface React.

*   **`src/App.jsx`**
    *   **Propósito:** Componente principal (raiz) da aplicação. Orquestra a exibição de diferentes seções (catálogo, questionário, resultado), gerencia o estado global da UI, busca dados externos (horários) e passa dados e callbacks para componentes filhos.
    *   **Estado Chave:**
        *   `psicologasList`: Array com os dados das psicólogas, incluindo seus horários carregados da API.
        *   `iniciarMatch`: Boolean que controla a exibição do `QuestionarioMatch`.
        *   `resultadoMatch`: Array contendo a psicóloga recomendada após o match.
        *   `horariosGerais`: Objeto com todos os horários únicos disponíveis, usado no filtro do questionário.
        *   `horarioSelecionado`: String do horário escolhido na tela de resultado para agendamento.
        *   `error`: Armazena erros da API de horários.
        *   `isLoadingHorarios`: Boolean para feedback de carregamento dos horários.
    *   **Efeitos (`useEffect`):**
        *   **Busca de Horários (no mount):**
            *   Define `isLoadingHorarios` para `true`.
            *   Chama a API `https://lista-psis-api.onrender.com/api/horarios`.
            *   Processa os dados recebidos, mapeando `horarios_disponiveis` para cada psicóloga em `psicologasList` pelo `psi.id`.
            *   Agrega todos os horários únicos em `horariosGerais`.
            *   Atualiza `isLoadingHorarios` para `false` e `error` se necessário.
        *   **Scroll para Resultado:** Quando `resultadoMatch` é populado, rola a tela suavemente para a seção de resultados.
    *   **Funções Principais:**
        *   `traduzirDia(dia)`: Converte abreviações de dias para nomes completos (ex: "seg" para "Segunda-feira").
        *   `handleStartMatch()`: Ativa o modo questionário (`setIniciarMatch(true)`).
        *   `handleWhatsAppResultadoClick(psiNome)`: Abre o WhatsApp com uma mensagem pré-formatada para agendamento, incluindo o `horarioSelecionado` se houver.
        *   `handleMatchComplete(matches)`: Callback para `QuestionarioMatch`; atualiza `resultadoMatch` e desativa o modo questionário.
        *   `resetApp()`: Restaura o estado inicial da aplicação, permitindo ao usuário recomeçar.
        *   `renderContent()`: Renderiza condicionalmente `Catalogo`, `QuestionarioMatch`, ou a tela de resultado.
    *   **Interações:**
        *   Importa `psicologasData` de `data.js` como base.
        *   Passa `psicologasList`, `horariosGerais`, `isLoadingHorarios` e callbacks para `Catalogo` e `QuestionarioMatch`.
        *   Usa `logger` para registrar eventos e erros.

*   **`src/data.js`**
    *   **Propósito:** Fornece os dados estáticos da aplicação, incluindo os perfis das psicólogas e a estrutura das perguntas do questionário de match.
    *   **Exportações:**
        *   `psicologasData` (Array de Objetos): Cada objeto descreve uma psicóloga.
            *   **Campos Cruciais para Lógica:**
                *   `id`: Usado para vincular com horários da API e como chave interna.
                *   `tagsParaMatch`: Array de strings (kebab-case) que define as especialidades e características da psicóloga. Usadas diretamente no cálculo de score do questionário e como vocabulário para a análise da IA.
                *   `mensagemResultado`: Texto exibido quando a psicóloga é o resultado do match.
                *   `horariosDisponiveis` (no `data.js`): É um placeholder; os horários reais são carregados da API.
        *   `perguntasMatch` (Array de Objetos): Cada objeto define uma pergunta do questionário.
            *   **Campos Cruciais para Lógica (dentro de cada `respostas` da pergunta):**
                *   `tag`: String (kebab-case) que corresponde a uma ou mais `tagsParaMatch` em `psicologasData`.
                *   `peso`: Número que quantifica a importância daquela resposta/tag para o score.
    *   **Interação:** Importado por `App.jsx` (para `psicologasData`) e `QuestionarioMatch.jsx` (para `perguntasMatch`). Desacopla os dados da lógica dos componentes.

*   **`src/index.css` e `src/App.css`**
    *   **Propósito:** Arquivos CSS para estilização global e específica do componente App, respectivamente.
    *   **Funcionamento:** Contêm regras CSS que definem a aparência da aplicação (layout, cores, fontes, etc.). `index.css` geralmente contém estilos mais globais ou resets, enquanto `App.css` pode conter estilos para o layout principal gerenciado por `App.jsx`.
    *   **Interação:** Importados em `src/main.jsx` e `src/App.jsx` para serem aplicados pela engine do navegador.

### 7.3. Componentes (`src/components/`)

*   **`src/components/QuestionarioMatch.jsx`**
    *   **Propósito:** Componente interativo que guia o usuário através de um questionário de múltipla escolha, permite a seleção de horários e a entrada de texto livre para encontrar a psicóloga mais compatível. Contém a lógica central de pontuação e match.
    *   **Props:**
        *   `onMatchComplete` (Function): Callback chamada ao final do match com a psicóloga recomendada.
        *   `psicologas` (Array): Lista completa de psicólogas (com seus horários já carregados da API).
        *   `horariosGerais` (Object): Objeto com todos os horários disponíveis para popular o seletor.
        *   `isLoadingHorarios` (Boolean): Para feedback de UI na etapa de seleção de horários.
    *   **Estado:**
        *   `perguntaAtual`: Índice da etapa atual do questionário.
        *   `respostas`: Array das respostas selecionadas pelo usuário (objetos com `tag` e `peso`).
        *   `horariosSelecionados`: Array de strings dos horários preferidos.
        *   `textoLivre`: String da descrição do usuário.
        *   `isLoadingMatch`: Boolean para feedback durante o processamento do match.
    *   **Funções Chave:**
        *   `handleRespostaClick(resposta)`: Adiciona resposta e avança.
        *   `handleHorarioClick(horarioKey)`: Gerencia seleção de horários.
        *   `finalizarMatch()`: Orquestra a lógica de match:
            1.  Filtra `psicologas` por `horariosSelecionados` (se houver). Se não encontrar, usa todas e ativa `avisoHorario`.
            2.  Calcula scores baseados nas `respostas` (comparando `resposta.tag` com `psi.tagsParaMatch` e somando `resposta.peso`).
            3.  Se `textoLivre` existir, chama `analisarTextoComIA`.
            4.  Adiciona pontos ao score com base nas tags e confiança retornadas pela IA (`pontosIA = Math.round(7 * (confianca || 0.5))`).
            5.  Determina `maiorScore` e seleciona a(s) psicóloga(s). Desempate aleatório.
            6.  Chama `onMatchComplete`.
        *   `analisarTextoComIA(texto, todasAsTags)`: (Função externa ao componente, mas usada por ele)
            *   Formata o prompt para a API Gemini, incluindo o texto do usuário e as `tagsParaMatch` das psicólogas candidatas.
            *   Define `responseMimeType: "application/json"` e um schema de resposta para garantir que a IA retorne um JSON estruturado (`[{tag, confianca}]`).
            *   Envia a requisição para a API Gemini (modelo `gemini-2.0-flash`).
            *   Retorna as tags e confianças ou um array vazio em caso de erro.
        *   `renderEtapaAtual()`: Controla qual parte do questionário é exibida.
    *   **Interações:**
        *   Importa `perguntasMatch` de `src/data.js`.
        *   Usa `logger` para registrar o processo de match.
        *   Renderiza dinamicamente as perguntas, opções de horários e campo de texto.

*   **`src/components/Catalogo.jsx`**
    *   **Propósito:** Exibe a lista completa de psicólogas em formato de "cards". Cada card mostra informações resumidas e pode ser expandido para detalhes e horários.
    *   **Props:**
        *   `psicologas` (Array): Lista de psicólogas a serem exibidas.
        *   `isLoadingHorarios` (Boolean): Passado para o componente `Horarios`.
    *   **Estado:**
        *   `expandedCardId`: ID da psicóloga cujo card está expandido, ou `null`.
    *   **Referências (`useRef`):**
        *   `cardRefs`: Usado para armazenar referências aos elementos DOM dos cards para a funcionalidade de scroll suave ao expandir.
    *   **Funcionalidades:**
        *   Mapeia `psicologas` para renderizar um `psi-card` para cada uma.
        *   `handleToggleExpand(psiId)`: Alterna o estado `expandedCardId` e aciona o scroll suave para o card.
        *   `handleWhatsAppClick(psiNome)`: Abre o WhatsApp para agendamento direto do catálogo.
        *   Quando um card é expandido, renderiza o componente `Horarios` passando os `horarios_disponiveis` da psicóloga específica.
    *   **Interações:**
        *   Usa `Horarios.jsx` para exibir a disponibilidade.
        *   Usa `CalendarIcon.jsx` nos botões.

*   **`src/components/Horarios.jsx`**
    *   **Propósito:** Componente simples para exibir os horários disponíveis de uma psicóloga ou mensagens de status (carregando, indisponível).
    *   **Props:**
        *   `horarios` (Object): Horários da psicóloga (ex: `{ seg: ['10:00'], ter: ['14:00'] }`).
        *   `isLoading` (Boolean): Indica se os horários estão carregando.
    *   **Funcionamento:**
        *   Renderiza condicionalmente: mensagem de carregamento, mensagem de "nenhum horário" ou a lista de horários formatada.
        *   Usa a função `traduzirDia` para formatar os nomes dos dias.
    *   **Interações:** Usado por `Catalogo.jsx` e `App.jsx` (na tela de resultado do match).

*   **`src/components/CalendarIcon.jsx`**
    *   **Propósito:** Componente funcional que renderiza um ícone de calendário SVG.
    *   **Funcionamento:** Retorna diretamente a marcação SVG do ícone. Reutilizável em botões de agendamento.

### 7.4. Utilitários (`src/utils/`)

*   **`src/utils/logger.js`**
    *   **Propósito:** Módulo de logging centralizado com integração opcional com Grafana Faro.
    *   **Funcionamento:**
        *   Inicializa o Grafana Faro se `VITE_GRAFANA_FARO_URL` estiver definido nas variáveis de ambiente.
        *   Exporta métodos (`log`, `info`, `warn`, `error`).
        *   Em desenvolvimento, os logs (exceto erros, que sempre aparecem) vão para o console.
        *   Se Faro estiver ativo, todos os logs são enviados para o Grafana com o nível apropriado e contexto.
    *   **Interações:** Usado por `App.jsx` e `QuestionarioMatch.jsx` para registrar eventos importantes e erros.

### 7.5. Testes (`src/__tests__/`)

*   **`src/__tests__/setup.js`**
    *   **Propósito:** Arquivo de configuração para o ambiente de teste Vitest.
    *   **Funcionamento:** Geralmente usado para importar polyfills, mocks globais ou configurações que devem ser aplicadas a todos os testes (ex: `@testing-library/jest-dom/vitest` para estender os matchers do Vitest com os do jest-dom).
    *   **Interação:** Especificado na configuração `test.setupFiles` em `vite.config.js`.

*   **`src/__tests__/App.test.jsx` e `src/__tests__/QuestionarioMatch.test.jsx`**
    *   **Propósito:** Arquivos contendo testes unitários e de integração para os componentes `App` e `QuestionarioMatch`, respectivamente.
    *   **Funcionamento:** Usam Vitest como test runner e React Testing Library para renderizar componentes, simular interações do usuário (cliques, digitação) e fazer asserções sobre o estado e a saída dos componentes.
    *   **Exemplos de Testes (Conceitual):**
        *   Verificar se o `App` renderiza o catálogo inicialmente.
        *   Simular cliques para iniciar o questionário e verificar se `QuestionarioMatch` é renderizado.
        *   Testar a lógica de pontuação do `QuestionarioMatch` com diferentes respostas (pode requerer mock da API Gemini).
        *   Verificar se a seleção de horários filtra corretamente as psicólogas.
    *   **Interação:** Executados pelo comando `npm run test` (ou similar) que invoca o Vitest.

## 8. Considerações Futuras e Melhorias

*   **Testes:** Expandir a cobertura de testes, especialmente para a lógica de match e interações com API.
*   **Gerenciamento de Estado:** Para aplicações maiores, considerar bibliotecas de gerenciamento de estado como Redux ou Zustand.
*   **Performance:** Otimizar a renderização de listas grandes se o número de psicólogas crescer significativamente.
*   **Error Handling:** Aprimorar o feedback ao usuário para diferentes tipos de falhas de API.
*   **Configurabilidade:** Tornar pesos e o multiplicador da IA configuráveis, talvez via variáveis de ambiente ou um painel de admin.
*   **Internacionalização (i18n):** Se aplicável, preparar a aplicação para múltiplos idiomas.
*   **Acessibilidade (a11y):** Realizar auditorias de acessibilidade e implementar melhorias.
