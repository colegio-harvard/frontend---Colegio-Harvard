import apiClient from './apiClient';

export const obtenerResumenInventario = () => apiClient.get('/inventario/resumen');
export const listarProductosInventario = () => apiClient.get('/inventario/productos');
export const crearProductoInventario = data => apiClient.post('/inventario/productos', data);
export const actualizarProductoInventario = (id, data) => apiClient.put(`/inventario/productos/${id}`, data);
export const listarMovimientosInventario = () => apiClient.get('/inventario/movimientos');
export const registrarMovimientoInventario = data => apiClient.post('/inventario/movimientos', data);
export const listarVentasInventario = () => apiClient.get('/inventario/ventas');
export const registrarVentaInventario = data => apiClient.post('/inventario/ventas', data);
export const exportarInventario = () => apiClient.get('/inventario/exportar', { responseType: 'blob' });
