import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';
import { Bell, X } from 'lucide-react';
import { apiCall } from '../utils/api';

interface Notification {
  id: string;
  message: string;
  createdAt: string;
}

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onNotificationsRead: () => void;
}

export function NotificationDialog({ 
  open, 
  onOpenChange, 
  notifications,
  onNotificationsRead 
}: NotificationDialogProps) {
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    setIsMarkingRead(true);
    try {
      // Mark all notifications as read
      await Promise.all(
        notifications.map(notif => 
          apiCall(`/notifications/${notif.id}/read`, { method: 'POST' })
        )
      );
      onNotificationsRead();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleClose = () => {
    if (notifications.length > 0) {
      markAllAsRead();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <DialogTitle>알림</DialogTitle>
            </div>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={isMarkingRead}
              >
                모두 읽음
              </Button>
            )}
          </div>
          <DialogDescription>
            {notifications.length > 0 
              ? `${notifications.length}개의 새로운 알림이 있습니다`
              : '새로운 알림이 없습니다'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] -mx-6 px-6">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>받은 알림이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card key={notification.id} className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button onClick={handleClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
