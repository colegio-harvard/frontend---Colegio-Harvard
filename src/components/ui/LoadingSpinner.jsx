const LoadingSpinner = ({ size = 'md', text = 'Cargando...' }) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`animate-spin rounded-full border-2 border-cream-300 border-t-gold-500 ${sizes[size]}`}></div>
      {text && <p className="mt-3 text-sm text-gold-600 font-medium">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
