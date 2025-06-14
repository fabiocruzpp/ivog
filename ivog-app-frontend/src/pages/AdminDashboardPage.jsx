import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import styles from './AdminDashboardPage.module.css';

import KpiCard from '../components/KpiCard';
import LineChart from '../components/LineChart';
import BarChart from '../components/BarChart';
import DoughnutChart from '../components/DoughnutChart';
import InfoTable from '../components/InfoTable';
import FilterBar from '../components/FilterBar';

const initialFilters = {
    ddd: '',
    canal_principal: '',
    rede_parceiro: '',
    loja_revenda: '',
    cargo: ''
};

function AdminDashboardPage() {
    const [kpis, setKpis] = useState(null);
    const [activityData, setActivityData] = useState(null);
    const [themeData, setThemeData] = useState(null);
    const [themePerformanceData, setThemePerformanceData] = useState(null);
    const [userDistributionData, setUserDistributionData] = useState(null);
    const [questionPerfData, setQuestionPerfData] = useState(null);
    const [topUsersData, setTopUsersData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [filterOptions, setFilterOptions] = useState({ ddds: [], canais: [], redes: [], lojas: [], cargos: [] });
    const [selectedFilters, setSelectedFilters] = useState(initialFilters);

    useEffect(() => {
        api.get('/admin/dashboard/filter-options')
            .then(response => {
                setFilterOptions(prev => ({ ...prev, ddds: response.data.ddds }));
            })
            .catch(error => console.error("Erro ao buscar opções de filtro:", error));
    }, []);

    useEffect(() => {
        const { ddd, canal_principal, rede_parceiro } = selectedFilters;
        if (ddd && canal_principal) {
            const params = { ddd, canal: canal_principal };
            
            if (canal_principal === 'Parceiros') {
                api.get('/options/redes-e-parceiros', { params }).then(res => {
                    setFilterOptions(prev => ({ ...prev, redes: res.data }));
                });
            } else if (canal_principal === 'Distribuição') {
                 api.get('/options/redes', { params }).then(res => {
                    setFilterOptions(prev => ({ ...prev, redes: res.data }));
                });
            } else {
                 setFilterOptions(prev => ({ ...prev, redes: [] }));
            }

            if (canal_principal === 'Loja Própria' || rede_parceiro) {
                 api.get('/options/lojas', { params: { ...params, rede: rede_parceiro } }).then(res => {
                    setFilterOptions(prev => ({ ...prev, lojas: res.data }));
                });
            } else {
                 setFilterOptions(prev => ({ ...prev, lojas: [] }));
            }

            const cargoParams = { canal: canal_principal, tipoParceiro: rede_parceiro };
            api.get('/options/cargos', { params: cargoParams }).then(res => {
                setFilterOptions(prev => ({ ...prev, cargos: res.data }));
            });
        }
    }, [selectedFilters.ddd, selectedFilters.canal_principal, selectedFilters.rede_parceiro]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = Object.fromEntries(Object.entries(selectedFilters).filter(([_, v]) => v !== ''));

            const [
                kpisRes, activityRes, themesRes, themePerfRes,
                userDistRes, questionPerfRes, topUsersRes
            ] = await Promise.all([
                api.get('/admin/dashboard/kpis', { params }),
                api.get('/admin/dashboard/activity-over-time', { params }),
                api.get('/admin/dashboard/top-themes', { params }),
                api.get('/admin/dashboard/theme-performance', { params }),
                api.get('/admin/dashboard/user-distribution-by-channel', { params }),
                api.get('/admin/dashboard/question-performance', { params }),
                api.get('/admin/dashboard/top-users-by-activity', { params }),
            ]);

            setKpis(kpisRes.data);
            setQuestionPerfData(questionPerfRes.data);
            setTopUsersData(topUsersRes.data.map(u => ({ nome: u.first_name, simulados: u.activityCount })));

            setActivityData({
                labels: activityRes.data.map(d => new Date(d.date).toLocaleDateString('pt-BR')),
                datasets: [{ label: 'Simulados por Dia', data: activityRes.data.map(d => d.count), borderColor: 'rgb(108, 48, 191)', backgroundColor: 'rgba(108, 48, 191, 0.5)', fill: true }]
            });
            setThemeData({
                labels: themesRes.data.map(t => t.tema),
                datasets: [{ label: 'Respostas por Tema', data: themesRes.data.map(t => t.count), backgroundColor: 'rgba(108, 48, 191, 0.8)' }]
            });
            setThemePerformanceData({
                labels: themePerfRes.data.map(t => t.tema),
                datasets: [{ label: 'Taxa de Acerto (%)', data: themePerfRes.data.map(t => t.successRate.toFixed(2)), backgroundColor: 'rgba(164, 131, 236, 0.8)' }]
            });
            setUserDistributionData({
                labels: userDistRes.data.map(c => c.canal_principal),
                datasets: [{ label: 'Nº de Usuários', data: userDistRes.data.map(c => c.userCount), backgroundColor: ['rgba(108, 48, 191, 0.9)', 'rgba(164, 131, 236, 0.9)', 'rgba(237, 228, 255, 0.9)'], borderColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 1 }]
            });

        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedFilters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...selectedFilters, [name]: value };

        const resetMap = {
            ddd: { canal_principal: '', rede_parceiro: '', loja_revenda: '', cargo: '' },
            canal_principal: { rede_parceiro: '', loja_revenda: '', cargo: '' },
            rede_parceiro: { loja_revenda: '', cargo: '' },
            loja_revenda: { cargo: '' }
        };

        setSelectedFilters({ ...newFilters, ...(resetMap[name] || {}) });
    };

    const handleResetFilters = () => {
        setSelectedFilters(initialFilters);
    };

    return (
        <div className={styles.dashboardContainer}>
            <FilterBar 
                filterOptions={filterOptions}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
            />

            {loading ? (
                <div className={styles.loading}>Atualizando dados...</div>
            ) : (
                <>
                    <div className={styles.kpiGrid}>
                        <KpiCard title="Total de Usuários" value={kpis?.totalUsers ?? 0} />
                        <KpiCard title="Total de Perguntas" value={kpis?.totalQuestions ?? 0} />
                        <KpiCard title="Simulados Realizados" value={kpis?.totalQuizzes ?? 0} />
                        <KpiCard title="Treinos Realizados" value={kpis?.totalTrainings ?? 0} />
                    </div>

                    <div className={styles.widgetGrid}>
                        <div className={styles.chartContainer}>
                            <h3>Atividade Recente</h3>
                            {activityData && <LineChart data={activityData} />}
                        </div>
                        <div className={styles.chartContainer}>
                            <h3>Distribuição por Canal</h3>
                            {userDistributionData && <DoughnutChart data={userDistributionData} />}
                        </div>
                        <InfoTable 
                            title="Perguntas Mais Difíceis"
                            headers={['Pergunta', '% Acerto']}
                            data={questionPerfData?.hardest.map(q => ({ pergunta: q.pergunta, taxa: `${q.successRate.toFixed(1)}%` }))}
                        />
                        <InfoTable 
                            title="Perguntas Mais Fáceis"
                            headers={['Pergunta', '% Acerto']}
                            data={questionPerfData?.easiest.map(q => ({ pergunta: q.pergunta, taxa: `${q.successRate.toFixed(1)}%` }))}
                        />
                        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
                            <h3>Desempenho por Tema</h3>
                            {themePerformanceData && <BarChart data={themePerformanceData} />}
                        </div>
                        <InfoTable 
                            title="Top 10 Usuários por Atividade"
                            headers={['Nome', 'Simulados Feitos']}
                            data={topUsersData}
                        />
                         <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
                            <h3>Temas Mais Populares</h3>
                            {themeData && <BarChart data={themeData} />}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminDashboardPage;