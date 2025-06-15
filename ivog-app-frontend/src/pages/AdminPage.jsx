import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import styles from './AdminPage.module.css';
import { useConfigStore } from '../store/configStore';
import { useFeedbackStore } from '../store/feedbackStore';
import { useUserStore } from '../store/userStore';
import PillFormModal from '../components/PillFormModal';

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

function AdminManagement() {
    const [admins, setAdmins] = useState([]);
    const [newAdminId, setNewAdminId] = useState('');
    const { addToast } = useFeedbackStore();
    const { user } = useUserStore();

    const SUPER_ADMIN_ID = '1318210843';
    const isSuperAdmin = user?.id.toString() === SUPER_ADMIN_ID;

    const fetchAdmins = useCallback(() => {
        api.get('/admin/management/admins')
            .then(res => setAdmins(res.data))
            .catch(() => addToast('Erro ao carregar lista de admins.', 'error'));
    }, [addToast]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!newAdminId.trim()) return;
        try {
            const res = await api.post('/admin/management/admins', { telegram_id_to_add: newAdminId });
            addToast('Admin adicionado com sucesso!', 'success');
            alert(`Credenciais para o novo admin:\nUsuário: ${res.data.newUser.username}\nSenha: ${res.data.newUser.password}`);
            setNewAdminId('');
            fetchAdmins();
        } catch (err) {
            addToast(err.response?.data?.error || 'Erro ao adicionar admin.', 'error');
        }
    };

    const handleRemoveAdmin = async (id) => {
        if (window.confirm(`Tem certeza que deseja remover este administrador (${id})?`)) {
            try {
                await api.delete(`/admin/management/admins/${id}`);
                addToast('Admin removido com sucesso.', 'success');
                fetchAdmins();
            } catch (err) {
                addToast(err.response?.data?.error || 'Erro ao remover admin.', 'error');
            }
        }
    };

    return (
        <div className={styles.adminSection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Gerenciar Administradores</h2>
            </div>
            <form onSubmit={handleAddAdmin} className={styles.addAdminForm}>
                <input 
                    type="text" 
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    placeholder="ID do Telegram do novo admin"
                    className={styles.adminInput}
                    disabled={!isSuperAdmin}
                />
                <button 
                    type="submit" 
                    className={styles.primaryButton}
                    disabled={!isSuperAdmin}
                >
                    Adicionar
                </button>
            </form>
            <ul className={styles.adminList}>
                {admins.map(admin => (
                    <li key={admin.telegram_id}>
                        <span>{admin.first_name} ({admin.telegram_id})</span>
                        <button 
                            onClick={() => handleRemoveAdmin(admin.telegram_id)} 
                            className={styles.deleteButtonSmall}
                            disabled={!isSuperAdmin || admin.telegram_id.toString() === SUPER_ADMIN_ID}
                        >
                            Remover
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function KnowledgePillsManagement() {
    const [pills, setPills] = useState([]);
    const [csvFile, setCsvFile] = useState(null);
    const [mediaFiles, setMediaFiles] = useState(null);
    const { addToast, showLoading, hideLoading } = useFeedbackStore();
    // CADA COMPONENTE AGORA ACESSA DIRETAMENTE A STORE
    const { configs, toggleConfig, setConfigValue } = useConfigStore(); 
    const csvInputRef = React.useRef(null);
    const mediaInputRef = React.useRef(null);
    const [isPillModalOpen, setIsPillModalOpen] = useState(false);
    const [editingPill, setEditingPill] = useState(null);
    const [selectedPillIds, setSelectedPillIds] = useState([]);
    const [intervalMinutes, setIntervalMinutes] = useState('');

    // Efeito para sincronizar o input com o valor da store
    useEffect(() => {
        if (configs && configs.pills_broadcast_interval_minutes !== undefined) {
            setIntervalMinutes(configs.pills_broadcast_interval_minutes.toString());
        }
    }, [configs]);
    
    const fetchPills = useCallback(() => {
        api.get('/admin/pills')
            .then(res => setPills(res.data))
            .catch(() => addToast('Erro ao carregar pílulas.', 'error'));
    }, [addToast]);

    useEffect(() => {
        fetchPills();
    }, [fetchPills]);

    const handleImportCsv = async () => {
        if (!csvFile) return addToast('Por favor, selecione um arquivo CSV.', 'error');
        const formData = new FormData();
        formData.append('csvfile', csvFile);
        
        showLoading();
        try {
            const res = await api.post('/admin/pills/import-csv', formData);
            addToast(res.data.message, 'success');
            fetchPills();
            setCsvFile(null);
            if (csvInputRef.current) csvInputRef.current.value = null;
        } catch (err) {
            addToast(err.response?.data?.error || 'Erro ao importar CSV.', 'error');
        } finally {
            hideLoading();
        }
    };

    const handleSendNow = async () => {
        if(window.confirm('Deseja enviar uma pílula para os usuários agora? Esta ação é independente do agendador.')) {
            showLoading();
            try {
                const res = await api.post('/admin/pills/send-now');
                addToast(res.data.message, 'success');
            } catch (err) {
                addToast(err.response?.data?.error || 'Erro ao disparar envio.', 'error');
            } finally {
                hideLoading();
            }
        }
    };

    const handleSaveInterval = async () => {
        showLoading();
        try {
            await setConfigValue('pills_broadcast_interval_minutes', intervalMinutes);
            addToast('Intervalo salvo! O agendador será atualizado no backend.', 'success');
        } catch (err) {
            addToast(err.response?.data?.error || 'Erro ao salvar intervalo.', 'error');
        } finally {
            hideLoading();
        }
    };
    
    const handleMediaUpload = async () => {
        if (!mediaFiles || mediaFiles.length === 0) return addToast('Por favor, selecione os arquivos de mídia.', 'error');
        const formData = new FormData();
        for (const file of mediaFiles) {
            formData.append('mediafiles', file);
        }
        
        showLoading();
        try {
            const res = await api.post('/admin/pills/upload-media', formData);
            addToast(res.data.message, 'success');
            setMediaFiles(null);
            if (mediaInputRef.current) mediaInputRef.current.value = null;
        } catch (err) {
            addToast(err.response?.data?.error || 'Erro ao enviar mídias.', 'error');
        } finally {
            hideLoading();
        }
    };

    const handleSyncMedia = async () => {
        showLoading();
        try {
            const res = await api.post('/admin/pills/sync-media');
            addToast(res.data.message, 'success');
            fetchPills();
        } catch (err) {
            addToast(err.response?.data?.error || 'Erro ao sincronizar mídias.', 'error');
        } finally {
            hideLoading();
        }
    };

    const handlePillSubmit = async (pillData) => {
        const apiCall = pillData.id
            ? api.put(`/admin/pills/${pillData.id}`, pillData)
            : api.post('/admin/pills', pillData);
        
        showLoading();
        try {
            const res = await apiCall;
            addToast(res.data.message, 'success');
            fetchPills();
            setIsPillModalOpen(false);
        } catch (err) {
            addToast(err.response?.data?.error || 'Erro ao salvar pílula.', 'error');
        } finally {
            hideLoading();
        }
    };

    const handleSelectAllPills = (e) => {
        if (e.target.checked) {
            setSelectedPillIds(pills.map(p => p.id));
        } else {
            setSelectedPillIds([]);
        }
    };

    const handleSelectPill = (id) => {
        setSelectedPillIds(prev => 
            prev.includes(id) 
                ? prev.filter(selectedId => selectedId !== id) 
                : [...prev, id]
        );
    };

    const handleDeletePill = async (id) => {
        if (window.confirm('Tem certeza?')) {
            try {
                await api.delete(`/admin/pills/${id}`);
                addToast('Pílula deletada.', 'success');
                fetchPills();
            } catch(err) {
                addToast('Erro ao deletar.', 'error');
            }
        }
    };

    const handleBulkDeletePills = async () => {
        if (window.confirm(`Deletar ${selectedPillIds.length} pílulas?`)) {
            showLoading();
            try {
                await api.post('/admin/pills/bulk-delete', { ids: selectedPillIds });
                addToast('Pílulas selecionadas deletadas.', 'success');
                setSelectedPillIds([]);
                fetchPills();
            } catch(err) {
                addToast('Erro na exclusão em massa.', 'error');
            } finally {
                hideLoading();
            }
        }
    };

    return (
        <div className={styles.adminSection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Pílulas do Conhecimento</h2>
            </div>
            <div className={styles.pillsConfigGrid}>
                <div className={styles.configToggle}>
                    <span>Envio Automático</span>
                    <label className={styles.switch}>
                        <input 
                            type="checkbox" 
                            checked={configs.pills_broadcast_enabled || false}
                            onChange={() => toggleConfig('pills_broadcast_enabled')}
                        />
                        <span className={styles.slider}></span>
                    </label>
                </div>
                <div className={styles.configInterval}>
                    <label>Intervalo (minutos)</label>
                    <input 
                        type="number" 
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(e.target.value)}
                        className={styles.intervalInput}
                        min="1"
                    />
                    <button onClick={handleSaveInterval} className={styles.secondaryButton}>Salvar</button>
                </div>
                <div className={styles.configManualSend}>
                     <button onClick={handleSendNow} className={styles.primaryButton}>Enviar Pílula Agora</button>
                </div>
            </div>
            
            <div className={styles.importSection}>
                <div>
                    <label>1. Importar CSV de Pílulas</label>
                    <input type="file" accept=".csv" ref={csvInputRef} onChange={(e) => setCsvFile(e.target.files[0])} />
                    <button onClick={handleImportCsv} className={styles.secondaryButton} disabled={!csvFile}>Importar CSV</button>
                </div>
            </div>
            
            <div className={styles.importSection}>
                <div>
                    <label>2. Enviar Arquivos de Mídia (PDFs, etc)</label>
                    <input type="file" multiple ref={mediaInputRef} onChange={(e) => setMediaFiles(e.target.files)} />
                    <button onClick={handleMediaUpload} className={styles.secondaryButton} disabled={!mediaFiles}>Enviar Mídias</button>
                </div>
                <div className={styles.syncSection}>
                    <label>3. Associar Mídias e Telegram</label>
                    <button onClick={handleSyncMedia} className={styles.syncButton}>Sincronizar Mídias</button>
                </div>
            </div>

            <div className={styles.pillsToolbar}>
                <button onClick={() => { setEditingPill(null); setIsPillModalOpen(true); }} className={styles.primaryButton}>Criar Pílula</button>
                {selectedPillIds.length > 0 && (
                    <button onClick={handleBulkDeletePills} className={styles.deleteButton}>
                        Excluir Selecionadas ({selectedPillIds.length})
                    </button>
                )}
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.pillsTable}>
                    <thead>
                        <tr>
                            <th><input type="checkbox" checked={pills.length > 0 && selectedPillIds.length === pills.length} onChange={handleSelectAllPills} /></th>
                            <th>ID</th>
                            <th>Conteúdo</th>
                            <th>Arquivo</th>
                            <th>File ID</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pills.map(pill => (
                            <tr key={pill.id}>
                                <td><input type="checkbox" checked={selectedPillIds.includes(pill.id)} onChange={() => handleSelectPill(pill.id)} /></td>
                                <td>{pill.id}</td>
                                <td className={styles.contentCell}>{pill.conteudo}</td>
                                <td>{pill.source_file}</td>
                                <td className={styles.fileIdCell}>{pill.telegram_file_id ? '✅' : 'Pendente'}</td>
                                <td className={styles.actionsCell}>
                                    <button onClick={() => { setEditingPill(pill); setIsPillModalOpen(true); }} className={styles.editButton}>Editar</button>
                                    <button onClick={() => handleDeletePill(pill.id)} className={styles.deleteButtonSmall}>Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PillFormModal
                isOpen={isPillModalOpen}
                onClose={() => {setIsPillModalOpen(false); setEditingPill(null);}}
                onSubmit={handlePillSubmit}
                pill={editingPill}
            />
        </div>
    );
}


function AdminPage() {
    const { addToast } = useFeedbackStore();
    const { configs, loading: loadingConfigs, toggleConfig } = useConfigStore(); // Apenas o toggle é usado aqui

    const [challenges, setChallenges] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentChallenge, setCurrentChallenge] = useState(null);
    const [formOptions, setFormOptions] = useState({ temas: [], subtemas: [], cargos: [], canais: [] });
    const [loading, setLoading] = useState(false);
    
    const fetchChallenges = useCallback(async () => {
        setLoading(true);
        try {
            const challengesRes = await api.get('/admin/challenges');
            setChallenges(challengesRes.data);
        } catch (err) {
             addToast('Erro ao carregar desafios.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchChallenges();
    }, [fetchChallenges]);
    
    const handleOpenChallengeModal = async (challenge = null) => {
        setCurrentChallenge(challenge);
        setLoading(true);
        try {
            const [temasRes, subtemasRes, cargosRes, canaisRes] = await Promise.all([
                api.get('/admin/challenge_options', { params: { type: 'tema' } }),
                api.get('/admin/challenge_options', { params: { type: 'subtema' } }),
                api.get('/admin/challenge_options', { params: { type: 'cargo' } }),
                api.get('/admin/challenge_options', { params: { type: 'canal_principal' } })
            ]);
            setFormOptions({
                temas: temasRes.data,
                subtemas: subtemasRes.data,
                cargos: cargosRes.data,
                canais: canaisRes.data
            });
            setIsModalOpen(true);
        } catch (err) {
            addToast('Erro ao carregar opções para o desafio.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteChallenge = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este desafio?')) {
            try {
                await api.delete(`/admin/challenges/${id}`);
                addToast('Desafio excluído com sucesso!', 'success');
                fetchChallenges();
            } catch (err) {
                addToast(err.response?.data?.error || 'Erro ao excluir desafio.', 'error');
            }
        }
    };
    
    const handleFormSubmit = async (challengeData) => {
        const apiCall = challengeData.id 
            ? api.put(`/admin/challenges/${challengeData.id}`, challengeData)
            : api.post('/admin/challenges', challengeData);

        try {
            await apiCall;
            addToast('Desafio salvo com sucesso!', 'success');
            setIsModalOpen(false);
            fetchChallenges();
        } catch (err) {
            addToast(err.response?.data?.error || 'Erro ao salvar desafio.', 'error');
        }
    };

    if (loading || loadingConfigs) return <p>Carregando painel de admin...</p>;

    return (
        <div className={styles.screenContainer}>
            <div className={styles.contentArea}>
                <div className={styles.adminSection}>
                     <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Análises</h2>
                        <Link to="/admin/dashboard" className={styles.primaryButton}>
                            Ver Dashboard
                        </Link>
                    </div>
                </div>

                <AdminManagement />
                
                <KnowledgePillsManagement />

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
                        <button onClick={() => handleOpenChallengeModal()} className={styles.primaryButton}>
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
                                            <button onClick={() => handleOpenChallengeModal(c)} className={styles.editButton}>Editar</button>
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