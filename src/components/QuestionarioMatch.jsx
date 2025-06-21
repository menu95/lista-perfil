import React, { useState } from 'react';
import { perguntasMatch } from '../data.js';
// 1. IMPORTA O NOSSO NOVO LOGGER
import logger from '../utils/logger.js'; 

function formatarDia(dia) {
    const mapa = { seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo" };
    return mapa[dia.toLowerCase()] || dia;
}

// FUNÇÃO COMPLETA DA API GEMINI JÁ A USAR O LOGGER
async function analisarTextoComIA(texto, todasAsTags) {
    logger.log("--- INÍCIO ANÁLISE IA ---", { texto });
    
    const prompt = `Analise o seguinte texto de um utilizador que procura terapia: "${texto}". Com base no texto, identifique as 3 tags mais relevantes da lista abaixo. Responda APENAS com um array de objetos JSON. Cada objeto deve ter uma chave "tag" (string) e uma chave "confianca" (um número de 0 a 1). Lista de tags disponíveis: ${JSON.stringify(todasAsTags)}`;
    
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              "tag": { "type": "STRING" },
              "confianca": { "type": "NUMBER" }
            },
            required: ["tag", "confianca"]
          }
        }
      }
    };
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

    if (!apiKey) {
        logger.error("ERRO CRÍTICO: Variável de ambiente VITE_GEMINI_API_KEY não encontrada.");
        return [];
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`Erro na API Gemini: ${response.status}`, { errorBody });
        throw new Error(`Erro na API Gemini: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0]) {
        const text = result.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(text);
        logger.log("--- SUCESSO ANÁLISE IA ---", { resultado: parsedJson });
        return parsedJson;
    } else {
        logger.warn("Resposta da API Gemini bem-sucedida, mas sem conteúdo esperado.", { apiResponse: result });
        return [];
    }
}


const QuestionarioMatch = ({ onMatchComplete, psicologas, horariosGerais, isLoadingHorarios }) => {
    const [perguntaAtual, setPerguntaAtual] = useState(0);
    const [respostas, setRespostas] = useState([]);
    const [horariosSelecionados, setHorariosSelecionados] = useState([]);
    const [textoLivre, setTextoLivre] = useState("");
    const [isLoadingMatch, setIsLoadingMatch] = useState(false);

    const totalEtapas = perguntasMatch.length + 2;

    const handleRespostaClick = (resposta) => {
        setRespostas([...respostas, resposta]);
        setPerguntaAtual(perguntaAtual + 1);
    };

    const handleHorarioClick = (horarioKey) => {
        setHorariosSelecionados(prev => prev.includes(horarioKey) ? prev.filter(h => h !== horarioKey) : [...prev, horarioKey]);
    };

    const irParaProximaEtapa = () => {
        setPerguntaAtual(perguntaAtual + 1);
    };

    const finalizarMatch = async () => {
        if (isLoadingMatch) return;
        setIsLoadingMatch(true);
        // 2. USA O LOGGER PARA MONITORAR O INÍCIO DO PROCESSO
        logger.log("--- INÍCIO DO MATCH ---", { num_respostas: respostas.length, num_horarios: horariosSelecionados.length, tem_texto: textoLivre.trim().length > 0 });

        let candidatasParaMatch = psicologas;
        let avisoHorario = false;

        if (horariosSelecionados.length > 0) {
            const psicologasDisponiveis = psicologas.filter(psi => 
                horariosSelecionados.some(horarioKey => {
                    const [dia, hora] = horarioKey.split(':');
                    return psi.horarios_disponiveis && psi.horarios_disponiveis[dia]?.includes(hora);
                })
            );
            if (psicologasDisponiveis.length > 0) {
                candidatasParaMatch = psicologasDisponiveis;
            } else {
                avisoHorario = true;
            }
        }

        const scores = candidatasParaMatch.reduce((acc, psi) => ({ ...acc, [psi.id]: 0 }), {});

        respostas.forEach(resposta => {
            candidatasParaMatch.forEach(psi => {
                if (psi.tagsParaMatch.includes(resposta.tag)) {
                    scores[psi.id] += resposta.peso;
                }
            });
        });

        if (textoLivre.trim().length > 0) {
            const tagsParaIA = [...new Set(candidatasParaMatch.flatMap(p => p.tagsParaMatch))];
            try {
                const startTime = performance.now();
                const tagsFromAI = await analisarTextoComIA(textoLivre, tagsParaIA);
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                
                logger.log("--- Performance Análise IA ---", { duration_ms: duration });

                tagsFromAI.forEach(item => {
                    candidatasParaMatch.forEach(psi => {
                        if (psi.tagsParaMatch.includes(item.tag)) {
                            const pontosIA = Math.round(7 * (item.confianca || 0.5));
                            scores[psi.id] += pontosIA;
                        }
                    });
                });
            } catch (error) {
                // 2. USA O LOGGER PARA CAPTURAR ERROS
                logger.error("Falha ao adicionar pontos da IA", { error: error.message });
            }
        }
        
        const maiorScore = Math.max(...Object.values(scores));

        if (maiorScore === 0) {
            const shuffled = [...candidatasParaMatch].sort(() => 0.5 - Math.random());
            const resultadoFinal = shuffled.slice(0, 1);
            logger.log("--- FIM DO MATCH (Score Zero) ---", { resultado: resultadoFinal[0]?.nome });
            onMatchComplete(resultadoFinal);
            setIsLoadingMatch(false);
            return;
        }

        let melhoresMatches = candidatasParaMatch.filter(psi => scores[psi.id] === maiorScore);
        let melhorMatch = melhoresMatches[Math.floor(Math.random() * melhoresMatches.length)];

        if (avisoHorario) {
            melhorMatch = {
                ...melhorMatch,
                mensagemResultado: (melhorMatch.mensagemResultado || "Esta é a melhor combinação para si.") + " (Aviso: não encontrámos uma especialista com os horários que selecionou, mas esta é a melhor combinação para as suas outras necessidades.)"
            };
        }
        
        // 2. USA O LOGGER PARA REGISTAR O SUCESSO
        logger.log("--- FIM DO MATCH (Sucesso) ---", { resultado: melhorMatch.nome, score: maiorScore, aviso_horario: avisoHorario });

        setIsLoadingMatch(false);
        onMatchComplete([melhorMatch]);
    };

    const renderEtapaAtual = () => {
        const progresso = ((perguntaAtual + 1) / totalEtapas) * 100;

        if (perguntaAtual < perguntasMatch.length) {
            const pergunta = perguntasMatch[perguntaAtual];
            return (
                <>
                    <div className="match-progresso-barra"><div className="match-progresso-preenchimento" style={{ width: `${progresso}%` }}></div></div>
                    <h3 className="match-pergunta">{pergunta.pergunta}</h3>
                    <div className="match-respostas">
                        {pergunta.respostas.map((resposta, index) => (
                            <button key={index} onClick={() => handleRespostaClick(resposta)}>{resposta.texto}</button>
                        ))}
                    </div>
                    <p className="match-progresso-texto">Passo {perguntaAtual + 1} de {totalEtapas}</p>
                </>
            );
        } else if (perguntaAtual === perguntasMatch.length) {
            const todosHorariosParaGrid = Object.entries(horariosGerais).flatMap(([dia, horas]) => horas.map(hora => ({
                key: `${dia}:${hora}`,
                display: `${formatarDia(dia)} ${hora}`
            })));

            return (
                <>
                    <div className="match-progresso-barra"><div className="match-progresso-preenchimento" style={{ width: `${progresso}%` }}></div></div>
                    <h3 className="match-pergunta">Quais dias e horários funcionam para si?</h3>
                    <p className="match-subpergunta">Selecione todas as opções que se encaixam na sua rotina. Isto ajudar-nos-á a encontrar uma especialista com agenda compatível.</p>
                    <div className="horarios-grid-container">
                        {isLoadingHorarios ? (
                            <p className="sem-horarios-texto">A carregar horários disponíveis...</p>
                        ) : todosHorariosParaGrid.length > 0 ? (
                            todosHorariosParaGrid.map(horario => (
                                <button key={horario.key} className={`botao-horario ${horariosSelecionados.includes(horario.key) ? 'selecionado' : ''}`} onClick={() => handleHorarioClick(horario.key)}>
                                    {horario.display}
                                </button>
                            ))
                        ) : (
                            <p className="sem-horarios-texto">Não foi possível carregar os horários. Pode pular esta etapa.</p>
                        )}
                    </div>
                    <div className="botoes-navegacao-horarios">
                        <button className="botao-proximo" onClick={irParaProximaEtapa}>Próxima Etapa</button>
                        <button className="botao-pular" onClick={irParaProximaEtapa}>Pular esta etapa</button>
                    </div>
                    <p className="match-progresso-texto">Passo {perguntaAtual + 1} de {totalEtapas}</p>
                </>
            );
        } else {
            return (
                <>
                    <div className="match-progresso-barra"><div className="match-progresso-preenchimento" style={{ width: '100%' }}></div></div>
                    <h3 className="match-pergunta">Descreva o seu momento com as suas palavras.</h3>
                    <p className="match-subpergunta">A nossa Inteligência Artificial analisará a sua descrição para refinar a recomendação. (Opcional)</p>
                    <textarea className="match-textarea" value={textoLivre} onChange={(e) => setTextoLivre(e.target.value)} placeholder="Ex: 'Tenho tido muitas crises de ansiedade no trabalho...'" rows="4"></textarea>
                    <button className="botao-finalizar" onClick={finalizarMatch} disabled={isLoadingMatch}>
                        {isLoadingMatch ? 'A analisar...' : 'Ver a minha especialista ideal'}
                    </button>
                    <p className="match-progresso-texto">Último passo</p>
                </>
            );
        }
    };

    return (
        <div className="match-container">
            {renderEtapaAtual()}
        </div>
    );
};

export default QuestionarioMatch;
