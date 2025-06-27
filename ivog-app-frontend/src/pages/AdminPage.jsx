import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import styles from './AdminPage.module.css';
import { useConfigStore } from '../store/configStore';
import { useFeedbackStore } from '../store/feedbackStore';
import { useUserStore } from '../store/userStore';
import PillFormModal from '../components/PillFormModal';
import UserManagementTable from '../components/UserManagementTable';

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
    perguntas_ids: [], // Adicionada a inicialização do array de perguntas
});

// Componente de Header com Tabs
function AdminHeader({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'overview', label: 'Visão Geral', icon: '📊' },
        { id: 'admins', label: 'Administradores', icon: '👥' },
        { id: 'users', label: 'Usuários', icon: '👤' },
        { id: 'pills', label: 'Pílulas', icon: '💊' },
        { id: 'challenges', label: 'Desafios', icon: '🎯' },
        { id: 'questions', label: 'Perguntas', icon: '❓' },
    ];

    return (
        <div className={styles.adminHeader}>
            <div className={styles.headerTop}>
                {/* <h1 className={styles.pageTitle}>
                <span className={styles.titleIcon}>⚙️</span>
                    Painel Administrativo
                </h1> */}
                <div className={styles.headerActions}>
                    <Link to="/admin/dashboard" className={styles.dashboardButton}>
                        <span>📈</span>
                        Dashboard
                    </Link>
                </div>
            </div>
            <nav className={styles.tabNavigation}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        <span className={styles.tabLabel}>{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}

function UserManagementSection() {
    return (
        <div className={styles.tabContent}>
            <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                    <h2>👤 Gerenciar Usuários</h2>
                </div>
                <UserManagementTable />
            </div>
        </div>
    );
}


// Componente de Visão Geral
function OverviewSection() {
    const { configs } = useConfigStore();
    
    const cards = [
        {
            title: 'Sistema',
            icon: '⚡',
            status: 'Ativo',
            color: 'green',
            description: 'Todos os serviços operacionais'
        },
        {
            title: 'Modo Treino',
            icon: '🎓',
            status: configs?.modo_treino_ativado ? 'Ativo' : 'Inativo',
            color: configs?.modo_treino_ativado ? 'blue' : 'gray',
            description: 'Sistema de treinamento'
        },
        {
            title: 'Pílulas',
            icon: '💊',
            status: configs?.pills_broadcast_interval_minutes === 999999 ? 'Pausado' : 'Ativo',
            color: configs?.pills_broadcast_interval_minutes === 999999 ? 'orange' : 'green',
            description: 'Envio automático de conteúdo'
        }
    ];

    return (
        <div className={styles.overviewSection}>
            <div className={styles.overviewCards}>
                {cards.map((card, index) => (
                    <div key={index} className={`${styles.statusCard} ${styles[card.color]}`}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardIcon}>{card.icon}</span>
                            <div className={styles.cardTitle}>{card.title}</div>
                        </div>
                        <div className={styles.cardStatus}>{card.status}</div>
                        <div className={styles.cardDescription}>{card.description}</div>
                    </div>
                ))}
            </div>
            
            <div className={styles.quickActions}>
                <h3>Ações Rápidas</h3>
                <div className={styles.actionButtons}>
                    <Link to="/admin/questions" className={styles.actionButton}>
                        <span>❓</span>
                        Gerenciar Perguntas
                    </Link>
                    <Link to="/admin/dashboard" className={styles.actionButton}>
                        <span>📈</span>
                        Ver Relatórios
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ChallengeFormModal({ isOpen, onClose, challenge, onSubmit, options }) {
    const [formData, setFormData] = useState(getInitialFormData());
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [questionSearch, setQuestionSearch] = useState('');
    const [loadingQuestions, setLoadingQuestions] = useState(false);

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
                    perguntas_ids: challenge.perguntas_ids ? JSON.parse(challenge.perguntas_ids) : [],
                });
            } else {
                setFormData(getInitialFormData());
                setAvailableQuestions([]);
            }
        }
    }, [challenge, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchQuestions = async () => {
            const { canal_principal, cargo } = formData.publico_alvo;
            if (canal_principal.length === 0 && cargo.length === 0) {
                setAvailableQuestions([]);
                return;
            }
            setLoadingQuestions(true);
            try {
                const params = new URLSearchParams();
                canal_principal.forEach(c => params.append('canal', c));
                cargo.forEach(c => params.append('publico', c));
                const response = await api.get(`/admin/questions?${params.toString()}`);
                setAvailableQuestions(response.data);
            } catch (error) {
                console.error("Erro ao buscar perguntas para o desafio:", error);
            } finally {
                setLoadingQuestions(false);
            }
        };
        const timer = setTimeout(fetchQuestions, 500);
        return () => clearTimeout(timer);
    }, [formData.publico_alvo, isOpen]);

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
        setFormData(prev => ({ ...prev, [group]: { ...prev[group], [field]: values } }));
    };

    const handleQuestionSelect = (questionId) => {
        setFormData(prev => {
            const newSelection = prev.perguntas_ids.includes(questionId)
                ? prev.perguntas_ids.filter(id => id !== questionId)
                : [...prev.perguntas_ids, questionId];
            return { ...prev, perguntas_ids: newSelection, num_perguntas: newSelection.length > 0 ? newSelection.length : prev.num_perguntas };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const { filtros, ...rest } = formData;
        const finalData = { ...rest };
        if (finalData.perguntas_ids.length > 0) {
            finalData.filtros = [];
        } else {
            const filtrosArray = [];
            if (filtros.tema) filtrosArray.push({ tipo: 'tema', valor: filtros.tema });
            if (filtros.subtema) filtrosArray.push({ tipo: 'subtema', valor: filtros.subtema });
            finalData.filtros = filtrosArray;
        }
        if (finalData.data_inicio) finalData.data_inicio = new Date(finalData.data_inicio).toISOString();
        if (finalData.data_fim) finalData.data_fim = new Date(finalData.data_fim).toISOString();
        onSubmit(finalData);
    };

    const filteredAvailableQuestions = availableQuestions.filter(q =>
        q.pergunta_formatada_display.toLowerCase().includes(questionSearch.toLowerCase())
    );

    const isManualSelection = formData.perguntas_ids.length > 0;

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>{challenge ? 'Editar Desafio' : 'Criar Novo Desafio'}</h2>
                    <button onClick={onClose} className={styles.closeButton}>×</button>
                </div>
                <form onSubmit={handleSubmit} className={styles.challengeForm}>
                    {/* --- CÓDIGO RESTAURADO --- */}
                    <div className={styles.formSection}>
                        <h3>Informações Básicas</h3>
                        <div className={styles.formGroup}><label>Título</label><input name="titulo" value={formData.titulo} onChange={handleChange} required /></div>
                        <div className={styles.formGroup}><label>Descrição</label><textarea name="descricao" value={formData.descricao} onChange={handleChange}></textarea></div>
                    </div>
                    <div className={styles.formSection}>
                        <h3>Configurações</h3>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}><label>Data de Início</label><input type="datetime-local" name="data_inicio" value={formData.data_inicio} onChange={handleChange} required /></div>
                            <div className={styles.formGroup}><label>Data de Fim</label><input type="datetime-local" name="data_fim" value={formData.data_fim} onChange={handleChange} required /></div>
                        </div>
                        <div className={styles.formGrid}>
                             <div className={styles.formGroup}>
                                <label>Status</label>
                                <select name="status" value={formData.status} onChange={handleChange}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="arquivado">Arquivado</option></select>
                            </div>
                        </div>
                    </div>
                    <div className={styles.formSection}>
                        <h3>Público-Alvo</h3>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Canal</label>
                                <select multiple value={formData.publico_alvo.canal_principal} onChange={(e) => handleMultiSelectChange(e, 'publico_alvo', 'canal_principal')} className={styles.multiSelect}>
                                    {options.canais.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Cargo</label>
                                <select multiple value={formData.publico_alvo.cargo} onChange={(e) => handleMultiSelectChange(e, 'publico_alvo', 'cargo')} className={styles.multiSelect}>
                                    {options.cargos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* --- FIM DO CÓDIGO RESTAURADO --- */}
                    
                    <div className={styles.formSection}>
                        <h3>Seleção de Conteúdo</h3>
                        <p className={styles.selectionInfo}>Você pode selecionar perguntas manualmente ou usar filtros de tema/subtema.</p>
                        <div className={styles.questionSelector}>
                            <h4>Selecionar Perguntas Manuais</h4>
                            <p className={styles.selectionSubInfo}>A lista abaixo é filtrada pelo público-alvo e apenas perguntas ativas são exibidas.</p>
                            <input type="text" placeholder="🔎 Buscar na lista de perguntas..." value={questionSearch} onChange={(e) => setQuestionSearch(e.target.value)} className={styles.questionSearchInput}/>
                            <div className={styles.questionList}>
                                {loadingQuestions ? <p>Carregando perguntas...</p> :
                                filteredAvailableQuestions.length > 0 ? filteredAvailableQuestions.map(q => (
                                    <div key={q.id} className={styles.questionItem}>
                                        <input type="checkbox" id={`q-${q.id}`} checked={formData.perguntas_ids.includes(q.id)} onChange={() => handleQuestionSelect(q.id)}/>
                                        <label htmlFor={`q-${q.id}`}>{`#${q.id} - ${q.pergunta_formatada_display}`}</label>
                                    </div>
                                )) : <p>Nenhuma pergunta encontrada para o público selecionado.</p>
                                }
                            </div>
                            <div className={styles.selectionCount}>{formData.perguntas_ids.length} pergunta(s) selecionada(s).</div>
                        </div>
                        <div className={`${styles.filterSelector} ${isManualSelection ? styles.disabledSection : ''}`}>
                             <h4>OU Usar Filtros Automáticos</h4>
                             <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Tema</label>
                                    <select name="tema" value={formData.filtros.tema} onChange={handleFilterChange} required={!isManualSelection} disabled={isManualSelection}><option value="">Selecione um tema</option>{options.temas.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Subtema (Opcional)</label>
                                    <select name="subtema" value={formData.filtros.subtema} onChange={handleFilterChange} disabled={isManualSelection}><option value="">Selecione um subtema</option>{options.subtemas.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.formSection}>
                        <h3>Finalização</h3>
                         <div className={styles.formGroup}>
                            <label>Nº de Perguntas</label>
                            <input type="number" name="num_perguntas" value={formData.num_perguntas} onChange={handleChange} min="1" required disabled={isManualSelection}/>
                            {isManualSelection && <small>O nº de perguntas é definido pela sua seleção manual.</small>}
                        </div>
                    </div>
                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
                        <button type="submit" className={styles.primaryButton}>Salvar Desafio</button>
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
        <div className={styles.tabContent}>
            <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                    <h2>👥 Gerenciar Administradores</h2>
                    <div className={styles.adminCount}>
                        <span>{admins.length} administrador{admins.length !== 1 ? 'es' : ''}</span>
                    </div>
                </div>
                
                <div className={styles.addAdminSection}>
                    <form onSubmit={handleAddAdmin} className={styles.addAdminForm}>
                        <div className={styles.inputGroup}>
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
                                <span>➕</span>
                                Adicionar
                            </button>
                        </div>
                        {!isSuperAdmin && (
                            <p className={styles.permissionWarning}>
                                ⚠️ Apenas o super admin pode gerenciar administradores
                            </p>
                        )}
                    </form>
                </div>

                <div className={styles.adminsList}>
                    {admins.map(admin => (
                        <div key={admin.telegram_id} className={styles.adminItem}>
                            <div className={styles.adminInfo}>
                                <div className={styles.adminAvatar}>
                                    {admin.first_name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.adminDetails}>
                                    <div className={styles.adminName}>{admin.first_name}</div>
                                    <div className={styles.adminId}>ID: {admin.telegram_id}</div>
                                </div>
                            </div>
                            <div className={styles.adminActions}>
                                {admin.telegram_id.toString() === SUPER_ADMIN_ID && (
                                    <span className={styles.superAdminBadge}>Super Admin</span>
                                )}
                                <button
                                    onClick={() => handleRemoveAdmin(admin.telegram_id)}
                                    className={styles.removeButton}
                                    disabled={!isSuperAdmin || admin.telegram_id.toString() === SUPER_ADMIN_ID}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function KnowledgePillsManagement() {
    const [pills, setPills] = useState([]);
    const [csvFile, setCsvFile] = useState(null);
    const [mediaFiles, setMediaFiles] = useState(null);
    const { addToast, showLoading, hideLoading } = useFeedbackStore();
    const { configs, setConfigValue } = useConfigStore();
    const csvInputRef = React.useRef(null);
    const mediaInputRef = React.useRef(null);
    const [isPillModalOpen, setIsPillModalOpen] = useState(false);
    const [editingPill, setEditingPill] = useState(null);
    const [selectedPillIds, setSelectedPillIds] = useState([]);
    const [intervalMinutes, setIntervalMinutes] = useState('');
    const [quietTimeStart, setQuietTimeStart] = useState('21:00');
    const [quietTimeEnd, setQuietTimeEnd] = useState('06:00');
    const [quietTimeEnabled, setQuietTimeEnabled] = useState(false);

    useEffect(() => {
        if (configs && configs.pills_broadcast_interval_minutes !== undefined) {
            const displayValue = configs.pills_broadcast_interval_minutes === 999999 ? 0 : configs.pills_broadcast_interval_minutes;
            setIntervalMinutes(displayValue.toString());
        }

        if (configs) {
            const enabledKeys = ['pills_quiet_time_enabled', 'pills_quiet_enabled', 'pills_silence_enabled', 'pills_no_disturb_enabled'];
            for (const key of enabledKeys) {
                if (configs[key] !== undefined) {
                    setQuietTimeEnabled(configs[key] === true || configs[key] === 'true');
                    break;
                }
            }

            if (configs.pills_quiet_time_start) {
                setQuietTimeStart(configs.pills_quiet_time_start);
            }
            if (configs.pills_quiet_time_end) {
                setQuietTimeEnd(configs.pills_quiet_time_end);
            }
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
        console.log('Botão Importar XLSX clicado. Iniciando processo...');
        if (!csvFile) {
            console.log('Estado csvFile está vazio.');
            return;
        }
        console.log('Arquivo no estado:', csvFile);

        const formData = new FormData();
        const fieldName = 'file';
        formData.append(fieldName, csvFile);
        console.log('FormData criado com o arquivo:', fieldName);

        try {
            const response = await api.post('/admin/knowledge-pills/import-csv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('Resposta da API:', response.data);
            addToast('Importação iniciada!', 'info');
            if (response.data.errors && response.data.errors.length > 0) {
                 addToast(`Importação concluída com erros: ${response.data.errors.length} erros.`, 'warning');
            } else {
                 addToast(response.data.message || 'Importação concluída com sucesso!', 'success');
            }
             fetchPills();
        } catch (error) {
            console.error('Erro na importação:', error);
            addToast(error.response?.data?.error || 'Erro ao importar arquivo.', 'error');
            console.error('Detalhes do erro:', error.response?.data || error.message);
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
        const numericValue = parseInt(intervalMinutes, 10);
        
        if (isNaN(numericValue) || numericValue < 0) {
            addToast('Por favor, insira um valor válido (0 ou maior).', 'error');
            return;
        }

        showLoading();
        try {
            if (numericValue === 0) {
                await setConfigValue('pills_broadcast_interval_minutes', 999999);
                addToast('Envio de pílulas desabilitado! (Intervalo definido como inativo)', 'success');
            } else {
                await setConfigValue('pills_broadcast_interval_minutes', numericValue);
                addToast(`Intervalo de ${numericValue} minuto(s) salvo! O agendador será atualizado.`, 'success');
            }
        } catch (err) {
            console.error('Erro:', err);
            addToast(err.response?.data?.error || 'Erro ao salvar intervalo.', 'error');
        } finally {
            hideLoading();
        }
    };

    const handleSaveQuietTime = async () => {
        if (quietTimeEnabled && (!quietTimeStart || !quietTimeEnd)) {
            addToast('Por favor, defina os horários de início e fim.', 'error');
            return;
        }

        showLoading();
        try {
            try {
                const toggleResponse = await api.post('/admin/toggle_config/pills_quiet_time_enabled');
                const currentValue = toggleResponse.data.new_value;
                
                if (currentValue !== quietTimeEnabled) {
                    await api.post('/admin/toggle_config/pills_quiet_time_enabled');
                }
                console.log('✅ Enabled salvo com sucesso');
            } catch (err) {
                console.error('❌ Erro ao salvar enabled:', err.response?.data?.error);
                throw err;
            }

            if (quietTimeEnabled) {
                try {
                    await setConfigValue('pills_quiet_time_start', quietTimeStart);
                    await setConfigValue('pills_quiet_time_end', quietTimeEnd);
                    console.log('✅ Horários salvos com sucesso');
                } catch (err) {
                    console.error('❌ Erro ao salvar horários:', err.response?.data?.error);
                    throw err;
                }
            }
            
            const message = quietTimeEnabled 
                ? `Horário silencioso ativado: ${quietTimeStart} às ${quietTimeEnd}`
                : 'Horário silencioso desativado';
            
            addToast(message, 'success');
            
        } catch (err) {
            console.error('Erro ao salvar horário silencioso:', err);
            addToast(err.response?.data?.error || 'Erro ao salvar horário silencioso.', 'error');
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
            const res = await api.post('/admin/pills/upload-media', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
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

    const getPillsStatus = () => {
        const interval = configs?.pills_broadcast_interval_minutes;
        if (!interval || interval === 999999) {
            return { status: 'disabled', text: 'Desativado', className: 'statusDisabled' };
        }

        let statusText = `Ativo: ${interval} minuto${interval > 1 ? 's' : ''}`;
        
        const enabledKeys = ['pills_quiet_time_enabled', 'pills_quiet_enabled', 'pills_silence_enabled', 'pills_no_disturb_enabled'];
        let quietEnabled = false;
        for (const key of enabledKeys) {
            if (configs?.[key] === true || configs?.[key] === 'true') {
                quietEnabled = true;
                break;
            }
        }

        if (quietEnabled) {
            const start = configs.pills_quiet_time_start || '21:00';
            const end = configs.pills_quiet_time_end || '06:00';
            statusText += ` (Silêncio: ${start}-${end})`;
        }

        return { 
            status: 'active', 
            text: statusText, 
            className: 'statusActive' 
        };
    };

    const renderFileStatus = (pill) => {
        // Se não há arquivo de origem, mostra "Sem Anexo"
        if (!pill.source_file) {
            return <span className={`${styles.statusBadge} ${styles.noFile}`}>Sem Anexo</span>;
        }
        
        // A propriedade 'fileExists' agora vem da API.
        // Se 'fileExists' for true, o arquivo foi encontrado.
        if (pill.fileExists) {
            return <span className={`${styles.statusBadge} ${styles.synced}`}>✅ Encontrado</span>;
        } 
        
        // Se 'fileExists' for false, o arquivo está ausente.
        return <span className={`${styles.statusBadge} ${styles.pending}`}>❌ Ausente</span>;
    };

    const pillsStatus = getPillsStatus();

    return (
        <div className={styles.tabContent}>
            <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                    <h2>💊 Pílulas do Conhecimento</h2>
                    <div className={`${styles.statusBadge} ${styles[pillsStatus.className]}`}>
                        <span className={styles.statusDot}></span>
                        {pillsStatus.text}
                    </div>
                </div>

                <div className={styles.configSection}>
                    <h3>⚙️ Configurações de Envio</h3>
                    <div className={styles.configGrid}>
                        <div className={styles.configCard}>
                            <h4>Intervalo de Envio</h4>
                            <div className={styles.configInputGroup}>
                                <input
                                    type="number"
                                    value={intervalMinutes}
                                    onChange={(e) => setIntervalMinutes(e.target.value)}
                                    className={styles.configInput}
                                    min="0"
                                    placeholder="0 para desativar"
                                />
                                <span className={styles.inputUnit}>minutos</span>
                                <button onClick={handleSaveInterval} className={styles.saveButton}>
                                    💾 Salvar
                                </button>
                            </div>
                        </div>

                        <div className={styles.configCard}>
                            <h4>Ação Manual</h4>
                            <button onClick={handleSendNow} className={styles.sendNowButton}>
                                🚀 Enviar Pílula Agora
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.quietTimeSection}>
                    <h3>🌙 Horário Silencioso</h3>
                    <div className={styles.quietTimeCard}>
                        <div className={styles.quietTimeToggle}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={quietTimeEnabled}
                                    onChange={(e) => setQuietTimeEnabled(e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                Ativar horário silencioso
                            </label>
                        </div>
                        
                        {quietTimeEnabled && (
                            <div className={styles.timeConfig}>
                                <div className={styles.timeInputGroup}>
                                    <label>Das:</label>
                                    <input
                                        type="time"
                                        value={quietTimeStart}
                                        onChange={(e) => setQuietTimeStart(e.target.value)}
                                        className={styles.timeInput}
                                    />
                                </div>
                                <span className={styles.timeSeparator}>até</span>
                                <div className={styles.timeInputGroup}>
                                    <label>Às:</label>
                                    <input
                                        type="time"
                                        value={quietTimeEnd}
                                        onChange={(e) => setQuietTimeEnd(e.target.value)}
                                        className={styles.timeInput}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <button onClick={handleSaveQuietTime} className={styles.saveButton}>
                            💾 Salvar Horário
                        </button>
                        
                        {quietTimeEnabled && (
                            <div className={styles.quietTimeInfo}>
                                <span className={styles.infoIcon}>ℹ️</span>
                                As pílulas não serão enviadas entre {quietTimeStart} e {quietTimeEnd}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.importSection}>
                    <h3>📁 Gerenciar Conteúdo</h3>
                    <div className={styles.importSteps}>
                        <div className={styles.importStep}>
                            <div className={styles.stepNumber}>1</div>
                            <div className={styles.stepContent}>
                                <h4>Importar CSV</h4>
                                <div className={styles.fileUpload}>
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        ref={csvInputRef}
                                        onChange={(e) => setCsvFile(e.target.files[0])}
                                        className={styles.fileInput}
                                    />
                                    {csvFile && (
                                        <div className={styles.fileInfo}>
                                            <span className={styles.fileName}>📄 {csvFile.name}</span>
                                            <span className={styles.fileSize}>({(csvFile.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={handleImportCsv} 
                                        className={styles.uploadButton} 
                                        disabled={!csvFile}
                                    >
                                        📤 Importar XLSX
                                    </button>
                                </div>
                                <div className={styles.csvHelp}>
                                    <small>
                                        ℹ️ Formato: CARGO;TEMA;CONTEUDO;ARQUIVO_DE_ORIGEM;PAGINA
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div className={styles.importStep}>
                            <div className={styles.stepNumber}>2</div>
                            <div className={styles.stepContent}>
                                <h4>Upload de Mídia</h4>
                                <div className={styles.fileUpload}>
                                    <input 
                                        type="file" 
                                        multiple 
                                        ref={mediaInputRef} 
                                        onChange={(e) => setMediaFiles(e.target.files)}
                                        className={styles.fileInput}
                                    />
                                    <button 
                                        onClick={handleMediaUpload} 
                                        className={styles.uploadButton} 
                                        disabled={!mediaFiles}
                                    >
                                        🎬 Enviar Mídias
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.importStep}>
                            <div className={styles.stepNumber}>3</div>
                            <div className={styles.stepContent}>
                                <h4>Verificar Mídias</h4>
                                <button onClick={handleSyncMedia} className={styles.syncButton}>
                                    🔄 Verificar Mídias
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.pillsToolbar}>
                    <button 
                        onClick={() => { setEditingPill(null); setIsPillModalOpen(true); }} 
                        className={styles.primaryButton}
                    >
                        ➕ Criar Pílula
                    </button>
                    {selectedPillIds.length > 0 && (
                        <button onClick={handleBulkDeletePills} className={styles.deleteButton}>
                            🗑️ Excluir Selecionadas ({selectedPillIds.length})
                        </button>
                    )}
                    <div className={styles.pillsCount}>
                        Total: {pills.length} pílula{pills.length !== 1 ? 's' : ''}
                    </div>
                </div>

                <div className={styles.pillsTable}>
                    <div className={styles.tableWrapper}>
                        <div className={styles.tableHeader}>
                            <div className={styles.checkboxColumn}>
                                <input 
                                    type="checkbox" 
                                    checked={pills.length > 0 && selectedPillIds.length === pills.length} 
                                    onChange={handleSelectAllPills}
                                    className={styles.headerCheckbox}
                                />
                            </div>
                            <div className={styles.idColumn}>ID</div>
                            <div className={styles.contentColumn}>Conteúdo</div>
                            <div className={styles.fileColumn}>Arquivo</div>
                            <div className={styles.statusColumn}>Status</div>
                            <div className={styles.actionsColumn}>Ações</div>
                        </div>
                        
                        <div className={styles.tableBody}>
                            {pills.map(pill => (
                                <div key={pill.id} className={styles.tableRow}>
                                    <div className={styles.checkboxColumn} data-label="">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPillIds.includes(pill.id)} 
                                            onChange={() => handleSelectPill(pill.id)}
                                            className={styles.rowCheckbox}
                                        />
                                    </div>
                                    <div className={styles.idColumn} data-label="ID">#{pill.id}</div>
                                    <div className={styles.contentColumn} data-label="Conteúdo">
                                        <div className={styles.pillContent}>{pill.conteudo}</div>
                                    </div>
                                    <div className={styles.fileColumn} data-label="Arquivo">
                                        {pill.source_file && (
                                            <span className={styles.fileName}>{pill.source_file}</span>
                                        )}
                                    </div>
                                    <div className={styles.statusColumn} data-label="Status">
                                        {renderFileStatus(pill)}
                                    </div>
                                    <div className={styles.actionsColumn} data-label="Ações">
                                        <button 
                                            onClick={() => { setEditingPill(pill); setIsPillModalOpen(true); }} 
                                            className={styles.editButton}
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => handleDeletePill(pill.id)} 
                                            className={styles.deleteButtonSmall}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <PillFormModal
                    isOpen={isPillModalOpen}
                    onClose={() => {setIsPillModalOpen(false); setEditingPill(null);}}
                    onSubmit={handlePillSubmit}
                    pill={editingPill}
                />
            </div>
        </div>
    );
}

function ChallengesManagement() {
    const { addToast } = useFeedbackStore();
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

    return (
        <div className={styles.tabContent}>
            <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                    <h2>🎯 Gerenciador de Desafios</h2>
                    <button 
                        onClick={() => handleOpenChallengeModal()} 
                        className={styles.primaryButton}
                    >
                        ➕ Criar Novo Desafio
                    </button>
                </div>

                <div className={styles.challengesGrid}>
                    {challenges.length > 0 ? challenges.map(challenge => (
                        <div key={challenge.id} className={styles.challengeCard}>
                            <div className={styles.challengeHeader}>
                                <h3 className={styles.challengeTitle}>{challenge.titulo}</h3>
                                <span className={`${styles.statusBadge} ${styles[challenge.status]}`}>
                                    {challenge.status}
                                </span>
                            </div>
                            
                            <div className={styles.challengeInfo}>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Perguntas:</span>
                                    <span className={styles.infoValue}>{challenge.num_perguntas}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Início:</span>
                                    <span className={styles.infoValue}>
                                        {new Date(challenge.data_inicio).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Fim:</span>
                                    <span className={styles.infoValue}>
                                        {new Date(challenge.data_fim).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {challenge.descricao && (
                                <div className={styles.challengeDescription}>
                                    {challenge.descricao}
                                </div>
                            )}

                            <div className={styles.challengeActions}>
                                <button 
                                    onClick={() => handleOpenChallengeModal(challenge)} 
                                    className={styles.editButton}
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    onClick={() => handleDeleteChallenge(challenge.id)} 
                                    className={styles.deleteButton}
                                >
                                    🗑️ Excluir
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>🎯</div>
                            <h3>Nenhum desafio criado</h3>
                            <p>Comece criando seu primeiro desafio!</p>
                            <button 
                                onClick={() => handleOpenChallengeModal()} 
                                className={styles.primaryButton}
                            >
                                ➕ Criar Primeiro Desafio
                            </button>
                        </div>
                    )}
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
        </div>
    );
}

function ConfigurationSection() {
    const { configs, toggleConfig } = useConfigStore();

    return (
        <div className={styles.tabContent}>
            <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                    <h2>⚙️ Configurações Gerais</h2>
                </div>
                
                <div className={styles.configOptions}>
                    <div className={styles.configOption}>
                        <div className={styles.configInfo}>
                            <h3>🎓 Modo Treino</h3>
                            <p>Ativa o sistema de treinamento para usuários</p>
                        </div>
                        <label className={styles.toggleSwitch}>
                            <input
                                type="checkbox"
                                checked={configs?.modo_treino_ativado || false}
                                onChange={() => toggleConfig('modo_treino_ativado')}
                            />
                            <span className={styles.toggleSlider}></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AdminPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const { loading: loadingConfigs } = useConfigStore();

    if (loadingConfigs) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Carregando painel de admin...</p>
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewSection />;
            case 'admins':
                return <AdminManagement />;
            case 'users': 
                return <UserManagementSection />;
            case 'pills':
                return <KnowledgePillsManagement />;
            case 'challenges':
                return <ChallengesManagement />;
            case 'questions':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionCard}>
                            <div className={styles.cardHeader}>
                                <h2>❓ Base de Conhecimento</h2>
                                <Link to="/admin/questions" className={styles.primaryButton}>
                                    🔗 Gerenciar Perguntas
                                </Link>
                            </div>
                            <div className={styles.redirectInfo}>
                                <p>Clique no botão acima para acessar o gerenciador completo de perguntas.</p>
                            </div>
                        </div>
                        <ConfigurationSection />
                    </div>
                );
            default:
                return <OverviewSection />;
        }
    };

    return (
        <div className={styles.adminContainer}>
            <AdminHeader activeTab={activeTab} onTabChange={setActiveTab} />
            <div className={styles.adminContent}>
                {renderTabContent()}
            </div>
        </div>
    );
}

export default AdminPage;