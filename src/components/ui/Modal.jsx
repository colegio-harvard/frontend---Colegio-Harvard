import { useEffect } from 'react';
import { HiX } from 'react-icons/hi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-primary-900/30 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative bg-white rounded-xl shadow-gold-lg w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-slide-up border border-cream-200`}>
        <div className="flex items-center justify-between p-4 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-white">
          <h3 className="text-lg font-semibold text-primary-800 font-display">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-cream-400 hover:text-primary-600 rounded-lg hover:bg-cream-100 transition-colors">
            <HiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
