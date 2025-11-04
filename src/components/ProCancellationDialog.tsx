import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { AlertCircle } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner';

interface ProCancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CANCELLATION_REASONS = [
  { value: 'expensive', label: '가격이 비쌉니다' },
  { value: 'not_using', label: '자주 사용하지 않습니다' },
  { value: 'features', label: '필요한 기능이 부족합니다' },
  { value: 'technical', label: '기술적 문제가 있습니다' },
  { value: 'alternative', label: '다른 서비스를 사용합니다' },
  { value: 'temporary', label: '일시적으로 중단합니다' },
  { value: 'other', label: '기타' }
];

export function ProCancellationDialog({ open, onOpenChange, onSuccess }: ProCancellationDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('해제 사유를 선택해주세요');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      toast.error('기타 사유를 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiCall('/pro-cancellation', {
        method: 'POST',
        body: JSON.stringify({
          reason: selectedReason,
          customReason: selectedReason === 'other' ? customReason.trim() : undefined
        })
      });

      toast.success('Pro 해제 신청이 완료되었습니다');
      onOpenChange(false);
      setSelectedReason('');
      setCustomReason('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Pro cancellation request failed:', error);
      toast.error(error.message || 'Pro 해제 신청에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pro 구독 해제</DialogTitle>
          <DialogDescription>
            Pro 구독을 해제하시는 이유를 알려주세요. 더 나은 서비스를 제공하는 데 도움이 됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Message */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">주의사항</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>해제 신청 후 구독 만료일까지 Pro 기능을 이용할 수 있습니다</li>
                <li>만료일 이후 자동으로 무료 플랜으로 전환됩니다</li>
              </ul>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <Label className="mb-3 block">해제 사유를 선택해주세요 *</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              <div className="space-y-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label htmlFor={reason.value} className="cursor-pointer">
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'other' && (
            <div>
              <Label htmlFor="customReason" className="mb-2 block">
                상세 사유를 입력해주세요 *
              </Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="해제 사유를 자세히 알려주세요..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {customReason.length}/500자
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? '처리 중...' : '해제 신청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
