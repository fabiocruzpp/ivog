import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import styles from './QuestionManagerPage.module.css';
import QuestionFormModal from '../components/QuestionFormModal';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

function QuestionManagerPage() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [importing, setImporting] = useState(false);
    const [telegramId, setTelegramId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ subtemas: [], canais: [], publicos: [] });
    const [filters, setFilters] = useState({
        searchTerm: '',
        subtema: '',
        canal: '',
        publico: ''
    });

    const fileInputRef = useRef(null);
    const headerCheckboxRef = useRef(null);

    useEffect(() => {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (user && user.id) {
            setTelegramId(user.id.toString());
        } else {
            setTelegramId('1318210843'); 
        }

        const fetchFilterOptions = async () => {
             try {
                const response = await api.get('/admin/form-options');
                setFilterOptions(prev => ({
                    ...prev,
                    canais: response.data.canais || [],
                    publicos: response.data.cargos || []
                }));
            } catch (error) {
                console.error("Falha ao carregar opções de filtro", error);
            }
        };
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        if (questions.length > 0) {
            const subtemasUnicos = [...new Set(questions.map(q => q.subtema).filter(Boolean))].sort();
            setFilterOptions(prev => ({ ...prev, subtemas: subtemasUnicos }));
        }
    }, [questions]);

    const fetchQuestions = useCallback(async () => {
        if (!telegramId) return;

        try {
            setLoading(true);
            const params = { telegram_id: telegramId };
            const response = await api.get('/admin/questions', { params });
            setQuestions(response.data);
            setError('');
        } catch (err) {
            setError('Falha ao carregar as perguntas.');
        } finally {
            setLoading(false);
        }
    }, [telegramId]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);
    
    // --- LÓGICA DE FILTRO (EXISTENTE) ---
    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            const { searchTerm, subtema, canal, publico } = filters;
            const searchLower = searchTerm.toLowerCase();

            const searchTermMatch = searchTerm === '' ||
                q.pergunta_formatada_display.toLowerCase().includes(searchLower) ||
                q.tema.toLowerCase().includes(searchLower) ||
                (q.subtema && q.subtema.toLowerCase().includes(searchLower));
            
            const subtemaMatch = subtema === '' || q.subtema === subtema;
            const canalMatch = canal === '' || q.canal.length === 0 || q.canal.includes(canal);
            const publicoMatch = publico === '' || q.publico.length === 0 || q.publico.includes(publico);

            return searchTermMatch && subtemaMatch && canalMatch && publicoMatch;
        });
    }, [questions, filters]);
    
    // --- LÓGICA DE SELEÇÃO (EXISTENTE) ---
    useEffect(() => {
        if (headerCheckboxRef.current) {
            const allIdsOnPage = filteredQuestions.map(q => q.id);
            const allOnPageSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedIds.includes(id));
            headerCheckboxRef.current.checked = allOnPageSelected;
            headerCheckboxRef.current.indeterminate = !allOnPageSelected && selectedIds.some(id => allIdsOnPage.includes(id));
        }
    }, [selectedIds, filteredQuestions]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenCreateModal = () => {
        setEditingQuestion(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (question) => {
        setEditingQuestion(question);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingQuestion(null);
    };

    const handleDelete = async (questionId) => {
        if (window.confirm('Tem certeza que deseja excluir esta pergunta?')) {
            try {
                await api.delete(`/admin/questions/${questionId}`, { data: { telegram_id: telegramId } });
                fetchQuestions();
            } catch (err) {
                alert('Erro ao excluir a pergunta.');
            }
        }
    };
    
    const handleSubmit = async (formData) => {
        const payload = { ...formData, telegram_id: telegramId };
        const apiCall = editingQuestion
            ? api.put(`/admin/questions/${editingQuestion.id}`, payload)
            : api.post('/admin/questions', payload);
        
        try {
            await apiCall;
            handleCloseModal();
            fetchQuestions();
        } catch (err) {
            alert('Erro ao salvar a pergunta.');
        }
    };

    const handleImportClick = () => fileInputRef.current.click();

    const handleFileImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        const url = `/admin/import-questions?telegram_id=${telegramId}`;
        try {
            setImporting(true);
            const response = await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert(response.data.message);
            fetchQuestions();
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao importar o arquivo.');
        } finally {
            setImporting(false);
            event.target.value = null;
        }
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? filteredQuestions.map(q => q.id) : []);
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0 || !window.confirm(`Excluir as ${selectedIds.length} perguntas selecionadas?`)) return;
        try {
            await api.post('/admin/questions/bulk-delete', { ids: selectedIds, telegram_id: telegramId });
            setSelectedIds([]);
            fetchQuestions();
        } catch (err) {
            alert("Erro ao excluir as perguntas selecionadas.");
        }
    };

    // --- INÍCIO DA ALTERAÇÃO ---
    // Nova função para ativar/desativar pergunta
    const handleToggleStatus = async (questionId) => {
        // Atualização otimista da UI para resposta rápida
        setQuestions(prev => prev.map(q => 
            q.id === questionId ? { ...q, is_active: q.is_active ? 0 : 1 } : q
        ));

        try {
            await api.patch(`/admin/questions/toggle-status/${questionId}`, { telegram_id: telegramId });
            // Opcional: pode chamar fetchQuestions() aqui se quiser garantir a sincronia total,
            // mas a atualização otimista já reflete a mudança.
        } catch (err) {
            alert("Erro ao alterar o status da pergunta. Revertendo alteração.");
            // Reverte a mudança na UI em caso de erro na API
            setQuestions(prev => prev.map(q => 
                q.id === questionId ? { ...q, is_active: q.is_active ? 0 : 1 } : q
            ));
        }
    };

    const renderContent = () => {
        if (loading) return <p className={styles.message}>Carregando perguntas...</p>;
        if (error) return <p className={`${styles.message} ${styles.error}`}>{error}</p>;

        const formatCell = (data) => (Array.isArray(data) && data.length > 0) ? data.join(', ') : 'Todos';

        return (
            <div className={styles.tableContainer}>
                <table className={styles.questionsTable}>
                    <thead>
                        <tr>
                            <th className={styles.checkboxCell}><input type="checkbox" ref={headerCheckboxRef} onChange={handleSelectAll} /></th>
                            <th className={styles.statusCell}>Status</th>
                            <th>Tema</th>
                            <th>Pergunta</th>
                            <th className={styles.tagsCell}>Canal</th>
                            <th className={styles.tagsCell}>Público</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredQuestions.length > 0 ? filteredQuestions.map(q => (
                            <tr key={q.id} className={!q.is_active ? styles.inactiveRow : ''}>
                                <td className={styles.checkboxCell}><input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => handleSelectOne(q.id)} /></td>
                                <td className={styles.statusCell}>
                                    <span className={q.is_active ? styles.statusActive : styles.statusInactive}>
                                        {q.is_active ? 'Ativa' : 'Inativa'}
                                    </span>
                                </td>
                                <td>{q.tema}</td>
                                <td className={styles.questionTextCell} title={q.pergunta_formatada_display}>{q.pergunta_formatada_display}</td>
                                <td className={styles.tagsCell}>{formatCell(q.canal)}</td>
                                <td className={styles.tagsCell}>{formatCell(q.publico)}</td>
                                <td className={styles.actionsCell}>
                                    <button onClick={() => handleToggleStatus(q.id)} className={styles.toggleButton}>
                                        {q.is_active ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button onClick={() => handleOpenEditModal(q)} className={styles.editButton}>Editar</button>
                                    <button onClick={() => handleDelete(q.id)} className={styles.deleteButton}>Excluir</button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="7">Nenhuma pergunta encontrada com os filtros atuais.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };
    // --- FIM DA ALTERAÇÃO ---

    return (
        <div className={styles.screenContainer}>
            <div className={styles.contentArea}>
                <div className={styles.toolbar}>
                    <div>
                        <button onClick={handleOpenCreateModal} className={styles.primaryButton}>Criar Nova Pergunta</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx" style={{ display: 'none' }} />
                        <button onClick={handleImportClick} className={styles.secondaryButton} disabled={importing}>{importing ? 'Importando...' : 'Importar XLSX'}</button>
                    </div>
                    <div>
                        {selectedIds.length > 0 && <button onClick={handleBulkDelete} className={styles.bulkDeleteButton}>Excluir Selecionadas ({selectedIds.length})</button>}
                    </div>
                </div>
                <div className={styles.filterBar}>
                    <input type="text" name="searchTerm" placeholder="🔎 Buscar por pergunta, tema..." value={filters.searchTerm} onChange={handleFilterChange} className={styles.searchInput}/>
                    <div className={styles.filterGroup}>
                        <select name="subtema" value={filters.subtema} onChange={handleFilterChange} className={styles.filterSelect}>
                            <option value="">Todos os Subtemas</option>
                            {filterOptions.subtemas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <select name="canal" value={filters.canal} onChange={handleFilterChange} className={styles.filterSelect}>
                            <option value="">Todos os Canais</option>
                            {filterOptions.canais.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <select name="publico" value={filters.publico} onChange={handleFilterChange} className={styles.filterSelect}>
                            <option value="">Todos os Públicos</option>
                            {filterOptions.publicos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
                {renderContent()}
            </div>
            <QuestionFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleSubmit} question={editingQuestion} telegramId={telegramId} />
        </div>
    );
}

export default QuestionManagerPage;