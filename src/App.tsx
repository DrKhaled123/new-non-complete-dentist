import React, { useState, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import ProfileDashboard from './components/profile/ProfileDashboard';
import DrugCalculatorPage from './components/drugs/DrugCalculatorPage';
import ProcessRecommenderPage from './components/processes/ProcessRecommenderPage';
import PatientCarePage from './components/care/PatientCarePage';
import MaterialDatabasePage from './components/materials/MaterialDatabasePage';
import CaseManagementPage from './components/cases/CaseManagementPage';
import { ToastProvider } from './components/shared/ToastContainer';
import ErrorBoundary from './components/shared/ErrorBoundary';
import './styles/index.css';

// Simple navigation state management
type CurrentPage = 'dashboard' | 'drugs' | 'processes' | 'care' | 'materials' | 'cases';

// Doctor profile interface
interface DoctorProfile {
  name: string;
  email: string;
  specialization: string;
  licenseNumber: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<CurrentPage>('dashboard'); // Back to dashboard
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  // Load doctor profile from localStorage on app start
  useEffect(() => {
    const savedProfile = localStorage.getItem('doctorProfile');
    if (savedProfile) {
      setDoctorProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as CurrentPage);
  };

  const handleProfileUpdate = (profile: DoctorProfile) => {
    setDoctorProfile(profile);
    localStorage.setItem('doctorProfile', JSON.stringify(profile));
  };

  // Render current page content
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <ProfileDashboard 
            onNavigate={handleNavigate}
            doctorProfile={doctorProfile}
            onProfileUpdate={handleProfileUpdate}
          />
        );
      case 'drugs':
        return <DrugCalculatorPage doctorProfile={doctorProfile} onNavigate={handleNavigate} />;
      case 'processes':
        return <ProcessRecommenderPage doctorProfile={doctorProfile} onNavigate={handleNavigate} />;
      case 'care':
        return <PatientCarePage doctorProfile={doctorProfile} onNavigate={handleNavigate} />;
      case 'materials':
        return <MaterialDatabasePage doctorProfile={doctorProfile} onNavigate={handleNavigate} />;
      case 'cases':
        return <CaseManagementPage doctorProfile={doctorProfile} onNavigate={handleNavigate} />;
      default:
        return (
          <ProfileDashboard 
            onNavigate={handleNavigate}
            doctorProfile={doctorProfile}
            onProfileUpdate={handleProfileUpdate}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="App">
          <MainLayout currentPage={currentPage} onNavigate={handleNavigate} doctorProfile={doctorProfile}>
            {renderCurrentPage()}
          </MainLayout>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;