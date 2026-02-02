/**
 * Error handling utility that sanitizes error messages for security.
 * Prevents internal database details from being exposed in browser DevTools.
 */

const isDevelopment = import.meta.env.DEV;

interface ErrorInfo {
    userMessage: string;
    code?: string;
}

/**
 * Maps known database/API error patterns to user-friendly messages
 */
function mapErrorToUserMessage(error: any): ErrorInfo {
    const errorMessage = error?.message || String(error);

    // RLS policy violations
    if (errorMessage.includes('violates row-level security')) {
        return {
            userMessage: 'You do not have permission to perform this action.',
            code: 'RLS_VIOLATION'
        };
    }

    // Duplicate key violations
    if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        return {
            userMessage: 'This item already exists.',
            code: 'DUPLICATE'
        };
    }

    // Foreign key violations
    if (errorMessage.includes('foreign key constraint')) {
        return {
            userMessage: 'This action cannot be completed due to related data.',
            code: 'FK_VIOLATION'
        };
    }

    // Not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('PGRST116')) {
        return {
            userMessage: 'The requested item was not found.',
            code: 'NOT_FOUND'
        };
    }

    // Authentication errors
    if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('unauthorized')) {
        return {
            userMessage: 'Your session has expired. Please sign in again.',
            code: 'AUTH_ERROR'
        };
    }

    // Network errors
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        return {
            userMessage: 'Network error. Please check your connection and try again.',
            code: 'NETWORK_ERROR'
        };
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return {
            userMessage: 'Too many requests. Please wait a moment and try again.',
            code: 'RATE_LIMITED'
        };
    }

    // Default fallback
    return {
        userMessage: 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN'
    };
}

/**
 * Safely logs errors - only logs detailed info in development mode.
 * In production, logs a sanitized version without exposing internal details.
 */
export function logError(context: string, error: any): void {
    if (isDevelopment) {
        // In development, log full error details for debugging
        console.error(`[${context}]`, error);
    } else {
        // In production, log only safe information
        const errorInfo = mapErrorToUserMessage(error);
        console.error(`[${context}] Error code: ${errorInfo.code}`);
    }
}

/**
 * Gets a user-friendly error message from any error object.
 * Never exposes internal database or API details.
 */
export function getSafeErrorMessage(error: any): string {
    return mapErrorToUserMessage(error).userMessage;
}

/**
 * Combined function that logs safely and returns a user message.
 * Use this in catch blocks for a single call that handles both.
 */
export function handleError(context: string, error: any): string {
    logError(context, error);
    return getSafeErrorMessage(error);
}
