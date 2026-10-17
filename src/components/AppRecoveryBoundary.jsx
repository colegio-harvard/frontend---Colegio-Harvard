import { Component } from 'react';

const esErrorDeModuloDesactualizado = (error) => {
  const mensaje = String(error?.message || error || '');
  return /failed to fetch dynamically imported module|importing a module script failed|loading chunk|chunkloaderror/i.test(mensaje);
};

export default class AppRecoveryBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (!esErrorDeModuloDesactualizado(error)) return;

    const clave = `harvard-recuperacion-modulo:${window.location.pathname}`;
    try {
      const ultimoIntento = Number(window.sessionStorage.getItem(clave) || 0);
      if (Date.now() - ultimoIntento > 60_000) {
        window.sessionStorage.setItem(clave, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // Si el navegador bloquea sessionStorage, se mantiene la pantalla de recuperación.
    }
  }

  recargar = () => window.location.reload();

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 p-6 text-center">
        <section className="max-w-md rounded-2xl border border-cream-200 bg-white p-8 shadow-lg">
          <h1 className="font-display text-2xl font-semibold text-primary-800">Actualización disponible</h1>
          <p className="mt-3 text-primary-700/75">
            El sistema se actualizó mientras esta ventana estaba abierta. Recarga para continuar con la versión más reciente.
          </p>
          <button type="button" onClick={this.recargar} className="btn-primary mt-6">Actualizar ahora</button>
        </section>
      </main>
    );
  }
}
