// Core Profile and Authentication Types
export interface Profile {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
}

export interface AuthSession {
  profileId: string;
  email: string;
  name: string;
  token: string;
  expiresAt: Date;
}

// Case Management Types
export interface Case {
  id: string;
  profileId: string;
  patientIdentifier: string;
  patientAge: number;
  patientWeight: number;
  conditions: string[];
  allergies: string[];
  selectedTreatments: Treatment[];
  calculatedDoses: Dose[];
  clinicalNotes: string;
  followUpNotes: Note[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Treatment {
  type: "drug" | "procedure" | "material";
  name: string;
  details: Record<string, any>;
}

export interface Dose {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  totalQuantity: string;
  clinicalNotes: string[];
}

export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
}

export interface CaseVersion {
  id: string;
  caseId: string;
  versionNumber: number;
  changes: Record<string, any>;
  changedBy: string;
  changedAt: Date;
}

// Drug Types (from JSON data)
export interface Drug {
  id: string;
  name: string;
  class: string;
  category?: 'analgesic' | 'local_anesthetic' | 'antibiotic' | 'anti-inflammatory';
  indications: DrugIndication[];
  dosage: DrugDosage;
  administration: DrugAdministration;
  renal_adjustment: RenalAdjustment[];
  hepatic_adjustment: HepaticAdjustment[];
  contraindications: string[];
  side_effects: SideEffects;
  interactions: DrugInteraction[];
  // Analgesic-specific fields
  painReliefLevel?: string;
  onsetTime?: string;
  duration?: string;
  analgesicCategory?: string;
  // Local anesthetic-specific fields
  anesthesiaDuration?: string;
  vasoconstrictor?: string;
  maximumDose?: string;
}

export interface DrugIndication {
  type: "Prophylaxis" | "Treatment";
  description: string;
  evidence_level: string;
}

export interface DrugDosage {
  adults: {
    dose: string;
    regimen: string;
    max_daily: string;
  };
  pediatrics: {
    dose: string;
    regimen: string;
    max_daily: string;
  };
}

export interface DrugAdministration {
  route: string;
  instructions: string;
  bioavailability: string;
}

export interface RenalAdjustment {
  condition: string;
  adjustment: string;
  dose_amount: string;
}

export interface HepaticAdjustment {
  condition: string;
  adjustment: string;
  dose_amount: string;
}

export interface SideEffects {
  common: string[];
  serious: string[];
}

export interface DrugInteraction {
  drug: string;
  effect: string;
  management: string;
}

// Procedure Types (from JSON data)
export interface Procedure {
  id: string;
  name: string;
  category: string;
  diagnosis: string;
  differential_diagnosis: string[];
  investigations: string[];
  management_plan: ManagementStep[];
  references: string[];
}

export interface ManagementStep {
  step: number;
  title: string;
  description: string;
}

// Material Types (from JSON data)
export interface Material {
  id: string;
  name: string;
  category: string;
  properties: MaterialProperties;
  indications: string[];
  contraindications: string[];
  handling_characteristics: string[];
  longevity: string;
  cost_considerations: string;
}

export interface MaterialProperties {
  strength?: string;
  aesthetics?: string;
  durability?: string;
  biocompatibility?: string;
  thermal_expansion?: string;
  wear_resistance?: string;
  polishability?: string;
  handling_characteristics?: string[];
  fluoride_release?: string;
  adhesion?: string;
  coefficient_thermal_expansion?: string;
  thermal_conductivity?: string;
  dimensional_stability?: string;
  translucency?: string;
  color_stability?: string;
  radiopacity?: string;
  fracture_toughness?: string;
  surface_treatment?: string;
  osseointegration?: string;
  osseointegration_rate?: string;
  etchability?: string;
  thermal_shock_resistance?: string;
  command_set?: string;
  flow_characteristics?: string;
  adaptation?: string;
  depth_of_cure?: string;
  polymerization_shrinkage?: string;
  corrosion_resistance?: string;
  marginal_adaptation?: string;
  wear_compatibility?: string;
  burnishable?: string;
  fracture_resistance?: string;
  [key: string]: string | string[] | undefined;
}

// Patient Care Types
export interface PatientCareRecommendations {
  preOperative: Instruction[];
  postOperative: {
    immediate: Instruction[];
    first24Hours: Instruction[];
    firstWeek: Instruction[];
    ongoing: Instruction[];
  };
  nutrition: NutritionGuidance;
  oralHygiene: Instruction[];
  painManagement: Instruction[];
  warningSigns: Instruction[];
}

export interface Instruction {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface NutritionGuidance {
  foodsToEat: string[];
  foodsToAvoid: string[];
  hydrationGuidelines: string[];
  supplements?: string[];
}

// Drug Calculator Types
export interface PatientParameters {
  age: number;
  weight: number;
  conditions: string[];
  allergies: string[];
  gender?: "male" | "female";
  creatinine?: number;
}

export interface DoseCalculationResult {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  totalQuantity: string;
  clinicalNotes: string[];
  warnings: Warning[];
  contraindications: string[];
  adjustments: {
    renal?: string;
    hepatic?: string;
  };
}

export interface Warning {
  level: "minor" | "moderate" | "major";
  message: string;
  recommendation: string;
}

// UI Component Types
export interface CompactBoxProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  icon?: React.ReactNode;
  badge?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success';
}

export interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  variant?: "primary" | "secondary" | "accent" | "success" | "white";
  centered?: boolean;
}

export interface ToastProps {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
  onClose: () => void;
  showProgress?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  variant?: "default" | "primary" | "accent";
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

export interface PatientInputFormData {
  age: number;
  weight: number;
  conditions: string[];
  allergies: string[];
  gender: "male" | "female";
  creatinine?: number;
}

// Search and Filter Types
export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  filters?: Record<string, any>;
}

export interface FilterOptions {
  categories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  [key: string]: any;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
}

// Storage Types
export interface StorageKeys {
  CURRENT_SESSION: string;
  PROFILE_PREFIX: string;
  CASE_PREFIX: string;
  CACHE_PREFIX: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
}

// Performance Types
export interface PerformanceMetrics {
  navigationTime: number;
  calculationTime: number;
  searchTime: number;
  renderTime: number;
}

// Accessibility Types
export interface AccessibilityOptions {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
}

// Interaction and Calculation Types
export interface DrugInteractionCheck {
  drug1: string;
  drug2: string;
  interaction: DrugInteraction;
  severity: 'minor' | 'moderate' | 'major';
}

export interface DoseCalculation {
  drugName: string;
  patientParams: PatientParameters;
  calculatedDose: DoseCalculationResult;
}

// Service Types
export interface DrugCalculationInput {
  patient: PatientParameters;
  drug: Drug;
}

export interface DrugCalculationOutput extends DoseCalculationResult {}

export interface InteractionCheckInput {
  drugs: string[];
  patientConditions?: string[];
}

export interface InteractionCheckOutput {
  interactions: DrugInteractionCheck[];
  warnings: Warning[];
  recommendations: string[];
}

export interface MaterialRecommendationInput {
  procedure: string;
  requirements: string[];
  contraindications?: string[];
}

export interface MaterialRecommendationOutput {
  recommendedMaterials: Material[];
  reasoning: string[];
  alternatives: Material[];
}

export interface FollowUpInput {
  caseId: string;
  procedure: string;
  completedAt: Date;
  patientConditions?: string[];
}

export interface FollowUpItem {
  id: string;
  date: Date;
  type: 'check-up' | 'x-ray' | 'cleaning' | 'evaluation';
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface FollowUpOutput {
  followUpSchedule: FollowUpItem[];
  reminders: string[];
  nextAppointment?: Date;
}

export interface DataExportInput {
  format: 'json' | 'csv' | 'pdf' | 'xml';
  dataType: 'cases' | 'drugs' | 'materials' | 'procedures' | 'care-instructions';
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DataExportOutput {
  url: string;
  filename: string;
  size: number;
  generatedAt: Date;
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Constants
export const STORAGE_KEYS: StorageKeys = {
  CURRENT_SESSION: 'dental_dashboard_session',
  PROFILE_PREFIX: 'dental_profile_',
  CASE_PREFIX: 'dental_case_',
  CACHE_PREFIX: 'dental_cache_',
};

export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

export const PERFORMANCE_THRESHOLDS = {
  NAVIGATION: 200, // milliseconds
  CALCULATION: 500, // milliseconds
  SEARCH: 300, // milliseconds
};

export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes