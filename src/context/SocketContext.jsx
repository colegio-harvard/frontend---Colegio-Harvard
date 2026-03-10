import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket } from '../services/socketService';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { usuario } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!usuario) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const s = connectSocket();
    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err) => {
      if (err.message === 'auth_error') {
        console.warn('[Socket] Auth error, desconectando...');
        disconnectSocket();
        setSocket(null);
        setConnected(false);
      }
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    if (s.connected) setConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
    };
  }, [usuario]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocketContext debe usarse dentro de SocketProvider');
  return context;
};
