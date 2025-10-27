import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { AlertCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'post' | 'comment';
  targetId: string;
  accessToken: string;
  onReportSuccess?: () => void;
}

const REPORT_REASONS = [
  '스팸/광고',
  '욕설/비방',
  '개인정보 노출',
  '음란물',
  '기타',
];

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  accessToken,
  onReportSuccess,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('신고 사유를 선택해주세요');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            targetType,
            targetId,
            reason: selectedReason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '신고 접수에 실패했습니다');
      }

      // Success
      onReportSuccess?.();
      onOpenChange(false);
      setSelectedReason('');
      toast.success('✅ 신고가 접수되었습니다.\n검토 후 조치하겠습니다.');
    } catch (err) {
      console.error('Report error:', err);
      setError(err instanceof Error ? err.message : '신고 접수에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>신고하기</DialogTitle>
          <DialogDescription>
            {targetType === 'post' ? '게시글' : '댓글'}을 신고하는 이유를 선택해주세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {REPORT_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} />
                <Label htmlFor={reason} className="cursor-pointer">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedReason}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? '접수 중...' : '신고하기'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
