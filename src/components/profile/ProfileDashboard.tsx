import React, { useState, useEffect } from 'react';
import { Case } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import Modal from '../shared/Modal';
import { useToast } from '../shared/ToastContainer';

interface DoctorProfile {
  name: string;
  email: string;
  specialization: string;
  licenseNumber: string;
}

interface ProfileDashboardProps {
  onNavigate?: (page: string) => void;
  doctorProfile: DoctorProfile | null;
  onProfileUpdate: (profile: DoctorProfile) => void;
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ 
  onNavigate, 
  doctorProfile, 
  onProfileUpdate 
}) => {
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(!doctorProfile);
  const [profileForm, setProfileForm] = useState<DoctorProfile>({
    name: doctorProfile?.name || '',
    email: doctorProfile?.email || '',
    specialization: doctorProfile?.specialization || 'General Dentistry',
    licenseNumber: doctorProfile?.licenseNumber || '',
  });
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (doctorProfile) {
      loadRecentCases();
    }
  }, [doctorProfile]);

  const loadRecentCases = async () => {
    if (!doctorProfile) return;
    
    try {
      setIsLoading(true);
      // Simple localStorage-based case loading for demo
      const casesKey = `dental_cases_${doctorProfile.email}`;
      const storedCases = localStorage.getItem(casesKey);
      const caseList = storedCases ? JSON.parse(storedCases) : [];
      setRecentCases(caseList.slice(0, 5));
    } catch (err: any) {
      console.error('Failed to load cases:', err);
      showError('Failed to load recent cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileForm.name || !profileForm.email) {
      showError('Name and email are required');
      return;
    }

    onProfileUpdate(profileForm);
    setShowProfileModal(false);
    showSuccess(`Welcome, Dr. ${profileForm.name}!`);
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!doctorProfile) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Dental Dashboard</h2>
              <p className="text-gray-600">Please enter your profile information to get started</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Dr. John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="doctor@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization
                </label>
                <select
                  value={profileForm.specialization}
                  onChange={(e) => setProfileForm({...profileForm, specialization: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="General Dentistry">General Dentistry</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Oral Surgery">Oral Surgery</option>
                  <option value="Endodontics">Endodontics</option>
                  <option value="Periodontics">Periodontics</option>
                  <option value="Prosthodontics">Prosthodontics</option>
                  <option value="Pediatric Dentistry">Pediatric Dentistry</option>
                  <option value="Oral Pathology">Oral Pathology</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.licenseNumber}
                  onChange={(e) => setProfileForm({...profileForm, licenseNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="DDS123456"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
              >
                Start Using Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, Dr. {doctorProfile.name}!</h1>
              <p className="text-teal-100">
                {doctorProfile.specialization} • {doctorProfile.email}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{recentCases.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Drug Calculations</p>
                <p className="text-lg font-bold text-gray-900">Available</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Materials DB</p>
                <p className="text-lg font-bold text-gray-900">Ready</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-lg font-bold text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions and Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompactBox title="Quick Actions" defaultExpanded={true}>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate?.('drugs')}
                className="w-full flex items-center px-4 py-3 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors text-left"
              >
                <svg className="w-5 h-5 text-teal-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Calculate Drug Dosage</p>
                  <p className="text-sm text-gray-600">Get precise dosing recommendations</p>
                </div>
              </button>

              <button
                onClick={() => onNavigate?.('cases')}
                className="w-full flex items-center px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
              >
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Manage Patient Cases</p>
                  <p className="text-sm text-gray-600">Add and track patient cases</p>
                </div>
              </button>

              <button
                onClick={() => onNavigate?.('materials')}
                className="w-full flex items-center px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
              >
                <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Browse Materials</p>
                  <p className="text-sm text-gray-600">Compare dental materials</p>
                </div>
              </button>
            </div>
          </CompactBox>

          <CompactBox title="Doctor Profile" defaultExpanded={true}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">Dr. {doctorProfile.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{doctorProfile.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{doctorProfile.specialization}</p>
              </div>
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </CompactBox>
        </div>

        {/* Recent Cases */}
        <CompactBox title={`Recent Patient Cases (${recentCases.length})`} defaultExpanded={true}>
          {isLoading ? (
            <LoadingSpinner text="Loading cases..." />
          ) : recentCases.length === 0 ? (
            <div className="text-center py-8">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cases yet</h3>
              <p className="text-gray-600 mb-4">Start by adding your first patient case</p>
              <button
                onClick={() => onNavigate?.('cases')}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                Add First Case
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCases.map((case_) => (
                <div key={case_.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Patient: {case_.patientIdentifier}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Age: {case_.patientAge} • Weight: {case_.patientWeight}kg
                      </p>
                      {case_.conditions.length > 0 && (
                        <p className="text-sm text-gray-600">
                          Conditions: {case_.conditions.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(case_.createdAt)}</p>
                      <p className="text-xs text-gray-400">
                        {case_.calculatedDoses.length} dose{case_.calculatedDoses.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-center pt-4">
                <button
                  onClick={() => onNavigate?.('cases')}
                  className="text-teal-600 hover:text-teal-500 font-medium text-sm"
                >
                  View All Cases →
                </button>
              </div>
            </div>
          )}
        </CompactBox>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Clinical Decision Support</h4>
              <p className="text-sm text-blue-700 mt-1">
                This tool provides clinical decision support. Always use professional judgment and follow established clinical protocols.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Edit Doctor Profile"
        size="md"
      >
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={profileForm.email}
              onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialization
            </label>
            <select
              value={profileForm.specialization}
              onChange={(e) => setProfileForm({...profileForm, specialization: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="General Dentistry">General Dentistry</option>
              <option value="Orthodontics">Orthodontics</option>
              <option value="Oral Surgery">Oral Surgery</option>
              <option value="Endodontics">Endodontics</option>
              <option value="Periodontics">Periodontics</option>
              <option value="Prosthodontics">Prosthodontics</option>
              <option value="Pediatric Dentistry">Pediatric Dentistry</option>
              <option value="Oral Pathology">Oral Pathology</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfileDashboard;