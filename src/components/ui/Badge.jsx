const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-cream-200 text-primary-800',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-primary-700 border border-red-200',
    info: 'bg-gold-50 text-gold-700 border border-gold-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default Badge;
