import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import styles from './ProfilePage.module.css';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

// Componente auxiliar para os dropdowns
const FormSelect = ({ label, name, value, onChange, options, disabled = false, defaultOptionText }) => (
    <div className={styles.formGroup}>
        <label htmlFor={name}>{label}</label>
        <select id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={styles.formSelect}>
            <option value="">{defaultOptionText}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

// Componente auxiliar para inputs de texto
const FormInput = ({ label, name, value, onChange, disabled = false, placeholder = '' }) => (
    <div className={styles.formGroup}>
        <label htmlFor={name}>{label}</label>
        <input type="text" id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className={styles.formInput} placeholder={placeholder} />
    </div>
);


function ProfilePage() {
    const [telegramId, setTelegramId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        first_name: '',
        ddd: '',
        canal_principal: '',
        tipo_parceiro: '',
        rede_parceiro: '',
        loja_revenda: '',
        cargo: ''
    });

    const [options, setOptions] = useState({
        ddds: [], canais: [], tiposParceiro: [], redes: [], lojas: [], cargos: []
    });

    useEffect(() => {
        const telegram = window.Telegram.WebApp;
        const user = telegram.initDataUnsafe?.user;

        if (user && user.id) {
            const currentId = user.id.toString();
            setTelegramId(currentId);

            const fetchInitialData = async () => {
                try {
                    setLoading(true);
                    // Pega o nome do objeto do telegram como valor inicial
                    const initialFirstName = user.first_name || '';
                    setFormData(prev => ({...prev, first_name: initialFirstName}));

                    const [dddsRes, profileRes] = await Promise.all([
                        api.get('/options/ddds'),
                        api.get(`/user/${currentId}`).catch(() => ({ data: {} }))
                    ]);
                    setOptions(prev => ({ ...prev, ddds: dddsRes.data }));
                    if(profileRes.data) {
                       setFormData(prev => ({ ...prev, ...profileRes.data, first_name: profileRes.data.first_name || initialFirstName }));
                    }
                } catch (error) {
                    console.error("Erro ao buscar dados iniciais:", error);
                    setMessage('Falha ao carregar dados.');
                } finally {
                    setLoading(false);
                }
            };
            fetchInitialData();
        } else {
            setMessage('Erro: Não foi possível identificar o usuário do Telegram.');
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        if (formData.ddd) {
            api.get(`/options/canais?ddd=${formData.ddd}`).then(res => {
                setOptions(prev => ({ ...prev, canais: res.data, tiposParceiro: [], redes: [], lojas: [], cargos: [] }));
            });
        }
    }, [formData.ddd]);

    useEffect(() => {
        if (!formData.canal_principal) return;
        
        if (formData.canal_principal === 'Parceiros') {
            api.get(`/options/tipos-parceiro?ddd=${formData.ddd}&canal=${formData.canal_principal}`).then(res => {
                setOptions(prev => ({ ...prev, tiposParceiro: res.data, redes: [], lojas: [], cargos: [] }));
            });
        } else if (formData.canal_principal === 'Loja Propria') {
             api.get(`/options/lojas?ddd=${formData.ddd}&canal=${formData.canal_principal}`).then(res => {
                setOptions(prev => ({ ...prev, lojas: res.data, tiposParceiro: [], redes: [], cargos: [] }));
            });
        } else if (formData.canal_principal === 'Distribuição') {
            api.get(`/options/redes?ddd=${formData.ddd}&canal=${formData.canal_principal}`).then(res => {
                setOptions(prev => ({ ...prev, redes: res.data, tiposParceiro: [], lojas: [], cargos: [] }));
            });
        }
    }, [formData.ddd, formData.canal_principal]);

    useEffect(() => {
        if (!formData.tipo_parceiro) return;

        if (formData.tipo_parceiro === 'Parceiro Lojas') {
            api.get(`/options/redes?ddd=${formData.ddd}&canal=${formData.canal_principal}&tipoParceiro=${formData.tipo_parceiro}`).then(res => {
                setOptions(prev => ({ ...prev, redes: res.data, lojas: [], cargos: [] }));
            });
        } else if (['PAP', 'GA', 'GA Multicanal'].includes(formData.tipo_parceiro)) {
             api.get(`/options/cargos?canal=${formData.canal_principal}&tipoParceiro=${formData.tipo_parceiro}`).then(res => {
                setOptions(prev => ({ ...prev, cargos: res.data, redes: [], lojas: [] }));
            });
        }
    }, [formData.ddd, formData.canal_principal, formData.tipo_parceiro]);
    
    useEffect(() => {
        if (!formData.rede_parceiro) return;

        if (formData.tipo_parceiro === 'Parceiro Lojas') {
            api.get(`/options/lojas?ddd=${formData.ddd}&canal=${formData.canal_principal}&rede=${formData.rede_parceiro}`).then(res => {
                setOptions(prev => ({...prev, lojas: res.data, cargos: [] }));
            });
        } else if (formData.canal_principal === 'Distribuição') {
            api.get(`/options/cargos?canal=${formData.canal_principal}`).then(res => {
                setOptions(prev => ({ ...prev, cargos: res.data, lojas: [] }));
            });
        }
    }, [formData.ddd, formData.canal_principal, formData.tipo_parceiro, formData.rede_parceiro]);

    useEffect(() => {
        if(!formData.loja_revenda) return;
        
        api.get(`/options/cargos?canal=${formData.canal_principal}&tipoParceiro=${formData.tipo_parceiro}`).then(res => {
            setOptions(prev => ({ ...prev, cargos: res.data }));
        });

    }, [formData.canal_principal, formData.tipo_parceiro, formData.loja_revenda]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        
        const resetState = {
            ddd: { canal_principal: '', tipo_parceiro: '', rede_parceiro: '', loja_revenda: '', cargo: '' },
            canal_principal: { tipo_parceiro: '', rede_parceiro: '', loja_revenda: '', cargo: '' },
            tipo_parceiro: { rede_parceiro: '', loja_revenda: '', cargo: '' },
            rede_parceiro: { loja_revenda: '', cargo: '' },
            loja_revenda: { cargo: '' }
        };

        setFormData(prev => ({
            ...prev,
            ...(resetState[name] || {}),
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Salvando...');
        try {
            // Garante que o first_name está incluído no payload
            const payload = { ...formData, telegram_id: telegramId };
            await api.post('/register', payload);
            setMessage('Perfil salvo com sucesso!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
            setMessage('Erro ao salvar o perfil. Tente novamente.');
        }
    };

    if (loading) {
        return <p style={{ textAlign: 'center' }}>Carregando perfil...</p>;
    }
    
    const showCanal = formData.ddd && options.canais.length > 0;
    const showTipoParceiro = formData.canal_principal === 'Parceiros' && options.tiposParceiro.length > 0;
    const showRede = (formData.canal_principal === 'Distribuição' || formData.tipo_parceiro === 'Parceiro Lojas') && options.redes.length > 0;
    const showLoja = (formData.canal_principal === 'Loja Propria' || (formData.rede_parceiro && formData.tipo_parceiro === 'Parceiro Lojas')) && options.lojas.length > 0;
    const showCargo = options.cargos.length > 0;

    return (
        <div className={styles.screenContainer}>
            <div className={styles.headerBar}>
                <Link to="/" className={styles.headerIconBtn}><BackArrowIcon /></Link>
                <h1 className={styles.screenTitle}>Atualizar Dados</h1>
            </div>
            <div className={styles.formContentArea}>
                <p className={styles.formInstructions}>Mantenha seus dados atualizados para uma experiência completa.</p>
                <form onSubmit={handleSubmit}>
                    <FormInput label="Nome" name="first_name" value={formData.first_name} onChange={handleChange} />
                    <FormInput label="ID do Telegram" name="telegram_id" value={telegramId} disabled={true} />

                    <hr className={styles.divider} />

                    <FormSelect label="DDD" name="ddd" value={formData.ddd} onChange={handleChange} options={options.ddds} defaultOptionText="Selecione seu DDD" />
                    
                    {showCanal && <FormSelect label="Canal" name="canal_principal" value={formData.canal_principal} onChange={handleChange} options={options.canais} defaultOptionText="Selecione seu Canal" />}
                    
                    {showTipoParceiro && <FormSelect label="Tipo de Parceiro" name="tipo_parceiro" value={formData.tipo_parceiro} onChange={handleChange} options={options.tiposParceiro} defaultOptionText="Selecione o Tipo de Parceiro" />}
                    
                    {showRede && <FormSelect label="Rede" name="rede_parceiro" value={formData.rede_parceiro} onChange={handleChange} options={options.redes} defaultOptionText="Selecione a Rede" />}

                    {showLoja && <FormSelect label="Loja" name="loja_revenda" value={formData.loja_revenda} onChange={handleChange} options={options.lojas} defaultOptionText="Selecione a Loja" />}
                    
                    {showCargo && <FormSelect label="Cargo" name="cargo" value={formData.cargo} onChange={handleChange} options={options.cargos} defaultOptionText="Selecione o Cargo" />}
                    
                    <button type="submit" className={styles.submitButton}>Salvar Alterações</button>
                    {message && <p className={styles.messageFeedback}>{message}</p>}
                </form>
            </div>
        </div>
    );
}

export default ProfilePage;