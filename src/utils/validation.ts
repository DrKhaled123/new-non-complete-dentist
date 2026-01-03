/**
 * Input validation utilities
 * Provides sanitization and validation for user inputs
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate numeric input
 */
export function isValidNumber(value: unknown, min?: number, max?: number): boolean {
  const num = Number(value);
  
  if (isNaN(num)) {
    return false;
  }

  if (min !== undefined && num < min) {
    return false;
  }

  if (max !== undefined && num > max) {
    return false;
  }

  return true;
}

/**
 * Validate age
 */
export function isValidAge(age: number): boolean {
  return isValidNumber(age, 0, 150);
}

/**
 * Validate weight in kg
 */
export function isValidWeight(weight: number): boolean {
  return isValidNumber(weight, 0.5, 300);
}

/**
 * Validate creatinine level
 */
export function isValidCreatinine(creatinine: number): boolean {
  return isValidNumber(creatinine, 0.1, 20);
}

/**
 * Validate drug name
 */
export function isValidDrugName(name: string): boolean {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return false;
  }

  // Allow alphanumeric, spaces, hyphens, and parentheses
  const validNameRegex = /^[a-zA-Z0-9\s\-()]+$/;
  return validNameRegex.test(name) && name.length <= 100;
}

/**
 * Validate clinical notes
 */
export function isValidClinicalNotes(notes: string): boolean {
  if (typeof notes !== 'string') {
    return false;
  }

  // Max 5000 characters
  return notes.length <= 5000;
}

/**
 * Validate allergy list
 */
export function isValidAllergies(allergies: string[]): boolean {
  if (!Array.isArray(allergies)) {
    return false;
  }

  return allergies.every(allergy => 
    typeof allergy === 'string' && 
    allergy.trim().length > 0 && 
    allergy.length <= 100
  );
}

/**
 * Validate medical conditions list
 */
export function isValidConditions(conditions: string[]): boolean {
  if (!Array.isArray(conditions)) {
    return false;
  }

  return conditions.every(condition => 
    typeof condition === 'string' && 
    condition.trim().length > 0 && 
    condition.length <= 100
  );
}

/**
 * Validate gender
 */
export function isValidGender(gender: string): boolean {
  return ['male', 'female', 'other'].includes(gender.toLowerCase());
}

/**
 * Validate case ID
 */
export function isValidCaseId(id: string): boolean {
  // UUID v4 format or simple alphanumeric
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const alphanumericRegex = /^[a-zA-Z0-9_-]+$/;
  
  return uuidRegex.test(id) || (alphanumericRegex.test(id) && id.length <= 50);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize object by removing potentially dangerous properties
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  // Remove properties that might contain code
  const dangerousProps = ['__proto__', 'constructor', 'prototype'];
  dangerousProps.forEach(prop => {
    delete (sanitized as Record<string, unknown>)[prop];
  });

  return sanitized;
}

/**
 * Validate JSON string
 */
export function isValidJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number (basic)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  // Check if it's 10-15 digits
  return /^\d{10,15}$/.test(cleaned);
}
