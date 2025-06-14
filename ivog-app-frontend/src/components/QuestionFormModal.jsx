import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './QuestionFormModal.module.css';

const getInitialFormData = () => ({
    pergunta_formatada_display: '',
    alternativas: ['', ''],
    correta: '',
    tema: '',
    subtema: '',
    publico: [],
    canal: [],
    feedback: '',
    fonte: ''
});

function QuestionFormModal({ isOpen, onClose, onSubmit, question, telegramId }) {
    const [formData, setFormData] = useState(getInitialFormData());
    const [options, setOptions] = useState({ canais: [], cargos: [] });

    useEffect(() => {
        if (isOpen) {
            const fetchOptions = async () => {
                try {
                    const params = telegramId ? { telegram_id: telegramId } : {};
                    // ATUALIZADO: Chamada única para o novo endpoint
                    const response = await api.get('/admin/form-options', { params });
                    setOptions({
                        canais: response.data.canais || [],
                        cargos: response.data.cargos || []
                    });
                } catch (error) {
                    console.error("Falha ao carregar opções para o formulário de perguntas", error);
                }
            };
            fetchOptions();
        }
    }, [isOpen, telegramId]);

    useEffect(() => {
        if (isOpen) {
            if (question) {
                setFormData({
                    pergunta_formatada_display: question.pergunta_formatada_display || '',
                    alternativas: question.alternativas?.length > 0 ? question.alternativas : ['', ''],
                    correta: question.correta || '',
                    tema: question.tema || '',
                    subtema: question.subtema || '',
                    publico: question.publico || [],
                    canal: question.canal || [],
                    feedback: question.feedback || '',
                    fonte: question.fonte || '',
                });
            } else {
                setFormData(getInitialFormData());
            }
        }
    }, [question, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAlternativeChange = (index, value) => {
        const newAlternativas = [...formData.alternativas];
        newAlternativas[index] = value;
        setFormData(prev => ({ ...prev, alternativas: newAlternativas }));
    };
    
    const handleAddAlternative = () => {
        setFormData(prev => ({
            ...prev,
            alternativas: [...prev.alternativas, '']
        }));
    };

    const handleRemoveAlternative = (indexToRemove) => {
        const alternativeToRemove = formData.alternativas[indexToRemove];
        const newCorreta = formData.correta === alternativeToRemove ? '' : formData.correta;

        setFormData(prev => ({
            ...prev,
            alternativas: prev.alternativas.filter((_, index) => index !== indexToRemove),
            correta: newCorreta
        }));
    };
    
    const handleMultiSelectChange = (e) => {
        const { name, selectedOptions } = e.target;
        const values = Array.from(selectedOptions, option => option.value);
        setFormData(prev => ({ ...prev, [name]: values }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const finalFormData = {
            ...formData,
            alternativas: formData.alternativas.filter(alt => alt.trim() !== '')
        };

        if (finalFormData.alternativas.length < 2) {
            alert('A pergunta deve ter pelo menos duas alternativas preenchidas.');
            return;
        }

        if (!finalFormData.correta || !finalFormData.alternativas.includes(finalFormData.correta)) {
            alert('A resposta correta deve ser selecionada e deve ser idêntica a uma das alternativas preenchidas.');
            return;
        }
        onSubmit(finalFormData);
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <h2>{question ? 'Editar Pergunta' : 'Criar Nova Pergunta'}</h2>
                <form onSubmit={handleSubmit} className={styles.questionForm}>
                    <div className={styles.formGroup}>
                        <label>Tema *</label>
                        <input name="tema" value={formData.tema} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Subtema</label>
                        <input name="subtema" value={formData.subtema} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Pergunta *</label>
                        <textarea name="pergunta_formatada_display" value={formData.pergunta_formatada_display} onChange={handleChange} required />
                    </div>
                    
                    <hr className={styles.divider} />
                    <label className={styles.sectionLabel}>Alternativas</label>
                    
                    {formData.alternativas.map((alt, index) => (
                        <div className={styles.alternativeRow} key={index}>
                            <input 
                                value={alt} 
                                onChange={(e) => handleAlternativeChange(index, e.target.value)}
                                placeholder={`Alternativa ${index + 1}`}
                            />
                            <button 
                                type="button" 
                                onClick={() => handleRemoveAlternative(index)}
                                className={styles.removeButton}
                                disabled={formData.alternativas.length <= 2}
                            >
                                —
                            </button>
                        </div>
                    ))}
                    
                    <button type="button" onClick={handleAddAlternative} className={styles.addButton}>+ Adicionar Alternativa</button>
                    <hr className={styles.divider} />

                    <div className={styles.formGroup}>
                        <label>Resposta Correta *</label>
                        <select name="correta" value={formData.correta} onChange={handleChange} required>
                            <option value="">Selecione a alternativa correta</option>
                            {formData.alternativas.filter(Boolean).map((alt, index) => (
                                <option key={index} value={alt}>{alt}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Canal de Direcionamento</label>
                            <select multiple name="canal" value={formData.canal} onChange={handleMultiSelectChange} className={styles.multiSelect}>
                                {options.canais.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <small>Segure Ctrl (ou Cmd) para selecionar mais de um.</small>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Público/Cargo de Direcionamento</label>
                             <select multiple name="publico" value={formData.publico} onChange={handleMultiSelectChange} className={styles.multiSelect}>
                                {options.cargos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <small>Segure Ctrl (ou Cmd) para selecionar mais de um.</small>
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

export default QuestionFormModal;