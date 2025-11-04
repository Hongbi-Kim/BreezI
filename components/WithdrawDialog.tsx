import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, customReason?: string) => void;
  isLoading: boolean;
}

const WITHDRAW_REASONS = [
  '서비스가 필요 없어서',
  '사용 방법이 어려워서',
  '개인정보 보호가 걱정되어서',
  '원하는 기능이 없어서',
  'AI 답변이 만족스럽지 않아서',
  '기타'
];

export function WithdrawDialog({ open, onOpenChange, onConfirm, isLoading }: WithdrawDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      toast.error('탈퇴 이유를 선택해주세요.');
      return;
    }

    if (selectedReason === '기타' && !customReason.trim()) {
      toast.error('기타 사유를 입력해주세요.');
      return;
    }

    onConfirm(selectedReason, selectedReason === '기타' ? customReason : undefined);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>탈퇴 시 다음 데이터가 모두 삭제됩니다:</p>
            <ul className="text-sm list-disc list-inside space-y-1 text-gray-600">
              <li>모든 채팅 기록</li>
              <li>감정 일기 및 리포트</li>
              <li>AI 학습 데이터</li>
              <li>Wave Loop 미션 기록</li>
              <li>프로필 정보</li>
            </ul>
            <p className="text-red-600 font-medium mt-2">
              ⚠️ 이 작업은 되돌릴 수 없습니다.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>탈퇴 이유를 알려주세요</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {WITHDRAW_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="font-normal cursor-pointer">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === '기타' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">기타 사유</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="탈퇴 사유를 자세히 알려주세요"
                rows={3}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? '탈퇴 처리 중...' : '탈퇴하기'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
