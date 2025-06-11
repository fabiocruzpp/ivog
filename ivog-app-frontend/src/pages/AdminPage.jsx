import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const ADMIN_TELEGRAM_ID = '1318210843';

function AdminPage() {
  const [configs, setConfigs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [telegramId, setTelegramId] = useState(null);
  
  const [numPerguntas, setNumPerguntas] = useState('');
  const [message, setMessage] = useState('');

  // Novos estados para o formulário de desafio
  const [temas, setTemas] = useState([]);
  const [subtemas, setSubtemas] = useState([]);
  const [selectedTipo, setSelectedTipo] = useState('tema');
  const [selectedValue, setSelectedValue] = useState('');

  useEffect(() => {
    const telegram = window.Telegram.WebApp;
    const user = telegram.initDataUnsafe?.user;

    if (user && user.id.toString() === ADMIN_TELEGRAM_ID) {
      setIsAuthorized(true);
      const currentTelegramId = user.id.toString();
      setTelegramId(currentTelegramId);
      // Busca todas as informações iniciais necessárias para a página
      fetchAllInitialData(currentTelegramId);
    } else {
      setError('Acesso negado. Esta área é restrita a administradores.');
      setLoading(false);
    }
  }, []);

  const fetchAllInitialData = async (currentTelegramId) => {
    try {
      setLoading(true);
      // Usamos Promise.all para buscar tudo em paralelo
      const [configsRes, temasRes, subtemasRes] = await Promise.all([
        api.get('/admin/configs', { params: { telegram_id: currentTelegramId } }),
        api.get('/admin/challenge_options', { params: { type: 'tema', telegram_id: currentTelegramId } }),
        api.get('/admin/challenge_options', { params: { type: 'subtema', telegram_id: currentTelegramId } })
      ]);

      setConfigs(configsRes.data);
      setNumPerguntas(configsRes.data.num_max_perguntas_simulado || '');
      setTemas(temasRes.data);
      setSubtemas(subtemasRes.data);
      
      // Define um valor inicial para o dropdown de valor
      if (temasRes.data.length > 0) {
        setSelectedValue(temasRes.data[0]);
      }

    } catch (err) {
      setError('Falha ao carregar dados da página de admin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => { /* ...código existente... */ };
  const handleSetNumPerguntas = async (e) => { /* ...código existente... */ };

  // Função para lidar com a ativação de um desafio
  const handleActivateChallenge = async (e) => {
    e.preventDefault();
    if (!selectedValue) {
        setMessage('Por favor, selecione um valor para o desafio.');
        return;
    }
    setMessage(`Ativando desafio ${selectedTipo}: ${selectedValue}...`);
    try {
        await api.post('/admin/challenge/activate', {
            telegram_id: telegramId,
            tipo: selectedTipo,
            valor: selectedValue
        });
        setMessage('Desafio ativado com sucesso! Notificação enviada.');
        fetchAllInitialData(telegramId); // Re-busca tudo para atualizar a tela
    } catch (err) {
        setMessage('Erro ao ativar desafio.');
        console.error(err);
    }
  };

  // Função para lidar com a desativação de um desafio
  const handleDeactivateChallenge = async () => {
    setMessage('Desativando desafio...');
    try {
        await api.post('/admin/challenge/deactivate', { telegram_id: telegramId });
        setMessage('Desafio desativado com sucesso! Resumo enviado.');
        fetchAllInitialData(telegramId); // Re-busca tudo para atualizar a tela
    } catch (err) {
        setMessage('Erro ao desativar desafio.');
        console.error(err);
    }
  };

  if (!isAuthorized) { /* ...código de acesso negado sem alteração... */ }
  if (loading) { return <p style={centeredTextStyle}>Carregando painel de admin...</p>; }

  const optionsList = selectedTipo === 'tema' ? temas : subtemas;

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <Link to="/" style={backButtonStyle}>&larr; Voltar ao Menu</Link>
      <h1 style={{ textAlign: 'center' }}>⚙️ Painel de Administração</h1>
      
      {message && <p style={{ textAlign: 'center', fontWeight: 'bold', height: '20px', color: '#007BFF' }}>{message}</p>}

      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Status do Desafio</h2>
        {configs && (
          <div style={configItemStyle}>
              <span>Desafio Ativo: <strong>{configs.desafio_ativo ? '🔥 SIM' : '🧘 Não'}</strong></span>
              {configs.desafio_ativo 
                  ? <button onClick={handleDeactivateChallenge} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>Desativar</button>
                  : null
              }
          </div>
        )}
        {configs && configs.desafio_ativo && (
            <div style={{marginTop: '10px'}}>
                <p><strong>Tipo:</strong> {configs.desafio_tipo}</p>
                <p><strong>Valor:</strong> {configs.desafio_valor}</p>
            </div>
        )}
      </div>

      {!configs?.desafio_ativo && (
        <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Ativar Novo Desafio</h2>
            <form onSubmit={handleActivateChallenge}>
                <div style={formGroupStyle}>
                    <label>Tipo de Desafio</label>
                    <select value={selectedTipo} onChange={e => setSelectedTipo(e.target.value)} style={inputStyle}>
                        <option value="tema">Tema</option>
                        <option value="subtema">Subtema</option>
                    </select>
                </div>
                <div style={formGroupStyle}>
                    <label>Valor</label>
                    <select value={selectedValue} onChange={e => setSelectedValue(e.target.value)} style={inputStyle}>
                        {optionsList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <button type="submit" style={{...submitButtonStyle, backgroundColor: '#007BFF'}}>Ativar Desafio</button>
            </form>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Configurações Gerais</h2>
        {configs && (
          <>
            <div style={configItemStyle}>
              <span>Simulado Livre Ativado: <strong>{configs.simulado_livre_ativado ? '✅ Sim' : '❌ Não'}</strong></span>
              <button onClick={() => handleToggle('simulado_livre_ativado')} style={buttonStyle}>Alternar</button>
            </div>
            <div style={configItemStyle}>
              <span>Feedback Detalhado: <strong>{configs.feedback_detalhado_ativo ? '✅ Sim' : '❌ Não'}</strong></span>
              <button onClick={() => handleToggle('feedback_detalhado_ativo')} style={buttonStyle}>Alternar</button>
            </div>
            <form onSubmit={handleSetNumPerguntas} style={configItemStyle}>
              <label htmlFor="numPerguntas">Nº Máx. de Perguntas:</label>
              <input 
                type="number" 
                id="numPerguntas" 
                value={numPerguntas} 
                onChange={(e) => setNumPerguntas(e.target.value)}
                style={{...inputStyle, width: '60px', textAlign: 'center'}}
              />
              <button type="submit" style={buttonStyle}>Salvar</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Funções existentes que foram omitidas na resposta anterior por engano
AdminPage.prototype.handleToggle = async function(key) {
    this.setMessage(`Alterando ${key}...`);
    try {
      await api.post(`/admin/toggle_config/${key}`, { telegram_id: this.state.telegramId });
      this.setMessage(`'${key}' alterado com sucesso!`);
      this.fetchAllInitialData(this.state.telegramId);
    } catch (err) {
      this.setMessage(`Erro ao alterar '${key}'.`);
      console.error(err);
    }
};
AdminPage.prototype.handleSetNumPerguntas = async function(e) {
    e.preventDefault();
    this.setMessage('Salvando número de perguntas...');
    try {
        await api.post('/admin/set_config/num_max_perguntas_simulado', {
            telegram_id: this.state.telegramId,
            value: this.state.numPerguntas
        });
        this.setMessage('Número de perguntas salvo com sucesso!');
        this.fetchAllInitialData(this.state.telegramId);
    } catch (err) {
        this.setMessage('Erro ao salvar número de perguntas.');
        console.error(err);
    }
};

// Estilos
const centeredTextStyle = { textAlign: 'center', fontSize: '18px', padding: '20px' };
const backButtonStyle = { display: 'inline-block', marginBottom: '20px', textDecoration: 'none', color: '#007BFF', fontWeight: 'bold' };
const cardStyle = { backgroundColor: '#fff', padding: '20px', margin: '15px 0', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const cardTitleStyle = { marginTop: 0, marginBottom: '15px', borderBottom: '2px solid #007BFF', paddingBottom: '10px' };
const configItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', padding: '12px 0', borderBottom: '1px solid #eee' };
const buttonStyle = { padding: '8px 12px', fontSize: '14px', cursor: 'pointer', border: '1px solid #007BFF', borderRadius: '5px', backgroundColor: 'white', color: '#007BFF', fontWeight: 'bold' };
const inputStyle = { padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ccc', marginLeft: '10px' };
const formGroupStyle = { display: 'flex', flexDirection: 'column', marginBottom: '15px' };
const submitButtonStyle = { width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' };


export default AdminPage;