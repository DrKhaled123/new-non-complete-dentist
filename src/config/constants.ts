/**
 * Application constants and configuration
 * Centralized configuration to avoid magic numbers and strings
 */

// ============================================================================
// AUTHENTICATION & SESSION
// ============================================================================

/** Session timeout in milliseconds (30 minutes) */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Session check interval in milliseconds (5 seconds) */
export const SESSION_CHECK_INTERVAL_MS = 5 * 1000;

/** Password hash iterations for PBKDF2 */
export const PASSWORD_HASH_ITERATIONS = 100000;

/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 8;

// ============================================================================
// STORAGE & CACHING
// ============================================================================

/** localStorage cache TTL in milliseconds (1 hour) */
export const CACHE_TTL_MS = 60 * 60 * 1000;

/** localStorage quota warning threshold (80% of available) */
export const STORAGE_QUOTA_WARNING_THRESHOLD = 0.8;

/** Storage key prefixes */
export const STORAGE_PREFIXES = {
  DOCTOR_PROFILE: 'dental_doctor_profile_',
  CASES: 'dental_cases_',
  DRUGS: 'dental_cache_drugs',
  PROCEDURES: 'dental_cache_procedures',
  MATERIALS: 'dental_cache_materials',
  SESSION: 'dental_session_',
  SYNC_STATUS: 'dental_sync_status_',
} as const;

// ============================================================================
// VALIDATION CONSTRAINTS
// ============================================================================

/** Age constraints */
export const AGE_CONSTRAINTS = {
  MIN: 0,
  MAX: 150,
} as const;

/** Weight constraints in kg */
export const WEIGHT_CONSTRAINTS = {
  MIN: 0.5,
  MAX: 300,
} as const;

/** Creatinine constraints in mg/dL */
export const CREATININE_CONSTRAINTS = {
  MIN: 0.1,
  MAX: 20,
} as const;

/** String length constraints */
export const STRING_CONSTRAINTS = {
  DRUG_NAME_MAX: 100,
  ALLERGY_MAX: 100,
  CONDITION_MAX: 100,
  CLINICAL_NOTES_MAX: 5000,
  CASE_ID_MAX: 50,
} as const;

// ============================================================================
// DOSING CALCULATIONS
// ============================================================================

/** Pediatric age threshold */
export const PEDIATRIC_AGE_THRESHOLD = 18;

/** Default duration for prescriptions in days */
export const DEFAULT_PRESCRIPTION_DURATION_DAYS = 7;

/** Creatinine clearance calculation method */
export const CREATININE_CLEARANCE_METHOD = 'COCKCROFT_GAULT' as const;

/** Renal function categories */
export const RENAL_FUNCTION_CATEGORIES = {
  NORMAL: { min: 90, max: Infinity, label: 'Normal' },
  MILD_IMPAIRMENT: { min: 60, max: 89, label: 'Mild impairment' },
  MODERATE_IMPAIRMENT: { min: 30, max: 59, label: 'Moderate impairment' },
  SEVERE_IMPAIRMENT: { min: 15, max: 29, label: 'Severe impairment' },
  ESRD: { min: 0, max: 14, label: 'ESRD' },
} as const;

// ============================================================================
// WARNINGS & ALERTS
// ============================================================================

/** Warning levels */
export const WARNING_LEVELS = {
  MINOR: 'minor',
  MODERATE: 'moderate',
  MAJOR: 'major',
  CRITICAL: 'critical',
} as const;

/** Elderly patient age threshold */
export const ELDERLY_AGE_THRESHOLD = 65;

// ============================================================================
// PAGINATION & PERFORMANCE
// ============================================================================

/** Default page size for lists */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum items to load without pagination */
export const MAX_ITEMS_WITHOUT_PAGINATION = 100;

/** Debounce delay for search input in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300;

/** Debounce delay for form input in milliseconds */
export const FORM_INPUT_DEBOUNCE_MS = 500;

// ============================================================================
// API & NETWORK
// ============================================================================

/** Default request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS = 30 * 1000;

/** Retry configuration */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;

/** Rate limiting */
export const RATE_LIMITING = {
  LOGIN_ATTEMPTS_MAX: 5,
  LOGIN_ATTEMPTS_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_CALLS_PER_MINUTE: 60,
} as const;

// ============================================================================
// UI & UX
// ============================================================================

/** Toast notification duration in milliseconds */
export const TOAST_DURATION_MS = 5000;

/** Animation duration in milliseconds */
export const ANIMATION_DURATION_MS = 300;

/** Modal animation duration in milliseconds */
export const MODAL_ANIMATION_MS = 200;

// ============================================================================
// MEDICAL DATA
// ============================================================================

/** Supported genders */
export const SUPPORTED_GENDERS = ['male', 'female', 'other'] as const;

/** Common dental procedures */
export const COMMON_PROCEDURES = [
  'tooth_extraction',
  'root_canal',
  'periodontal_surgery',
  'implant_placement',
  'scaling_root_planing',
  'crown_preparation',
  'bridge_preparation',
] as const;

// ============================================================================
// ENVIRONMENT
// ============================================================================

/** Is development environment */
export const IS_DEV = process.env.NODE_ENV === 'development';

/** Is production environment */
export const IS_PROD = process.env.NODE_ENV === 'production';

/** Enable debug logging */
export const DEBUG_LOGGING = IS_DEV;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/** Feature flags for gradual rollout */
export const FEATURE_FLAGS = {
  ENABLE_MEDICAL_CONTENT_SYNC: true,
  ENABLE_CASE_VERSIONING: true,
  ENABLE_EXPORT_FUNCTIONALITY: true,
  ENABLE_ADVANCED_FILTERING: true,
} as const;
