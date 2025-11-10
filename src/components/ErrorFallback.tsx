import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface ErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
}

export function ErrorFallback({
  error,
  onRetry,
  title = '데이터를 불러올 수 없습니다',
  description = '일시적인 문제로 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
  showRetry = true
}: ErrorFallbackProps) {
  // Check if it's a rate limit error
  const isRateLimitError = error?.message?.includes('Too many requests') || 
                           error?.message?.includes('429');
  
  const displayTitle = isRateLimitError 
    ? '서버가 바쁩니다' 
    : title;
  
  const displayDescription = isRateLimitError
    ? '현재 많은 사용자가 접속하여 서버가 바쁩니다. 1-2분 후에 다시 시도해주세요.'
    : description;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <CardTitle>{displayTitle}</CardTitle>
          </div>
          <CardDescription className="text-left">
            {displayDescription}
          </CardDescription>
        </CardHeader>
        {showRetry && onRetry && (
          <CardContent>
            <Button 
              onClick={onRetry} 
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
