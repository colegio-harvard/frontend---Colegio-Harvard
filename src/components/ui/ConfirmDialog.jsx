import Modal from './Modal';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', variant = 'danger' }) => {
  const buttonVariants = {
    danger: 'bg-primary-600 hover:bg-primary-700 shadow-crimson',
    warning: 'bg-amber-600 hover:bg-amber-700',
    primary: 'bg-gold-gradient hover:opacity-90 shadow-gold',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-primary-800/70 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-primary-800/60 bg-cream-100 rounded-lg hover:bg-cream-200 transition-colors">
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 ${buttonVariants[variant]}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
