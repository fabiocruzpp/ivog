import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import styles from './QuestionManagerPage.module.css';
import QuestionFormModal from '../components/QuestionFormModal';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

function QuestionManagerPage() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [telegramId, setTelegramId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [importing, setImporting] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user && user.id) {
            setTelegramId(user.id.toString());
        } else {
            setError("ID do Telegram não encontrado. Acesso negado.");
            setLoading(false);
        }
    }, []);

    const fetchQuestions = useCallback(async () => {
        if (!telegramId) return;
        try {
            setLoading(true);
            const response = await api.get('/admin/questions', {
                params: { telegram_id: telegramId }
            });
            setQuestions(response.data);
            setError('');
        } catch (err) {
            setError('Falha ao carregar as perguntas. Verifique se você tem permissão de administrador.');
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
                await api.delete(`/admin/questions/${questionId}`, {
                    data: { telegram_id: telegramId }
                });
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
        formData.append('csvfile', file);
        formData.append('telegram_id', telegramId);

        try {
            setImporting(true);
            const response = await api.post('/admin/questions/import', formData, {
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
            event.target.value = null; // Reseta o input de arquivo
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
                            <th>ID</th>
                            <th>Tema</th>
                            <th>Pergunta</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.length > 0 ? questions.map(q => (
                            <tr key={q.id}>
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
                                <td colSpan="4">Nenhuma pergunta encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={styles.screenContainer}>
            <div className={styles.headerBar}>
                <Link to="/admin" className={styles.headerIconBtn}><BackArrowIcon /></Link>
                <h1 className={styles.screenTitle}>Gerenciar Perguntas</h1>
            </div>
            <div className={styles.contentArea}>
                <div className={styles.toolbar}>
                    <button onClick={handleOpenCreateModal} className={styles.primaryButton}>Criar Nova Pergunta</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" style={{ display: 'none' }} />
                    <button onClick={handleImportClick} className={styles.secondaryButton} disabled={importing}>
                        {importing ? 'Importando...' : 'Importar CSV'}
                    </button>
                </div>
                {renderContent()}
            </div>

            <QuestionFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                question={editingQuestion}
            />
        </div>
    );
}

export default QuestionManagerPage;