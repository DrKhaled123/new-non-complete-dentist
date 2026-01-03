# Testing the Medical Content Verification System

## Quick Verification Test

### 1. Start the Development Server

```bash
cd dental-dashboard
npm start
```

The app should start at `http://localhost:3000`

### 2. Test Data Loading

**Expected Behavior**:
- Medical data loads automatically on app start
- Data quality indicator shows sync status
- No critical errors in console

**What to Check**:
1. Open browser console (F12)
2. Look for these log messages:
   - "Loaded X drugs from database"
   - "Loaded X procedures from database"
   - "Loaded X materials from database"
   - "Medical data synchronization completed successfully"

### 3. Test Drug Calculator with Verification

**Navigate to**: Drug Calculator page

**Test Case 1: Valid Drug Selection**
1. Select a drug from dropdown
2. **Expected**: Verification badge shows "Verified" (green)
3. **Expected**: Drug details display correctly

**Test Case 2: Patient Validation**
1. Enter patient age: 30
2. Enter patient weight: 70
3. **Expected**: Patient validation badge shows "Verified"
4. Change age to 5 (pediatric)
5. **Expected**: Clinical alert appears: "Pediatric patient - special dosing considerations"

**Test Case 3: Allergy Detection**
1. Select drug: "Amoxicillin"
2. Check allergy: "Penicillin"
3. **Expected**: Critical alert appears
4. **Expected**: Calculate button shows "Critical Issues Detected"
5. **Expected**: Cannot calculate dose

**Test Case 4: Medical Condition Alerts**
1. Select drug with renal adjustment
2. Check condition: "Kidney Disease"
3. Calculate dose
4. **Expected**: Clinical note shows renal adjustment required

**Test Case 5: Age-Specific Dosing**
1. Enter patient age: 10 (pediatric)
2. Select any drug
3. Calculate dose
4. **Expected**: Uses pediatric dosing if available
5. **Expected**: Warning if pediatric dosing not available

### 4. Test Data Quality Indicator

**What to Check**:
1. Data quality score displays (should be 90%+)
2. Last sync time shows
3. Detailed breakdown shows:
   - Drugs: X/Y valid
   - Procedures: X/Y valid
   - Materials: X/Y valid
4. Progress bars display correctly

**Test Refresh**:
1. Click "Refresh Data" button
2. **Expected**: Loading indicator appears
3. **Expected**: Data reloads successfully
4. **Expected**: Success message appears

### 5. Test Verification Badge States

**Test Different Validation States**:

**Valid State** (Green):
- Select a complete, valid drug
- **Expected**: Green badge with checkmark
- **Expected**: Text: "Verified"

**Warning State** (Yellow):
- Drug with missing optional fields
- **Expected**: Yellow badge with info icon
- **Expected**: Text: "Recommendations"

**Error State** (Red):
- Drug with critical missing fields (if any in test data)
- **Expected**: Red badge with warning icon
- **Expected**: Text: "Critical Issues"

### 6. Test Clinical Alerts

**Critical Alerts** (Red):
- Drug + Patient with contraindication
- **Expected**: Red alert box
- **Expected**: Action blocked
- **Expected**: Clear message about why

**Major Alerts** (Orange):
- Geriatric patient (age > 65)
- **Expected**: Orange alert box
- **Expected**: Recommendation displayed
- **Expected**: Action allowed with warning

**Moderate Alerts** (Blue):
- Patient with high weight
- **Expected**: Blue info box
- **Expected**: Informational message

## Manual Testing Checklist

### Data Loading Tests
- [ ] Medical data loads on app start
- [ ] Drugs database loads successfully
- [ ] Procedures database loads successfully
- [ ] Materials database loads successfully
- [ ] Cache works (second load is faster)
- [ ] Sync status updates correctly

### Validation Tests
- [ ] Drug validation works
- [ ] Procedure validation works
- [ ] Material validation works
- [ ] Patient validation works
- [ ] Drug-patient combination validation works
- [ ] Workflow validation works

### UI Component Tests
- [ ] VerificationBadge displays correctly
- [ ] DataQualityIndicator shows accurate data
- [ ] Loading states work
- [ ] Error states display properly
- [ ] Success states show correctly

### Clinical Safety Tests
- [ ] Allergy detection works
- [ ] Contraindication checking works
- [ ] Age-specific alerts work
- [ ] Medical condition alerts work
- [ ] Critical alerts block actions
- [ ] Major alerts warn users

### Performance Tests
- [ ] Initial load < 2 seconds
- [ ] Validation < 100ms
- [ ] Search < 300ms
- [ ] No memory leaks
- [ ] Smooth UI interactions

## Automated Testing

### Unit Tests

Create test file: `src/services/medical/__tests__/contentValidator.test.ts`

```typescript
import { medicalContentValidator } from '../contentValidator';
import { Drug, Procedure, Material, PatientParameters } from '../../../types';

describe('Medical Content Validator', () => {
  describe('Drug Validation', () => {
    test('validates complete drug successfully', () => {
      const drug: Drug = {
        id: 'test-drug',
        name: 'Test Drug',
        class: 'Antibiotic',
        indications: [{ type: 'Treatment', description: 'Test', evidence_level: 'A' }],
        dosage: {
          adults: { dose: '500 mg', regimen: 'TID', max_daily: '1500 mg' },
          pediatrics: { dose: '250 mg', regimen: 'TID', max_daily: '750 mg' }
        },
        administration: { route: 'Oral', instructions: 'Test', bioavailability: '90%' },
        renal_adjustment: [],
        hepatic_adjustment: [],
        contraindications: [],
        side_effects: { common: [], serious: [] },
        interactions: []
      };

      const result = medicalContentValidator.validateDrug(drug);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects missing drug name', () => {
      const drug: any = {
        id: 'test-drug',
        name: '',
        class: 'Antibiotic'
      };

      const result = medicalContentValidator.validateDrug(drug);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'DRUG_NAME_MISSING'
        })
      );
    });
  });

  describe('Patient Validation', () => {
    test('validates adult patient successfully', () => {
      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: [],
        allergies: []
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects pediatric patient and creates alert', () => {
      const patient: PatientParameters = {
        age: 10,
        weight: 30,
        conditions: [],
        allergies: []
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'age_restriction',
          severity: 'major'
        })
      );
    });

    test('detects penicillin allergy', () => {
      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: [],
        allergies: ['Penicillin']
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'allergy',
          severity: 'critical'
        })
      );
    });
  });

  describe('Drug-Patient Combination', () => {
    test('detects contraindication', () => {
      const drug: Drug = {
        // ... drug with contraindication
        contraindications: ['Kidney Disease']
      };

      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: ['Kidney Disease'],
        allergies: []
      };

      const result = medicalContentValidator.validateDrugPatientCombination(drug, patient);
      
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'contraindication',
          severity: 'critical'
        })
      );
    });
  });
});
```

### Integration Tests

Create test file: `src/hooks/__tests__/useMedicalContent.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMedicalContent } from '../useMedicalContent';

describe('useMedicalContent Hook', () => {
  test('loads medical data on mount', async () => {
    const { result } = renderHook(() => useMedicalContent());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.drugs.length).toBeGreaterThan(0);
    expect(result.current.procedures.length).toBeGreaterThan(0);
    expect(result.current.materials.length).toBeGreaterThan(0);
  });

  test('provides data quality score', async () => {
    const { result } = renderHook(() => useMedicalContent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.current.dataQualityScore).toBeLessThanOrEqual(100);
  });

  test('refreshes data on demand', async () => {
    const { result } = renderHook(() => useMedicalContent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialDrugs = result.current.drugs;

    await result.current.refreshData();

    expect(result.current.drugs).toBeDefined();
  });
});
```

### Component Tests

Create test file: `src/components/shared/__tests__/VerificationBadge.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import VerificationBadge from '../VerificationBadge';
import { ValidationResult } from '../../../services/medical/contentValidator';

describe('VerificationBadge', () => {
  test('shows "Not Verified" when validation is null', () => {
    render(<VerificationBadge validation={null} />);
    
    expect(screen.getByText('Not Verified')).toBeInTheDocument();
  });

  test('shows "Verified" for valid data', () => {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      clinicalAlerts: []
    };

    render(<VerificationBadge validation={validation} />);
    
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  test('shows "Critical Issues" for critical errors', () => {
    const validation: ValidationResult = {
      isValid: false,
      errors: [
        { field: 'name', message: 'Required', severity: 'critical', code: 'REQUIRED' }
      ],
      warnings: [],
      clinicalAlerts: []
    };

    render(<VerificationBadge validation={validation} />);
    
    expect(screen.getByText('Critical Issues')).toBeInTheDocument();
  });

  test('shows details when showDetails is true', () => {
    const validation: ValidationResult = {
      isValid: false,
      errors: [
        { field: 'name', message: 'Required', severity: 'high', code: 'REQUIRED' }
      ],
      warnings: [
        { field: 'description', message: 'Missing', recommendation: 'Add description' }
      ],
      clinicalAlerts: []
    };

    render(<VerificationBadge validation={validation} showDetails={true} />);
    
    expect(screen.getByText(/1 error/)).toBeInTheDocument();
    expect(screen.getByText(/1 warning/)).toBeInTheDocument();
  });
});
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- contentValidator.test.ts
```

## Expected Test Results

### Coverage Goals
- **Services**: 90%+ coverage
- **Hooks**: 85%+ coverage
- **Components**: 80%+ coverage
- **Overall**: 85%+ coverage

### Performance Benchmarks
- Validation: < 50ms per item
- Data loading: < 500ms (cached)
- Search: < 300ms
- Sync: < 2s (with retry)

## Debugging Tips

### Enable Verbose Logging
```typescript
// In medicalDataSync.ts, add more console.log statements
console.log('Sync started:', new Date());
console.log('Drugs loaded:', drugs.length);
console.log('Validation results:', validationResults);
```

### Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Look for JSON file loads
4. Check timing and response

### Check Console for Errors
1. Open DevTools Console
2. Look for red error messages
3. Check for validation warnings
4. Monitor sync status updates

### Use React DevTools
1. Install React DevTools extension
2. Inspect component props
3. Check hook state
4. Monitor re-renders

## Common Issues and Solutions

### Issue: Data not loading
**Check**:
- JSON files exist in `src/data/`
- File paths are correct
- No JSON syntax errors

### Issue: Validation not working
**Check**:
- Hook is called correctly
- Validation function receives correct data
- ValidationResult is used in UI

### Issue: Sync errors
**Check**:
- Network connectivity
- File permissions
- Cache storage availability

### Issue: Performance problems
**Check**:
- Cache is working
- No unnecessary re-renders
- Validation is memoized

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Data loads successfully
✅ Validation works correctly
✅ Clinical alerts display properly
✅ Performance meets benchmarks
✅ UI is responsive
✅ No memory leaks

---

**Testing Status**: Ready for comprehensive testing
**Last Updated**: January 2, 2026
