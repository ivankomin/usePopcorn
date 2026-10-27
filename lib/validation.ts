/**
 * Centralized authentication and input validation utilities.
 */

export interface PasswordRequirementRule {
  id: "minLength" | "uppercase" | "lowercase" | "number" | "special";
  label: string;
  shortLabel: string;
  validator: (password: string) => boolean;
}

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS: PasswordRequirementRule[] = [
  {
    id: "minLength",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    shortLabel: `${PASSWORD_MIN_LENGTH}+ characters`,
    validator: (pw: string) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter (A-Z)",
    shortLabel: "Uppercase letter (A-Z)",
    validator: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter (a-z)",
    shortLabel: "Lowercase letter (a-z)",
    validator: (pw: string) => /[a-z]/.test(pw),
  },
  {
    id: "number",
    label: "At least one number (0-9)",
    shortLabel: "Number (0-9)",
    validator: (pw: string) => /[0-9]/.test(pw),
  },
  {
    id: "special",
    label: "At least one special character (!@#$%...)",
    shortLabel: "Special character (!@#$...)",
    validator: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
];

export const PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, with uppercase, lowercase, a number, and a special character.";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  rulesMet: Record<PasswordRequirementRule["id"], boolean>;
}

/**
 * Validates a password against all strict security requirements.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const rulesMet: Record<PasswordRequirementRule["id"], boolean> = {
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  };

  for (const rule of PASSWORD_REQUIREMENTS) {
    const isMet = rule.validator(password || "");
    rulesMet[rule.id] = isMet;
    if (!isMet) {
      errors.push(rule.label);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    rulesMet,
  };
}

/**
 * Returns a human-friendly error string if invalid, or null if valid.
 */
export function getPasswordValidationError(password: string): string | null {
  const result = validatePassword(password);
  if (result.isValid) return null;
  return `Password must include: ${result.errors.join(", ")}.`;
}

/**
 * Validates basic email address structure (non-empty and valid format).
 */
export function validateEmail(email: string): string | null {
  const trimmed = (email || "").trim();
  if (!trimmed) {
    return "Email address is required.";
  }

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address (e.g., user@domain.com).";
  }

  return null;
}

