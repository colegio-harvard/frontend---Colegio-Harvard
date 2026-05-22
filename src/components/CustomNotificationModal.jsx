import { HiBell } from 'react-icons/hi';

const CustomNotificationModal = ({ titulo, cuerpo, imagenUrl, onAccept }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-800/95 backdrop-blur-sm p-4">
      <div className={`w-full animate-slide-up ${imagenUrl ? 'max-w-5xl' : 'max-w-lg text-center'}`}>
        {imagenUrl ? (
          <div className="overflow-hidden rounded-2xl bg-white shadow-gold-lg">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
              <div className="flex flex-col justify-between bg-primary-800 p-6 text-white">
                <div>
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gold-gradient shadow-gold">
                    <HiBell className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-3xl font-bold leading-tight">{titulo}</h2>
                  <div className="gold-line-left my-4 w-24"></div>
                  <p className="whitespace-pre-line text-base leading-relaxed text-primary-100">{cuerpo}</p>
                </div>
                <button
                  onClick={onAccept}
                  className="mt-6 w-full rounded-lg bg-gold-gradient px-6 py-3 text-base font-bold text-white shadow-gold transition-opacity hover:opacity-90"
                >
                  Entendido
                </button>
              </div>
              <div className="bg-cream-50 p-3">
                <img src={imagenUrl} alt={titulo} className="h-[70vh] max-h-[760px] w-full rounded-xl object-contain bg-white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
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
        )}
      </div>
    </div>
  );
};

export default CustomNotificationModal;