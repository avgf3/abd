import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-background border border-destructive/20 rounded-lg m-4">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-destructive">
                حدث خطأ غير متوقع
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                عذراً، حدث خطأ أثناء تحميل هذا القسم. يرجى المحاولة مرة أخرى.
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => {
                  this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null
                  });
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                إعادة المحاولة
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="default"
                size="sm"
              >
                <Home className="h-4 w-4 mr-2" />
                إعادة تحميل الصفحة
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left text-xs bg-muted p-3 rounded border">
                <summary className="cursor-pointer font-medium mb-2">
                  تفاصيل الخطأ (وضع التطوير)
                </summary>
                <pre className="whitespace-pre-wrap text-destructive">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;