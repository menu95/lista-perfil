// src/components/Catalogo.jsx

import React, { useState, useRef } from 'react'; // 1. Importar o useRef
import CalendarIcon from './CalendarIcon.jsx';
import Horarios from './Horarios.jsx';

const Catalogo = ({ psicologas, isLoadingHorarios }) => {
  const [expandedCardId, setExpandedCardId] = useState(null);
  const numeroClinica = '5521996561994';

  // 2. Criar uma referência para guardar os elementos dos cards
  const cardRefs = useRef({});

  const handleWhatsAppClick = (psiNome) => {
    const mensagem = encodeURIComponent(`Olá, vi o catálogo e gostaria de agendar com a psicóloga ${psiNome}.`);
    window.open(`https://wa.me/${numeroClinica}?text=${mensagem}`, '_blank');
  };

  const handleToggleExpand = (psiId) => {
    const isExpanding = expandedCardId !== psiId;
    setExpandedCardId(isExpanding ? psiId : null);

    // 3. Adicionar a lógica de scroll suave
    // Usamos um pequeno timeout para garantir que o scroll acontece
    // após o React renderizar e a animação de altura começar.
    setTimeout(() => {
      const cardElement = cardRefs.current[psiId];
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: "smooth",
          block: "center", // Centraliza o card no ecrã
        });
      }
    }, 150); // 150ms é um bom valor de delay
  };

  return (
    <div className="catalogo-container">
      {psicologas.map((psi) => {
        const isExpanded = expandedCardId === psi.id;
        return (
          // 4. Associar cada card à sua referência
          <div 
            key={psi.id} 
            className={`psi-card ${isExpanded ? 'psi-card--expanded' : ''}`}
            ref={el => (cardRefs.current[psi.id] = el)}
          >
            <img src={psi.fotoUrl} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/150x150/EAE5DE/CCC?text=Foto'; }} alt={`Foto de ${psi.nome}`} className="psi-foto" />
            <div className="psi-info">
                <h3 className="psi-nome">{psi.nome}</h3>
                {psi.crp && <p className="psi-crp"><strong>CRP:</strong> {psi.crp}</p>}
                <p className="psi-abordagem">{psi.abordagem}</p>
                <p className={`psi-bio ${!isExpanded ? 'psi-bio--collapsed' : ''}`}>{psi.bio}</p>
                
                {isExpanded && <Horarios horarios={psi.horarios_disponiveis} isLoading={isLoadingHorarios} />}

                <div className="psi-especialidades">
                {psi.especialidades.map((esp, index) => (
                    <span key={index} className="tag">{esp}</span>
                ))}
                </div>
            </div>
            <div className="card-botoes">
                <button className="botao-agendar" onClick={() => handleWhatsAppClick(psi.nome)}>
                    <CalendarIcon /> Agendar
                </button>
                <button className="botao-perfil" onClick={() => handleToggleExpand(psi.id)}>
                    {isExpanded ? 'Ver Menos' : 'Ver Perfil'}
                </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Catalogo;
