import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Error boundary for better error handling
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('خطأ في التطبيق:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: "'Cairo', Arial, sans-serif",
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>خطأ في التطبيق</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>حدث خطأ غير متوقع. يرجى تحديث الصفحة.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontFamily: "'Cairo', Arial, sans-serif"
            }}
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
