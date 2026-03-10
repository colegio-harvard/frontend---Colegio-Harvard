import { createContext, useContext, useState, useEffect } from 'react';
import { getUsuarioGuardado, getToken, guardarSesion, cerrarSesion } from '../services/authService';
import { connectSocket, disconnectSocket } from '../services/socketService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = getToken();
    const user = getUsuarioGuardado();
    if (token && user) {
      setUsuario(user);
      connectSocket();
    }
    setCargando(false);
  }, []);

  const iniciarSesion = (token, user) => {
    guardarSesion(token, user);
    setUsuario(user);
    connectSocket();
  };

  const logout = () => {
    disconnectSocket();
    cerrarSesion();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
