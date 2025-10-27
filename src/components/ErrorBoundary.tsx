import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>앗! 문제가 발생했어요</AlertTitle>
              <AlertDescription>
                예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </AlertDescription>
            </Alert>

            {process.env.NODE_ENV === 'development' && error && (
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-48 mb-4">
                {error.toString()}
                {'\n\n'}
                {error.stack}
              </pre>
            )}

            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
              <Button onClick={this.handleReset} variant="outline" className="flex-1">
                다시 시도
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
