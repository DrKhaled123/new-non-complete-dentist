import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  onNavigate?: (page: string) => void;
  doctorProfile?: { name: string; email: string; specialization: string; licenseNumber: string } | null;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPage, onNavigate, doctorProfile }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on route change
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [currentPage]);

  // Handle search functionality
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-primary-50/30 to-accent-50/20">
      {/* Enhanced Top Bar */}
      <header className="bg-white/95 backdrop-blur-xl shadow-medical border-b border-secondary-200/60 fixed w-full top-0 z-50 transition-all duration-300">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          {/* Left side - Logo and hamburger */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Mobile hamburger menu */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 sm:p-3 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 medical-button"
              aria-label="Toggle sidebar"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Enhanced Logo */}
            <div className="flex items-center group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-medical-gradient rounded-2xl flex items-center justify-center shadow-medical-card group-hover:shadow-medical-hover transition-all duration-300 transform group-hover:scale-105">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 sm:ml-4">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary-900 group-hover:text-primary-700 transition-colors duration-300">Dental Dashboard</h1>
                <p className="text-xs sm:text-sm text-secondary-600 hidden sm:block font-medium">Clinical Decision Support System</p>
              </div>
            </div>
          </div>

          {/* Center - Enhanced Search bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-6 lg:mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search drugs, procedures, materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-secondary-200 rounded-2xl leading-5 bg-white/80 backdrop-blur-sm placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-medical-card hover:shadow-medical-hover hover:border-secondary-300"
                />
              </div>
            </form>
          </div>

          {/* Right side - Enhanced Notifications and profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile search button */}
            <button className="md:hidden p-2 sm:p-3 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Notifications */}
            <button className="p-2 sm:p-3 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 relative group">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.07 2.82l3.12 3.12M7.05 5.84L3.93 2.72M17 8a5 5 0 10-10 0c0 1.098.5 2.073 1.262 2.728L7 13h10l-.738-2.272A4.98 4.98 0 0017 8z" />
              </svg>
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full animate-pulse-medical"></span>
              <span className="sr-only">View notifications</span>
            </button>

            {/* Enhanced Profile dropdown */}
            <div className="relative group">
              <button className="flex items-center space-x-2 sm:space-x-3 text-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 p-1 sm:p-2 hover:bg-secondary-50 transition-all duration-300">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-secondary-800 to-secondary-900 rounded-full flex items-center justify-center shadow-medical-card group-hover:shadow-medical-hover transition-all duration-300">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {doctorProfile ? doctorProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'DR'}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-secondary-700 font-semibold leading-tight">
                    {doctorProfile ? `Dr. ${doctorProfile.name}` : 'Doctor'}
                  </p>
                  <p className="text-xs text-secondary-500 font-medium">
                    {doctorProfile ? doctorProfile.specialization : 'Dentist'}
                  </p>
                </div>
                <svg className="hidden lg:block h-4 w-4 text-secondary-400 group-hover:text-secondary-600 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        doctorProfile={doctorProfile}
      />

      {/* Enhanced Main content */}
      <main className={`transition-all duration-300 ease-in-out pt-16 lg:pt-20 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-64'
      }`}>
        <div className="min-h-screen">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>

      {/* Enhanced Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;