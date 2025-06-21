import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import logger from '../utils/logger.js'; // Importar o logger mockado

// --- Mocks Globais ---

vi.mock('../data.js', () => {
  // Definir os dados mock DENTRO da factory para evitar problemas de hoisting
  const mockPsicologasDataConst = [
    { id: '1', nome: 'Dra. Exemplo 1', abordagem: 'TCC', bio: 'Bio Exemplo 1', especialidades: ['ansiedade', 'depressao'], fotoUrl: 'url1', mensagemResultado: 'Resultado 1', crp: '01/12345', horarios_disponiveis: {}, tagsParaMatch: ['ansiedade', 'tcc'] },
    { id: '2', nome: 'Dra. Exemplo 2', abordagem: 'Psicanálise', bio: 'Bio Exemplo 2', especialidades: ['trauma', 'luto'], fotoUrl: 'url2', mensagemResultado: 'Resultado 2', crp: '01/67890', horarios_disponiveis: {}, tagsParaMatch: ['trauma', 'psicanalise'] },
    { id: '3', nome: 'Dra. Exemplo 3', abordagem: 'Humanista', bio: 'Bio Exemplo 3', especialidades: ['autoestima'], fotoUrl: 'url3', mensagemResultado: 'Resultado 3', crp: '01/11223', horarios_disponiveis: {}, tagsParaMatch: ['autoestima', 'humanista'] },
  ];

  const mockPerguntasMatchConst = [
    {
      id: 'necessidade',
      pergunta: 'Qual a sua principal necessidade ou desafio no momento?',
      respostas: [
        { texto: 'Ansiedade', tag: 'ansiedade', peso: 3 },
        { texto: 'Depressão', tag: 'depressao', peso: 3 },
        { texto: 'Autoestima', tag: 'autoestima', peso: 3 },
      ],
    },
    {
      id: 'abordagem',
      pergunta: 'Você tem preferência por alguma abordagem?',
      respostas: [
        { texto: 'TCC', tag: 'tcc', peso: 2 },
        { texto: 'Psicanálise', tag: 'psicanalise', peso: 2 },
        { texto: 'Humanista', tag: 'humanista', peso: 2 },
      ],
    },
  ];

  return {
    psicologasData: mockPsicologasDataConst,
    perguntasMatch: mockPerguntasMatchConst,
  };
});

// Mock do logger
vi.mock('../utils/logger.js', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock de componentes filhos para inspecionar props
const mockCatalogo = vi.fn();
vi.mock('../components/Catalogo.jsx', () => ({
  default: (props) => {
    mockCatalogo(props); // Chama o mock para registrar as props
    return <div data-testid="mock-catalogo">Catalogo Mock</div>;
  }
}));

const mockQuestionarioMatch = vi.fn();
vi.mock('../components/QuestionarioMatch.jsx', () => ({
  default: (props) => {
    mockQuestionarioMatch(props); // Chama o mock para registrar as props
    // Simula a chamada de onMatchComplete para testes de fluxo
    if (props.onMatchComplete && global.simulateMatchComplete) {
        global.simulateMatchComplete(props.onMatchComplete);
    }
    return <div data-testid="mock-questionario">Questionario Mock</div>;
  }
}));


// Mock do window.open e window.scrollTo
global.open = vi.fn();
global.scrollTo = vi.fn();


// --- Configuração de Testes ---
beforeEach(() => {
  vi.clearAllMocks(); // Limpa todos os mocks antes de cada teste
  global.fetch = vi.fn(); // Reseta o mock do fetch
  delete global.simulateMatchComplete; // Garante que não vaze entre testes
});

afterEach(() => {
    delete global.simulateMatchComplete;
});


// --- Suítes de Teste ---
describe('App.jsx - Orquestração e Integração com API', () => {

  it('Teste 1.1: Renderização com Sucesso na Carga de Dados da API', async () => {
    const mockHorariosAPI = [
      { psicologa_id: '1', horarios_disponiveis: { seg: ['09:00', '10:00'], ter: ['14:00'] } },
      { psicologa_id: '2', horarios_disponiveis: { qua: ['11:00'] } },
    ];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHorariosAPI,
    });

    render(<App />);

    // Espera que a API seja chamada e os dados processados
    // Apenas Catalogo é renderizado inicialmente.
    await waitFor(() => {
      expect(mockCatalogo).toHaveBeenCalled();
    });
    expect(mockQuestionarioMatch).not.toHaveBeenCalled(); // Não deve ter sido chamado ainda

    // Verificar props para Catalogo
    // Pegar a última chamada ao mock para garantir que temos as props após a resolução da API
    const lastCatalogoCallIndex = mockCatalogo.mock.calls.length - 1;
    const catalogoProps = mockCatalogo.mock.calls[lastCatalogoCallIndex][0];
    expect(catalogoProps.psicologas.find(p => p.id === '1').horarios_disponiveis).toEqual({ seg: ['09:00', '10:00'], ter: ['14:00'] });
    expect(catalogoProps.psicologas.find(p => p.id === '2').horarios_disponiveis).toEqual({ qua: ['11:00'] });
    expect(catalogoProps.psicologas.find(p => p.id === '3').horarios_disponiveis).toEqual({}); // Não estava na API, deve ser vazio
    expect(catalogoProps.isLoadingHorarios).toBe(false);

    // Para verificar horariosGerais, precisamos simular o clique para renderizar o QuestionarioMatch
    // ou testar o estado interno do App, o que é menos ideal.
    // Por enquanto, vamos focar no que é passado para o Catalogo e no banner de erro.
    // A verificação de horariosGerais será mais apropriada quando QuestionarioMatch for renderizado.

    // Verificar ausência do banner de erro
    expect(screen.queryByText(/Ops! Ocorreu um problema/i)).not.toBeInTheDocument();
  }); // Fechamento correto do it() para Teste 1.1

  it('Teste 1.2: Renderização com Falha na API de Horários', async () => {
    const apiError = new Error('API is down');
    global.fetch.mockRejectedValueOnce(apiError);

    render(<App />);

    // Espera que a tentativa de fetch ocorra e Catalogo seja renderizado
    await waitFor(() => {
        expect(mockCatalogo).toHaveBeenCalled();
    });
    expect(mockQuestionarioMatch).not.toHaveBeenCalled(); // Não deve ter sido chamado

    // Verificar se o banner de erro é exibido
    expect(screen.getByText(/Ops! Ocorreu um problema/i)).toBeInTheDocument();
    expect(document.querySelector('.error-banner')).toBeInTheDocument();

    // Verificar props para Catalogo
    // Pegar a última chamada, pois o componente pode re-renderizar
    const lastCatalogoCallIndex = mockCatalogo.mock.calls.length - 1;
    const catalogoPropsError = mockCatalogo.mock.calls[lastCatalogoCallIndex][0];
    expect(catalogoPropsError.isLoadingHorarios).toBe(false);
    // Em caso de erro, psicologas ainda terá os dados iniciais, mas horarios_disponiveis não será populado pela API
    expect(catalogoPropsError.psicologas.every(p => Object.keys(p.horarios_disponiveis).length === 0)).toBe(true);

    // O logger.error deve ter sido chamado com o erro da API
    await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
            "--- ERRO API HORÁRIOS ---",
            expect.objectContaining({ erro: apiError.message })
        );
    });
  });
});

// Outros testes de App.jsx (UI Pós-Match, Navegação) virão aqui
// ...

// Testes básicos anteriores para garantir que não quebramos nada (podem ser removidos ou adaptados)
describe('App.jsx - Testes de Renderização Básica (Exemplo Anterior)', () => {
    beforeEach(() => {
        // Mock de fetch para estes testes básicos, se necessário
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [] // Retorna vazio para não interferir com lógica específica de horários
        });
    });

    it('renderiza o header corretamente', async () => {
        render(<App />);
        await waitFor(() => expect(mockCatalogo).toHaveBeenCalled());
        expect(screen.getByText('Encontre uma especialista ideal para si')).toBeInTheDocument();
    });

    it('mostra o mock do catálogo inicialmente', async () => {
        render(<App />);
        await waitFor(() => expect(mockCatalogo).toHaveBeenCalled());
        expect(screen.getByTestId('mock-catalogo')).toBeInTheDocument();
        expect(screen.getByText('Não sabe qual profissional escolher?')).toBeInTheDocument();
    });

    it('navega para o questionário mockado ao clicar em "Encontrar a minha especialista ideal"', async () => {
        render(<App />);
        // Espera que o Catalogo seja renderizado (pode ser chamado múltiplas vezes durante o setup inicial devido a atualizações de estado)
        await waitFor(() => expect(mockCatalogo).toHaveBeenCalled());

        // Guarda a contagem de chamadas ANTES do clique
        const initialCatalogoCallCount = mockCatalogo.mock.calls.length;
        expect(initialCatalogoCallCount).toBeGreaterThan(0); // Garante que foi chamado pelo menos uma vez

        const botaoIniciarMatch = screen.getByText('✨ Encontrar a minha especialista ideal');
        fireEvent.click(botaoIniciarMatch);

        // Após o clique, QuestionarioMatch deve ser renderizado (e chamado pela primeira vez)
        await waitFor(() => expect(mockQuestionarioMatch).toHaveBeenCalledTimes(1));
        expect(screen.getByTestId('mock-questionario')).toBeInTheDocument();

        // Garante que o mockCatalogo NÃO foi chamado novamente após o clique,
        // ou seja, a contagem de chamadas permaneceu a mesma de antes do clique.
        expect(mockCatalogo.mock.calls.length).toBe(initialCatalogoCallCount);
    });
}); // Fechamento do describe 'App.jsx - Testes de Renderização Básica (Exemplo Anterior)'


// --- Testes de UI Pós-Match ---
describe('App.jsx - UI Pós-Match', () => {
  beforeEach(() => {
    // Mock de fetch para estes testes, API de horários retorna sucesso mas pode ser vazia ou com dados.
    // O importante é o estado resultadoMatch.
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [ // Mock da API de horários, pode ser ajustado por teste se necessário
        { psicologa_id: '1', horarios_disponiveis: { seg: ['10:00', '11:00'], ter: ['14:00'] } },
        { psicologa_id: '2', horarios_disponiveis: { qua: ['11:00'] } },
      ],
    });
  });

  it('Teste 5.1: Exibe horários específicos da especialista no select', async () => {
    const psicologaComHorarios = {
      id: '1',
      nome: 'Dra. Com Horários',
      fotoUrl: 'url.jpg',
      crp: '01/123',
      abordagem: 'TCC',
      bio: 'Bio dela',
      // Horários específicos desta psicóloga
      horarios_disponiveis: { seg: ['09:00', '10:00'], qui: ['14:00'] },
      mensagemResultado: "Sua especialista ideal!",
      tagsParaMatch: [] // Não relevante para este teste específico
    };

    // Simular que o QuestionarioMatch completou e chamou onMatchComplete com esta psicóloga
    global.simulateMatchComplete = (onMatchCompleteCallback) => {
      onMatchCompleteCallback([psicologaComHorarios]);
    };

    render(<App />);

    // Clicar para iniciar o match e disparar a simulação de onMatchComplete
    await waitFor(() => expect(mockCatalogo).toHaveBeenCalled());
    fireEvent.click(screen.getByText('✨ Encontrar a minha especialista ideal'));

    // Esperar o resultado do match ser renderizado
    await screen.findByText('✨ A sua especialista ideal');
    await screen.findByText('Dra. Com Horários');

    const selectHorario = screen.getByLabelText('Escolha um horário para iniciar:');
    expect(selectHorario).not.toBeDisabled();

    const options = Array.from(selectHorario.querySelectorAll('option'));
    // Esperado: 1 option "Selecione um horário" + 2 options de seg + 1 option de qui
    expect(options).toHaveLength(1 + 2 + 1);

    expect(options[0].textContent).toBe('Selecione um horário');
    expect(options[0].disabled).toBe(true);

    // Verificar optgroup "Segunda-feira" e suas options
    const optgroupSeg = selectHorario.querySelector('optgroup[label="Segunda-feira"]');
    expect(optgroupSeg).not.toBeNull();
    const optionsSeg = Array.from(optgroupSeg.querySelectorAll('option'));
    expect(optionsSeg).toHaveLength(2);
    expect(optionsSeg[0].value).toBe('Segunda-feira às 09:00');
    expect(optionsSeg[0].textContent).toBe('09:00');
    expect(optionsSeg[1].value).toBe('Segunda-feira às 10:00');
    expect(optionsSeg[1].textContent).toBe('10:00');

    // Verificar optgroup "Quinta-feira" e suas options
    const optgroupQui = selectHorario.querySelector('optgroup[label="Quinta-feira"]');
    expect(optgroupQui).not.toBeNull();
    const optionsQui = Array.from(optgroupQui.querySelectorAll('option'));
    expect(optionsQui).toHaveLength(1);
    expect(optionsQui[0].value).toBe('Quinta-feira às 14:00');
    expect(optionsQui[0].textContent).toBe('14:00');
  });

  it('Teste 5.2: Exibe select desabilitado para especialista sem horários', async () => {
    const psicologaSemHorarios = {
      id: '2',
      nome: 'Dra. Sem Horários',
      fotoUrl: 'url2.jpg',
      crp: '01/456',
      abordagem: 'Psicanálise',
      bio: 'Bio dela também',
      horarios_disponiveis: {}, // Sem horários
      mensagemResultado: "Sua especialista ideal!",
      tagsParaMatch: []
    };

    global.simulateMatchComplete = (onMatchCompleteCallback) => {
      onMatchCompleteCallback([psicologaSemHorarios]);
    };

    render(<App />);
    await waitFor(() => expect(mockCatalogo).toHaveBeenCalled());
    fireEvent.click(screen.getByText('✨ Encontrar a minha especialista ideal'));

    await screen.findByText('✨ A sua especialista ideal');
    await screen.findByText('Dra. Sem Horários');

    const selectHorario = screen.getByLabelText('Escolha um horário para iniciar:');
    expect(selectHorario).toBeDisabled();

    const options = Array.from(selectHorario.querySelectorAll('option'));
    expect(options).toHaveLength(1); // Apenas a option "Nenhum horário disponível"
    expect(options[0].textContent).toBe('Nenhum horário disponível');
    expect(options[0].disabled).toBe(true);
  });
});
