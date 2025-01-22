import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardComponent from './components/Dashboard';
import FieldManagement from './pages/FieldManagement';
import Analytics from './pages/Analytics';
import Irrigation from './pages/Irrigation';
import SettingsComponent from './pages/Settings';
import ZoneManagement from './components/ZoneManagement/index';
import theme from './theme';

function App() {
  const [serverStatus, setServerStatus] = useState(false);
  const [arduinoStatus, setArduinoStatus] = useState(false);
  const [currentPage, setCurrentPage] = useState('Dashboard');

  React.useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error('Server responded with error');
        }
        const data = await response.json();
        setServerStatus(data.connected);
        setArduinoStatus(data.arduinoConnected);
      } catch (error) {
        console.error('Failed to check server status:', error);
        setServerStatus(false);
        setArduinoStatus(false);
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <DashboardComponent />;
      case 'Zones':
        return <ZoneManagement />;
      case 'Irrigation':
        return <Irrigation />;
      case 'Analytics':
        return <Analytics />;
      case 'Settings':
        return <SettingsComponent />;
      default:
        return <DashboardComponent />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <DashboardLayout 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        serverStatus={serverStatus}
        arduinoStatus={arduinoStatus}
      >
        {renderPage()}
      </DashboardLayout>
    </ThemeProvider>
  );
}

export default App;
