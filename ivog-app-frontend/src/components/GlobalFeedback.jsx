import React from 'react';
import { useFeedbackStore } from '../store/feedbackStore';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './GlobalFeedback.module.css';

const Spinner = () => (
  <div className={styles.spinnerOverlay}>
    <div className={styles.spinner}></div>
  </div>
);

const Toast = ({ toast }) => {
  const { removeToast } = useFeedbackStore();

  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.type]}`}
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      layout
    >
      <div className={styles.toastMessage}>{toast.message}</div>
      <button onClick={() => removeToast(toast.id)} className={styles.closeButton}>×</button>
    </motion.div>
  );
};

function GlobalFeedback() {
  const { isLoading, toasts } = useFeedbackStore();

  return (
    <>
      {/* Renderiza o Spinner global se isLoading for true */}
      <AnimatePresence>
        {isLoading && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Spinner />
           </motion.div>
        )}
      </AnimatePresence>

      {/* Renderiza o container de Toasts */}
      <div className={styles.toastContainer}>
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

export default GlobalFeedback;