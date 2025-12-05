import React from 'react';
import PropTypes from 'prop-types';
import './ConfirmModal.css';

/**
 * Modal di conferma riusabile per azioni critiche
 * Pattern: Modale con overlay, titolo, messaggio, pulsanti Sì/No
 *
 * @param {boolean} isOpen - Se true, il modal è visibile
 * @param {string} title - Titolo del modal
 * @param {string|React.Node} message - Messaggio (può essere testo o JSX)
 * @param {string} confirmLabel - Testo pulsante conferma
 * @param {string} cancelLabel - Testo pulsante annulla
 * @param {function} onConfirm - Callback quando utente conferma
 * @param {function} onCancel - Callback quando utente annulla
 * @param {string} variant - Variante colore: 'warning'|'danger'|'info'
 */
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Sì, Procedi',
  cancelLabel = 'Annulla',
  onConfirm,
  onCancel,
  variant = 'warning'
}) {
  if (!isOpen) return null;

  const getVariantClass = () => {
    switch (variant) {
      case 'danger':
        return 'confirm-modal-danger';
      case 'info':
        return 'confirm-modal-info';
      case 'warning':
      default:
        return 'confirm-modal-warning';
    }
  };

  // Handler per chiudere con Escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Previeni scroll della pagina sottostante
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  return (
    <div
      className="confirm-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className={`confirm-modal-content ${getVariantClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <h2 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h2>
        </div>

        <div className="confirm-modal-body">
          {/* Supporta sia testo semplice che JSX */}
          {typeof message === 'string' ? (
            <p className="confirm-modal-message">{message}</p>
          ) : (
            <div className="confirm-modal-message">{message}</div>
          )}
        </div>

        <div className="confirm-modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onCancel}
            autoFocus // Focus su Annulla per sicurezza
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="button danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node
  ]).isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['warning', 'danger', 'info'])
};

export default ConfirmModal;
