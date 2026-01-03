# Medical Content Verification Integration Guide

## Quick Start

This guide shows you how to integrate medical content verification into your components.

## Step 1: Import the Hooks

```typescript
import { useMedicalContent } from '../hooks/useMedicalContent';
import { useContentVerification } from '../hooks/useContentVerification';
```

## Step 2: Use the Hooks in Your Component

```typescript
const MyComponent = () => {
  // Get medical data with automatic caching and sync
  const {
    drugs,
    procedures,
    materials,
    isLoading,
    syncStatus,
    dataQualityScore,
    refreshData
  } = useMedicalContent();

  // Get verification functions
  const {
    validateDrug,
    validateProcedure,
    validateMaterial,
    validatePatient,
    validateDrugPatient,
    criticalAlerts,
    hasCriticalAlerts
  } = useContentVerification();

  // Your component logic...
};
```

## Step 3: Add Verification UI Components

```typescript
import VerificationBadge from '../components/shared/VerificationBadge';
import DataQualityIndicator from '../components/shared/DataQualityIndicator';

// In your JSX:
<DataQualityIndicator syncStatus={syncStatus} showDetails={true} />

<VerificationBadge validation={drugValidation} showDetails={true} />
```

## Complete Example: Drug Selection with Verification

```typescript
import React, { useState, useEffect } from 'react';
import { Drug, PatientParameters } from '../types';
import { useMedicalContent } from '../hooks/useMedicalContent';
import { useContentVerification } from '../hooks/useContentVerification';
import VerificationBadge from '../components/shared/VerificationBadge';
import DataQualityIndicator from '../components/shared/DataQualityIndicator';

const DrugSelector = () => {
  const { drugs, isLoading, syncStatus } = useMedicalContent();
  const { validateDrug, validateDrugPatient, hasCriticalAlerts } = useContentVerification();
  
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [drugValidation, setDrugValidation] = useState(null);
  const [patient, setPatient] = useState<PatientParameters>({
    age: 30,
    weight: 70,
    conditions: [],
    allergies: []
  });

  // Validate drug when selected
  useEffect(() => {
    if (selectedDrug) {
      const validation = validateDrug(selectedDrug);
      setDrugValidation(validation);
    }
  }, [selectedDrug, validateDrug]);

  // Validate drug-patient combination before prescribing
  const handlePrescribe = () => {
    if (!selectedDrug) return;
    
    const combinationValidation = validateDrugPatient(selectedDrug, patient);
    
    if (combinationValidation.clinicalAlerts.some(a => a.severity === 'critical')) {
      alert('CRITICAL: Cannot prescribe due to safety concerns');
      return;
    }
    
    // Proceed with prescription...
  };

  return (
    <div>
      {/* Data Quality Indicator */}
      <DataQualityIndicator syncStatus={syncStatus} showDetails={true} />
      
      {/* Drug Selection */}
      <select onChange={(e) => {
        const drug = drugs.find(d => d.id === e.target.value);
        setSelectedDrug(drug || null);
      }}>
        <option value="">Select a drug...</option>
        {drugs.map(drug => (
          <option key={drug.id} value={drug.id}>{drug.name}</option>
        ))}
      </select>

      {/* Verification Badge */}
      {selectedDrug && (
        <div>
          <h3>{selectedDrug.name}</h3>
          <VerificationBadge validation={drugValidation} showDetails={true} />
        </div>
      )}

      {/* Prescribe Button */}
      <button 
        onClick={handlePrescribe}
        disabled={hasCriticalAlerts}
      >
        {hasCriticalAlerts ? 'Critical Issues Detected' : 'Prescribe'}
      </button>
    </div>
  );
};
```

## Validation Types

### Drug Validation
```typescript
const validation = validateDrug(drug);
// Checks: name, class, dosage, contraindications, indications, administration
```

### Procedure Validation
```typescript
const validation = validateProcedure(procedure);
// Checks: name, diagnosis, management plan, investigations, references
```

### Material Validation
```typescript
const validation = validateMaterial(material);
// Checks: name, category, properties, indications, contraindications
```

### Patient Validation
```typescript
const validation = validatePatient(patientParams);
// Checks: age, weight, allergies, medical conditions
// Returns: clinical alerts for age groups, conditions, allergies
```

### Drug-Patient Combination Validation
```typescript
const validation = validateDrugPatient(drug, patient);
// Checks: contraindications, allergies, age-specific considerations
// Returns: critical safety alerts
```

### Complete Workflow Validation
```typescript
const validation = validateWorkflow({
  drug: selectedDrug,
  procedure: selectedProcedure,
  material: selectedMaterial,
  patient: patientParams
});
// Comprehensive validation of entire treatment workflow
```

## Validation Result Structure

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  clinicalAlerts: ClinicalAlert[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

interface ClinicalAlert {
  type: 'contraindication' | 'interaction' | 'dosage' | 'allergy' | 'age_restriction';
  message: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  action: string;
}
```

## Clinical Alert Handling

### Critical Alerts (Block Action)
```typescript
if (validation.clinicalAlerts.some(alert => alert.severity === 'critical')) {
  // Block the action - do not allow prescription/procedure
  showError('CRITICAL: Action blocked due to safety concerns');
  return;
}
```

### Major Alerts (Warn User)
```typescript
const majorAlerts = validation.clinicalAlerts.filter(alert => alert.severity === 'major');
if (majorAlerts.length > 0) {
  // Show warning but allow user to proceed with caution
  showWarning(`WARNING: ${majorAlerts[0].message}`);
}
```

### Moderate/Minor Alerts (Inform User)
```typescript
const infoAlerts = validation.clinicalAlerts.filter(
  alert => alert.severity === 'moderate' || alert.severity === 'minor'
);
// Display as informational messages
```

## Data Quality Monitoring

### Check Data Quality Score
```typescript
const { dataQualityScore, validationSummary } = useMedicalContent();

if (dataQualityScore < 80) {
  showWarning('Medical data quality is below optimal level');
}
```

### Monitor Sync Status
```typescript
const { syncStatus } = useMedicalContent();

if (syncStatus.isLoading) {
  // Show loading indicator
}

if (syncStatus.errors.length > 0) {
  // Show sync errors
}

const lastSync = syncStatus.lastSync;
// Display last sync time
```

### Force Data Refresh
```typescript
const { refreshData } = useMedicalContent();

const handleRefresh = async () => {
  await refreshData();
  showSuccess('Medical data refreshed successfully');
};
```

## Best Practices

### 1. Always Validate Before Critical Actions
```typescript
// ✅ Good
const validation = validateDrugPatient(drug, patient);
if (validation.isValid && !hasCriticalAlerts) {
  prescribeDrug();
}

// ❌ Bad
prescribeDrug(); // No validation
```

### 2. Display Verification Status to Users
```typescript
// ✅ Good
<VerificationBadge validation={drugValidation} showDetails={true} />

// ❌ Bad
// No visual indication of verification status
```

### 3. Handle Critical Alerts Appropriately
```typescript
// ✅ Good
if (hasCriticalAlerts) {
  return <ErrorMessage>Cannot proceed due to safety concerns</ErrorMessage>;
}

// ❌ Bad
// Ignore critical alerts and proceed anyway
```

### 4. Monitor Data Quality
```typescript
// ✅ Good
<DataQualityIndicator syncStatus={syncStatus} showDetails={true} />

// ❌ Bad
// No visibility into data quality
```

### 5. Provide User Feedback
```typescript
// ✅ Good
useEffect(() => {
  if (selectedDrug) {
    const validation = validateDrug(selectedDrug);
    if (!validation.isValid) {
      showWarning(`Drug data has ${validation.errors.length} issues`);
    }
  }
}, [selectedDrug]);

// ❌ Bad
// Silent validation with no user feedback
```

## Performance Tips

### 1. Use Memoization for Expensive Validations
```typescript
const drugValidation = useMemo(() => {
  return selectedDrug ? validateDrug(selectedDrug) : null;
}, [selectedDrug, validateDrug]);
```

### 2. Debounce Real-Time Validation
```typescript
const debouncedValidation = useMemo(
  () => debounce((patient) => validatePatient(patient), 300),
  [validatePatient]
);
```

### 3. Lazy Load Medical Data
```typescript
// Data is automatically loaded on mount by useMedicalContent
// No need to manually trigger loading
```

## Troubleshooting

### Issue: Validation not updating
**Solution**: Ensure you're using the validation result from the hook, not a stale state

```typescript
// ✅ Good
const { lastValidation } = useContentVerification();

// ❌ Bad
const [validation, setValidation] = useState(null);
// Might not update when validation changes
```

### Issue: Critical alerts not blocking action
**Solution**: Check hasCriticalAlerts flag before proceeding

```typescript
// ✅ Good
if (hasCriticalAlerts) {
  return; // Block action
}

// ❌ Bad
if (criticalAlerts.length > 0) {
  // Might miss alerts from nested validations
}
```

### Issue: Data not syncing
**Solution**: Check sync status and errors

```typescript
const { syncStatus } = useMedicalContent();

if (syncStatus.errors.length > 0) {
  console.error('Sync errors:', syncStatus.errors);
  // Handle sync errors
}
```

## Testing

### Unit Testing Validation
```typescript
import { medicalContentValidator } from '../services/medical/contentValidator';

test('validates drug correctly', () => {
  const drug = { /* drug data */ };
  const result = medicalContentValidator.validateDrug(drug);
  
  expect(result.isValid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

### Integration Testing with Hooks
```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useContentVerification } from '../hooks/useContentVerification';

test('validates drug-patient combination', () => {
  const { result } = renderHook(() => useContentVerification());
  
  const validation = result.current.validateDrugPatient(drug, patient);
  
  expect(validation.isValid).toBe(true);
});
```

## Additional Resources

- **API Documentation**: See JSDoc comments in service files
- **Type Definitions**: `src/types/index.ts`
- **Example Implementation**: `src/components/drugs/DrugCalculatorPageEnhanced.tsx`
- **Validation Rules**: `src/services/medical/contentValidator.ts`
- **Sync Service**: `src/services/medical/medicalDataSync.ts`

---

**Need Help?** Check the example implementation in `DrugCalculatorPageEnhanced.tsx` for a complete working example.
