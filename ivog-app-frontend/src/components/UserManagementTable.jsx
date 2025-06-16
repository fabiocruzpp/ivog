// ivog-app-frontend/src/components/UserManagementTable.jsx

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useFeedbackStore } from '../store/feedbackStore';
import styles from './UserManagementTable.module.css';

const UserManagementTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useFeedbackStore();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/users');
        setUsers(response.data);
      } catch (error) {
        addToast('Erro ao carregar a lista de usuários.', 'error');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [addToast]);

  const handleExcludeUser = async (telegramId, userName) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${userName} (${telegramId})?\nEsta ação é irreversível e excluirá todos os dados do usuário.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${telegramId}`);
      setUsers(currentUsers => currentUsers.filter(user => user.telegram_id !== telegramId));
      addToast('Usuário excluído com sucesso!', 'success');
    } catch (error) {
      addToast('Erro ao excluir o usuário.', 'error');
      console.error(error);
    }
  };

  if (loading) {
    return <p>Carregando usuários...</p>;
  }

  return (
    <div className={styles.tableContainer}>
      <h2>Gerenciamento de Usuários</h2>
      {users.length === 0 ? (
        <p>Nenhum usuário cadastrado.</p>
      ) : (
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>ID Telegram</th>
              <th>Nome</th>
              <th>DDD</th>
              <th>Canal</th>
              <th>Cargo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.telegram_id}>
                <td>{user.telegram_id}</td>
                {/* CORREÇÃO: Trocado "user.nome_completo" por "user.first_name" */}
                <td>{user.first_name}</td>
                <td>{user.ddd}</td>
                <td>{user.canal_principal}</td>
                <td>{user.cargo}</td>
                <td>
                  <button 
                    className={styles.excludeButton}
                    // CORREÇÃO: Passando "user.first_name" para a mensagem de confirmação
                    onClick={() => handleExcludeUser(user.telegram_id, user.first_name)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserManagementTable;