import React, { useState, useEffect } from 'react';
import { Case } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';
import { caseService } from '../../services/caseService';
import { followUpSystem } from '../../services/followUpSystem';
import { dataExportService } from '../../services/dataExportService';

interface CaseAnalyticsProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onNavigate?: (page: string, data?: any) => void;
}

interface AnalyticsData {
  totalCases: number;
  casesThisMonth: number;
  casesThisWeek: number;
  averageAge: number;
  commonConditions: { condition: string; count: number }[];
  caseTypes: { type: string; count: number }[];
  treatmentSuccess: {
    procedure: string;
    total: number;
    successful: number;
    successRate: number;
  }[];
  monthlyTrends: {
    month: string;
    cases: number;
    treatments: number;
    followUps: number;
  }[];
  patientDemographics: {
    ageGroups: { group: string; count: number }[];
    conditions: { condition: string; count: number }[];
    allergies: { allergy: string; count: number }[];
  };
  followUpMetrics: {
    totalScheduled: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  productivityMetrics: {
    casesPerWeek: number;
    treatmentsPerCase: number;
    avgCaseDuration: number;
    prescriptionRate: number;
  };
}

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  caseTypes: string[];
  conditions: string[];
  ageGroups: string[];
}

const CaseAnalytics: React.FC<CaseAnalyticsProps> = ({
  doctorProfile,
  onNavigate
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'treatments' | 'demographics' | 'trends' | 'productivity'>('overview');
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    caseTypes: [],
    conditions: [],
    ageGroups: []
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('pdf');
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (doctorProfile) {
      loadAnalyticsData();
    }
  }, [doctorProfile, filters]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Load cases with filters
      const allCases = await caseService.getCases();
      const filteredCases = applyFilters(allCases);
      setCases(filteredCases);

      // Calculate analytics
      const analyticsData = await calculateAnalytics(filteredCases);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      showError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (cases: Case[]): Case[] => {
    return cases.filter(case_ => {
      // Date range filter
      const caseDate = new Date(case_.createdAt);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      if (caseDate < startDate || caseDate > endDate) {
        return false;
      }

      // Additional filters can be implemented here
      return true;
    });
  };

  const calculateAnalytics = async (cases: Case[]): Promise<AnalyticsData> => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Basic metrics
    const totalCases = cases.length;
    const casesThisMonth = cases.filter(c => new Date(c.createdAt) >= thisMonth).length;
    const casesThisWeek = cases.filter(c => new Date(c.createdAt) >= thisWeek).length;
    
    const totalAge = cases.reduce((sum, c) => sum + c.patientAge, 0);
    const averageAge = totalCases > 0 ? Math.round(totalAge / totalCases) : 0;

    // Common conditions
    const conditionCounts: Record<string, number> = {};
    cases.forEach(case_ => {
      case_.conditions.forEach(condition => {
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
      });
    });
    const commonConditions = Object.entries(conditionCounts)
      .map(([condition, count]) => ({ condition, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Case types (derived from treatments)
    const caseTypeCounts: Record<string, number> = {};
    cases.forEach(case_ => {
      case_.selectedTreatments.forEach(treatment => {
        const type = treatment.details?.caseType || 'routine';
        caseTypeCounts[type] = (caseTypeCounts[type] || 0) + 1;
      });
    });
    const caseTypes = Object.entries(caseTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Treatment success rates
    const treatmentSuccess = await calculateTreatmentSuccess(cases);

    // Monthly trends
    const monthlyTrends = calculateMonthlyTrends(cases);

    // Patient demographics
    const patientDemographics = calculateDemographics(cases);

    // Follow-up metrics
    const followUpMetrics = await calculateFollowUpMetrics(cases);

    // Productivity metrics
    const productivityMetrics = calculateProductivityMetrics(cases);

    return {
      totalCases,
      casesThisMonth,
      casesThisWeek,
      averageAge,
      commonConditions,
      caseTypes,
      treatmentSuccess,
      monthlyTrends,
      patientDemographics,
      followUpMetrics,
      productivityMetrics
    };
  };

  const calculateTreatmentSuccess = async (cases: Case[]) => {
    // This would need actual treatment outcome tracking
    // For now, we'll simulate success rates based on completed follow-ups
    const treatmentStats: Record<string, { total: number; successful: number }> = {};

    cases.forEach(case_ => {
      case_.selectedTreatments.forEach(treatment => {
        const procedure = treatment.name;
        if (!treatmentStats[procedure]) {
          treatmentStats[procedure] = { total: 0, successful: 0 };
        }
        treatmentStats[procedure].total++;
        // Simulate success based on follow-up completion
        const hasFollowUp = case_.followUpNotes.length > 0;
        if (hasFollowUp) {
          treatmentStats[procedure].successful++;
        }
      });
    });

    return Object.entries(treatmentStats).map(([procedure, stats]) => ({
      procedure,
      total: stats.total,
      successful: stats.successful,
      successRate: stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0
    })).sort((a, b) => b.successRate - a.successRate);
  };

  const calculateMonthlyTrends = (cases: Case[]) => {
    const trends: Record<string, { cases: number; treatments: number; followUps: number }> = {};

    cases.forEach(case_ => {
      const month = new Date(case_.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!trends[month]) {
        trends[month] = { cases: 0, treatments: 0, followUps: 0 };
      }
      trends[month].cases++;
      trends[month].treatments += case_.selectedTreatments.length;
      trends[month].followUps += case_.followUpNotes.length;
    });

    return Object.entries(trends)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  };

  const calculateDemographics = (cases: Case[]) => {
    const ageGroups: Record<string, number> = {};
    const conditionCounts: Record<string, number> = {};
    const allergyCounts: Record<string, number> = {};

    cases.forEach(case_ => {
      // Age groups
      const ageGroup = case_.patientAge < 18 ? 'Pediatric (0-17)' :
                      case_.patientAge < 65 ? 'Adult (18-64)' : 'Senior (65+)';
      ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;

      // Conditions
      case_.conditions.forEach(condition => {
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
      });

      // Allergies
      case_.allergies.forEach(allergy => {
        allergyCounts[allergy] = (allergyCounts[allergy] || 0) + 1;
      });
    });

    return {
      ageGroups: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
      conditions: Object.entries(conditionCounts).map(([condition, count]) => ({ condition, count })),
      allergies: Object.entries(allergyCounts).map(([allergy, count]) => ({ allergy, count }))
    };
  };

  const calculateFollowUpMetrics = async (cases: Case[]) => {
    let totalScheduled = 0;
    let completed = 0;
    let overdue = 0;

    for (const case_ of cases) {
      const followUps = await followUpSystem.getFollowUpsForCase(case_.id);
      totalScheduled += followUps.length;
      completed += followUps.filter(f => f.status === 'completed').length;
      overdue += followUps.filter(f => f.status === 'pending' && f.scheduledDate < new Date()).length;
    }

    return {
      totalScheduled,
      completed,
      overdue,
      completionRate: totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0
    };
  };

  const calculateProductivityMetrics = (cases: Case[]) => {
    const totalTreatments = cases.reduce((sum, c) => sum + c.selectedTreatments.length, 0);
    const totalPrescriptions = cases.reduce((sum, c) => sum + c.calculatedDoses.length, 0);
    const totalDuration = cases.reduce((sum, c) => {
      const duration = (new Date().getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + duration;
    }, 0);

    return {
      casesPerWeek: cases.length / 4, // Approximate
      treatmentsPerCase: cases.length > 0 ? totalTreatments / cases.length : 0,
      avgCaseDuration: cases.length > 0 ? totalDuration / cases.length : 0,
      prescriptionRate: cases.length > 0 ? (totalPrescriptions / cases.length) * 100 : 0
    };
  };

  const handleExport = async () => {
    try {
      const exportData = {
        analytics,
        cases,
        filters,
        generatedAt: new Date().toISOString(),
        generatedBy: doctorProfile?.name
      };

      const exportResult = await dataExportService.exportCases(
        cases.map(c => c.id),
        {
          format: exportFormat,
          includePHI: false,
          sanitizeData: true,
          includeFollowUps: true,
          includeCalculations: true
        }
      );

      if (exportResult) {
        dataExportService.downloadExport(exportResult);
        showSuccess(`Analytics exported as ${exportFormat.toUpperCase()}`);
        setShowExportModal(false);
      } else {
        showError('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      showError('Export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner text="Loading analytics..." />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Case Analytics & Reporting</h2>
            <p className="text-indigo-100">
              Treatment outcomes, success rates, and performance metrics
            </p>
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
          >
            📊 Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <CompactBox title="Analytics Filters" defaultExpanded={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadAnalyticsData}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </CompactBox>

      {/* Key Metrics */}
      <CompactBox title="Key Performance Indicators" defaultExpanded={true}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{analytics.totalCases}</div>
            <div className="text-sm text-blue-800">Total Cases</div>
            <div className="text-xs text-blue-600 mt-1">
              {analytics.casesThisMonth} this month
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {analytics.followUpMetrics.completionRate}%
            </div>
            <div className="text-sm text-green-800">Follow-up Rate</div>
            <div className="text-xs text-green-600 mt-1">
              {analytics.followUpMetrics.completed}/{analytics.followUpMetrics.totalScheduled} completed
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {Math.round(analytics.productivityMetrics.treatmentsPerCase * 10) / 10}
            </div>
            <div className="text-sm text-purple-800">Avg Treatments</div>
            <div className="text-xs text-purple-600 mt-1">per case</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">{analytics.averageAge}</div>
            <div className="text-sm text-yellow-800">Avg Patient Age</div>
            <div className="text-xs text-yellow-600 mt-1">years</div>
          </div>
        </div>
      </CompactBox>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'treatments', label: 'Treatment Success', icon: '🎯' },
            { id: 'demographics', label: 'Demographics', icon: '👥' },
            { id: 'trends', label: 'Trends', icon: '📈' },
            { id: 'productivity', label: 'Productivity', icon: '⚡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CompactBox title="Most Common Conditions" defaultExpanded={true}>
              <div className="space-y-2">
                {analytics.commonConditions.slice(0, 8).map((condition, index) => (
                  <div key={condition.condition} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{condition.condition}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${(condition.count / analytics.totalCases) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {condition.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CompactBox>

            <CompactBox title="Case Types Distribution" defaultExpanded={true}>
              <div className="space-y-2">
                {analytics.caseTypes.map((type, index) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{type.type}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(type.count / analytics.totalCases) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {type.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CompactBox>
          </div>
        )}

        {activeTab === 'treatments' && (
          <CompactBox title="Treatment Success Rates" defaultExpanded={true}>
            <div className="space-y-4">
              {analytics.treatmentSuccess.map((treatment, index) => (
                <div key={treatment.procedure} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{treatment.procedure}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {treatment.successful}/{treatment.total}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        treatment.successRate >= 80 ? 'bg-green-100 text-green-800' :
                        treatment.successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {treatment.successRate}% success
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        treatment.successRate >= 80 ? 'bg-green-500' :
                        treatment.successRate >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${treatment.successRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CompactBox>
        )}

        {activeTab === 'demographics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CompactBox title="Age Groups" defaultExpanded={true}>
              <div className="space-y-2">
                {analytics.patientDemographics.ageGroups.map((group, index) => (
                  <div key={group.group} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{group.group}</span>
                    <span className="text-sm font-medium text-gray-900">{group.count}</span>
                  </div>
                ))}
              </div>
            </CompactBox>

            <CompactBox title="Top Conditions" defaultExpanded={true}>
              <div className="space-y-2">
                {analytics.patientDemographics.conditions.slice(0, 8).map((condition, index) => (
                  <div key={condition.condition} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{condition.condition}</span>
                    <span className="text-sm font-medium text-gray-900">{condition.count}</span>
                  </div>
                ))}
              </div>
            </CompactBox>

            <CompactBox title="Common Allergies" defaultExpanded={true}>
              <div className="space-y-2">
                {analytics.patientDemographics.allergies.slice(0, 8).map((allergy, index) => (
                  <div key={allergy.allergy} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{allergy.allergy}</span>
                    <span className="text-sm font-medium text-gray-900">{allergy.count}</span>
                  </div>
                ))}
              </div>
            </CompactBox>
          </div>
        )}

        {activeTab === 'trends' && (
          <CompactBox title="Monthly Trends" defaultExpanded={true}>
            <div className="space-y-4">
              {analytics.monthlyTrends.map((trend, index) => (
                <div key={trend.month} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{trend.month}</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Cases:</span>
                      <span className="font-medium text-gray-900 ml-2">{trend.cases}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Treatments:</span>
                      <span className="font-medium text-gray-900 ml-2">{trend.treatments}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Follow-ups:</span>
                      <span className="font-medium text-gray-900 ml-2">{trend.followUps}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CompactBox>
        )}

        {activeTab === 'productivity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CompactBox title="Productivity Metrics" defaultExpanded={true}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Cases per Week</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {Math.round(analytics.productivityMetrics.casesPerWeek * 10) / 10}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Treatments per Case</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {Math.round(analytics.productivityMetrics.treatmentsPerCase * 10) / 10}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Avg Case Duration</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {Math.round(analytics.productivityMetrics.avgCaseDuration)} days
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Prescription Rate</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {Math.round(analytics.productivityMetrics.prescriptionRate)}%
                  </span>
                </div>
              </div>
            </CompactBox>

            <CompactBox title="Follow-up Performance" defaultExpanded={true}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Total Scheduled</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.followUpMetrics.totalScheduled}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Completed</span>
                  <span className="text-lg font-semibold text-green-600">
                    {analytics.followUpMetrics.completed}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Overdue</span>
                  <span className="text-lg font-semibold text-red-600">
                    {analytics.followUpMetrics.overdue}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${analytics.followUpMetrics.completionRate}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  {analytics.followUpMetrics.completionRate}% completion rate
                </div>
              </div>
            </CompactBox>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Analytics Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'pdf')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pdf">PDF Report</option>
                  <option value="csv">CSV Data</option>
                  <option value="json">JSON Data</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                This export will include analytics data and filtered case information.
                Sensitive patient information will be anonymized.
              </div>
            </div>
            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseAnalytics;