import React from 'react';
import styles from './KpiCard.module.css';

function KpiCard({ title, value }) {
    return (
        <div className={styles.card}>
            <h4 className={styles.title}>{title}</h4>
            <p className={styles.value}>{value}</p>
        </div>
    );
}

export default KpiCard;