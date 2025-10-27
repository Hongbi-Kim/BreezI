import React, { useEffect, useState } from 'react';
import { Progress } from './ui/progress';
import { Loader2 } from 'lucide-react';

interface LoadingProgressProps {
  /**
   * 로딩 메시지
   */
  message?: string;
  /**
   * 수동으로 진행률 설정 (0-100)
   */
  value?: number;
  /**
   * 자동으로 진행률 증가 (실제 로딩과 무관하게 시각적 효과)
   */
  auto?: boolean;
  /**
   * 작은 크기로 표시
   */
  small?: boolean;
}

/**
 * 로딩 프로그레스바 컴포넌트
 * - auto=true: 자동으로 진행률이 증가 (페이크 프로그레스)
 * - value 지정: 실제 진행률 표시
 */
export function LoadingProgress({ 
  message = '로딩 중...', 
  value, 
  auto = true,
  small = false 
}: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!auto || value !== undefined) return;

    // 자동 증가 로직 (페이크 프로그레스)
    const interval = setInterval(() => {
      setProgress((prev) => {
        // 90%까지만 자동 증가 (완료는 실제 로딩 완료 시에만)
        if (prev >= 90) return prev;
        
        // 처음엔 빠르게, 나중엔 천천히
        const increment = prev < 30 ? 10 : prev < 60 ? 5 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [auto, value]);

  const currentProgress = value !== undefined ? value : progress;

  if (small) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-3">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <p className="text-sm text-gray-700">{message}</p>
      </div>
      <Progress value={currentProgress} className="h-2" />
      <p className="text-xs text-center text-gray-500">
        {currentProgress}%
      </p>
    </div>
  );
}

/**
 * 전체 화면 로딩 오버레이
 */
export function LoadingOverlay({ 
  message = '처리 중입니다...', 
  value 
}: { 
  message?: string; 
  value?: number;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <LoadingProgress message={message} value={value} />
      </div>
    </div>
  );
}

/**
 * 인라인 로딩 스피너
 */
export function LoadingSpinner({ 
  message, 
  className = '' 
}: { 
  message?: string; 
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      {message && (
        <p className="text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}
