// ivog-app-frontend/src/pages/RegisterPage.jsx

import React, { useState, useEffect } from 'react';
import api from '/src/services/api.js';
import { useNavigate } from 'react-router-dom';
import styles from '/src/pages/RegisterPage.module.css';
import { useUserStore } from '/src/store/userStore.js';

// Componentes auxiliares do formulário (sem alterações)
const FormSelect = ({ label, name, value, onChange, options, disabled = false, defaultOptionText }) => (
    <div className={styles.formGroup}>
        <label htmlFor={name}>{label}</label>
        <select id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={styles.formSelect} required>
            <option value="">{defaultOptionText}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);
const FormInput = ({ label, name, value, onChange, disabled = false, placeholder = '', type = 'text', pattern = null }) => (
    <div className={styles.formGroup}>
        <label htmlFor={name}>{label}</label>
        <input type={type} pattern={pattern} id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={styles.formInput} placeholder={placeholder} required />
    </div>
);

function RegisterPage() {
    const navigate = useNavigate();
    const { fetchUser } = useUserStore();
    const [telegramId, setTelegramId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        first_name: '', ddd: '', canal_principal: '', tipo_parceiro: '',
        rede_parceiro: '', loja_revenda: '', cargo: '', matricula: ''
    });
    const [options, setOptions] = useState({
        ddds: [], canais: [], tiposParceiro: [], redes: [], lojas: [], cargos: []
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        const resetMap = {
            ddd: { canal_principal: '', tipo_parceiro: '', rede_parceiro: '', loja_revenda: '', cargo: '', matricula: '' },
            canal_principal: { tipo_parceiro: '', rede_parceiro: '', loja_revenda: '', cargo: '', matricula: '' },
            tipo_parceiro: { rede_parceiro: '', loja_revenda: '', cargo: '', matricula: '' },
            rede_parceiro: { loja_revenda: '', cargo: '', matricula: '' },
            loja_revenda: { cargo: '', matricula: '' },
            cargo: { matricula: ''}
        };
        setFormData(prev => ({ ...prev, ...(resetMap[name] || {}), [name]: value }));
    };

    // 1. Busca dados iniciais (DDDs) ao carregar a página
    useEffect(() => {
        const telegram = window.Telegram.WebApp;
        const user = telegram.initDataUnsafe?.user;

        if (user && user.id) {
            setTelegramId(user.id.toString());
            setFormData(prev => ({...prev, first_name: user.first_name || ''}));
            api.get('/options/ddds').then(res => {
                setOptions(prev => ({ ...prev, ddds: res.data }));
            }).catch(err => setMessage('Falha ao carregar opções.'))
            .finally(() => setLoading(false));
        } else {
            setMessage('Não foi possível identificar o utilizador.');
            setLoading(false);
        }
    }, []);

    // 2. Busca Canais quando o DDD muda
    useEffect(() => {
        if (formData.ddd) {
            api.get(`/options/canais?ddd=${formData.ddd}`).then(res => {
                setOptions(prev => ({ ...prev, canais: res.data }));
            });
        }
    }, [formData.ddd]);
    
    // 3. Busca o próximo passo quando o Canal Principal muda
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

    // 4. Busca o próximo passo quando o Tipo de Parceiro muda (Fluxo Parceiros)
    useEffect(() => {
        if (!formData.tipo_parceiro) return;
        const { ddd, canal_principal, tipo_parceiro } = formData;
        if (tipo_parceiro === 'Parceiro Lojas') {
            api.get(`/options/redes?ddd=${ddd}&canal=${canal_principal}&tipoParceiro=${tipo_parceiro}`).then(res => setOptions(prev => ({ ...prev, redes: res.data })));
        } else if (['PAP', 'GA', 'GA Multicanal'].includes(tipo_parceiro)) {
             api.get(`/options/cargos?canal=${canal_principal}&tipoParceiro=${tipo_parceiro}`).then(res => setOptions(prev => ({ ...prev, cargos: res.data })));
        }
    }, [formData.ddd, formData.canal_principal, formData.tipo_parceiro]);

    // 5. CORREÇÃO: Busca o próximo passo quando a Rede é selecionada
    useEffect(() => {
        if (!formData.rede_parceiro) return;
        const { ddd, canal_principal, tipo_parceiro, rede_parceiro } = formData;

        if (canal_principal === 'Distribuição') {
            // Se o canal é Distribuição, busca os cargos.
            api.get(`/options/cargos?canal=${canal_principal}`).then(res => {
                setOptions(prev => ({...prev, cargos: res.data}));
            });
        } else if (tipo_parceiro === 'Parceiro Lojas') {
            // Se o fluxo é Parceiro > Lojas, busca as lojas.
            api.get(`/options/lojas?ddd=${ddd}&canal=${canal_principal}&rede=${rede_parceiro}`).then(res => {
                setOptions(prev => ({...prev, lojas: res.data }));
            });
        }
    }, [formData.ddd, formData.canal_principal, formData.tipo_parceiro, formData.rede_parceiro]);
    
    // 6. Busca Cargos quando a Loja é selecionada (final de alguns fluxos)
    useEffect(() => {
        if(!formData.loja_revenda) return;
        api.get(`/options/cargos?canal=${formData.canal_principal}&tipoParceiro=${formData.tipo_parceiro}`).then(res => {
            setOptions(prev => ({ ...prev, cargos: res.data }));
        });
    }, [formData.canal_principal, formData.tipo_parceiro, formData.loja_revenda]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('A finalizar cadastro...');
        try {
            await api.post('/user/register', { ...formData, telegram_id: telegramId });
            setMessage('Cadastro realizado com sucesso! A redirecionar...');
            
            // Força a atualização do estado do usuário.
            // Isso garantirá que `isNewUser` seja `false` antes de navegar.
            await fetchUser();
            
            navigate('/');
        } catch (error) {
            setMessage('Erro ao finalizar o cadastro. Tente novamente.');
        }
    };

    if (loading) return <p style={{ textAlign: 'center', padding: '20px' }}>A carregar formulário...</p>;
    
    // Lógica de renderização condicional
    const showRede = (formData.canal_principal === 'Distribuição' || formData.tipo_parceiro === 'Parceiro Lojas') && options.redes.length > 0;
    const showLoja = (formData.canal_principal === 'Loja Própria' || (formData.tipo_parceiro === 'Parceiro Lojas' && formData.rede_parceiro)) && options.lojas.length > 0;
    const showCargo = options.cargos.length > 0;
    const showMatricula = (formData.canal_principal === 'Loja Própria' && formData.cargo) || (formData.canal_principal === 'Parceiros' && formData.tipo_parceiro === 'Parceiro Lojas' && formData.cargo);

    return (
        <div className={styles.screenContainer}>
            
            <div className={styles.formContentArea}>
                <p className={styles.formInstructions}>Complete o seu cadastro para começar a jogar e competir.</p>
                <form onSubmit={handleSubmit}>
                    <FormInput label="O seu Nome" name="first_name" value={formData.first_name} onChange={handleChange} />
                    <FormInput label="ID do Telegram" name="telegram_id" value={telegramId} disabled={true} />
                    <hr className={styles.divider} />
                    <FormSelect label="DDD" name="ddd" value={formData.ddd} onChange={handleChange} options={options.ddds} defaultOptionText="Selecione o seu DDD" />
                    {formData.ddd && <FormSelect label="Canal" name="canal_principal" value={formData.canal_principal} onChange={handleChange} options={options.canais} defaultOptionText="Selecione o seu Canal" />}
                    {formData.canal_principal === 'Parceiros' && <FormSelect label="Tipo de Parceiro" name="tipo_parceiro" value={formData.tipo_parceiro} onChange={handleChange} options={options.tiposParceiro} defaultOptionText="Selecione o Tipo de Parceiro" />}
                    {showRede && <FormSelect label="Rede" name="rede_parceiro" value={formData.rede_parceiro} onChange={handleChange} options={options.redes} defaultOptionText="Selecione a Rede" />}
                    {showLoja && <FormSelect label="Loja" name="loja_revenda" value={formData.loja_revenda} onChange={handleChange} options={options.lojas} defaultOptionText="Selecione a Loja" />}
                    {showCargo && <FormSelect label="Cargo" name="cargo" value={formData.cargo} onChange={handleChange} options={options.cargos} defaultOptionText="Selecione o Cargo" />}
                    {showMatricula && <FormInput label="Matrícula/RE" name="matricula" value={formData.matricula} onChange={handleChange} type="tel" pattern="\d*" placeholder="Digite apenas números" />}

                    <button type="submit" className={styles.submitButton}>Concluir Cadastro</button>
                    {message && <p className={styles.messageFeedback}>{message}</p>}
                </form>
            </div>
        </div>
    );
}

export default RegisterPage;