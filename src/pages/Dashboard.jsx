import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import DashboardAdmin from './dashboards/DashboardAdmin';
import DashboardTutor from './dashboards/DashboardTutor';
import DashboardPadre from './dashboards/DashboardPadre';
import DashboardPorteria from './dashboards/DashboardPorteria';
import DashboardPsicologia from './dashboards/DashboardPsicologia';

const Dashboard = () => {
  const { usuario } = useAuth();

  const renderDashboard = () => {
    switch (usuario?.rol_codigo) {
      case ROLES.SUPER_ADMIN:
      case ROLES.ADMIN:
        return <DashboardAdmin />;
      case ROLES.TUTOR:
        return <DashboardTutor />;
      case ROLES.PADRE:
        return <DashboardPadre />;
      case ROLES.PORTERIA:
        return <DashboardPorteria />;
      case ROLES.PSICOLOGIA:
        return <DashboardPsicologia />;
      default:
        return <p>Rol no reconocido</p>;
    }
  };

  return renderDashboard();
};

export default Dashboard;
