import React from 'react';
import styles from './InfoTable.module.css';

function InfoTable({ title, headers, data }) {
    if (!data || data.length === 0) {
        return (
            <div className={styles.tableContainer}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.noData}>Não há dados suficientes para exibir.</p>
            </div>
        );
    }
    
    // Pega as chaves do primeiro objeto de dados para renderizar as células
    const keys = Object.keys(data[0]);

    return (
        <div className={styles.tableContainer}>
            <h3 className={styles.title}>{title}</h3>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {keys.map((key, cellIndex) => (
                                <td key={cellIndex}>{row[key]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default InfoTable;