import React from 'react';
import { AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { supabase } from '../utils/supabase/client';

interface SuspendedAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suspendedInfo: {
    status: 'suspended' | 'banned';
    reason: string;
    userId: string;
    email: string;
    accessToken: string;
  } | null;
  onSubmitUnbanRequest: (reason: string) => Promise<void>;
}

type Step = 'form' | 'success';

export function SuspendedAccountDialog({ 
  open, 
  onOpenChange, 
  suspendedInfo,
  onSubmitUnbanRequest
}: SuspendedAccountDialogProps) {
  const [step, setStep] = React.useState<Step>('form');
  const [unbanRequestReason, setUnbanRequestReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Reset to initial state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('form');
        setUnbanRequestReason('');
      }, 300);
    }
  }, [open]);

  if (!suspendedInfo) return null;

  const statusText = suspendedInfo.status === 'suspended' ? '정지' : '차단';
  const statusColor = suspendedInfo.status === 'suspended' ? 'text-orange-600' : 'text-red-600';
  const badgeColor = suspendedInfo.status === 'suspended' ? 'bg-orange-600' : 'bg-red-600';

  const handleSubmit = async () => {
    if (!unbanRequestReason.trim()) {
      alert('해제 요청 사유를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitUnbanRequest(unbanRequestReason.trim());
      setStep('success');
    } catch (error) {
      console.error('Failed to submit unban request:', error);
      alert('요청 제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    // Make sure to sign out when closing the dialog after request submission
    // This ensures the suspended user's session is cleared
    if (step === 'success') {
      try {
        console.log('Signing out suspended user after request submission');
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent closing the dialog while form is being submitted
      if (!newOpen && submitting) {
        return;
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside during submission
          if (submitting) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with Escape key during submission
          if (submitting) {
            e.preventDefault();
          }
        }}
      >
        {/* Form - Show info and request form together */}
        {step === 'form' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Shield className={`w-5 h-5 ${statusColor}`} />
                <DialogTitle className={statusColor}>계정 {statusText}</DialogTitle>
              </div>
              <DialogDescription>
                귀하의 계정이 {statusText}되어 로그인할 수 없습니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge className={badgeColor}>{statusText}된 계정</Badge>
                <span className="text-xs text-gray-500">{suspendedInfo.email}</span>
              </div>

              {/* Reason */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5" />
                  <p className="text-sm">{statusText} 사유</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap pl-6">
                  {suspendedInfo.reason}
                </p>
              </div>

              {/* Unban Request Form */}
              <div className="pt-3 border-t border-gray-200">
                <div className="mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-900">
                      {statusText} 해제를 요청하실 수 있습니다. 관리자가 검토한 후 연락드립니다.
                    </p>
                  </div>
                  <Label htmlFor="unban-reason" className="text-sm">
                    해제 요청 사유
                  </Label>
                </div>
                <Textarea
                  id="unban-reason"
                  value={unbanRequestReason}
                  onChange={(e) => setUnbanRequestReason(e.target.value)}
                  placeholder={`${statusText} 해제가 필요한 사유를 자세히 설명해주세요...\n\n예시:\n- 오해로 인한 신고였음을 확인했습니다\n- 규정을 숙지했으며 재발하지 않겠습니다\n- 부적절한 행동에 대해 사과드립니다`}
                  className="min-h-[140px] resize-none"
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1"
              >
                닫기
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !unbanRequestReason.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitting ? '제출 중...' : '해제 요청 제출'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Success - Request submitted */}
        {step === 'success' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <DialogTitle className="text-green-600">요청이 완료됐습니다</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900 mb-2">
                  {statusText} 해제 요청이 성공적으로 제출되었습니다.
                </p>
                <p className="text-sm text-green-800">
                  관리자가 검토한 후 등록하신 이메일({suspendedInfo.email})로 연락드리겠습니다.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  💡 검토는 보통 1-2일 이내에 완료됩니다.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleClose}
                className="w-full"
              >
                확인
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
