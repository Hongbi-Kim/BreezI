import React, { useState } from 'react';
import { UserCog, Shield, Eye, X, Mail, Calendar, Activity, Flag, MessageSquare, FileText, MessageCircle, AlertTriangle, Clock, Send, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

interface User {
  userId: string;
  email: string;
  nickname: string;
  birthDate: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastActive: string;
  activityCount: number;
  reportedCount: number;
  reporterCount: number;
  warningCount?: number;
  accountAgeDays?: number;
  daysSinceLastActivity?: number;
  suspendedAt?: string;
  bannedAt?: string;
  suspendReason?: string;
  banReason?: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: any;
  ipAddress: string;
  timestamp: string;
}

interface Report {
  id: string;
  reporterId: string;
  reporterNickname: string;
  reporterEmail?: string;
  targetType: 'post' | 'comment';
  targetId: string;
  targetUserId: string;
  targetUserNickname: string;
  targetUserEmail?: string;
  reason: string;
  status: 'pending' | 'processed' | 'rejected';
  createdAt: string;
  processedAt: string | null;
  processedBy: string | null;
  action: string | null;
  targetContent?: {
    title?: string;
    content: string;
    emotion?: string;
    createdAt: string;
  } | null;
  targetDeleted?: boolean;
}

interface UserDetails {
  profile: any;
  stats: {
    activityCount: number;
    postCount: number;
    commentCount: number;
    diaryCount: number;
    chatRoomCount: number;
    reportedCount: number;
    reporterCount: number;
  };
  recentActivity: ActivityLog[];
  reports: {
    asTarget: Report[];
    asReporter: Report[];
  };
}

interface UserManagementTabProps {
  users: User[];
  accessToken: string;
  onSuspendUser: (userId: string, reason: string) => Promise<void>;
  onBanUser: (userId: string, reason: string) => Promise<void>;
  onActivateUser: (userId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function UserManagementTab({ 
  users, 
  accessToken,
  onSuspendUser,
  onBanUser,
  onActivateUser,
  onRefresh
}: UserManagementTabProps) {
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const itemsPerPage = 10;

  const loadUserDetails = async (userId: string) => {
    try {
      setLoadingUserDetails(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/users/${userId}/details`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data);
        setUserDialogOpen(true);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || '사용자 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('Load user details error:', error);
      toast.error('사용자 정보를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleActivateUser = async () => {
    if (!selectedUser) return;
    const userId = selectedUser.profile.userId;
    
    if (!confirm('사용자 정지/차단을 해제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/users/${userId}/activate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('✅ 사용자 정지/차단이 해제되었습니다');
        await loadUserDetails(userId);
        if (onRefresh) await onRefresh();
      } else {
        toast.error(data.error || '활성화에 실패했습니다');
      }
    } catch (error) {
      console.error('Activate user error:', error);
      toast.error('활성화 중 오류가 발생했습니다');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map(u => u.userId)));
    }
  };

  const handleSendNotification = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('알림을 받을 사용자를 선택해주세요');
      return;
    }

    if (!notificationMessage.trim()) {
      toast.error('알림 내용을 입력해주세요');
      return;
    }

    if (!confirm(`${selectedUserIds.size}명의 사용자에게 알림을 전송하시겠습니까?`)) {
      return;
    }

    setSendingNotification(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            userIds: Array.from(selectedUserIds),
            message: notificationMessage,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(`${selectedUserIds.size}명에게 알림이 전송되었습니다`);
        setNotificationDialogOpen(false);
        setNotificationMessage('');
        setSelectedUserIds(new Set());
      } else {
        toast.error(data.error || '알림 전송에 실패했습니다');
      }
    } catch (error) {
      console.error('Send notification error:', error);
      toast.error('알림 전송 중 오류가 발생했습니다');
    } finally {
      setSendingNotification(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'profile_setup': '프로필 설정',
      'create_post': '게시글 작성',
      'create_comment': '댓글 작성',
      'create_report': '신고 접수',
      'like_post': '게시글 좋아요',
      'delete_post': '게시글 삭제',
      'delete_comment': '댓글 삭제',
      'account_activated': '계정 활성화',
    };
    return labels[action] || action;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">활성</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-600">정지</Badge>;
      case 'banned':
        return <Badge className="bg-red-600">차단</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Debug: Check for duplicate userIds
  React.useEffect(() => {
    const userIds = users.map(u => u.userId);
    const duplicates = userIds.filter((id, index) => userIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.warn('⚠️ Duplicate userIds found:', duplicates);
      console.warn('All userIds:', userIds);
    }
  }, [users]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-purple-600" />
            사용자 관리
          </CardTitle>
          <CardDescription>
            전체 사용자 목록 및 관리 (총 {filteredUsers.length}명)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <input
              type="text"
              placeholder="이메일 또는 닉네임으로 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            
            {selectedUserIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600">{selectedUserIds.size}명 선택됨</Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => setNotificationDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  알림 전송
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>닉네임</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>활동</TableHead>
                  <TableHead>신고당함</TableHead>
                  <TableHead>경고</TableHead>
                  <TableHead>최근활동</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user, index) => (
                  <TableRow key={`user-${user.userId}-${index}`} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.has(user.userId)}
                        onCheckedChange={() => toggleUserSelection(user.userId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell 
                      className="max-w-[200px] truncate cursor-pointer"
                      onClick={() => loadUserDetails(user.userId)}
                    >
                      {user.email}
                    </TableCell>
                    <TableCell onClick={() => loadUserDetails(user.userId)}>
                      {user.nickname}
                    </TableCell>
                    <TableCell onClick={() => loadUserDetails(user.userId)}>
                      {getStatusBadge(user.status)}
                    </TableCell>
                    <TableCell onClick={() => loadUserDetails(user.userId)}>
                      <span className="text-sm text-gray-600">{user.activityCount}건</span>
                    </TableCell>
                    <TableCell onClick={() => loadUserDetails(user.userId)}>
                      {user.reportedCount > 0 ? (
                        <Badge variant="destructive" className="bg-red-500">
                          {user.reportedCount}회
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => loadUserDetails(user.userId)}>
                      {user.warningCount ? (
                        <Badge className="bg-orange-500">{user.warningCount}회</Badge>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => loadUserDetails(user.userId)}>
                      <span className="text-sm text-gray-600">
                        {user.daysSinceLastActivity !== undefined 
                          ? user.daysSinceLastActivity === 0 
                            ? '오늘'
                            : `${user.daysSinceLastActivity}일 전`
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => loadUserDetails(user.userId)}>
                      <span className="text-sm text-gray-600">
                        {user.accountAgeDays !== undefined
                          ? `${user.accountAgeDays}일`
                          : formatDate(user.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadUserDetails(user.userId);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>사용자 상세 정보</DialogTitle>
            <DialogDescription>
              사용자의 프로필, 활동 내역, 신고 기록을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {loadingUserDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              {/* Profile Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="w-5 h-5" />
                    프로필 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">이메일</p>
                      <p>{selectedUser.profile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">닉네임</p>
                      <p>{selectedUser.profile.nickname}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">생년월일</p>
                      <p>{selectedUser.profile.birthDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">상태</p>
                      <div>{getStatusBadge(selectedUser.profile.status || 'active')}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">누적 경고</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedUser.profile.warningCount >= 5 ? 'destructive' : 'secondary'} className="text-sm">
                          {selectedUser.profile.warningCount || 0}/5
                        </Badge>
                        {selectedUser.profile.warningCount >= 5 && (
                          <span className="text-xs text-red-600">정지 기준 도달</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">가입일</p>
                      <p className="text-sm">{formatDate(selectedUser.profile.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">최근 로그인</p>
                      <p className="text-sm">
                        {selectedUser.profile.lastSignIn ? formatDate(selectedUser.profile.lastSignIn) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <Separator className="my-4" />
                  <div className="flex gap-2">
                    {(selectedUser.profile.status === 'suspended' || selectedUser.profile.status === 'banned') ? (
                      <Button
                        onClick={handleActivateUser}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        정지 해제
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          await onSuspendUser(selectedUser.profile.userId, '관리자 조치');
                          setTimeout(async () => {
                            await loadUserDetails(selectedUser.profile.userId);
                            if (onRefresh) await onRefresh();
                          }, 500);
                        }}
                        className="flex-1"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        정지
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Section */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Activity className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl">{selectedUser.stats.activityCount}</div>
                    <p className="text-xs text-gray-600">활동</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl">{selectedUser.stats.postCount}</div>
                    <p className="text-xs text-gray-600">게시글</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl">{selectedUser.stats.commentCount}</div>
                    <p className="text-xs text-gray-600">댓글</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                    <div className="text-2xl">{selectedUser.stats.diaryCount}</div>
                    <p className="text-xs text-gray-600">일기</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                    <div className="text-2xl">{selectedUser.stats.chatRoomCount}</div>
                    <p className="text-xs text-gray-600">채팅방</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Flag className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <div className="text-2xl">{selectedUser.stats.reportedCount}</div>
                    <p className="text-xs text-gray-600">신고됨</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for Activity & Reports */}
              <Tabs defaultValue="activity" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="activity">활동 로그</TabsTrigger>
                  <TabsTrigger value="reported">신고당한 내역</TabsTrigger>
                  <TabsTrigger value="reporter">신고한 내역</TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">최근 활동 ({selectedUser.recentActivity.length}건)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {selectedUser.recentActivity.length > 0 ? (
                            selectedUser.recentActivity.map((log) => (
                              <div key={log.id} className={`${
                                log.action === 'account_activated' 
                                  ? 'bg-green-50 border-green-300' 
                                  : 'bg-gray-50 border-gray-200'
                              } border rounded-lg p-3`}>
                                <div className="flex items-center justify-between mb-2">
                                  <Badge className={`text-xs ${
                                    log.action === 'account_activated' 
                                      ? 'bg-green-600' 
                                      : 'bg-purple-600'
                                  }`}>
                                    {getActionLabel(log.action)}
                                  </Badge>
                                  <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <div className="text-xs text-gray-600 bg-white rounded p-2 border">
                                    {Object.entries(log.details).map(([key, value], index) => (
                                      <div key={`${log.id}-detail-${key}-${index}`}>
                                        <span className="text-gray-500">{key}:</span>{' '}
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-2">IP: {log.ipAddress}</div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-8">활동 내역이 없습니다.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reported" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        신고당한 내역 ({selectedUser.reports.asTarget.length}건)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {selectedUser.reports.asTarget.length > 0 ? (
                            selectedUser.reports.asTarget.map((report) => (
                              <div key={report.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Badge variant="destructive" className="text-xs">
                                    {report.targetType === 'post' ? '게시글' : '댓글'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">{report.reason}</Badge>
                                  {report.status === 'processed' && report.action && (
                                    <Badge className={`text-xs ${
                                      report.action === 'suspend' ? 'bg-red-600' : 
                                      report.action === 'warning' ? 'bg-orange-600' : 
                                      'bg-gray-500'
                                    }`}>
                                      {report.action === 'suspend' ? '정지' : 
                                       report.action === 'warning' ? '경고' : 
                                       '무시'}
                                    </Badge>
                                  )}
                                  {report.status === 'pending' && (
                                    <Badge className="text-xs bg-orange-600">대기중</Badge>
                                  )}
                                  {report.targetDeleted && (
                                    <Badge variant="secondary" className="text-xs bg-gray-400">삭제됨</Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm mb-1">
                                  <span className="text-gray-600">신고자:</span> {report.reporterEmail || report.reporterNickname}
                                </p>
                                
                                {/* Show target content */}
                                {report.targetContent && (
                                  <div className="mt-2 mb-2 p-2 bg-white border border-red-300 rounded">
                                    <p className="text-xs text-gray-600 mb-1">신고된 내용:</p>
                                    {report.targetType === 'post' && report.targetContent.title && (
                                      <p className="text-xs mb-1">
                                        <span className="text-gray-500">제목:</span> {report.targetContent.title}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-700 line-clamp-3">
                                      {report.targetContent.content}
                                    </p>
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-300">
                                  <p className="text-xs text-gray-500">
                                    신고: {formatDate(report.createdAt)}
                                  </p>
                                  {report.processedAt && (
                                    <p className="text-xs text-gray-500">
                                      처리: {formatDate(report.processedAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-8">신고당한 내역이 없습니다.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reporter" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        신고한 내역 ({selectedUser.reports.asReporter.length}건)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {selectedUser.reports.asReporter.length > 0 ? (
                            selectedUser.reports.asReporter.map((report) => (
                              <div key={report.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {report.targetType === 'post' ? '게시글' : '댓글'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">{report.reason}</Badge>
                                  <Badge className={`text-xs ${report.status === 'pending' ? 'bg-orange-600' : 'bg-gray-500'}`}>
                                    {report.status === 'pending' ? '대기중' : '��리완료'}
                                  </Badge>
                                </div>
                                <p className="text-sm">
                                  <span className="text-gray-600">대상:</span> {report.targetUserNickname}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(report.createdAt)}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-8">신고한 내역이 없습니다.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              알림 전송
            </DialogTitle>
            <DialogDescription>
              선택한 {selectedUserIds.size}명의 사용자에게 알림을 전송합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-message">알림 내용</Label>
              <Textarea
                id="notification-message"
                placeholder="사용자에게 전송할 알림 내용을 입력하세요..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                {notificationMessage.length} / 500자
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">전송 대상:</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600">{selectedUserIds.size}명</Badge>
                {selectedUserIds.size > 0 && (
                  <span className="text-xs text-gray-500">
                    {Array.from(selectedUserIds).slice(0, 3).map(id => {
                      const user = users.find(u => u.userId === id);
                      return user?.nickname || user?.email;
                    }).join(', ')}
                    {selectedUserIds.size > 3 && ` 외 ${selectedUserIds.size - 3}명`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setNotificationDialogOpen(false);
                  setNotificationMessage('');
                }}
                className="flex-1"
                disabled={sendingNotification}
              >
                취소
              </Button>
              <Button
                onClick={handleSendNotification}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={sendingNotification || !notificationMessage.trim()}
              >
                {sendingNotification ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    전송
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
