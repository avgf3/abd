import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback((
    error: unknown,
    context: string,
    options: ErrorOptions = {}
  ) => {
    const {
      showToast = true,
      logToConsole = true,
      fallbackMessage = 'حدث خطأ غير متوقع'
    } = options;

    // Extract error message
    let errorMessage = fallbackMessage;
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message || fallbackMessage;
      errorDetails = error.stack || '';
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }

    // Log to console
    if (logToConsole) {
      console.error(`[${context}] Error:`, {
        message: errorMessage,
        details: errorDetails,
        originalError: error,
        timestamp: new Date().toISOString()
      });
    }

    // Show toast notification
    if (showToast) {
      toast({
        title: context,
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      });
    }

    // Return formatted error for further handling
    return {
      message: errorMessage,
      details: errorDetails,
      context,
      timestamp: new Date().toISOString()
    };
  }, [toast]);

  const handleAsyncOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    context: string,
    options: ErrorOptions = {}
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error, context, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncOperation
  };
}