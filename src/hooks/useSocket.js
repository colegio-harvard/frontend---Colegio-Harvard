import { useEffect, useRef } from 'react';
import { useSocketContext } from '../context/SocketContext';

export const useSocket = (evento, callback) => {
  const { socket } = useSocketContext();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!socket || !evento) return;

    const handler = (...args) => callbackRef.current(...args);
    socket.on(evento, handler);

    return () => socket.off(evento, handler);
  }, [socket, evento]);
};
