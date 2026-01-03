import React, { useState, useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  onNavigate?: (page: string) => void;
  doctorProfile?: { name: string; email: string; specialization: string; licenseNumber: string } | null;
}

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentPage, onNavigate, doctorProfile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Overview and recent cases',
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'drugs',
      name: 'Drug Calculator',
      description: 'Calculate dosages and check interactions',
      badge: 'Enhanced',
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      id: 'processes',
      name: 'Process Recommender',
      description: 'Clinical protocols and procedures',
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      id: 'care',
      name: 'Patient Care',
      description: 'Care instructions and nutrition',
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      id: 'materials',
      name: 'Material Database',
      description: 'Dental materials and comparisons',
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'cases',
      name: 'Case Management',
      description: 'Patient cases and follow-ups',
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
  ];

  const handleItemClick = (itemId: string) => {
    if (onNavigate) {
      onNavigate(itemId);
    }
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Enhanced Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-xl shadow-medical-elevated transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0 border-r border-secondary-200/60 ${
        isCollapsed ? 'lg:w-20' : 'lg:w-64'
      }`}>
        
        {/* Enhanced Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-secondary-200/60 lg:hidden">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-medical-gradient rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="ml-3 text-lg font-bold text-secondary-900">Menu</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <div className="hidden lg:flex items-center justify-end p-4 border-b border-secondary-200/60">
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Enhanced Navigation */}
        <nav className="mt-4 lg:mt-8 px-3 sm:px-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full group flex items-center px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium rounded-2xl transition-all duration-300 transform hover:scale-[1.02] ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 shadow-medical-card border-l-4 border-primary-500'
                        : 'text-secondary-700 hover:bg-gradient-to-r hover:from-secondary-50 hover:to-primary-50 hover:text-secondary-900 hover:shadow-medical-card'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className={`flex-shrink-0 transition-colors duration-300 ${
                      isActive ? 'text-primary-600' : 'text-secondary-500 group-hover:text-primary-600'
                    }`}>
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <div className="ml-3 sm:ml-4 text-left flex-1">
                        <div className="font-semibold flex items-center justify-between">
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="px-2 py-1 text-xs font-medium bg-accent-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs transition-colors duration-300 mt-0.5 ${
                          isActive ? 'text-primary-600' : 'text-secondary-500 group-hover:text-secondary-600'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                    )}
                  </button>
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 px-3 py-2 bg-secondary-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-nowrap">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-secondary-300">{item.description}</div>
                      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-secondary-900 rotate-45"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhanced Bottom section */}
          <div className="mt-8 lg:mt-12 pt-6 border-t border-secondary-200/60 space-y-4">
            {/* Medical info card */}
            <div className={`bg-gradient-to-br from-primary-50 via-accent-50 to-primary-100 rounded-2xl p-4 sm:p-5 shadow-medical-card border border-primary-200/50 ${isCollapsed ? 'px-3' : ''}`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {!isCollapsed && (
                  <div className="ml-3 sm:ml-4">
                    <p className="text-sm font-bold text-secondary-900">Clinical Decision Support</p>
                    <p className="text-xs text-secondary-700 mt-0.5 opacity-90">Always use professional judgment</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Doctor Info */}
            {doctorProfile && (
              <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-medical-card border border-secondary-200/50 ${isCollapsed ? 'px-3' : ''}`}>
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-medical-card">
                    <span className="text-white font-bold text-xs sm:text-sm">
                      {doctorProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                      <p className="text-sm font-bold text-secondary-900 truncate">Dr. {doctorProfile.name}</p>
                      <p className="text-xs text-secondary-600 truncate">{doctorProfile.specialization}</p>
                      <p className="text-xs text-secondary-500 mt-0.5 truncate">License: {doctorProfile.licenseNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;