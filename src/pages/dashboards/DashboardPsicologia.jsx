import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { HiSpeakerphone } from 'react-icons/hi';
import { listarComunicados } from '../../services/comunicadosService';

const DashboardPsicologia = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [stats, setStats] = useState({ total: 0, noLeidos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await listarComunicados();
        const comunicados = res.data.data || [];
        setStats({
          total: comunicados.length,
          noLeidos: comunicados.filter(c => !c.leido).length,
        });
      } catch { /* silenciar */ }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">
        Bienvenido/a, {usuario?.nombres?.split(' ')[0]}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/comunicados')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <HiSpeakerphone className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-800">{stats.total}</p>
              <p className="text-sm text-primary-800/60">Comunicados</p>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/comunicados')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <HiSpeakerphone className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.noLeidos}</p>
              <p className="text-sm text-primary-800/60">Sin leer</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPsicologia;
