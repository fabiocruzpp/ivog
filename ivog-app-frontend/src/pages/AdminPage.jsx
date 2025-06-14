import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import styles from './AdminPage.module.css';
import { useConfigStore } from '../store/configStore';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

const getInitialFormData = () => ({
    id: null,
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo',
    num_perguntas: 10,
    publico_alvo: { canal_principal: [], cargo: [] },
    filtros: { tema: '', subtema: '' },
});

function ChallengeFormModal({ isOpen, onClose, challenge, onSubmit, options }) {
    const [formData, setFormData] = useState(getInitialFormData());

    useEffect(() => {
        if (isOpen) {
            if (challenge) {
                const temaFiltro = challenge.filtros?.find(f => f.tipo_filtro === 'tema')?.valor_filtro || '';
                const subtemaFiltro = challenge.filtros?.find(f => f.tipo_filtro === 'subtema')?.valor_filtro || '';
                setFormData({
                    id: challenge.id || null,
                    titulo: challenge.titulo || '',
                    descricao: challenge.descricao || '',
                    data_inicio: challenge.data_inicio ? challenge.data_inicio.slice(0, 16) : '',
                    data_fim: challenge.data_fim ? challenge.data_fim.slice(0, 16) : '',
                    status: challenge.status || 'ativo',
                    num_perguntas: challenge.num_perguntas || 10,
                    publico_alvo: challenge.publico_alvo_json ? JSON.parse(challenge.publico_alvo_json) : { canal_principal: [], cargo: [] },
                    filtros: { tema: temaFiltro, subtema: subtemaFiltro },
                });
            } else {
                setFormData(getInitialFormData());
            }
        }
    }, [challenge, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, filtros: { ...prev.filtros, [name]: value } }));
    };

    const handleMultiSelectChange = (e, group, field) => {
        const values = Array.from(e.target.selectedOptions, option => option.value);
        setFormData(prev => ({
            ...prev,
            [group]: {
                ...prev[group],
                [field]: values
            }
        }));
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const { filtros, ...rest } = formData;
        const filtrosArray = [];
        if (filtros.tema) filtrosArray.push({ tipo: 'tema', valor: filtros.tema });
        if (filtros.subtema) filtrosArray.push({ tipo: 'subtema', valor: filtros.subtema });

        const finalData = { ...rest, filtros: filtrosArray };
        if (finalData.data_inicio) finalData.data_inicio = new Date(finalData.data_inicio).toISOString();
        if (finalData.data_fim) finalData.data_fim = new Date(finalData.data_fim).toISOString();
        onSubmit(finalData);
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <h2>{challenge ? 'Editar Desafio' : 'Criar Novo Desafio'}</h2>
                <form onSubmit={handleSubmit} className={styles.challengeForm}>
                    <div className={styles.formGroup}>
                        <label>Título</label>
                        <input name="titulo" value={formData.titulo} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Descrição</label>
                        <textarea name="descricao" value={formData.descricao} onChange={handleChange}></textarea>
                    </div>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Data de Início</label>
                            <input type="datetime-local" name="data_inicio" value={formData.data_inicio} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Data de Fim</label>
                            <input type="datetime-local" name="data_fim" value={formData.data_fim} onChange={handleChange} required />
                        </div>
                    </div>
                     <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Status</label>
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="ativo">Ativo</option>
                                <option value="inativo">Inativo</option>
                                <option value="arquivado">Arquivado</option>
                            </select>
                        </div>
                         <div className={styles.formGroup}>
                            <label>Nº de Perguntas</label>
                            <input type="number" name="num_perguntas" value={formData.num_perguntas} onChange={handleChange} min="1" required />
                        </div>
                    </div>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Conteúdo (Tema)</label>
                            <select name="tema" value={formData.filtros.tema} onChange={handleFilterChange} required >
                                <option value="">Selecione um tema</option>
                                {options.temas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Conteúdo (Subtema)</label>
                            <select name="subtema" value={formData.filtros.subtema} onChange={handleFilterChange}>
                                <option value="">(Opcional) Selecione um subtema</option>
                                {options.subtemas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Público: Canal</label>
                            <select multiple value={formData.publico_alvo.canal_principal} onChange={(e) => handleMultiSelectChange(e, 'publico_alvo', 'canal_principal')} className={styles.multiSelect}>
                                {options.canais.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Público: Cargo</label>
                            <select multiple value={formData.publico_alvo.cargo} onChange={(e) => handleMultiSelectChange(e, 'publico_alvo', 'cargo')} className={styles.multiSelect}>
                                {options.cargos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
                        <button type="submit" className={styles.primaryButton}>Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [challenges, setChallenges] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentChallenge, setCurrentChallenge] = useState(null);
    const [formOptions, setFormOptions] = useState({ temas: [], subtemas: [], cargos: [], canais: [] });
    const [telegramId, setTelegramId] = useState(null);

    const { configs, loading: loadingConfigs, toggleConfig } = useConfigStore();

    useEffect(() => {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (user && user.id) {
            setTelegramId(user.id.toString());
        }
    }, []);

    const fetchAllData = useCallback(async () => {
        const isWeb = !window.Telegram?.WebApp?.initData;
        if (!isWeb && !telegramId) {
            return;
        }

        setLoading(true);
        setMessage('');
        try {
            const params = telegramId ? { telegram_id: telegramId } : {};

            const [challengesRes, temasRes, subtemasRes, cargosRes, canaisRes] = await Promise.all([
                api.get('/admin/challenges', { params }),
                api.get('/admin/challenge_options', { params: { ...params, type: 'tema' } }),
                api.get('/admin/challenge_options', { params: { ...params, type: 'subtema' } }),
                api.get('/admin/challenge_options', { params: { ...params, type: 'cargo' } }),
                api.get('/admin/challenge_options', { params: { ...params, type: 'canal_principal' } })
            ]);
            setChallenges(challengesRes.data);
            setFormOptions({
                temas: temasRes.data,
                subtemas: subtemasRes.data,
                cargos: cargosRes.data,
                canais: canaisRes.data
            });
        } catch (err) {
            setMessage('Erro ao carregar dados do admin.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [telegramId]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleOpenCreateModal = () => {
        setCurrentChallenge(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (challenge) => {
        setCurrentChallenge(challenge);
        setIsModalOpen(true);
    };

    const handleDeleteChallenge = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este desafio?')) {
            setMessage('Excluindo...');
            try {
                await api.delete(`/admin/challenges/${id}`, { data: { telegram_id: telegramId } });
                setMessage('Desafio excluído com sucesso!');
                fetchAllData();
            } catch (err) {
                setMessage('Erro ao excluir desafio.');
                console.error(err);
            }
        }
    };
    
    const handleFormSubmit = async (challengeData) => {
        setMessage('Salvando desafio...');
        const payload = { ...challengeData, telegram_id: telegramId };
        const apiCall = challengeData.id 
            ? api.put(`/admin/challenges/${challengeData.id}`, payload)
            : api.post('/admin/challenges', payload);

        try {
            await apiCall;
            setMessage('Desafio salvo com sucesso!');
            setIsModalOpen(false);
            fetchAllData();
        } catch (err) {
            setMessage('Erro ao salvar desafio.');
            console.error(err);
        }
    };

    if (loading || loadingConfigs) return <p>Carregando painel de admin...</p>;

    return (
        <div className={styles.screenContainer}>
            <div className={styles.contentArea}>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.adminSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Configurações Gerais</h2>
                    </div>
                    <div className={styles.configToggle}>
                        <span>Modo Treino</span>
                        <label className={styles.switch}>
                            <input 
                                type="checkbox" 
                                checked={configs.modo_treino_ativado || false}
                                onChange={() => toggleConfig('modo_treino_ativado')}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>

                <div className={styles.adminSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Base de Conhecimento</h2>
                        <Link to="/admin/questions" className={styles.primaryButton}>
                            Gerenciar Perguntas
                        </Link>
                    </div>
                </div>

                <div className={styles.adminSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Gerenciador de Desafios</h2>
                        <button onClick={handleOpenCreateModal} className={styles.primaryButton}>
                            Criar Novo Desafio
                        </button>
                    </div>
                    <div className={styles.tableContainer}>
                        <table className={styles.challengeTable}>
                            <thead>
                                <tr>
                                    <th>Título</th>
                                    <th>Status</th>
                                    <th>Nº Perguntas</th>
                                    <th>Início</th>
                                    <th>Fim</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {challenges.length > 0 ? challenges.map(c => (
                                    <tr key={c.id}>
                                        <td>{c.titulo}</td>
                                        <td><span className={`${styles.statusBadge} ${styles[c.status]}`}>{c.status}</span></td>
                                        <td>{c.num_perguntas}</td>
                                        <td>{new Date(c.data_inicio).toLocaleString()}</td>
                                        <td>{new Date(c.data_fim).toLocaleString()}</td>
                                        <td className={styles.actionsCell}>
                                            <button onClick={() => handleOpenEditModal(c)} className={styles.editButton}>Editar</button>
                                            <button onClick={() => handleDeleteChallenge(c.id)} className={styles.deleteButton}>Excluir</button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6">Nenhum desafio criado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <ChallengeFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    challenge={currentChallenge}
                    onSubmit={handleFormSubmit}
                    options={formOptions}
                />
            )}
        </div>
    );
}

export default AdminPage;