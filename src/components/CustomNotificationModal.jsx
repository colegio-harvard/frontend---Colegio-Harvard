import { HiBell } from 'react-icons/hi';

const CustomNotificationModal = ({ titulo, cuerpo, onAccept }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-800/95 backdrop-blur-sm">
      <div className="text-center p-8 max-w-lg animate-slide-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gold-gradient shadow-gold-lg mb-6">
          <HiBell className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 font-display">{titulo}</h2>
        <div className="gold-line w-40 mx-auto mb-4"></div>
        <p className="text-lg text-primary-100 mb-8 whitespace-pre-line">{cuerpo}</p>
        <button
          onClick={onAccept}
          className="px-8 py-3 bg-gold-gradient text-white font-bold rounded-lg hover:opacity-90 transition-all duration-200 text-lg shadow-gold-lg"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default CustomNotificationModal;
