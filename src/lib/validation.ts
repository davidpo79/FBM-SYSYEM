/**
 * Email validation utility.
 * Rejects obviously fake/test emails and validates format.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Disposable / temporary email domains (common ones)
const BLOCKED_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "trashmail.com",
  "fakeinbox.com",
  "tempail.com",
  "temp-mail.org",
  "10minutemail.com",
  "maildrop.cc",
];

// Patterns that indicate a test/fake email (local part patterns)
const FAKE_LOCAL_PATTERNS = [
  /^test$/i,
  /^test[0-9]*$/i,
  /^fake$/i,
  /^fake[0-9]*$/i,
  /^example$/i,
  /^aaa+$/i,
  /^bbb+$/i,
  /^xxx+$/i,
  /^abc$/i,
  /^asdf+$/i,
  /^qwerty$/i,
  /^admin$/i,
  /^user$/i,
  /^no[-_]?reply$/i,
  /^(.)\1{4,}$/,  // same character repeated 5+ times like aaaa@, 1111@
];

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: "נא להזין כתובת אימייל" };
  }

  // Basic format check
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "כתובת האימייל אינה תקינה" };
  }

  const [localPart, domain] = trimmed.split("@");

  // Check blocked disposable domains
  if (BLOCKED_DOMAINS.includes(domain)) {
    return { valid: false, error: "לא ניתן להשתמש בכתובת אימייל זמנית" };
  }

  // Check fake/test local part patterns
  for (const pattern of FAKE_LOCAL_PATTERNS) {
    if (pattern.test(localPart)) {
      return { valid: false, error: "נא להזין כתובת אימייל אמיתית" };
    }
  }

  // Check if domain has repeated characters only (e.g. aaa.com)
  const domainName = domain.split(".")[0];
  if (/^(.)\1{2,}$/.test(domainName)) {
    return { valid: false, error: "נא להזין כתובת אימייל אמיתית" };
  }

  return { valid: true };
}
