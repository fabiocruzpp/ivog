import React, { useState, useEffect } from 'react';
import styles from './PillFormModal.module.css';

const getInitialFormData = () => ({
    id: null,
    tema: '',
    conteudo: '',
    target_cargo: [],
    target_canal: [],
    source_file: '',
    source_page: ''
});

function PillFormModal({ isOpen, onClose, onSubmit, pill }) {
    const [formData, setFormData] = useState(getInitialFormData());

    useEffect(() => {
        if (isOpen) {
            if (pill) {
                setFormData({
                    id: pill.id,
                    tema: pill.tema || '',
                    conteudo: pill.conteudo || '',
                    target_cargo: JSON.parse(pill.target_cargo || '[]'),
                    target_canal: JSON.parse(pill.target_canal || '[]'),
                    source_file: pill.source_file || '',
                    source_page: pill.source_page || '',
                });
            } else {
                setFormData(getInitialFormData());
            }
        }
    }, [pill, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <h2>{pill ? 'Editar Pílula' : 'Criar Nova Pílula'}</h2>
                <form onSubmit={handleSubmit} className={styles.pillForm}>
                    <div className={styles.formGroup}>
                        <label>Tema</label>
                        <input name="tema" value={formData.tema} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Conteúdo *</label>
                        <textarea name="conteudo" value={formData.conteudo} onChange={handleChange} required rows="5" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Cargos Alvo (separados por | )</label>
                        <input name="target_cargo" value={formData.target_cargo.join('|')} onChange={(e) => setFormData(prev => ({...prev, target_cargo: e.target.value.split('|')}))} />
                    </div>
                     <div className={styles.formGroup}>
                        <label>Canais Alvo (separados por | )</label>
                        <input name="target_canal" value={formData.target_canal.join('|')} onChange={(e) => setFormData(prev => ({...prev, target_canal: e.target.value.split('|')}))} />
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Arquivo de Origem</label>
                            <input name="source_file" value={formData.source_file} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Página</label>
                            <input name="source_page" value={formData.source_page} onChange={handleChange} />
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

export default PillFormModal;