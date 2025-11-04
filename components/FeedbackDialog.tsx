import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner';

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
}

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error('피드백 내용을 입력해주세요.');
      return;
    }

    setIsSending(true);
    try {
      await apiCall('/feedback', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() })
      });

      toast.success('피드백이 전송되었습니다. 소중한 의견 감사합니다! 🙏');
      setContent('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to send feedback:', error);
      toast.error(`피드백 전송에 실패했습니다: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            피드백 보내기
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            피드백 보내기
          </DialogTitle>
          <DialogDescription>
            Wave I를 사용하면서 느낀 점, 개선이 필요한 점, 새로운 아이디어 등을 자유롭게 공유해주세요!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="의견을 입력해주세요..."
            rows={6}
            className="resize-none"
          />
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setContent('');
              }}
              disabled={isSending}
            >
              취소
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !content.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? '전송 중...' : '전송'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
