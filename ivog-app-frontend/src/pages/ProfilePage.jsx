// ivog-app-frontend/src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import styles from './ProfilePage.module.css';
import { useFeedbackStore } from '../store/feedbackStore'; // Importa o store de feedback

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

// Componentes auxiliares do formulário
const FormSelect = ({ label, name, value, onChange, options, disabled = false, defaultOptionText }) => (
    <div className={styles.formGroup}>
        <label htmlFor={name}>{label}</label>
        <select id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={styles.formSelect}>
            <option value="">{defaultOptionText}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);
const FormInput = ({ label, name, value, onChange, disabled = false, placeholder = '' }) => (
    <div className={styles.formGroup}>
        <label htmlFor={name}>{label}</label>
        <input type="text" id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={styles.formInput} placeholder={placeholder} />
    </div>
);


function ProfilePage() {
    const [telegramId, setTelegramId] = useState(null);
    const [loading, setLoading] = useState(true);
    // Remove o estado de mensagem local: const [message, setMessage] = useState('');
    const { addToast } = useFeedbackStore(); // Usa a ação do store

    const [formData, setFormData] = useState({
        first_name: '', ddd: '', canal_principal: '', tipo_parceiro: '',
        rede_parceiro: '', loja_revenda: '', cargo: ''
    });
    const [options, setOptions] = useState({
        ddds: [], canais: [], tiposParceiro: [], redes: [], lojas: [], cargos: []
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        const resetMap = {
            ddd: { canal_principal: '', tipo_parceiro: '', rede_parceiro: '', loja_revenda: '', cargo: '' },
            canal_principal: { tipo_parceiro: '', rede_parceiro: '', loja_revenda: '', cargo: '' },
            tipo_parceiro: { rede_parceiro: '', loja_revenda: '', cargo: '' },
            rede_parceiro: { loja_revenda: '', cargo: '' },
            loja_revenda: { cargo: '' }
        };
        setFormData(prev => ({ ...prev, ...(resetMap[name] || {}), [name]: value }));
    };

    // 1. Busca dados iniciais ao carregar
    useEffect(() => {
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user && user.id) {
            const currentId = user.id.toString();
            setTelegramId(currentId);

            const fetchInitialData = async () => {
                try {
                    setLoading(true);
                    const [dddsRes, profileRes] = await Promise.all([
                        api.get('/options/ddds'),
                        api.get(`/user/${currentId}`).catch(() => ({ data: {} }))
                    ]);
                    setOptions(prev => ({ ...prev, ddds: dddsRes.data }));
                    if(profileRes.data) {
                       setFormData(prev => ({ ...prev, ...profileRes.data }));
                    }
                } catch (error) {
                    addToast('Falha ao carregar dados.', 'error');
                } finally {
                    setLoading(false);
                }
            };
            fetchInitialData();
        } else {
            addToast('Não foi possível identificar o utilizador.', 'error');
            setLoading(false);
        }
    }, [addToast]); // Adiciona addToast às dependências

    // Efeitos em cascata permanecem os mesmos...
    useEffect(() => {
        if (formData.ddd) {
            api.get(`/options/canais?ddd=${formData.ddd}`).then(res => {
                setOptions(prev => ({ ...prev, canais: res.data }));
            });
        }
    }, [formData.ddd]);

    useEffect(() => {
        if (!formData.canal_principal) return;
        const { ddd, canal_principal } = formData;
        if (canal_principal === 'Parceiros') {
            api.get(`/options/tipos-parceiro?ddd=${ddd}&canal=${canal_principal}`).then(res => setOptions(prev => ({ ...prev, tiposParceiro: res.data })));
        } else if (canal_principal === 'Loja Própria') {
             api.get(`/options/lojas?ddd=${ddd}&canal=${canal_principal}`).then(res => setOptions(prev => ({ ...prev, lojas: res.data })));
        } else if (canal_principal === 'Distribuição') {
            api.get(`/options/redes?ddd=${ddd}&canal=${canal_principal}`).then(res => setOptions(prev => ({ ...prev, redes: res.data })));
        }
    }, [formData.ddd, formData.canal_principal]);

    useEffect(() => {
        if (!formData.tipo_parceiro) return;
        const { ddd, canal_principal, tipo_parceiro } = formData;
        if (tipo_parceiro === 'Parceiro Lojas') {
            api.get(`/options/redes?ddd=${ddd}&canal=${canal_principal}&tipoParceiro=${tipo_parceiro}`).then(res => setOptions(prev => ({ ...prev, redes: res.data })));
        } else if (['PAP', 'GA', 'GA Multicanal'].includes(tipo_parceiro)) {
             api.get(`/options/cargos?canal=${canal_principal}&tipoParceiro=${tipo_parceiro}`).then(res => setOptions(prev => ({ ...prev, cargos: res.data })));
        }
    }, [formData.ddd, formData.canal_principal, formData.tipo_parceiro]);

    useEffect(() => {
        if (!formData.rede_parceiro) return;
        const { ddd, canal_principal, tipo_parceiro, rede_parceiro } = formData;
        if (canal_principal === 'Distribuição') {
            api.get(`/options/cargos?canal=${canal_principal}`).then(res => setOptions(prev => ({...prev, cargos: res.data})));
        } else if (tipo_parceiro === 'Parceiro Lojas') {
            api.get(`/options/lojas?ddd=${ddd}&canal=${canal_principal}&rede=${rede_parceiro}`).then(res => setOptions(prev => ({...prev, lojas: res.data })));
        }
    }, [formData.ddd, formData.canal_principal, formData.tipo_parceiro, formData.rede_parceiro]);
    
    useEffect(() => {
        if(!formData.loja_revenda) return;
        api.get(`/options/cargos?canal=${formData.canal_principal}&tipoParceiro=${formData.tipo_parceiro}`).then(res => {
            setOptions(prev => ({ ...prev, cargos: res.data }));
        });
    }, [formData.canal_principal, formData.tipo_parceiro, formData.loja_revenda]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        useFeedbackStore.getState().showLoading();
        try {
            await api.post('/register', { ...formData, telegram_id: telegramId });
            addToast('Perfil gravado com sucesso!', 'success');
        } catch (error) {
            addToast('Erro ao gravar o perfil. Tente novamente.', 'error');
        } finally {
            useFeedbackStore.getState().hideLoading();
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>A carregar perfil...</p>;
    
    const showRede = (formData.canal_principal === 'Distribuição' || formData.tipo_parceiro === 'Parceiro Lojas') && options.redes.length > 0;
    const showLoja = (formData.canal_principal === 'Loja Própria' || (formData.tipo_parceiro === 'Parceiro Lojas' && formData.rede_parceiro)) && options.lojas.length > 0;
    const showCargo = options.cargos.length > 0;

    return (
        <div className={styles.screenContainer}>
            <div className={styles.formContentArea}>
                <p className={styles.formInstructions}>Mantenha os seus dados atualizados para uma experiência completa.</p>
                <form onSubmit={handleSubmit}>
                    <FormInput label="Nome" name="first_name" value={formData.first_name} onChange={handleChange} />
                    <FormInput label="ID do Telegram" name="telegram_id" value={telegramId} disabled={true} />
                    <hr className={styles.divider} />
                    <FormSelect label="DDD" name="ddd" value={formData.ddd} onChange={handleChange} options={options.ddds} defaultOptionText="Selecione o seu DDD" />
                    {formData.ddd && <FormSelect label="Canal" name="canal_principal" value={formData.canal_principal} onChange={handleChange} options={options.canais} defaultOptionText="Selecione o seu Canal" />}
                    {formData.canal_principal === 'Parceiros' && <FormSelect label="Tipo de Parceiro" name="tipo_parceiro" value={formData.tipo_parceiro} onChange={handleChange} options={options.tiposParceiro} defaultOptionText="Selecione o Tipo de Parceiro" />}
                    {showRede && <FormSelect label="Rede" name="rede_parceiro" value={formData.rede_parceiro} onChange={handleChange} options={options.redes} defaultOptionText="Selecione a Rede" />}
                    {showLoja && <FormSelect label="Loja" name="loja_revenda" value={formData.loja_revenda} onChange={handleChange} options={options.lojas} defaultOptionText="Selecione a Loja" />}
                    {showCargo && <FormSelect label="Cargo" name="cargo" value={formData.cargo} onChange={handleChange} options={options.cargos} defaultOptionText="Selecione o Cargo" />}
                    
                    <button type="submit" className={styles.submitButton}>Gravar Alterações</button>
                    {/* O feedback agora é global e não precisa mais ser renderizado aqui */}
                </form>
            </div>
        </div>
    );
}

export default ProfilePage;