import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';

import { HiEye, HiEyeOff, HiArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';
import logoHarvard from '../assets/logo-harvard.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { usuario, iniciarSesion } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (usuario) navigate('/dashboard');
  }, [usuario, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !contrasena.trim()) {
      toast.error('Ingrese usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      const data = await login(username.trim(), contrasena);
      iniciarSesion(data.token, data.usuario);
      toast.success('Bienvenido');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al iniciar sesión';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 bg-texture-heraldic p-4 pb-[30vh] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-login-gradient opacity-50"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-gold-200/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-200/15 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to landing */}
        <a
          href="/landing.html"
          className="inline-flex items-center gap-1.5 mb-4 text-sm font-medium text-primary-800/70 hover:text-primary-800 transition-colors group"
        >
          <HiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Volver al inicio
        </a>

        {/* Main Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-gold-lg border border-cream-200 overflow-hidden">
          {/* Gold accent bar */}
          <div className="h-1.5 bg-gold-gradient"></div>

          <div className="p-8">
            {/* Header with shield motif */}
            <div className="text-center mb-8">
              <img src={logoHarvard} alt="Colegio Harvard" className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-3 border-gold-400 shadow-gold-lg" />
              <h1 className="text-2xl font-bold text-primary-800 font-display tracking-tight">Colegio Harvard</h1>
              <div className="gold-line w-32 mx-auto my-3"></div>
              <p className="text-sm text-gold-600 font-medium">Sistema de Gestión Escolar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-primary-800 mb-1.5">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario"
                  className="input-field"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-800 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    className="input-field pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-gold-600 transition-colors"
                  >
                    {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-crimson-gradient text-white font-semibold rounded-lg hover:opacity-90 focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-crimson text-sm tracking-wide"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          {/* Bottom gold accent */}
          <div className="h-0.5 bg-gold-gradient opacity-40"></div>
        </div>

      </div>
    </div>
  );
};

export default Login;
