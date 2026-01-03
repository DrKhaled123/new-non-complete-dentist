import React, { useState, useEffect } from 'react';
import { Case } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';
import { caseService } from '../../services/caseService';
import { dataExportService, ExportOptions, ExportResult } from '../../services/dataExportService';

interface DataExportServiceProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onClose?: () => void;
}

interface ExportJob {
  id: string;
  type: 'single_case' | 'multiple_cases' | 'treatment_plan' | 'analytics_report';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: ExportResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const DataExportService: React.FC<DataExportServiceProps> = ({
  doctorProfile,
  onClose
}) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includePHI: false,
    sanitizeData: true,
    includeFollowUps: true,
    includeCalculations: true
  });
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'reports' | 'history'>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (doctorProfile) {
      loadCases();
      loadExportHistory();
    }
  }, [doctorProfile]);

  const loadCases = async () => {
    try {
      setIsLoading(true);
      const casesData = await caseService.getCases();
      setCases(casesData);
    } catch (error) {
      console.error('Failed to load cases:', error);
      showError('Failed to load cases for export');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExportHistory = () => {
    // Load export history from localStorage
    const history = localStorage.getItem('dental_export_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        setExportJobs(parsed.map((job: any) => ({
          ...job,
          createdAt: new Date(job.createdAt),
          completedAt: job.completedAt ? new Date(job.completedAt) : undefined
        })));
      } catch (error) {
        console.error('Failed to parse export history:', error);
      }
    }
  };

  const saveExportHistory = (jobs: ExportJob[]) => {
    localStorage.setItem('dental_export_history', JSON.stringify(jobs));
  };

  const handleSingleCaseExport = async (caseId: string) => {
    try {
      setIsLoading(true);

      const job: ExportJob = {
        id: `export_${Date.now()}`,
        type: 'single_case',
        status: 'processing',
        progress: 0,
        createdAt: new Date()
      };

      setExportJobs(prev => [job, ...prev]);

      const result = await dataExportService.exportCase(caseId, exportOptions);
      
      if (result) {
        dataExportService.downloadExport(result);
        
        // Update job status
        const updatedJob: ExportJob = {
          ...job,
          status: 'completed',
          progress: 100,
          result,
          completedAt: new Date()
        };
        
        setExportJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
        saveExportHistory([updatedJob, ...exportJobs.filter(j => j.id !== job.id)]);
        
        showSuccess(`Case exported as ${exportOptions.format.toUpperCase()}`);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Single case export failed:', error);
      
      const failedJob: ExportJob = {
        ...exportJobs[0],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setExportJobs(prev => prev.map(j => j.id === failedJob.id ? failedJob : j));
      showError('Failed to export case');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchExport = async () => {
    if (selectedCases.length === 0) {
      showError('Please select at least one case to export');
      return;
    }

    try {
      setIsLoading(true);

      const job: ExportJob = {
        id: `batch_${Date.now()}`,
        type: 'multiple_cases',
        status: 'processing',
        progress: 0,
        createdAt: new Date()
      };

      setExportJobs(prev => [job, ...prev]);

      const result = await dataExportService.exportCases(selectedCases, exportOptions);
      
      if (result) {
        dataExportService.downloadExport(result);
        
        const updatedJob: ExportJob = {
          ...job,
          status: 'completed',
          progress: 100,
          result,
          completedAt: new Date()
        };
        
        setExportJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
        saveExportHistory([updatedJob, ...exportJobs.filter(j => j.id !== job.id)]);
        
        showSuccess(`${selectedCases.length} cases exported as ${exportOptions.format.toUpperCase()}`);
        setSelectedCases([]);
      } else {
        throw new Error('Batch export failed');
      }
    } catch (error) {
      console.error('Batch export failed:', error);
      
      const failedJob: ExportJob = {
        ...exportJobs[0],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setExportJobs(prev => prev.map(j => j.id === failedJob.id ? failedJob : j));
      showError('Failed to export cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTreatmentPlanExport = async (caseId: string) => {
    try {
      setIsLoading(true);

      const job: ExportJob = {
        id: `plan_${Date.now()}`,
        type: 'treatment_plan',
        status: 'processing',
        progress: 0,
        createdAt: new Date()
      };

      setExportJobs(prev => [job, ...prev]);

      const result = await dataExportService.exportTreatmentPlan(caseId, exportOptions);
      
      if (result) {
        dataExportService.downloadExport(result);
        
        const updatedJob: ExportJob = {
          ...job,
          status: 'completed',
          progress: 100,
          result,
          completedAt: new Date()
        };
        
        setExportJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
        saveExportHistory([updatedJob, ...exportJobs.filter(j => j.id !== job.id)]);
        
        showSuccess('Treatment plan exported successfully');
      } else {
        throw new Error('Treatment plan export failed');
      }
    } catch (error) {
      console.error('Treatment plan export failed:', error);
      
      const failedJob: ExportJob = {
        ...exportJobs[0],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setExportJobs(prev => prev.map(j => j.id === failedJob.id ? failedJob : j));
      showError('Failed to export treatment plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyticsReportExport = async () => {
    try {
      setIsLoading(true);

      const job: ExportJob = {
        id: `analytics_${Date.now()}`,
        type: 'analytics_report',
        status: 'processing',
        progress: 0,
        createdAt: new Date()
      };

      setExportJobs(prev => [job, ...prev]);

      // Generate analytics data
      const analyticsData = await generateAnalyticsData();
      
      const result = await dataExportService.exportCases(
        cases.map(c => c.id),
        {
          ...exportOptions,
          format: 'json'
        }
      );
      
      if (result) {
        // Create analytics report
        const analyticsResult: ExportResult = {
          data: JSON.stringify({
            ...analyticsData,
            cases: result.data,
            generatedAt: new Date().toISOString(),
            generatedBy: doctorProfile?.name
          }, null, 2),
          filename: `analytics_report_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json',
          size: 0
        };

        dataExportService.downloadExport(analyticsResult);
        
        const updatedJob: ExportJob = {
          ...job,
          status: 'completed',
          progress: 100,
          result: analyticsResult,
          completedAt: new Date()
        };
        
        setExportJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
        saveExportHistory([updatedJob, ...exportJobs.filter(j => j.id !== job.id)]);
        
        showSuccess('Analytics report exported successfully');
      } else {
        throw new Error('Analytics report export failed');
      }
    } catch (error) {
      console.error('Analytics report export failed:', error);
      
      const failedJob: ExportJob = {
        ...exportJobs[0],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setExportJobs(prev => prev.map(j => j.id === failedJob.id ? failedJob : j));
      showError('Failed to export analytics report');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalyticsData = async () => {
    const totalCases = cases.length;
    const casesThisMonth = cases.filter(c => {
      const caseDate = new Date(c.createdAt);
      const now = new Date();
      return caseDate.getMonth() === now.getMonth() && caseDate.getFullYear() === now.getFullYear();
    }).length;

    const commonConditions: Record<string, number> = {};
    cases.forEach(case_ => {
      case_.conditions.forEach(condition => {
        commonConditions[condition] = (commonConditions[condition] || 0) + 1;
      });
    });

    return {
      summary: {
        totalCases,
        casesThisMonth,
        averageAge: cases.reduce((sum, c) => sum + c.patientAge, 0) / totalCases || 0,
        totalTreatments: cases.reduce((sum, c) => sum + c.selectedTreatments.length, 0),
        totalFollowUps: cases.reduce((sum, c) => sum + c.followUpNotes.length, 0)
      },
      topConditions: Object.entries(commonConditions)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([condition, count]) => ({ condition, count })),
      exportMetadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: doctorProfile?.name,
        version: '1.0'
      }
    };
  };

  const previewExport = async (caseId?: string) => {
    try {
      setIsLoading(true);
      
      const selectedCaseId = caseId || selectedCases[0];
      if (!selectedCaseId) {
        showError('No case selected for preview');
        return;
      }

      const result = await dataExportService.exportCase(selectedCaseId, {
        ...exportOptions,
        format: 'json'
      });

      if (result) {
        const preview = JSON.parse(result.data);
        setPreviewData(preview);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview failed:', error);
      showError('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Data Export Service</h2>
            <p className="text-green-100">
              Export cases, treatment plans, and analytics reports in multiple formats
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Export Options */}
      <CompactBox title="Export Options" defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="pdf">PDF Report</option>
              <option value="csv">CSV Data</option>
              <option value="json">JSON Data</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includePHI"
              checked={exportOptions.includePHI}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includePHI: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="includePHI" className="text-sm text-gray-700">
              Include PHI (Not Recommended)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="sanitizeData"
              checked={exportOptions.sanitizeData}
              onChange={(e) => setExportOptions(prev => ({ ...prev, sanitizeData: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="sanitizeData" className="text-sm text-gray-700">
              Sanitize Sensitive Data
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeFollowUps"
              checked={exportOptions.includeFollowUps}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeFollowUps: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="includeFollowUps" className="text-sm text-gray-700">
              Include Follow-ups
            </label>
          </div>
        </div>
      </CompactBox>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'single', label: 'Single Case', icon: '📄' },
            { id: 'batch', label: 'Batch Export', icon: '📚' },
            { id: 'reports', label: 'Reports', icon: '📊' },
            { id: 'history', label: 'History', icon: '🕒' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
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
        {activeTab === 'single' && (
          <CompactBox title="Single Case Export" defaultExpanded={true}>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSingleCaseExport(e.target.value);
                    }
                  }}
                >
                  <option value="">Select a case to export...</option>
                  {cases.map(case_ => (
                    <option key={case_.id} value={case_.id}>
                      {case_.patientIdentifier} - {new Date(case_.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => previewExport()}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Preview
                </button>
              </div>
              
              {cases.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cases.map(case_ => (
                    <div key={case_.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{case_.patientIdentifier}</div>
                        <div className="text-sm text-gray-600">
                          {case_.selectedTreatments.length} treatments • Created {formatDate(new Date(case_.createdAt))}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => previewExport(case_.id)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleSingleCaseExport(case_.id)}
                          disabled={isLoading}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Export
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CompactBox>
        )}

        {activeTab === 'batch' && (
          <CompactBox title="Batch Case Export" defaultExpanded={true}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Select cases to export ({selectedCases.length} selected)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedCases(cases.map(c => c.id))}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedCases([])}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cases.map(case_ => (
                  <label key={case_.id} className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(case_.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCases(prev => [...prev, case_.id]);
                        } else {
                          setSelectedCases(prev => prev.filter(id => id !== case_.id));
                        }
                      }}
                      className="mr-3 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{case_.patientIdentifier}</div>
                      <div className="text-sm text-gray-600">
                        {case_.selectedTreatments.length} treatments • Created {formatDate(new Date(case_.createdAt))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => previewExport()}
                  disabled={selectedCases.length === 0 || isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Preview Selection
                </button>
                <button
                  onClick={handleBatchExport}
                  disabled={selectedCases.length === 0 || isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Export {selectedCases.length} Cases
                </button>
              </div>
            </div>
          </CompactBox>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <CompactBox title="Treatment Plan Export" defaultExpanded={true}>
              <div className="space-y-4">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleTreatmentPlanExport(e.target.value);
                    }
                  }}
                >
                  <option value="">Select a case to export treatment plan...</option>
                  {cases.map(case_ => (
                    <option key={case_.id} value={case_.id}>
                      {case_.patientIdentifier} - {case_.selectedTreatments.length} treatments
                    </option>
                  ))}
                </select>
              </div>
            </CompactBox>

            <CompactBox title="Analytics Report" defaultExpanded={true}>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Export comprehensive analytics including case statistics, treatment outcomes, and performance metrics.
                </p>
                <button
                  onClick={handleAnalyticsReportExport}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Generating Report...' : 'Generate Analytics Report'}
                </button>
              </div>
            </CompactBox>
          </div>
        )}

        {activeTab === 'history' && (
          <CompactBox title="Export History" defaultExpanded={true}>
            <div className="space-y-3">
              {exportJobs.length > 0 ? (
                exportJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {job.type.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Started: {formatDate(job.createdAt)}
                        {job.completedAt && ` • Completed: ${formatDate(job.completedAt)}`}
                      </div>
                      {job.result && (
                        <div className="text-xs text-gray-500 mt-1">
                          {job.result.filename} ({formatFileSize(job.result.size)})
                        </div>
                      )}
                      {job.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {job.error}
                        </div>
                      )}
                    </div>
                    {job.result && job.status === 'completed' && (
                      <button
                        onClick={() => dataExportService.downloadExport(job.result!)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Download
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No export history available
                </div>
              )}
            </div>
          </CompactBox>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Export Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExportService;