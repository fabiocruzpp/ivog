import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import styles from './UserManagementTable.module.css';

// Ícones
const SearchIcon = () => <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>;
const ChevronDownIcon = () => <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>;
const ChevronUpIcon = () => <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"></path></svg>;

function UserManagementTable() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'telegram_id', direction: 'ascending' });

    useEffect(() => {
        api.get('/admin/users')
            .then(response => {
                setUsers(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Erro ao buscar usuários:", error);
                setLoading(false);
            });
    }, []);

    // Função de exclusão ajustada para usar o nome na confirmação
    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`Tem certeza de que deseja excluir o usuário "${userName}" (ID: ${userId})? Esta ação não pode ser desfeita.`)) {
            try {
                await api.delete(`/admin/users/${userId}`);
                setUsers(currentUsers => currentUsers.filter(user => user.telegram_id !== userId));
                alert('Usuário excluído com sucesso!');
            } catch (error) {
                console.error("Erro ao excluir usuário:", error);
                alert('Falha ao excluir o usuário.');
            }
        }
    };

    const sortedAndFilteredUsers = useMemo(() => {
        let filtered = users.filter(user =>
            (user.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.telegram_id?.toString() || '').includes(searchTerm) ||
            (user.ddd?.toString() || '').includes(searchTerm) || // Adicionado filtro por DDD
            (user.cargo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.canal_principal?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [users, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ children, name }) => {
        const isSorted = sortConfig.key === name;
        return (
            <th onClick={() => requestSort(name)}>
                <div className={styles.headerContent}>
                    {children}
                    <span className={styles.sortIcon}>
                        {isSorted ? (sortConfig.direction === 'ascending' ? <ChevronUpIcon /> : <ChevronDownIcon />) : null}
                    </span>
                </div>
            </th>
        );
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                Carregando usuários...
            </div>
        );
    }

    return (
        <div className={styles.tableContainer}>
            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span className={styles.searchIcon}><SearchIcon /></span>
                    <input
                        type="text"
                        placeholder="Buscar por nome, ID, DDD..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.userCount}>
                    {sortedAndFilteredUsers.length} de {users.length} usuários
                </div>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.userTable}>
                    <thead>
                        <tr>
                            {/* Cabeçalho restaurado para a estrutura original */}
                            <SortableHeader name="telegram_id">ID Telegram</SortableHeader>
                            <SortableHeader name="first_name">Nome</SortableHeader>
                            <SortableHeader name="ddd">DDD</SortableHeader>
                            <SortableHeader name="canal_principal">Canal</SortableHeader>
                            <SortableHeader name="cargo">Cargo</SortableHeader>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredUsers.map(user => (
                            <tr key={user.telegram_id}>
                                {/* Células restauradas para a estrutura original */}
                                <td data-label="ID Telegram">{user.telegram_id}</td>
                                <td data-label="Nome">{user.first_name}</td>
                                <td data-label="DDD">{user.ddd || 'N/A'}</td>
                                <td data-label="Canal">{user.canal_principal || 'N/A'}</td>
                                <td data-label="Cargo">{user.cargo || 'N/A'}</td>
                                <td data-label="Ações">
                                    <div className={styles.actionButtons}>
                                        <button className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                                        <button
                                            onClick={() => handleDeleteUser(user.telegram_id, user.first_name)}
                                            className={`${styles.actionButton} ${styles.deleteButton}`}
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserManagementTable;