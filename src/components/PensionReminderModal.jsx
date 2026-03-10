const PensionReminderModal = ({ onClose, mesLabel, alumnos = [], titulo, cuerpo }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-800/95 backdrop-blur-sm">
      <div className="text-center p-8 max-w-lg animate-slide-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gold-gradient shadow-gold-lg mb-6">
          <span className="text-white font-display font-bold text-4xl">!</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 font-display">{titulo || 'Recordatorio'}</h2>
        <div className="gold-line w-40 mx-auto mb-4"></div>
        {mesLabel && (
          <p className="text-xl text-gold-300 font-semibold mb-3">
            Mes: {mesLabel}
          </p>
        )}
        {alumnos.length > 0 && (
          <div className="mb-4 text-left bg-primary-700/50 rounded-lg p-4">
            <p className="text-sm text-primary-200 mb-2">Alumnos con pension pendiente:</p>
            <ul className="space-y-1">
              {alumnos.map((nombre, i) => (
                <li key={i} className="text-white text-sm font-medium">&bull; {nombre}</li>
              ))}
            </ul>
          </div>
        )}
        {cuerpo && (
          <p className="text-lg text-primary-100 mb-8">{cuerpo}</p>
        )}
        <button
          onClick={onClose}
          className="px-8 py-3 bg-gold-gradient text-white font-bold rounded-lg hover:opacity-90 transition-all duration-200 text-lg shadow-gold-lg"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default PensionReminderModal;
