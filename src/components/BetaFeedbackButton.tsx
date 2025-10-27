import { useState } from 'react';
import { MessageSquarePlus, Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

interface FeedbackButtonProps {
  accessToken: string;
}

/**
 * 피드백 수집 플로팅 버튼
 */
export function FeedbackButton({ accessToken }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error('피드백 내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      // ProfilePage의 피드백 보내기와 동일한 방식으로 전송
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/feedback/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            content: feedback.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast.success('✨ 소중한 피드백 감사합니다!\n더 나은 서비스를 만들겠습니다.');
      setFeedback('');
      setOpen(false);
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast.error('피드백 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-2"
          size="icon"
        >
          <MessageSquarePlus className="w-5 h-5 sm:mr-2" />
          <span className="hidden sm:inline">피드백</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>피드백 보내기</DialogTitle>
          <DialogDescription>
            BreezI를 더 좋게 만들기 위한 여러분의 의견을 들려주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="개선 아이디어, 불편한 점, 칭찬 등 무엇이든 좋습니다!"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
            maxLength={500}
            className="resize-none"
          />
          <div className="text-xs text-gray-500 text-right">
            {feedback.length}/500글자
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !feedback.trim()}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? '전송 중...' : '전송'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
