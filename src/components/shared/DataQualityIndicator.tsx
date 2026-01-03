import React from 'react';
import { SyncStatus } from '../../services/medical/medicalDataSync';

/**
 * DataQualityIndicator Component
 * 
 * Displays overall data quality score and sync status
 * Shows quality metrics for drugs, procedures, and materials
 */

interface DataQualityIndicatorProps {
  syncStatus: SyncStatus;
  showDetails?: boolean;
  className?: string;
}

const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({
  syncStatus,
  showDetails = false,
  className = ''
}) => {
  const { dataQuality, isLoading, lastSync, errors } = syncStatus;
  const { overallScore, drugs, procedures, materials } = dataQuality;

  // Determine quality level and color
  let qualityLevel = 'Excellent';
  let qualityColor = 'text-success-600 bg-success-50 border-success-200';
  let progressColor = 'bg-success-500';

  if (overallScore < 60) {
    qualityLevel = 'Poor';
    qualityColor = 'text-error-600 bg-error-50 border-error-200';
    progressColor = 'bg-error-500';
  } else if (overallScore < 80) {
    qualityLevel = 'Fair';
    qualityColor = 'text-warning-600 bg-warning-50 border-warning-200';
    progressColor = 'bg-warning-500';
  } else if (overallScore < 95) {
    qualityLevel = 'Good';
    qualityColor = 'text-accent-600 bg-accent-50 border-accent-200';
    progressColor = 'bg-accent-500';
  }

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className={`${className}`}>
      <div className={`rounded-lg border p-4 ${qualityColor}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Data Quality: {qualityLevel}</span>
          </div>
          <span className="text-2xl font-bold">{overallScore}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${overallScore}%` }}
          />
        </div>

        {/* Sync Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center">
            {isLoading ? (
              <>
                <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last sync: {formatLastSync(lastSync)}
              </>
            )}
          </span>
          {errors.length > 0 && (
            <span className="flex items-center text-error-600">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.length} sync error{errors.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Detailed Breakdown */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20 space-y-2">
            <div className="text-xs">
              <div className="flex justify-between items-center mb-1">
                <span>💊 Drugs</span>
                <span className="font-medium">{drugs.valid}/{drugs.total} valid</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${progressColor}`}
                  style={{ width: `${drugs.total > 0 ? (drugs.valid / drugs.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="text-xs">
              <div className="flex justify-between items-center mb-1">
                <span>🦷 Procedures</span>
                <span className="font-medium">{procedures.valid}/{procedures.total} valid</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${progressColor}`}
                  style={{ width: `${procedures.total > 0 ? (procedures.valid / procedures.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="text-xs">
              <div className="flex justify-between items-center mb-1">
                <span>🔬 Materials</span>
                <span className="font-medium">{materials.valid}/{materials.total} valid</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${progressColor}`}
                  style={{ width: `${materials.total > 0 ? (materials.valid / materials.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataQualityIndicator;
