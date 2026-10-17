import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AppRecoveryBoundary from './components/AppRecoveryBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRecoveryBoundary>
      <App />
    </AppRecoveryBoundary>
  </StrictMode>,
);
