import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import ChatPage from "@/pages/chat";
import { Component, ErrorInfo, ReactNode } from "react";

// Error Boundary Class Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("🚨 Error Boundary اكتشف خطأ:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 تفاصيل الخطأ:", error);
    console.error("🚨 معلومات إضافية:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: "'Cairo', Arial, sans-serif",
          color: 'white',
          textAlign: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{ maxWidth: '600px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#fbbf24' }}>
              🚨 حدث خطأ في التطبيق
            </h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              نعتذر، حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '2rem',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '0.8rem'
            }}>
              <strong>تفاصيل الخطأ:</strong><br/>
              {this.state.error?.message || 'خطأ غير معروف'}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                🔄 إعادة تحميل
              </button>
              <button 
                onClick={() => this.setState({ hasError: false })}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                🔄 محاولة مرة أخرى
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function Router() {
  console.log("🛣️ تحميل Router...");
  
  try {
    return (
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route component={ChatPage} />
      </Switch>
    );
  } catch (error) {
    console.error("❌ خطأ في Router:", error);
    throw error;
  }
}

function App() {
  console.log("🎯 تحميل مكون App الرئيسي...");
  
  try {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </UserProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("❌ خطأ في App:", error);
    
    // Fallback UI في حالة فشل كل شيء
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        background: '#1e3a8a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center'
      }}>
        <div>
          <h1>⚠️ خطأ في التطبيق</h1>
          <p>يرجى إعادة تحميل الصفحة</p>
          <button onClick={() => window.location.reload()}>إعادة تحميل</button>
        </div>
      </div>
    );
  }
}

export default App;
