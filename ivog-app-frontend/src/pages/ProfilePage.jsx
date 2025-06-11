import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import styles from './ProfilePage.module.css';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

function ProfilePage() {
  const [profile, setProfile] = useState({ ddd: '', canal_principal: '', cargo: '' });
  const [telegramId, setTelegramId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const telegram = window.Telegram.WebApp;
    const user = telegram.initDataUnsafe?.user;

    if (user && user.id) {
      setTelegramId(user.id.toString());
      fetchUserProfile(user.id.toString());
    } else {
      setMessage('Erro: Não foi possível identificar o usuário do Telegram.');
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (id) => {
    try {
      setLoading(true);
      const response = await api.get(`/user/${id}`);
      setProfile({
        ddd: response.data.ddd || '',
        canal_principal: response.data.canal_principal || '',
        cargo: response.data.cargo || '',
        // Adicione outros campos se necessário
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      setMessage('Falha ao carregar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevProfile => ({ ...prevProfile, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Salvando...');
    try {
      await api.post('/register', { telegram_id: telegramId, ...profile });
      setMessage('Perfil salvo com sucesso!');
      // Esconde a mensagem de sucesso após 3 segundos
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      setMessage('Erro ao salvar o perfil. Tente novamente.');
    }
  };

  if (loading) {
    return <p style={{ textAlign: 'center' }}>Carregando perfil...</p>;
  }

  return (
    <div className={styles.screenContainer}>
        <div className={styles.headerBar}>
            <Link to="/" className={styles.headerIconBtn}><BackArrowIcon /></Link>
            <h1 className={styles.screenTitle}>Atualizar Dados</h1>
        </div>
        <div className={styles.formContentArea}>
            <p className={styles.formInstructions}>Mantenha seus dados sempre atualizados para uma experiência personalizada.</p>
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="ddd">DDD</label>
                    <input type="text" id="ddd" name="ddd" value={profile.ddd} onChange={handleChange} className={styles.formInput} placeholder="Ex: 91" />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="canal_principal">Canal Principal</label>
                    {/* Em uma versão futura, este seria um <select> populado pela API */}
                    <input type="text" id="canal_principal" name="canal_principal" value={profile.canal_principal} onChange={handleChange} className={styles.formInput} placeholder="Ex: Loja Própria" />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="cargo">Cargo</label>
                    <input type="text" id="cargo" name="cargo" value={profile.cargo} onChange={handleChange} className={styles.formInput} placeholder="Ex: Guru" />
                </div>
                {/* Futuramente, campos dinâmicos apareceriam aqui */}
                
                <button type="submit" className={styles.submitButton}>Salvar Alterações</button>
                {message && <p style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
            </form>
        </div>
    </div>
  );
}

export default ProfilePage;