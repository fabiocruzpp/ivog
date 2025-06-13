import React, { useState, useEffect } from 'react';
import styles from './QuestionFormModal.module.css';

const getInitialFormData = () => ({
    pergunta_formatada_display: '',
    alternativas: ['', '', '', ''],
    correta: '',
    tema: '',
    subtema: '',
    publico: [],
    canal: [],
    feedback: '',
    fonte: ''
});

function QuestionFormModal({ isOpen, onClose, onSubmit, question }) {
    const [formData, setFormData] = useState(getInitialFormData());

    useEffect(() => {
        if (isOpen) {
            if (question) {
                // Preenche o formulário com os dados da pergunta para edição
                setFormData({
                    pergunta_formatada_display: question.pergunta_formatada_display || '',
                    alternativas: question.alternativas?.length === 4 ? question.alternativas : ['', '', '', ''],
                    correta: question.correta || '',
                    tema: question.tema || '',
                    subtema: question.subtema || '',
                    publico: question.publico || [],
                    canal: question.canal || [],
                    feedback: question.feedback || '',
                    fonte: question.fonte || '',
                });
            } else {
                // Limpa o formulário para criação
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
    
    // Converte a string de 'publico' ou 'canal' (separada por vírgula) em um array
    const handleArrayStringChange = (e) => {
        const { name, value } = e.target;
        const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, [name]: arrayValue }));
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        // Garante que a resposta correta é uma das alternativas
        if (!formData.alternativas.includes(formData.correta)) {
            alert('A resposta correta deve ser idêntica a uma das alternativas.');
            return;
        }
        onSubmit(formData);
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
                    
                    {formData.alternativas.map((alt, index) => (
                        <div className={styles.formGroup} key={index}>
                            <label>Alternativa {String.fromCharCode(65 + index)} *</label>
                            <input value={alt} onChange={(e) => handleAlternativeChange(index, e.target.value)} required />
                        </div>
                    ))}

                    <div className={styles.formGroup}>
                        <label>Resposta Correta *</label>
                        <select name="correta" value={formData.correta} onChange={handleChange} required>
                            <option value="">Selecione a alternativa correta</option>
                            {formData.alternativas.filter(Boolean).map((alt, index) => (
                                <option key={index} value={alt}>{alt}</option>
                            ))}
                        </select>
                    </div>

                     <div className={styles.formGroup}>
                        <label>Público (separado por vírgula)</label>
                        <input name="publico" value={formData.publico.join(', ')} onChange={handleArrayStringChange} placeholder="Ex: GG, GO, CN" />
                    </div>
                     <div className={styles.formGroup}>
                        <label>Canal (separado por vírgula)</label>
                        <input name="canal" value={formData.canal.join(', ')} onChange={handleArrayStringChange} placeholder="Ex: Loja Propria, Parceiros" />
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