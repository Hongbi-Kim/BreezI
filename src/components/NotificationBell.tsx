import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Notification {
  id: string;
  userId: string;
  type: 'warning' | 'comment' | 'suspended' | 'banned';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
  relatedCommentId?: string;
  commenterNickname?: string;
}

interface NotificationBellProps {
  accessToken: string;
  onNavigateToPost?: (postId: string) => void;
}

export function NotificationBell({ accessToken, onNavigateToPost }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/notifications`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/notifications/read-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to related content if applicable
    if (notification.type === 'comment' && notification.relatedId && onNavigateToPost) {
      setShowDialog(false);
      onNavigateToPost(notification.relatedId);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-4 h-4 text-gray-700 stroke-[2.0]" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-600 text-white min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>알람</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-sm"
                >
                  모두 읽음
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              알람을 확인하고 관리하세요.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>알람이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-purple-300 ${
                      notification.isRead
                        ? 'bg-white border-gray-200'
                        : 'bg-purple-50 border-purple-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {notification.type === 'warning' && (
                            <Badge variant="destructive" className="text-xs">
                              경고
                            </Badge>
                          )}
                          {notification.type === 'suspended' && (
                            <Badge className="text-xs bg-orange-600">
                              정지
                            </Badge>
                          )}
                          {notification.type === 'banned' && (
                            <Badge className="text-xs bg-red-700">
                              차단
                            </Badge>
                          )}
                          {notification.type === 'comment' && (
                            <Badge className="text-xs bg-blue-600">
                              댓글
                            </Badge>
                          )}
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm mb-1 whitespace-pre-wrap">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
