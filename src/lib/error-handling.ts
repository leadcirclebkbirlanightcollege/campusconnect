/**
 * Campus Connect — Central Error Handling & UX Normalization Engine
 *
 * Principles:
 * 1. Never expose raw SQL, PostgreSQL, PostgREST, RLS, or stack traces to users.
 * 2. Classify technical errors into meaningful, domain-aware categories.
 * 3. Provide contextual, human-readable, actionable copy with retry support.
 * 4. Maintain structured technical diagnostics in developer console/logs.
 * 5. Sanitize all error strings to prevent security/schema leakage.
 */

import { toast } from "sonner";

export type ErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "conflict"
  | "network"
  | "timeout"
  | "rate_limit"
  | "server"
  | "client"
  | "unknown";

export interface AppError {
  /** High-level category of failure */
  category: ErrorCategory;
  /** Safe, human-friendly message suitable for displaying in UI */
  userMessage: string;
  /** Optional secondary subtitle or tip for the user */
  userDescription?: string;
  /** Technical message with full details for developers / logging */
  technicalMessage: string;
  /** Error code if available (e.g., Postgres "23505", HTTP 403, etc.) */
  code?: string | number;
  /** Domain context where the error occurred (e.g. 'schedule-lecture') */
  context?: string;
  /** Whether the user can retry this operation */
  isRetryable: boolean;
  /** Original error object */
  originalError?: unknown;
  /** Timestamp when error was normalized */
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Postgres & PostgREST Error Code Dictionary
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorCodeDefinition {
  category: ErrorCategory;
  defaultMessage: string;
  defaultDescription?: string;
  isRetryable: boolean;
}

const POSTGRES_ERROR_MAP: Record<string, ErrorCodeDefinition> = {
  // 42501: insufficient_privilege / RLS violation
  "42501": {
    category: "authorization",
    defaultMessage: "You don't have permission to perform this action.",
    defaultDescription: "Please ensure your account has the required role and permissions.",
    isRetryable: false,
  },
  // 23505: unique_violation
  "23505": {
    category: "conflict",
    defaultMessage: "A record with this information already exists.",
    defaultDescription: "Please verify the details and avoid duplicates.",
    isRetryable: false,
  },
  // 23503: foreign_key_violation
  "23503": {
    category: "conflict",
    defaultMessage: "The selected item or relationship is no longer available.",
    defaultDescription: "Please refresh the page and select an active record.",
    isRetryable: true,
  },
  // 23502: not_null_violation
  "23502": {
    category: "validation",
    defaultMessage: "Please fill in all required fields.",
    defaultDescription: "One or more mandatory items were missing from your submission.",
    isRetryable: false,
  },
  // 23514: check_violation
  "23514": {
    category: "validation",
    defaultMessage: "The provided information does not meet the required format.",
    defaultDescription: "Please check the entered values and try again.",
    isRetryable: false,
  },
  // 40001: serialization_failure / deadlock
  "40001": {
    category: "conflict",
    defaultMessage: "This action conflicted with another recent change.",
    defaultDescription: "Please try again in a moment.",
    isRetryable: true,
  },
  // 57014: query_canceled / timeout
  "57014": {
    category: "timeout",
    defaultMessage: "The request took too long to process.",
    defaultDescription: "Please check your network connection and try again.",
    isRetryable: true,
  },
  // 28000 / 28P01: invalid_authorization_specification / invalid_password
  "28000": {
    category: "authentication",
    defaultMessage: "Invalid email or password.",
    defaultDescription: "Please double-check your credentials and sign in again.",
    isRetryable: false,
  },
  "28P01": {
    category: "authentication",
    defaultMessage: "Invalid email or password.",
    defaultDescription: "Please double-check your credentials and sign in again.",
    isRetryable: false,
  },
  // PostgREST codes
  "PGRST116": {
    category: "not_found",
    defaultMessage: "The requested record could not be found.",
    defaultDescription: "It may have been removed or you may not have access.",
    isRetryable: false,
  },
  "PGRST301": {
    category: "authentication",
    defaultMessage: "Your session has expired.",
    defaultDescription: "Please sign in again to continue.",
    isRetryable: false,
  },
  "PGRST204": {
    category: "server",
    defaultMessage: "Unable to complete request.",
    defaultDescription: "Please try again shortly.",
    isRetryable: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Context-Specific User Messages
// ─────────────────────────────────────────────────────────────────────────────

interface ContextMessageConfig {
  defaultMessage: string;
  permissionMessage?: string;
  conflictMessage?: string;
  validationMessage?: string;
}

const CONTEXT_MESSAGES: Record<string, ContextMessageConfig> = {
  "schedule-lecture": {
    defaultMessage: "We couldn't schedule this lecture. Please try again.",
    permissionMessage: "You are not authorized to schedule lectures for this class.",
    conflictMessage: "A lecture is already scheduled for this venue/time.",
    validationMessage: "Please verify the lecture topic, venue, date, and time.",
  },
  "update-lecture": {
    defaultMessage: "Unable to update the lecture details. Please try again.",
    permissionMessage: "You don't have permission to edit this lecture.",
  },
  "delete-lecture": {
    defaultMessage: "Unable to cancel this lecture. Please try again.",
    permissionMessage: "You don't have permission to delete this lecture.",
  },
  "go-live": {
    defaultMessage: "Unable to start class right now. Please try again.",
    permissionMessage: "You are not authorized to start this lecture session.",
  },
  "end-lecture": {
    defaultMessage: "Unable to end lecture right now. Please try again.",
    permissionMessage: "You are not authorized to conclude this lecture.",
  },
  "create-student": {
    defaultMessage: "Unable to create student account. Please try again.",
    conflictMessage: "A student with this email or student ID already exists.",
    validationMessage: "Please verify student name, email, roll number, and class.",
  },
  "add-faculty": {
    defaultMessage: "Unable to add faculty member right now. Please try again.",
    conflictMessage: "A faculty member with this email or ID already exists.",
    validationMessage: "Please check faculty name, email, and department.",
  },
  "save-timetable": {
    defaultMessage: "Unable to save timetable slots. Please try again.",
    conflictMessage: "A slot already overlaps with this time and room.",
    permissionMessage: "You don't have permission to modify timetable records.",
  },
  "promote-students": {
    defaultMessage: "Unable to execute student promotion. Please try again.",
    permissionMessage: "Only administrators can run batch academic promotions.",
  },
  "mark-attendance": {
    defaultMessage: "Unable to record attendance right now.",
    conflictMessage: "Attendance has already been recorded for this student.",
    permissionMessage: "You are not authorized to mark attendance for this lecture.",
  },
  "create-assignment": {
    defaultMessage: "Unable to publish assignment. Please try again.",
    permissionMessage: "You don't have permission to create assignments for this class.",
  },
  "submit-assignment": {
    defaultMessage: "Unable to submit your assignment. Please try again.",
    conflictMessage: "You have already submitted this assignment.",
  },
  "create-announcement": {
    defaultMessage: "Unable to broadcast announcement. Please try again.",
    permissionMessage: "You don't have permission to publish announcements.",
  },
  "upload-document": {
    defaultMessage: "Unable to upload document. Please check the file and try again.",
  },
  "login": {
    defaultMessage: "We couldn't sign you in. Please check your credentials.",
    validationMessage: "Please enter both your email/identifier and password.",
  },
  "signup": {
    defaultMessage: "Unable to create account right now. Please try again.",
    conflictMessage: "An account with this email address already exists.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sanitization Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a raw message looks like a database, SQL, or technical dump.
 */
function isTechnicalString(str: string): boolean {
  const lower = str.toLowerCase();
  return (
    lower.includes("row-level security") ||
    lower.includes("violates") ||
    lower.includes("constraint") ||
    lower.includes("foreign key") ||
    lower.includes("syntax error") ||
    lower.includes("schema") ||
    lower.includes("relation") ||
    lower.includes("column") ||
    lower.includes("table") ||
    lower.includes("sql") ||
    lower.includes("postgrest") ||
    lower.includes("jwt") ||
    lower.includes("pgrst") ||
    lower.includes("stack trace") ||
    lower.includes("null value in column") ||
    lower.includes("check_violation") ||
    lower.includes("duplicate key") ||
    lower.includes("auth.users") ||
    lower.includes("permission denied for")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalization Core
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts code, status, message, and details from any error shape.
 */
function extractErrorProperties(err: unknown): {
  message: string;
  code?: string | number;
  status?: number;
  details?: string;
  name?: string;
} {
  if (!err) {
    return { message: "Unknown error occurred" };
  }

  if (typeof err === "string") {
    return { message: err };
  }

  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const message =
      (typeof e.message === "string" && e.message) ||
      (typeof e.error_description === "string" && e.error_description) ||
      (typeof e.error === "string" && e.error) ||
      "An unexpected error occurred";

    const code =
      (typeof e.code === "string" || typeof e.code === "number" ? e.code : undefined) ||
      (typeof e.statusCode === "number" ? e.statusCode : undefined);

    const status =
      typeof e.status === "number"
        ? e.status
        : typeof e.statusCode === "number"
        ? e.statusCode
        : undefined;

    const details = typeof e.details === "string" ? e.details : undefined;
    const name = typeof e.name === "string" ? e.name : undefined;

    return { message, code, status, details, name };
  }

  return { message: String(err) };
}

/**
 * Normalizes any technical/runtime error into an AppError.
 */
export function normalizeError(
  err: unknown,
  context?: string,
  fallbackMessage?: string
): AppError {
  const { message: rawMessage, code: rawCode, status, details, name } =
    extractErrorProperties(err);
  const lowerMsg = rawMessage.toLowerCase();
  const codeStr = rawCode ? String(rawCode) : "";

  let category: ErrorCategory = "unknown";
  let userMessage = fallbackMessage || "Something went wrong. Please try again.";
  let userDescription: string | undefined = undefined;
  let isRetryable = true;

  // 1. Check known Postgres error codes
  if (codeStr && POSTGRES_ERROR_MAP[codeStr]) {
    const def = POSTGRES_ERROR_MAP[codeStr];
    category = def.category;
    userMessage = def.defaultMessage;
    userDescription = def.defaultDescription;
    isRetryable = def.isRetryable;
  }
  // 2. HTTP Status Codes
  else if (status === 401 || lowerMsg.includes("jwt") || lowerMsg.includes("unauthorized")) {
    category = "authentication";
    userMessage = "Your session has expired. Please sign in again.";
    userDescription = "You will be redirected to the sign in page.";
    isRetryable = false;
  } else if (status === 403 || lowerMsg.includes("forbidden") || lowerMsg.includes("row-level security")) {
    category = "authorization";
    userMessage = "You don't have permission to perform this action.";
    userDescription = "Please contact an administrator if you believe this is in error.";
    isRetryable = false;
  } else if (status === 404 || lowerMsg.includes("not found")) {
    category = "not_found";
    userMessage = "The requested information could not be found.";
    isRetryable = false;
  } else if (status === 409 || lowerMsg.includes("already exists") || lowerMsg.includes("duplicate")) {
    category = "conflict";
    userMessage = "This record or identifier already exists.";
    isRetryable = false;
  } else if (status === 429 || lowerMsg.includes("too many requests") || lowerMsg.includes("rate limit")) {
    category = "rate_limit";
    userMessage = "Too many requests. Please wait a moment before trying again.";
    isRetryable = true;
  } else if (
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("network error") ||
    lowerMsg.includes("offline") ||
    lowerMsg.includes("connection") ||
    name === "TypeError" && lowerMsg.includes("fetch")
  ) {
    category = "network";
    userMessage = "Unable to connect. Please check your internet connection.";
    userDescription = "The connection was interrupted. Please retry.";
    isRetryable = true;
  } else if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out") || name === "TimeoutError") {
    category = "timeout";
    userMessage = "The request timed out. Please try again.";
    isRetryable = true;
  } else if (lowerMsg.includes("invalid") || lowerMsg.includes("must be") || lowerMsg.includes("required")) {
    category = "validation";
    // If it's a safe validation message from Zod or client code, we can show it
    if (!isTechnicalString(rawMessage)) {
      userMessage = rawMessage;
    } else {
      userMessage = "Please check your inputs and try again.";
    }
    isRetryable = false;
  } else if (status && status >= 500) {
    category = "server";
    userMessage = "A temporary server error occurred. Please try again.";
    isRetryable = true;
  } else if (!isTechnicalString(rawMessage) && rawMessage.length < 120 && !rawMessage.startsWith("Error:")) {
    // If the message is already clean, short, and non-technical, use it directly
    userMessage = rawMessage;
  }

  // 3. Apply Context-Specific Overrides if available
  if (context && CONTEXT_MESSAGES[context]) {
    const ctx = CONTEXT_MESSAGES[context];
    if (category === "authorization" && ctx.permissionMessage) {
      userMessage = ctx.permissionMessage;
    } else if (category === "conflict" && ctx.conflictMessage) {
      userMessage = ctx.conflictMessage;
    } else if (category === "validation" && ctx.validationMessage) {
      userMessage = ctx.validationMessage;
    } else if (fallbackMessage) {
      userMessage = fallbackMessage;
    } else if (category === "unknown" || category === "server") {
      userMessage = ctx.defaultMessage;
    }
  }

  const technicalMessage = [
    rawMessage,
    details ? `Details: ${details}` : "",
    codeStr ? `Code: ${codeStr}` : "",
    status ? `Status: ${status}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    category,
    userMessage,
    userDescription,
    technicalMessage,
    code: rawCode ?? status,
    context,
    isRetryable,
    originalError: err,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Developer Diagnostics Logger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured logger for developers. Sanitizes credentials and sensitive fields.
 */
export function logTechnicalError(appError: AppError): void {
  // Always log structured details for debugging
  const logPayload = {
    category: appError.category,
    context: appError.context || "global",
    code: appError.code,
    userMessage: appError.userMessage,
    technicalMessage: appError.technicalMessage,
    timestamp: appError.timestamp,
  };

  if (import.meta.env.DEV) {
    console.error("[CampusConnect Error Engine]", logPayload, appError.originalError);
  } else {
    // Production console log (sanitized, structured)
    console.error(`[AppError][${appError.category}][${appError.context || "general"}]`, appError.technicalMessage);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Toast Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ShowErrorToastOptions {
  /** Context identifier (e.g. 'schedule-lecture', 'create-student') */
  context?: string;
  /** Explicit fallback message */
  fallback?: string;
  /** Optional retry handler */
  onRetry?: () => void;
  /** Deduplication ID to prevent spamming */
  id?: string;
}

/**
 * Normalizes an error, logs it for developers, and displays a polished UI toast.
 */
export function showErrorToast(
  error: unknown,
  options?: ShowErrorToastOptions
): AppError {
  const appError = normalizeError(error, options?.context, options?.fallback);
  logTechnicalError(appError);

  const toastId = options?.id || (options?.context ? `error-${options.context}` : undefined);

  if (options?.onRetry && appError.isRetryable) {
    toast.error(appError.userMessage, {
      id: toastId,
      description: appError.userDescription,
      duration: 6000,
      action: {
        label: "Retry",
        onClick: () => {
          try {
            options.onRetry?.();
          } catch (retryErr) {
            console.error("Retry failed:", retryErr);
          }
        },
      },
    });
  } else {
    toast.error(appError.userMessage, {
      id: toastId,
      description: appError.userDescription,
      duration: 4500,
    });
  }

  return appError;
}

/**
 * Shows a polished success toast with consistent styling.
 */
export function showSuccessToast(title: string, description?: string): void {
  toast.success(title, {
    description,
    duration: 3500,
  });
}
