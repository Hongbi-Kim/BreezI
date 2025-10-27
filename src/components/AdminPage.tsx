import React, { useState, useEffect } from 'react';
import { BarChart3, Users, MessageSquare, TrendingUp, AlertCircle, Flag, Shield, CheckCircle, Activity, Eye, UserCog, X, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { UserManagementTab } from './UserManagementTab';
import { FeedbackAndDeletionTab } from './FeedbackAndDeletionTab';
import { toast } from 'sonner';

interface AdminPageProps {
  accessToken: string;
}

interface AdminStats {
  userCount: number;
  deletionCount: number;
  deletionReasons: Record<string, number>;
  ageGroups: Record<string, number>;
}

interface Feedback {
  id: string;
  message: string;
  timestamp: string;
  userId: string;
  userNickname: string;
  userEmail: string;
  isRead: boolean;
  readAt?: string;
  readBy?: string;
}

interface Report {
  id: string;
  reporterId: string;
  reporterNickname: string;
  reporterEmail?: string;
  reporterDeleted?: boolean;
  reporterIp?: string;
  targetType: 'post' | 'comment';
  targetId: string;
  targetUserId: string;
  targetUserNickname: string;
  targetUserEmail?: string;
  targetUserDeleted?: boolean;
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
    authorIp?: string;
  } | null;
  savedContent?: {
    title?: string;
    content: string;
    emotion?: string;
    createdAt: string;
    authorIp?: string;
  } | null;
  targetDeleted?: boolean;
}

interface ActivityLog {
  id: string;
  userId: string;
  userNickname?: string;
  action: string;
  details: any;
  ipAddress: string;
  timestamp: string;
}

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

interface UnbanRequest {
  id: string;
  userId: string;
  email: string;
  nickname: string;
  reason: string;
  currentStatus: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt: string | null;
  processedBy: string | null;
}

interface VerificationRequest {
  id: string;
  userId: string;
  email: string;
  nickname: string;
  deletedUserRecord: {
    reportedCount: number;
    reporterCount: number;
    warningCount: number;
    suspensionHistory: any[];
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt: string | null;
  processedBy: string | null;
}

export function AdminPage({ accessToken }: AdminPageProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [unbanRequests, setUnbanRequests] = useState<UnbanRequest[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  
  // Pagination states
  const [reportsPage, setReportsPage] = useState(1);
  const [unbanRequestsPage, setUnbanRequestsPage] = useState(1);
  const [verificationsPage, setVerificationsPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAdminData();
  }, []);

  // 피드백 탭으로 전환 시 모든 미확인 피드백을 읽음 처리
  useEffect(() => {
    if (activeTab === 'feedback') {
      markAllFeedbackAsRead();
    }
  }, [activeTab]);

  const markAllFeedbackAsRead = async () => {
    // 미확인 피드백이 없으면 API 호출 생략
    const unreadCount = feedback.filter(f => !f.isRead).length;
    if (unreadCount === 0) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/feedback/mark-all-read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        // 로컬 상태 업데이트
        setFeedback(prev => prev.map(f => ({ ...f, isRead: true })));
        console.log(`✅ ${unreadCount} feedback items marked as read`);
      }
    } catch (error) {
      console.error('❌ Failed to mark feedback as read:', error);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('⚡ Fetching all admin data in parallel...');
      const startTime = performance.now();

      // Fetch all data in parallel using Promise.allSettled to prevent one failure from blocking others
      const [
        statsResponse,
        feedbackResponse,
        reportsResponse,
        logsResponse,
        usersResponse,
        unbanRequestsResponse,
        verificationsResponse
      ] = await Promise.allSettled([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/stats`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/feedback`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/reports`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/activity-logs?limit=100`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/users`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/unban-requests`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/verifications`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      ]);

      // Process stats
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        console.log('📊 Stats data received:', statsData);
        if (!statsData.error) {
          setStats(statsData);
        }
      } else {
        console.error('Failed to fetch stats');
      }

      // Process feedback
      if (feedbackResponse.status === 'fulfilled' && feedbackResponse.value.ok) {
        const feedbackData = await feedbackResponse.value.json();
        console.log('💬 Feedback data received:', feedbackData.feedback?.length || 0, 'items');
        setFeedback(feedbackData.feedback || []);
      } else {
        console.error('Failed to fetch feedback');
      }

      // Process reports
      if (reportsResponse.status === 'fulfilled' && reportsResponse.value.ok) {
        const reportsData = await reportsResponse.value.json();
        console.log('🚩 Reports data received:', reportsData.reports?.length || 0, 'items');
        setReports(reportsData.reports || []);
      } else {
        console.error('Failed to fetch reports');
      }

      // Process activity logs
      if (logsResponse.status === 'fulfilled' && logsResponse.value.ok) {
        const logsData = await logsResponse.value.json();
        console.log('📋 Activity logs received:', logsData.logs?.length || 0, 'items');
        setActivityLogs(logsData.logs || []);
      } else {
        console.error('Failed to fetch activity logs');
      }

      // Process users
      if (usersResponse.status === 'fulfilled' && usersResponse.value.ok) {
        const usersData = await usersResponse.value.json();
        console.log('👥 Users data received:', usersData.users?.length || 0, 'items');
        setUsers(usersData.users || []);
      } else {
        console.error('Failed to fetch users');
      }

      // Process unban requests
      if (unbanRequestsResponse.status === 'fulfilled' && unbanRequestsResponse.value.ok) {
        const unbanRequestsData = await unbanRequestsResponse.value.json();
        console.log('🔓 Unban requests received:', unbanRequestsData.requests?.length || 0, 'items');
        setUnbanRequests(unbanRequestsData.requests || []);
      } else {
        console.error('Failed to fetch unban requests');
      }

      // Process verifications
      if (verificationsResponse.status === 'fulfilled' && verificationsResponse.value.ok) {
        const verificationsData = await verificationsResponse.value.json();
        console.log('✅ Verifications received:', verificationsData.verifications?.length || 0, 'items');
        setVerifications(verificationsData.verifications || []);
      } else {
        console.error('Failed to fetch verification requests');
      }

      const endTime = performance.now();
      console.log(`⚡ All admin data loaded in ${Math.round(endTime - startTime)}ms`)
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setError(err.message || '관리자 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string, reason: string) => {
    if (!confirm(`사용자를 정지하시겠습니까?\n사유: ${reason}`)) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/users/${userId}/suspend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        toast.success('✅ 사용자가 정지되었습니다');
        loadAdminData();
      } else {
        const data = await response.json();
        toast.error(data.error || '사용자 정지에 실패했습니다');
      }
    } catch (error) {
      console.error('Suspend user error:', error);
      toast.error('사용자 정지 중 오류가 발생했습니다');
    }
  };

  const handleBanUser = async (userId: string, reason: string) => {
    if (!confirm(`사용자를 차단하시겠습니까?\n사유: ${reason}`)) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/users/${userId}/ban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        toast.success('✅ 사용자가 차단되었습니다');
        loadAdminData();
      } else {
        const data = await response.json();
        toast.error(data.error || '사용자 ��단에 실패했습니다');
      }
    } catch (error) {
      console.error('Ban user error:', error);
      toast.error('사용자 차단 중 오류가 발생했습니다');
    }
  };

  const handleActivateUser = async (userId: string) => {
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

      if (response.ok) {
        toast.success('✅ 사용자 정지/차단이 해제되었습니다');
        loadAdminData();
      } else {
        const data = await response.json();
        toast.error(data.error || '활성화에 실패했습니다');
      }
    } catch (error) {
      console.error('Activate user error:', error);
      toast.error('활성화 중 오류가 발생했습니다');
    }
  };

  const handleProcessUnbanRequest = async (requestId: string, action: 'approve' | 'reject') => {
    const actionText = action === 'approve' ? '승인' : '거부';
    if (!confirm(`이 정지 해제 요청을 ${actionText}하시겠습니까?`)) return;

    try {
      console.log(`🔄 Processing unban request ${requestId} with action: ${action}`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/unban-requests/${requestId}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action }),
        }
      );

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Unban request processed:', data);
        toast.success(`✅ 정지 해제 요청이 ${actionText}되었습니다`);
        loadAdminData();
      } else {
        const errorData = await response.json();
        console.error('❌ Process unban request failed:', errorData);
        toast.error(errorData.error || `정지 해제 요청 ${actionText}에 실패했습니다`);
      }
    } catch (error) {
      console.error('Process unban request error:', error);
      toast.error(`정지 해제 요청 ${actionText} 중 오류가 발생했습니다`);
    }
  };

  const handleProcessVerification = async (verificationId: string, action: 'approve' | 'reject') => {
    const actionText = action === 'approve' ? '승인' : '거부';
    if (!confirm(`이 계정 검증을 ${actionText}하시겠습니까?`)) return;

    try {
      console.log(`🔄 Processing verification ${verificationId} with action: ${action}`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/verifications/${verificationId}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action }),
        }
      );

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Verification processed:', data);
        toast.success(`✅ 계정 검증이 ${actionText}되었습니다`);
        loadAdminData();
      } else {
        const errorData = await response.json();
        console.error('❌ Process verification failed:', errorData);
        toast.error(errorData.error || `계정 검증 ${actionText}에 실패했습니다`);
      }
    } catch (error) {
      console.error('Process verification error:', error);
      toast.error(`계정 검증 ${actionText} 중 오류가 발생했습니다`);
    }
  };

  const handleProcessReport = async (reportId: string, action: 'suspend' | 'warning' | 'ignore', targetUserId?: string, reason?: string) => {
    try {
      console.log(`🔄 Processing report ${reportId} with action: ${action}`);
      
      // Process the report first
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/admin/reports/${reportId}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Report processed successfully:`, data);
        console.log(`📊 Action applied: ${action}`);
        
        let message = '✅ 신고가 처리되었습니다';
        if (action === 'suspend') {
          message = '✅ 사용���가 정지되었으며 신고가 처리 완료되었습니다';
        } else if (action === 'warning') {
          message = '⚠️ 경고가 발송되었으며 신고가 처리 완료되었습니다';
        } else if (action === 'ignore') {
          message = '✅ 신고가 무시 처리되었습니다';
        }
        toast.success(message);
        loadAdminData();
      } else {
        const data = await response.json();
        console.error(`❌ Report processing failed:`, data);
        toast.error(data.error || '신고 처리에 실패했습니다');
      }
    } catch (error) {
      console.error('❌ Process report error:', error);
      toast.error('신고 처리 중 오류가 발생했습니다');
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

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      'not_satisfied': '서비스가 만족스럽지 않아요',
      'low_usage': '사용 빈도가 낮아요',
      'privacy_concern': '개인정보 보호가 걱정돼요',
      'switching_service': '다른 서비스를 사용할 예정이에요',
      'Not specified': '미지정',
    };
    return labels[reason] || reason;
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
    };
    return labels[action] || action;
  };

  const toggleReportExpansion = (reportId: string) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  const getEmotionLabel = (emotion: string) => {
    const labels: Record<string, string> = {
      'happy': '😊 기쁨',
      'sad': '😢 슬픔',
      'angry': '😠 화남',
      'anxious': '😰 불안',
    };
    return labels[emotion] || emotion;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">관리자 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const processedReports = reports.filter(r => r.status === 'processed' || r.status === 'rejected');
  const pendingUnbanRequests = unbanRequests.filter(r => r.status === 'pending');
  
  // Paginate pending reports
  const totalPendingReportsPages = Math.ceil(pendingReports.length / itemsPerPage);
  const paginatedPendingReports = pendingReports.slice(
    (reportsPage - 1) * itemsPerPage,
    reportsPage * itemsPerPage
  );
  
  // Paginate unban requests
  const totalUnbanRequestsPages = Math.ceil(unbanRequests.length / itemsPerPage);
  const paginatedUnbanRequests = unbanRequests.slice(
    (unbanRequestsPage - 1) * itemsPerPage,
    unbanRequestsPage * itemsPerPage
  );
  
  // Paginate verifications
  const totalVerificationsPages = Math.ceil(verifications.length / itemsPerPage);
  const paginatedVerifications = verifications.slice(
    (verificationsPage - 1) * itemsPerPage,
    verificationsPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 pb-24">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl mb-2 text-purple-800">관리자 대시보드</h1>
          <p className="text-gray-600">BreezI 서비스 통계 및 관리</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                전체 사용자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-blue-600">{stats?.userCount || 0}</div>
              <p className="text-sm text-gray-600 mt-1">명</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-red-600" />
                탈퇴한 사용자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-red-600">{stats?.deletionCount || 0}</div>
              <p className="text-sm text-gray-600 mt-1">명</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-green-600" />
                피드백
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-green-600">{feedback.length}</div>
              <p className="text-sm text-gray-600 mt-1">건</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flag className="w-5 h-5 text-orange-600" />
                신고
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-orange-600">{pendingReports.length}</div>
              <p className="text-sm text-gray-600 mt-1">건 대기 중</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">사용자</TabsTrigger>
            <TabsTrigger value="reports" className="relative">
              신고
              {pendingReports.length > 0 && (
                <Badge className="ml-2 bg-orange-600">{pendingReports.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unbans" className="relative">
              정지해제
              {unbanRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="ml-2 bg-blue-600">{unbanRequests.filter(r => r.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="verifications" className="relative">
              검증
              {verifications.filter(v => v.status === 'pending').length > 0 && (
                <Badge className="ml-2 bg-yellow-600">{verifications.filter(v => v.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="relative">
              피드백
              {feedback.filter(f => !f.isRead).length > 0 && (
                <Badge className="ml-2 bg-green-600">{feedback.filter(f => !f.isRead).length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback-deletion">탈퇴</TabsTrigger>
          </TabsList>

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-4 mt-6">
            <UserManagementTab
              users={users}
              accessToken={accessToken}
              onSuspendUser={handleSuspendUser}
              onBanUser={handleBanUser}
              onActivateUser={handleActivateUser}
              onRefresh={loadAdminData}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-orange-600" />
                  신고 관리
                </CardTitle>
                <CardDescription>
                  사용자 신고 내역 및 처리 ({pendingReports.length}건 대기 중)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">신고 내역이 없습니다.</p>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {/* Pending Reports */}
                      {pendingReports.length > 0 && (
                        <div>
                          <h3 className="text-sm mb-3 text-orange-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            대기 중인 신고 ({pendingReports.length}건, {reportsPage}/{totalPendingReportsPages}페이지)
                          </h3>
                          <div className="space-y-3">
                            {paginatedPendingReports.map((report) => (
                              <div key={report.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="destructive" className="text-xs">
                                        {report.targetType === 'post' ? '게시글' : '댓글'}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {report.reason}
                                      </Badge>
                                      {report.targetDeleted && (
                                        <Badge variant="secondary" className="text-xs bg-gray-400">
                                          삭제됨
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm space-y-1">
                                      <p>
                                        <span className="text-gray-600">신고자:</span> {report.reporterEmail || report.reporterNickname}
                                        {report.reporterDeleted && <Badge variant="secondary" className="ml-2 text-xs">탈퇴한 계정</Badge>}
                                      </p>
                                      {report.reporterIp && (
                                        <p className="text-xs text-gray-500 ml-14">
                                          IP: {report.reporterIp}
                                        </p>
                                      )}
                                      <p>
                                        <span className="text-gray-600">대상 사용자:</span> {report.targetUserEmail || report.targetUserNickname}
                                        {report.targetUserDeleted && <Badge variant="secondary" className="ml-2 text-xs">탈퇴한 계정</Badge>}
                                      </p>
                                      {report.savedContent?.authorIp && (
                                        <p className="text-xs text-gray-500 ml-14">
                                          작성자 IP: {report.savedContent.authorIp}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">{formatDate(report.createdAt)}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Show/Hide Content Button */}
                                {report.targetContent && !report.targetDeleted && (
                                  <Collapsible open={expandedReports.has(report.id)}>
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleReportExpansion(report.id)}
                                        className="w-full mb-3"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        {expandedReports.has(report.id) ? '내용 숨기기' : '신고된 내용 보기'}
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2 mb-3">
                                      <div className="bg-white border border-orange-300 rounded-lg p-3">
                                        {report.savedContent?.deleted ? (
                                          <div className="text-center py-4">
                                            <p className="text-sm text-gray-500">
                                              🗑️ 법적 보관 기한(1년) 만료로 영구 삭제됨
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                              {report.savedContent.deletedReason}
                                            </p>
                                          </div>
                                        ) : (
                                          <>
                                            {report.targetType === 'post' && report.targetContent.title && (
                                              <div className="mb-2">
                                                <span className="text-xs text-gray-500">제목:</span>
                                                <p className="text-sm mt-1">{report.targetContent.title}</p>
                                              </div>
                                            )}
                                            <div className="mb-2">
                                              <span className="text-xs text-gray-500">내용:</span>
                                              <p className="text-sm mt-1 whitespace-pre-wrap">{report.targetContent.content}</p>
                                            </div>
                                            {report.targetContent.emotion && (
                                              <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {getEmotionLabel(report.targetContent.emotion)}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                  {formatDate(report.targetContent.createdAt)}
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                                
                                <div className="flex gap-2 mt-3 pt-3 border-t border-orange-200">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleProcessReport(report.id, 'suspend', report.targetUserId, `신고 ���유: ${report.reason}`)}
                                    className="flex-1"
                                  >
                                    <Shield className="w-4 h-4 mr-1" />
                                    정지
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleProcessReport(report.id, 'warning')}
                                    className="flex-1"
                                  >
                                    경고
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleProcessReport(report.id, 'ignore')}
                                    className="flex-1"
                                  >
                                    무시
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Pagination for Pending Reports */}
                          {totalPendingReportsPages > 1 && (
                            <div className="mt-4">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                                      className={reportsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>
                                  {Array.from({ length: totalPendingReportsPages }, (_, i) => i + 1).map(page => (
                                    <PaginationItem key={page}>
                                      <PaginationLink
                                        onClick={() => setReportsPage(page)}
                                        isActive={reportsPage === page}
                                        className="cursor-pointer"
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => setReportsPage(p => Math.min(totalPendingReportsPages, p + 1))}
                                      className={reportsPage === totalPendingReportsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Processed Reports */}
                      {processedReports.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-sm mb-3 text-gray-600 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            처리 완료 ({processedReports.length}건)
                          </h3>
                          <div className="space-y-3">
                            {processedReports.map((report) => (
                              <div key={report.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {report.targetType === 'post' ? '게시글' : '댓글'}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {report.reason}
                                      </Badge>
                                      <Badge className={`text-xs ${
                                        report.action === 'suspend' ? 'bg-red-600' : 
                                        report.action === 'warning' ? 'bg-orange-600' : 
                                        'bg-gray-500'
                                      }`}>
                                        {report.action === 'suspend' ? '정지' : 
                                         report.action === 'warning' ? '경고' : 
                                         '무시'}
                                      </Badge>
                                      {report.targetDeleted && (
                                        <Badge variant="secondary" className="text-xs bg-gray-400">
                                          삭제됨
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm space-y-1">
                                      <p>
                                        <span className="text-gray-600">신고자:</span> {report.reporterEmail || report.reporterNickname}
                                        {report.reporterDeleted && <Badge variant="secondary" className="ml-2 text-xs">탈퇴한 계정</Badge>}
                                      </p>
                                      {report.reporterIp && (
                                        <p className="text-xs text-gray-500 ml-14">
                                          IP: {report.reporterIp}
                                        </p>
                                      )}
                                      <p>
                                        <span className="text-gray-600">대상 사용자:</span> {report.targetUserEmail || report.targetUserNickname}
                                        {report.targetUserDeleted && <Badge variant="secondary" className="ml-2 text-xs">탈퇴한 계정</Badge>}
                                      </p>
                                      {report.savedContent?.authorIp && (
                                        <p className="text-xs text-gray-500 ml-14">
                                          작성자 IP: {report.savedContent.authorIp}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        신고: {formatDate(report.createdAt)} / 처리: {report.processedAt ? formatDate(report.processedAt) : '-'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Show/Hide Content Button for processed reports */}
                                {report.targetContent && (
                                  <Collapsible open={expandedReports.has(report.id)}>
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleReportExpansion(report.id)}
                                        className="w-full mb-2"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        {expandedReports.has(report.id) ? '내용 숨기기' : '신고된 내용 보기'}
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2">
                                      <div className="bg-white border border-gray-300 rounded-lg p-3">
                                        {report.savedContent?.deleted ? (
                                          <div className="text-center py-4">
                                            <p className="text-sm text-gray-500">
                                              🗑️ 법적 보관 기한(1년) 만료로 영구 삭제됨
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                              {report.savedContent.deletedReason}
                                            </p>
                                          </div>
                                        ) : (
                                          <>
                                            {report.targetType === 'post' && report.targetContent.title && (
                                              <div className="mb-2">
                                                <span className="text-xs text-gray-500">제목:</span>
                                                <p className="text-sm mt-1">{report.targetContent.title}</p>
                                              </div>
                                            )}
                                            <div className="mb-2">
                                              <span className="text-xs text-gray-500">내용:</span>
                                              <p className="text-sm mt-1 whitespace-pre-wrap">{report.targetContent.content}</p>
                                            </div>
                                            {report.targetContent.emotion && (
                                              <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {getEmotionLabel(report.targetContent.emotion)}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                              {formatDate(report.targetContent.createdAt)}
                                            </span>
                                          </div>
                                        )}
                                        {report.targetDeleted && (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            <span className="text-xs text-orange-600 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" />
                                              이 콘텐츠는 삭제되었습니다 (저장된 내용)
                                            </span>
                                          </div>
                                        )}
                                          </>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}

                                {/* Re-process buttons for processed reports */}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                  <Button
                                    size="sm"
                                    variant={report.action === 'suspend' ? 'default' : 'outline'}
                                    onClick={() => handleProcessReport(report.id, 'suspend', report.targetUserId, `신고 사유: ${report.reason}`)}
                                    className={report.action === 'suspend' ? 'flex-1 bg-red-600 hover:bg-red-700' : 'flex-1'}
                                    disabled={report.action === 'suspend'}
                                  >
                                    <Shield className="w-4 h-4 mr-1" />
                                    정지
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={report.action === 'warning' ? 'default' : 'outline'}
                                    onClick={() => handleProcessReport(report.id, 'warning')}
                                    className={report.action === 'warning' ? 'flex-1 bg-orange-600 hover:bg-orange-700' : 'flex-1'}
                                    disabled={report.action === 'warning'}
                                  >
                                    경고
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={report.action === 'ignore' ? 'default' : 'ghost'}
                                    onClick={() => handleProcessReport(report.id, 'ignore')}
                                    className={report.action === 'ignore' ? 'flex-1 bg-gray-500 hover:bg-gray-600' : 'flex-1'}
                                    disabled={report.action === 'ignore'}
                                  >
                                    무시
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unban Requests Tab */}
          <TabsContent value="unbans" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  정지 해제 요청
                </CardTitle>
                <CardDescription>
                  사용자 정지 해제 요청 목록 (총 {unbanRequests.length}건)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unbanRequests.length > 0 ? (
                  <>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {paginatedUnbanRequests.map((request, index) => (
                        <div key={request.id}>
                          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {request.nickname}
                                  </Badge>
                                  <span className="text-xs text-gray-600">
                                    {request.email}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={
                                    request.status === 'pending' ? 'bg-yellow-600' :
                                    request.status === 'approved' ? 'bg-green-600' :
                                    'bg-red-600'
                                  }>
                                    {request.status === 'pending' ? '대기 중' :
                                     request.status === 'approved' ? '승인됨' :
                                     '거부됨'}
                                  </Badge>
                                  <Badge variant="outline" className={
                                    request.currentStatus === 'active' ? 'text-green-600 border-green-600' :
                                    request.currentStatus === 'suspended' ? 'text-orange-600 border-orange-600' :
                                    'text-red-600 border-red-600'
                                  }>
                                    현재: {
                                      request.currentStatus === 'active' ? '활성' :
                                      request.currentStatus === 'suspended' ? '정지' : 
                                      '차단'
                                    }
                                  </Badge>
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(request.createdAt)}
                              </span>
                            </div>
                            <div className="mb-3">
                              <p className="text-sm mb-1">
                                <strong>요청 사유:</strong>
                              </p>
                              <p className="text-sm text-gray-700 bg-white p-3 rounded border whitespace-pre-wrap">
                                {request.reason}
                              </p>
                            </div>
                            {request.status === 'pending' && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  onClick={() => handleProcessUnbanRequest(request.id, 'approve')}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  onClick={() => handleProcessUnbanRequest(request.id, 'reject')}
                                  variant="destructive"
                                  className="flex-1"
                                  size="sm"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  거부
                                </Button>
                              </div>
                            )}
                            {request.status !== 'pending' && request.processedAt && (
                              <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                                처리 일시: {formatDate(request.processedAt)}
                              </div>
                            )}
                          </div>
                          {index < unbanRequests.length - 1 && <Separator className="my-4" />}
                        </div>
                      ))}
                      </div>
                    </ScrollArea>
                    
                    {/* Pagination for Unban Requests */}
                    {totalUnbanRequestsPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setUnbanRequestsPage(p => Math.max(1, p - 1))}
                                className={unbanRequestsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalUnbanRequestsPages }, (_, i) => i + 1).map(page => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setUnbanRequestsPage(page)}
                                  isActive={unbanRequestsPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setUnbanRequestsPage(p => Math.min(totalUnbanRequestsPages, p + 1))}
                                className={unbanRequestsPage === totalUnbanRequestsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">정지 해제 요청이 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Verification Tab */}
          <TabsContent value="verifications" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-yellow-600" />
                  계정 검증
                </CardTitle>
                <CardDescription>
                  신고 이력이 있는 재가입 계정 검증 ({verifications.filter(v => v.status === 'pending').length}건 대기 중)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">계정 검증 요청이 없습니다.</p>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {/* Pending Verifications */}
                      {verifications.filter(v => v.status === 'pending').length > 0 && (
                        <div>
                          <h3 className="text-sm mb-3 text-yellow-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            검증 대기 중 ({verifications.filter(v => v.status === 'pending').length}건)
                          </h3>
                          <div className="space-y-3">
                            {verifications.filter(v => v.status === 'pending').map((verification, index) => (
                              <div key={verification.id}>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs bg-yellow-100">
                                          재가입 계정
                                        </Badge>
                                      </div>
                                      <div className="text-sm space-y-1">
                                        <p><span className="text-gray-600">이메일:</span> {verification.email}</p>
                                        <p><span className="text-gray-600">닉네임:</span> {verification.nickname}</p>
                                        <p className="text-xs text-gray-500">요청 일시: {formatDate(verification.createdAt)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Previous Account Info */}
                                  {verification.deletedUserRecord && (
                                    <div className="space-y-3 mb-3">
                                      {/* Previous Join Date */}
                                      <div className="bg-white border border-gray-300 rounded-lg p-3">
                                        <p className="text-sm mb-2">이전 계정 정보:</p>
                                        <div className="space-y-1 text-sm">
                                          <p className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-600" />
                                            <span className="text-gray-600">탈퇴 일시:</span> 
                                            <span>{verification.deletedUserRecord.deletedAt ? formatDate(verification.deletedUserRecord.deletedAt) : '-'}</span>
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Violation History */}
                                      <div className="bg-white border border-yellow-300 rounded-lg p-3">
                                        <p className="text-sm mb-2">이전 계정 위반 이력:</p>
                                        <div className="space-y-1 text-sm">
                                          <p className="flex items-center gap-2">
                                            <Flag className="w-4 h-4 text-orange-600" />
                                            <span className="text-gray-600">신고 받은 횟수:</span> 
                                            <span className={verification.deletedUserRecord.reportedCount > 0 ? "text-red-600" : "text-green-600"}>
                                              {verification.deletedUserRecord.reportedCount || 0}건
                                            </span>
                                          </p>
                                          <p className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-red-600" />
                                            <span className="text-gray-600">정지 횟수:</span> 
                                            <span className={verification.deletedUserRecord.suspensionHistory?.length > 0 ? "text-red-600" : "text-green-600"}>
                                              {verification.deletedUserRecord.suspensionHistory?.length || 0}건
                                            </span>
                                          </p>
                                          <p className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-orange-600" />
                                            <span className="text-gray-600">경고 횟수:</span> 
                                            <span className={verification.deletedUserRecord.warningCount > 0 ? "text-red-600" : "text-green-600"}>
                                              {verification.deletedUserRecord.warningCount || 0}건
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Report History Details */}
                                      {verification.deletedUserRecord.reportHistory && verification.deletedUserRecord.reportHistory.length > 0 && (
                                        <div className="bg-white border border-red-300 rounded-lg p-3">
                                          <p className="text-sm mb-2 flex items-center gap-2">
                                            <Flag className="w-4 h-4 text-red-600" />
                                            신고 내역 상세:
                                          </p>
                                          <ScrollArea className="max-h-[200px]">
                                            <div className="space-y-2">
                                              {verification.deletedUserRecord.reportHistory.map((report: any, idx: number) => (
                                                <div key={report.id || idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-xs">
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
                                                  </div>
                                                  {report.savedContent && (
                                                    <p className="text-gray-600 line-clamp-2 mb-1">
                                                      {report.savedContent.title || report.savedContent.content}
                                                    </p>
                                                  )}
                                                  <p className="text-gray-500 text-xs">
                                                    {formatDate(report.createdAt)}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </ScrollArea>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  {verification.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleProcessVerification(verification.id, 'approve')}
                                        variant="default"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        size="sm"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        승인
                                      </Button>
                                      <Button
                                        onClick={() => handleProcessVerification(verification.id, 'reject')}
                                        variant="destructive"
                                        className="flex-1"
                                        size="sm"
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        거부 (차단)
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {index < verifications.filter(v => v.status === 'pending').length - 1 && <Separator className="my-4" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Processed Verifications */}
                      {verifications.filter(v => v.status !== 'pending').length > 0 && (
                        <div>
                          <h3 className="text-sm mb-3 text-gray-600 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            처리 완료 ({verifications.filter(v => v.status !== 'pending').length}건)
                          </h3>
                          <div className="space-y-3">
                            {verifications.filter(v => v.status !== 'pending').map((verification, index) => (
                              <div key={verification.id}>
                                <div className={`border rounded-lg p-4 ${
                                  verification.status === 'approved' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                                }`}>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge className={`text-xs ${
                                          verification.status === 'approved' ? 'bg-green-600' : 'bg-red-600'
                                        }`}>
                                          {verification.status === 'approved' ? '승인됨' : '거부됨'}
                                        </Badge>
                                      </div>
                                      <div className="text-sm space-y-1">
                                        <p><span className="text-gray-600">이메일:</span> {verification.email}</p>
                                        <p><span className="text-gray-600">닉네임:</span> {verification.nickname}</p>
                                        <p className="text-xs text-gray-500">
                                          요청: {formatDate(verification.createdAt)} / 처리: {verification.processedAt ? formatDate(verification.processedAt) : '-'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Previous Account Info (same as pending) */}
                                  {verification.deletedUserRecord && (
                                    <div className="space-y-3 mt-3">
                                      {/* Previous Join Date */}
                                      <div className="bg-white border border-gray-300 rounded-lg p-3">
                                        <p className="text-sm mb-2">이전 계정 정보:</p>
                                        <div className="space-y-1 text-sm">
                                          <p className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-600" />
                                            <span className="text-gray-600">탈퇴 일시:</span> 
                                            <span>{verification.deletedUserRecord.deletedAt ? formatDate(verification.deletedUserRecord.deletedAt) : '-'}</span>
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Violation History */}
                                      <div className="bg-white border border-yellow-300 rounded-lg p-3">
                                        <p className="text-sm mb-2">이전 계정 위반 이력:</p>
                                        <div className="space-y-1 text-sm">
                                          <p className="flex items-center gap-2">
                                            <Flag className="w-4 h-4 text-orange-600" />
                                            <span className="text-gray-600">신고 받은 횟수:</span> 
                                            <span className={verification.deletedUserRecord.reportedCount > 0 ? "text-red-600" : "text-green-600"}>
                                              {verification.deletedUserRecord.reportedCount || 0}건
                                            </span>
                                          </p>
                                          <p className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-red-600" />
                                            <span className="text-gray-600">정지 횟수:</span> 
                                            <span className={verification.deletedUserRecord.suspensionHistory?.length > 0 ? "text-red-600" : "text-green-600"}>
                                              {verification.deletedUserRecord.suspensionHistory?.length || 0}건
                                            </span>
                                          </p>
                                          <p className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-orange-600" />
                                            <span className="text-gray-600">경고 횟수:</span> 
                                            <span className={verification.deletedUserRecord.warningCount > 0 ? "text-red-600" : "text-green-600"}>
                                              {verification.deletedUserRecord.warningCount || 0}건
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Report History Details */}
                                      {verification.deletedUserRecord.reportHistory && verification.deletedUserRecord.reportHistory.length > 0 && (
                                        <div className="bg-white border border-red-300 rounded-lg p-3">
                                          <p className="text-sm mb-2 flex items-center gap-2">
                                            <Flag className="w-4 h-4 text-red-600" />
                                            신고 내역 상세:
                                          </p>
                                          <ScrollArea className="max-h-[200px]">
                                            <div className="space-y-2">
                                              {verification.deletedUserRecord.reportHistory.map((report: any, idx: number) => (
                                                <div key={report.id || idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-xs">
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
                                                  </div>
                                                  {report.savedContent && (
                                                    <p className="text-gray-600 line-clamp-2 mb-1">
                                                      {report.savedContent.title || report.savedContent.content}
                                                    </p>
                                                  )}
                                                  <p className="text-gray-500 text-xs">
                                                    {formatDate(report.createdAt)}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </ScrollArea>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {index < verifications.filter(v => v.status !== 'pending').length - 1 && <Separator className="my-4" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4 mt-6">
            <FeedbackAndDeletionTab
              feedback={feedback}
              stats={stats}
              formatDate={formatDate}
              getReasonLabel={getReasonLabel}
              mode="feedback"
            />
          </TabsContent>

          {/* Deletion Tab */}
          <TabsContent value="feedback-deletion" className="space-y-4 mt-6">
            <FeedbackAndDeletionTab
              feedback={feedback}
              stats={stats}
              formatDate={formatDate}
              getReasonLabel={getReasonLabel}
              mode="deletions"
            />
          </TabsContent>
        </Tabs>

        {/* Age Demographics - Outside tabs, always visible */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              연령대별 사용자 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.ageGroups && Object.keys(stats.ageGroups).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.ageGroups).map(([ageGroup, count]) => {
                  const total = Object.values(stats.ageGroups as Record<string, number>).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? Math.round((Number(count) / Number(total)) * 100) : 0;
                  
                  return (
                    <div key={ageGroup}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">{ageGroup}</span>
                        <span className="text-sm text-gray-600">
                          {count}명 ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                연령대별 데이터를 불러오는 중입니다...
                <br />
                <span className="text-xs">프로필을 설정한 사용자가 없으면 데이터가 표시되지 않습니다.</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
