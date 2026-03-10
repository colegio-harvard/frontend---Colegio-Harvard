const Card = ({ children, className = '', title, actions }) => {
  return (
    <div className={`bg-white rounded-xl shadow-card border border-cream-200 transition-all duration-300 hover:shadow-card-hover ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-white">
          {title && <h3 className="text-base font-semibold text-primary-800 font-display">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};

export default Card;
