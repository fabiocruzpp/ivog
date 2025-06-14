import React from 'react';
import styles from './FilterBar.module.css';

function FilterBar({ filterOptions, selectedFilters, onFilterChange, onResetFilters }) {
    return (
        <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
                <label htmlFor="ddd-filter">DDD</label>
                <select 
                    id="ddd-filter"
                    name="ddd" 
                    value={selectedFilters.ddd} 
                    onChange={onFilterChange}
                    className={styles.filterSelect}
                >
                    <option value="">Todos</option>
                    {filterOptions.ddds?.map(ddd => <option key={ddd} value={ddd}>{ddd}</option>)}
                </select>
            </div>
            <div className={styles.filterGroup}>
                <label htmlFor="canal-filter">Canal</label>
                <select 
                    id="canal-filter"
                    name="canal_principal" 
                    value={selectedFilters.canal_principal} 
                    onChange={onFilterChange}
                    className={styles.filterSelect}
                    disabled={!selectedFilters.ddd}
                >
                    <option value="">Todos</option>
                    {filterOptions.canais?.map(canal => <option key={canal} value={canal}>{canal}</option>)}
                </select>
            </div>
            <div className={styles.filterGroup}>
                <label htmlFor="rede-filter">Rede/Parceiro</label>
                <select 
                    id="rede-filter"
                    name="rede_parceiro" 
                    value={selectedFilters.rede_parceiro} 
                    onChange={onFilterChange}
                    className={styles.filterSelect}
                    disabled={!selectedFilters.canal_principal}
                >
                    <option value="">Todas</option>
                    {filterOptions.redes?.map(rede => <option key={rede} value={rede}>{rede}</option>)}
                </select>
            </div>
            <div className={styles.filterGroup}>
                <label htmlFor="loja-filter">Loja</label>
                <select 
                    id="loja-filter"
                    name="loja_revenda" 
                    value={selectedFilters.loja_revenda} 
                    onChange={onFilterChange}
                    className={styles.filterSelect}
                    disabled={!selectedFilters.canal_principal}
                >
                    <option value="">Todas</option>
                    {filterOptions.lojas?.map(loja => <option key={loja} value={loja}>{loja}</option>)}
                </select>
            </div>
            <div className={styles.filterGroup}>
                <label htmlFor="cargo-filter">Cargo</label>
                <select 
                    id="cargo-filter"
                    name="cargo" 
                    value={selectedFilters.cargo} 
                    onChange={onFilterChange}
                    className={styles.filterSelect}
                    disabled={!selectedFilters.canal_principal}
                >
                    <option value="">Todos</option>
                    {filterOptions.cargos?.map(cargo => <option key={cargo} value={cargo}>{cargo}</option>)}
                </select>
            </div>
            <button onClick={onResetFilters} className={styles.resetButton}>
                Limpar Filtros
            </button>
        </div>
    );
}

export default FilterBar;