import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    const [selectedIds, setSelectedIds] = useState([]); // NOVO ESTADO

    const fileInputRef = useRef(null);
    const headerCheckboxRef = useRef(null);

    useEffect(() => {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (user && user.id) {
            setTelegramId(user.id.toString());
        }
    }, []);
    
    // Sincroniza o estado do checkbox "selecionar todos"
    useEffect(() => {
        if (headerCheckboxRef.current) {
            const allIdsOnPage = questions.map(q => q.id);
            const allOnPageSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedIds.includes(id));
            headerCheckboxRef.current.checked = allOnPageSelected;
            headerCheckboxRef.current.indeterminate = !allOnPageSelected && selectedIds.some(id => allIdsOnPage.includes(id));
        }
    }, [selectedIds, questions]);

    const fetchQuestions = useCallback(async () => {
        const isWeb = !window.Telegram?.WebApp?.initData;
        if (!isWeb && !telegramId) {
            return;
        }

        try {
            setLoading(true);
            const params = telegramId ? { telegram_id: telegramId } : {};
            const response = await api.get('/admin/questions', { params });
            setQuestions(response.data);
            setError('');
        } catch (err) {
            setError('Falha ao carregar as perguntas.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [telegramId]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

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
                console.error(err);
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
            console.error(err);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        
        const url = telegramId 
            ? `/admin/import-questions?telegram_id=${telegramId}` 
            : '/admin/import-questions';

        try {
            setImporting(true);
            const response = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert(response.data.message);
            fetchQuestions();
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Erro ao importar o arquivo.';
            alert(errorMessage);
            console.error(err);
        } finally {
            setImporting(false);
            event.target.value = null;
        }
    };

    // --- NOVAS FUNÇÕES PARA SELEÇÃO ---
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = questions.map(q => q.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(selectedId => selectedId !== id) 
                : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) {
            alert("Nenhuma pergunta selecionada.");
            return;
        }
        if (window.confirm(`Tem certeza que deseja excluir as ${selectedIds.length} perguntas selecionadas?`)) {
            try {
                await api.post('/admin/questions/bulk-delete', { 
                    ids: selectedIds,
                    telegram_id: telegramId 
                });
                setSelectedIds([]);
                fetchQuestions();
            } catch (err) {
                alert("Erro ao excluir as perguntas selecionadas.");
                console.error(err);
            }
        }
    };

    const renderContent = () => {
        if (loading) return <p className={styles.message}>Carregando perguntas...</p>;
        if (error) return <p className={`${styles.message} ${styles.error}`}>{error}</p>;

        return (
            <div className={styles.tableContainer}>
                <table className={styles.questionsTable}>
                    <thead>
                        <tr>
                            <th className={styles.checkboxCell}>
                                <input type="checkbox" ref={headerCheckboxRef} onChange={handleSelectAll} />
                            </th>
                            <th>ID</th>
                            <th>Tema</th>
                            <th>Pergunta</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.length > 0 ? questions.map(q => (
                            <tr key={q.id}>
                                <td className={styles.checkboxCell}>
                                    <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => handleSelectOne(q.id)} />
                                </td>
                                <td>{q.id}</td>
                                <td>{q.tema}</td>
                                <td className={styles.questionTextCell}>{q.pergunta_formatada_display}</td>
                                <td className={styles.actionsCell}>
                                    <button onClick={() => handleOpenEditModal(q)} className={styles.editButton}>Editar</button>
                                    <button onClick={() => handleDelete(q.id)} className={styles.deleteButton}>Excluir</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5">Nenhuma pergunta encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={styles.screenContainer}>
            
            <div className={styles.contentArea}>
                <div className={styles.toolbar}>
                    <div>
                        <button onClick={handleOpenCreateModal} className={styles.primaryButton}>Criar Nova Pergunta</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx" style={{ display: 'none' }} />
                        <button onClick={handleImportClick} className={styles.secondaryButton} disabled={importing}>
                            {importing ? 'Importando...' : 'Importar XLSX'}
                        </button>
                    </div>
                    <div>
                        {selectedIds.length > 0 && (
                             <button onClick={handleBulkDelete} className={styles.bulkDeleteButton}>
                                Excluir Selecionadas ({selectedIds.length})
                             </button>
                        )}
                    </div>
                </div>
                {renderContent()}
            </div>

            <QuestionFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                question={editingQuestion}
                telegramId={telegramId} 
            />
        </div>
    );
}

export default QuestionManagerPage;