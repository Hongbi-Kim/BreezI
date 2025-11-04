import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Users, UserCheck, UserPlus, UserX, MessageCircle, Search, RefreshCw, Calendar, Bell, Send, Download } from 'lucide-react';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Logo Download Component
function LogoDownloadContent() {
  const [size, setSize] = useState(512);

  // Static SVG without animation - waves in their natural resting position
  const getSVGContent = (width: number, height: number) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Circle -->
  <circle cx="50" cy="50" r="48" fill="url(#waveGradient)" />
  
  <!-- Wave Layers - Natural position -->
  <path d="M20 52 Q30 42, 40 52 T60 52 Q70 42, 80 52 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.3)" />
  <path d="M20 59 Q30 49, 40 59 T60 59 Q70 49, 80 59 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.5)" />
  <path d="M20 65 Q30 57, 40 65 T60 65 Q70 57, 80 65 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.8)" />
  
  <!-- Gradient Definition -->
  <defs>
    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0c0f" />
      <stop offset="50%" stop-color="#0f1214" />
      <stop offset="100%" stop-color="#141a1f" />
    </linearGradient>
  </defs>
</svg>`;
  };

  const downloadSVG = () => {
    const svgContent = getSVGContent(size, size);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wave-i-logo-${size}x${size}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('SVG 다운로드 완료!');
  };

  const downloadPNG = () => {
    const svgContent = getSVGContent(size, size);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `wave-i-logo-${size}x${size}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        toast.success('PNG 다운로드 완료!');
      }, 'image/png');
    };

    img.src = url;
  };

  const downloadFullLogoSVG = () => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="200" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="48" fill="url(#waveGradientFull)" />
  <path d="M20 52 Q30 42, 40 52 T60 52 Q70 42, 80 52 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.3)" />
  <path d="M20 59 Q30 49, 40 59 T60 59 Q70 49, 80 59 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.5)" />
  <path d="M20 65 Q30 57, 40 65 T60 65 Q70 57, 80 65 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.8)" />
  <text x="110" y="62" font-family="Arial Black, Helvetica Bold, sans-serif" font-size="40" font-weight="900" fill="#000" transform="skewX(-5)">wave I</text>
  <defs>
    <linearGradient id="waveGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0c0f" />
      <stop offset="50%" stop-color="#0f1214" />
      <stop offset="100%" stop-color="#141a1f" />
    </linearGradient>
  </defs>
</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wave-i-full-logo.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('풀 로고 SVG 다운로드 완료!');
  };

  const downloadFullLogoPNG = () => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="200" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="48" fill="url(#waveGradientFull)" />
  <path d="M20 52 Q30 42, 40 52 T60 52 Q70 42, 80 52 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.3)" />
  <path d="M20 59 Q30 49, 40 59 T60 59 Q70 49, 80 59 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.5)" />
  <path d="M20 65 Q30 57, 40 65 T60 65 Q70 57, 80 65 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.8)" />
  <text x="110" y="62" font-family="Arial Black, Helvetica Bold, sans-serif" font-size="40" font-weight="900" fill="#000" transform="skewX(-5)">wave I</text>
  <defs>
    <linearGradient id="waveGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0c0f" />
      <stop offset="50%" stop-color="#0f1214" />
      <stop offset="100%" stop-color="#141a1f" />
    </linearGradient>
  </defs>
</svg>`;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1200, 400);
      URL.revokeObjectURL(url);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'wave-i-full-logo-1200x400.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        toast.success('풀 로고 PNG 다운로드 완료!');
      }, 'image/png');
    };

    img.src = url;
  };

  return (
    <div className="space-y-6">
      {/* Circle Logo */}
      <Card>
        <CardHeader>
          <CardTitle>원형 로고</CardTitle>
          <CardDescription>파도가 그려진 원형 로고</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 flex items-center justify-center">
            <div 
              dangerouslySetInnerHTML={{ __html: getSVGContent(200, 200) }}
              className="drop-shadow-lg"
            />
          </div>

          {/* Size Selector */}
          <div>
            <label className="block mb-2 text-sm">
              크기 선택: {size}x{size}px
            </label>
            <input
              type="range"
              min="128"
              max="2048"
              step="128"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>128px</span>
              <span>512px</span>
              <span>1024px</span>
              <span>2048px</span>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={downloadSVG}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              SVG 다운로드
            </Button>
            <Button
              onClick={downloadPNG}
            >
              <Download className="mr-2 h-4 w-4" />
              PNG 다운로드
            </Button>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
            <p className="mb-2"><strong>SVG:</strong> 벡터 형식으로 크기 조절 시 화질 손실이 없습니다.</p>
            <p><strong>PNG:</strong> 래스터 형식으로 선택한 크기로 다운로드됩니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* Full Logo with Text */}
      <Card>
        <CardHeader>
          <CardTitle>풀 로고 (텍스트 포함)</CardTitle>
          <CardDescription>wave I 텍스트가 포함된 가로형 로고</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 flex items-center justify-center">
            <svg width="300" height="100" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="48" fill="url(#waveGradientFullPreview)" />
              <path d="M20 52 Q30 42, 40 52 T60 52 Q70 42, 80 52 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.3)" />
              <path d="M20 59 Q30 49, 40 59 T60 59 Q70 49, 80 59 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.5)" />
              <path d="M20 65 Q30 57, 40 65 T60 65 Q70 57, 80 65 L80 75 L20 75 Z" fill="rgba(255, 255, 255, 0.8)" />
              <text x="110" y="62" fontFamily="Arial Black, Helvetica Bold, sans-serif" fontSize="40" fontWeight="900" fill="#000" transform="skewX(-5)">wave I</text>
              <defs>
                <linearGradient id="waveGradientFullPreview" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0a0c0f" />
                  <stop offset="50%" stopColor="#0f1214" />
                  <stop offset="100%" stopColor="#141a1f" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={downloadFullLogoSVG}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              SVG 다운로드
            </Button>
            <Button
              onClick={downloadFullLogoPNG}
            >
              <Download className="mr-2 h-4 w-4" />
              PNG 다운로드
            </Button>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
            <p>풀 로고는 1200x400px 크기의 PNG로 다운로드됩니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Format ISO timestamp to yyyy-mm-dd hh:mm:ss
const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

// Convert country code to flag emoji
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode) return '';
  
  const code = countryCode.toUpperCase();
  
  // Convert country code to flag emoji
  // Each letter is converted to regional indicator symbol (A = U+1F1E6, B = U+1F1E7, ...)
  try {
    const codePoints = [...code].map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    // If conversion fails, return the code as is
    return code;
  }
};

interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  birthDate?: string;
  age?: number;
  countryCode?: string;
  timezone?: string;
  createdAt: string;
  lastSignInAt?: string;
  diaryCount: number;
  isPro?: boolean;
  proStartDate?: string;
  proEndDate?: string;
  proPaymentCompleted?: boolean;
  hasItemPackage?: boolean;
  itemPackagePurchasedAt?: string;
  status?: string;
  withdrawnAt?: string;
}

interface Feedback {
  id: string;
  userId: string;
  email: string;
  nickname: string;
  content: string;
  createdAt: string;
}

interface Payment {
  orderId: string;
  userId: string;
  plan: 'monthly' | 'yearly';
  paymentMethod: string;
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

interface Withdrawal {
  userId: string;
  email: string;
  reason: string;
  customReason?: string;
  withdrawnAt: string;
}

interface Stats {
  totalUsers: number;
  ageGroups: Record<string, number>;
  countryStats: Record<string, number>;
  activeUsers: {
    last7Days: number;
    last30Days: number;
  };
  newUsers: {
    last7Days: number;
    last30Days: number;
  };
  totalFeedbacks: number;
  chatbotUsage?: {
    avgUsageRatio: string;
    characterRanking: Array<{
      characterId: string;
      characterName: string;
      sessionCount: number;
      percentage: string;
    }>;
    avgTurnsPerSession: string;
    avgTurnsByCharacter: Array<{
      characterId: string;
      characterName: string;
      avgTurns: string;
      sessionCount: number;
    }>;
    totalSessions: number;
    usersWithChats: number;
  };
  proStats?: {
    monthlyRatio: Array<{
      month: string;
      totalUsers: number;
      proUsers: number;
      percentage: string;
    }>;
    tenureBrackets: {
      '1month': { count: number; percentage: string };
      '3months': { count: number; percentage: string };
      '6months': { count: number; percentage: string };
      '12months': { count: number; percentage: string };
    };
    resubscriptionRate: {
      totalExpired: number;
      resubscribed: number;
      percentage: string;
    };
  };
  timestamp: string;
}

interface BehaviorLogs {
  dau: number;
  wau: number;
  mau: number;
  featureClicks: Record<string, number>;
  missionParticipation: {
    totalMissions: number;
    uniqueParticipants: number;
    participationRate: string;
  };
  retentionRate: {
    day1: string;
    day7: string;
    day30: string;
    eligible1Day: number;
    eligible7Days: number;
    eligible30Days: number;
  };
  timestamp: string;
}

interface ProCancellation {
  id: string;
  userId: string;
  email: string;
  reason: string;
  customReason?: string;
  createdAt: string;
}

export function AdminTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLogs | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<{ total: number; reasonStats: Record<string, number> } | null>(null);
  const [proCancellations, setProCancellations] = useState<ProCancellation[]>([]);
  const [cancellationStats, setCancellationStats] = useState<{ total: number; reasonStats: Record<string, number> } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showProDialog, setShowProDialog] = useState(false);
  const [selectedUserForPro, setSelectedUserForPro] = useState<User | null>(null);
  const [proDuration, setProDuration] = useState('30');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [usersData, statsData, feedbackData, paymentsData, withdrawalsData, behaviorData, cancellationsData] = await Promise.all([
        apiCall('/admin/users'),
        apiCall('/admin/stats'),
        apiCall('/admin/feedback'),
        apiCall('/admin/payments'),
        apiCall('/admin/withdrawals'),
        apiCall('/admin/behavior-logs'),
        apiCall('/admin/pro-cancellations')
      ]);
      
      console.log('[AdminTab] Stats data loaded:', statsData);
      console.log('[AdminTab] Pro stats present?:', !!statsData?.proStats);
      console.log('[AdminTab] Pro stats details:', statsData?.proStats);
      
      if (!statsData?.proStats) {
        console.error('[AdminTab] WARNING: No proStats in response!');
      }
      
      setUsers(usersData.users || []);
      setStats(statsData);
      setFeedbacks(feedbackData.feedbacks || []);
      setPayments(paymentsData.payments || []);
      setWithdrawals(withdrawalsData.withdrawals || []);
      setWithdrawalStats({ total: withdrawalsData.total || 0, reasonStats: withdrawalsData.reasonStats || {} });
      setBehaviorLogs(behaviorData);
      setProCancellations(cancellationsData.cancellations || []);
      setCancellationStats({ total: cancellationsData.total || 0, reasonStats: cancellationsData.reasonStats || {} });
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setError(err.message || '관리자 데이터를 불러오는데 실���했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.nickname?.toLowerCase().includes(query)
    );
  });

  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      toast.error('알림 메시지를 입력해주세요');
      return;
    }

    setIsSendingNotification(true);
    try {
      await apiCall('/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({
          userIds: selectedUserIds.length === 0 ? null : selectedUserIds,
          message: notificationMessage
        })
      });

      toast.success(
        selectedUserIds.length === 0 
          ? '모든 사용자에게 알림을 보냈습니다' 
          : `${selectedUserIds.length}명에게 알림을 보냈습니다`
      );

      setShowNotificationDialog(false);
      setNotificationMessage('');
      setSelectedUserIds([]);
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      toast.error(error.message || '알림 전송에 실패했습니다');
    } finally {
      setIsSendingNotification(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleSetPro = async () => {
    if (!selectedUserForPro) return;

    try {
      await apiCall('/admin/set-pro', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUserForPro.id,
          isPro: true,
          durationDays: parseInt(proDuration)
        })
      });

      toast.success(`${selectedUserForPro.name || selectedUserForPro.email}님에게 ${proDuration}일 Pro를 부여했습니다`);
      setShowProDialog(false);
      setSelectedUserForPro(null);
      setProDuration('30');
      loadAdminData(); // Reload data
    } catch (error: any) {
      console.error('Failed to set pro:', error);
      toast.error(error.message || 'Pro 설정에 실패했습니다');
    }
  };

  const handleRemovePro = async (user: User) => {
    try {
      await apiCall('/admin/set-pro', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          isPro: false
        })
      });

      toast.success(`${user.name || user.email}님의 Pro를 해제했습니다`);
      loadAdminData(); // Reload data
    } catch (error: any) {
      console.error('Failed to remove pro:', error);
      toast.error(error.message || 'Pro 해제에 실패했습니다');
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 pb-24 max-w-6xl mx-auto overflow-y-auto h-full">
        <div className="mb-4 sm:mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700 text-center">{error}</p>
            <p className="text-sm text-red-600 text-center mt-2">
              관리자 권한이 필요합니다 (khb1620@naver.com)
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 pb-24 max-w-6xl mx-auto overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl mb-1 sm:mb-2">관리자 대시보드</h2>
          <p className="text-gray-600 text-xs sm:text-sm">Wave I 서비스 현황을 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadAdminData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">새로고침</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm">전체 사용자</CardTitle>
                <Users className="w-4 h-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl">{stats.totalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">명</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm">활성 사용자</CardTitle>
                <UserCheck className="w-4 h-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl">{stats.activeUsers.last7Days}</div>
                <p className="text-xs text-gray-500 mt-1">최근 7일</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm">신규 가입</CardTitle>
                <UserPlus className="w-4 h-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl">{stats.newUsers.last7Days}</div>
                <p className="text-xs text-gray-500 mt-1">최근 7일</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm">탈퇴</CardTitle>
                <UserX className="w-4 h-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl">{withdrawalStats?.total || 0}</div>
                <p className="text-xs text-gray-500 mt-1">명</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm">피드백</CardTitle>
                <MessageCircle className="w-4 h-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl">{stats.totalFeedbacks}</div>
                <p className="text-xs text-gray-500 mt-1">개</p>
              </CardContent>
            </Card>
          </div>

          {/* Age Distribution */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                연령대 분포
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {Object.entries(stats.ageGroups).map(([age, count]) => (
                  <div key={age} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg sm:text-xl">{count}</div>
                    <p className="text-xs text-gray-600 mt-1">{age}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Country Distribution */}
          {stats.countryStats && Object.keys(stats.countryStats).length > 0 && (
            <Card className="mb-4 sm:mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🌍 국적별 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(stats.countryStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([country, count]) => {
                      const percentage = stats.totalUsers > 0 
                        ? ((count / stats.totalUsers) * 100).toFixed(1)
                        : '0';
                      return (
                        <div key={country} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl mb-1">{getCountryFlag(country)}</div>
                          <div className="text-lg sm:text-xl font-semibold">{count}</div>
                          <p className="text-xs text-gray-600 mt-1">{country}</p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm">활성 사용자 (30일)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl">{stats.activeUsers.last30Days}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalUsers > 0 
                    ? `${((stats.activeUsers.last30Days / stats.totalUsers) * 100).toFixed(1)}% 활성률`
                    : '0% 활성률'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm">신규 가입 (30일)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl">{stats.newUsers.last30Days}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalUsers > 0 
                    ? `${((stats.newUsers.last30Days / stats.totalUsers) * 100).toFixed(1)}% 성장률`
                    : '0% 성장률'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chatbot Usage Statistics */}
          {stats.chatbotUsage && (
            <Card className="mb-4 sm:mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💬 챗봇 사용률 분석
                </CardTitle>
                <CardDescription>
                  전체 사용자의 AI 캐릭터 채팅 사용 통계
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-semibold text-blue-600">{stats.chatbotUsage.avgUsageRatio}%</div>
                    <p className="text-xs text-gray-600 mt-1">평균 사용 비율</p>
                    <p className="text-xs text-gray-500">가입일 대비</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-semibold text-green-600">{stats.chatbotUsage.totalSessions}</div>
                    <p className="text-xs text-gray-600 mt-1">전체 세션</p>
                    <p className="text-xs text-gray-500">누적</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-semibold text-purple-600">{stats.chatbotUsage.avgTurnsPerSession}</div>
                    <p className="text-xs text-gray-600 mt-1">평균 대화 턴</p>
                    <p className="text-xs text-gray-500">세션당</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-semibold text-orange-600">{stats.chatbotUsage.usersWithChats}</div>
                    <p className="text-xs text-gray-600 mt-1">채팅한 유저</p>
                    <p className="text-xs text-gray-500">
                      {stats.totalUsers > 0 
                        ? `${((stats.chatbotUsage.usersWithChats / stats.totalUsers) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>

                {/* Character Usage Ranking */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">캐릭터 사용 순위</h4>
                  <div className="space-y-2">
                    {stats.chatbotUsage.characterRanking.map((char, index) => {
                      const emojis: Record<string, string> = {
                        'lumi': '🌙',
                        'kai': '💡',
                        'leo': '🦁',
                        'liv': '📊',
                        'group': '💬'
                      };
                      
                      return (
                        <div key={char.characterId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                          <span className="text-xl">{emojis[char.characterId]}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{char.characterName}</div>
                            <div className="text-xs text-gray-500">{char.sessionCount}회 세션</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-600">{char.percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Average Turns by Character */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">캐릭터별 평균 대화 턴수</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {stats.chatbotUsage.avgTurnsByCharacter.map((char) => {
                      const emojis: Record<string, string> = {
                        'lumi': '🌙',
                        'kai': '💡',
                        'leo': '🦁',
                        'liv': '📊',
                        'group': '💬'
                      };
                      
                      return (
                        <div key={char.characterId} className="text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                          <div className="text-2xl mb-1">{emojis[char.characterId]}</div>
                          <div className="text-lg font-semibold">{char.avgTurns}</div>
                          <p className="text-xs text-gray-600">{char.characterName}</p>
                          <p className="text-xs text-gray-500">{char.sessionCount}회</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Signups Chart */}
          {stats?.monthlySignups && (
            <Card className="mb-4 sm:mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 월별 사용자 가입 현황
                </CardTitle>
                <CardDescription>
                  최근 6개월 신규 가입자 추이
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.monthlySignups}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="signups" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="신규 가입자"
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pro Subscription Stats */}
          {stats?.proStats ? (
            <Card className="mb-4 sm:mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👑 Pro 가입자 분석
                </CardTitle>
                <CardDescription>
                  Pro 구독 현황 및 사용자 가입 기간 분석
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Monthly Pro Subscribers Chart */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">월별 Pro 가입자 수</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.proStats.monthlyRatio}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Bar dataKey="totalUsers" fill="#94a3b8" name="전체 사용자" />
                        <Bar dataKey="proUsers" fill="#a855f7" name="Pro 사용자" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* User Tenure Brackets */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">가입 기간별 사용자 분포</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-xl mb-1">🌱</div>
                      <div className="text-2xl font-semibold text-blue-600">{stats.proStats.tenureBrackets['1month'].count}</div>
                      <p className="text-xs text-gray-600 mt-1">1개월 미만</p>
                      <p className="text-xs text-gray-500">{stats.proStats.tenureBrackets['1month'].percentage}%</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-xl mb-1">🌿</div>
                      <div className="text-2xl font-semibold text-green-600">{stats.proStats.tenureBrackets['3months'].count}</div>
                      <p className="text-xs text-gray-600 mt-1">1~3개월</p>
                      <p className="text-xs text-gray-500">{stats.proStats.tenureBrackets['3months'].percentage}%</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-xl mb-1">🌳</div>
                      <div className="text-2xl font-semibold text-orange-600">{stats.proStats.tenureBrackets['6months'].count}</div>
                      <p className="text-xs text-gray-600 mt-1">3~6개월</p>
                      <p className="text-xs text-gray-500">{stats.proStats.tenureBrackets['6months'].percentage}%</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-xl mb-1">🏆</div>
                      <div className="text-2xl font-semibold text-purple-600">{stats.proStats.tenureBrackets['12months'].count}</div>
                      <p className="text-xs text-gray-600 mt-1">6개월 이상</p>
                      <p className="text-xs text-gray-500">{stats.proStats.tenureBrackets['12months'].percentage}%</p>
                    </div>
                  </div>
                </div>

                {/* Resubscription Rate */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">재가입 비율</h4>
                  <div className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600">만료된 Pro 구독자</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.proStats.resubscriptionRate.totalExpired}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">재가입자</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.proStats.resubscriptionRate.resubscribed}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">재가입률</p>
                      <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        {stats.proStats.resubscriptionRate.percentage}%
                      </p>
                    </div>
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                        style={{ width: `${stats.proStats.resubscriptionRate.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-4 sm:mb-6 border-2 border-yellow-300 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  ⚠️ Pro 통계 데이터 없음
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700">
                  서버에서 Pro 통계 데이터를 받지 못했습니다. 
                  브라우저 콘솔을 확인하세요.
                </p>
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                  {JSON.stringify({ hasStats: !!stats, hasProStats: !!stats?.proStats }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* User Behavior Logs */}
          {behaviorLogs && (
            <Card className="mb-4 sm:mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 사용자 행동 로그
                </CardTitle>
                <CardDescription>
                  사용자 활동 패턴 및 기능 사용 분석
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* DAU/WAU/MAU */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">활성 사용자 (Active Users)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-semibold text-blue-600">{behaviorLogs.dau}</div>
                      <p className="text-xs text-gray-600 mt-1">DAU</p>
                      <p className="text-xs text-gray-500">일일 활성 사용자</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-semibold text-green-600">{behaviorLogs.wau}</div>
                      <p className="text-xs text-gray-600 mt-1">WAU</p>
                      <p className="text-xs text-gray-500">주간 활성 사용자</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-semibold text-purple-600">{behaviorLogs.mau}</div>
                      <p className="text-xs text-gray-600 mt-1">MAU</p>
                      <p className="text-xs text-gray-500">월간 활성 사용자</p>
                    </div>
                  </div>
                </div>

                {/* Feature Clicks */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">기능별 클릭 수</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(behaviorLogs.featureClicks)
                      .filter(([feature]) => feature !== 'garden' && feature !== 'mission')
                      .map(([feature, count]) => {
                        const featureNames: Record<string, string> = {
                          chat: '채팅',
                          diary: '일기',
                          report: '리포트',
                          wave: 'Wave',
                          profile: '프로필'
                        };
                        const featureEmojis: Record<string, string> = {
                          chat: '💬',
                          diary: '📝',
                          report: '📊',
                          wave: '🌊',
                          profile: '👤'
                        };
                        
                        return (
                          <div key={feature} className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl mb-1">{featureEmojis[feature] || '📌'}</div>
                            <div className="text-lg font-semibold">{count}</div>
                            <p className="text-xs text-gray-600">{featureNames[feature] || feature}</p>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Mission Participation */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">미션 참여율</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-semibold text-orange-600">{behaviorLogs.missionParticipation.totalMissions}</div>
                      <p className="text-xs text-gray-600 mt-1">완료된 미션</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-semibold text-yellow-600">{behaviorLogs.missionParticipation.uniqueParticipants}</div>
                      <p className="text-xs text-gray-600 mt-1">참여 유저</p>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-lg">
                      <div className="text-2xl font-semibold text-pink-600">{behaviorLogs.missionParticipation.participationRate}%</div>
                      <p className="text-xs text-gray-600 mt-1">참여율</p>
                    </div>
                  </div>
                </div>

                {/* Retention Rate */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">재방문율 (Retention Rate)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="text-center mb-2">
                        <div className="text-2xl font-semibold text-blue-700">{behaviorLogs.retentionRate.day1}%</div>
                        <p className="text-xs text-gray-600 mt-1">1일 재방문</p>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        대상: {behaviorLogs.retentionRate.eligible1Day}명
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="text-center mb-2">
                        <div className="text-2xl font-semibold text-green-700">{behaviorLogs.retentionRate.day7}%</div>
                        <p className="text-xs text-gray-600 mt-1">7일 재방문</p>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        대상: {behaviorLogs.retentionRate.eligible7Days}명
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="text-center mb-2">
                        <div className="text-2xl font-semibold text-purple-700">{behaviorLogs.retentionRate.day30}%</div>
                        <p className="text-xs text-gray-600 mt-1">30일 재방문</p>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        대상: {behaviorLogs.retentionRate.eligible30Days}명
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tabs for Users and Feedback */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            사용자 ({users.length})
          </TabsTrigger>
          <TabsTrigger value="feedback">
            피드백 ({feedbacks.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            탈퇴 ({withdrawalStats?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="pro-cancellations">
            Pro 해제 ({cancellationStats?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="logo">
            로고 다운로드
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>사용자 목록</CardTitle>
                  <CardDescription>
                    전체 {users.length}명의 사용자
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowNotificationDialog(true)}
                  variant="default"
                  size="sm"
                  className="gap-2 self-start sm:self-auto"
                >
                  <Bell className="w-4 h-4" />
                  <span>알림 보내기</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="이메일, 이름, 닉네임으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    초기화
                  </Button>
                )}
              </div>

              {/* Users Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={selectAllUsers}
                        />
                      </TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>닉네임</TableHead>
                      <TableHead className="text-center">나이</TableHead>
                      <TableHead className="text-center">국적</TableHead>
                      <TableHead className="text-center">Pro</TableHead>
                      <TableHead className="text-center">아이템</TableHead>
                      <TableHead className="text-center">활동</TableHead>
                      <TableHead className="text-right">가입일</TableHead>
                      <TableHead className="text-right">최근 활동 시간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-gray-500">
                          {searchQuery ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const lastSignIn = user.lastSignInAt ? new Date(user.lastSignInAt) : null;
                        const daysSinceLogin = lastSignIn 
                          ? Math.floor((new Date().getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24))
                          : null;
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedUserIds.includes(user.id)}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="truncate max-w-[200px]">{user.email}</span>
                                {user.email === 'khb1620@naver.com' && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded whitespace-nowrap">
                                    👑 관리자
                                  </span>
                                )}
                                {user.isPro && (
                                  <span className="text-xs bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-0.5 rounded whitespace-nowrap font-semibold shadow-sm">
                                    ⭐ PRO
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.name || '-'}
                            </TableCell>
                            <TableCell>
                              {user.nickname || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {user.age ? `${user.age}세` : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {user.countryCode ? (
                                <span className="text-lg" title={user.countryCode}>
                                  {getCountryFlag(user.countryCode)}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-left">
                              {user.isPro ? (
                                <div className="flex flex-col gap-1 text-xs">
                                  {user.proStartDate && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500 min-w-[50px]">시작일:</span>
                                      <span className="text-gray-800">
                                        {new Date(user.proStartDate).toLocaleDateString('ko-KR', { 
                                          year: 'numeric',
                                          month: '2-digit', 
                                          day: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {user.proEndDate && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500 min-w-[50px]">만료일:</span>
                                      <span className="text-gray-800">
                                        {new Date(user.proEndDate).toLocaleDateString('ko-KR', { 
                                          year: 'numeric',
                                          month: '2-digit', 
                                          day: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    {user.proPaymentCompleted ? (
                                      <span className="text-green-600 font-semibold">✓ 결제완료</span>
                                    ) : (
                                      <span className="text-orange-600 font-semibold">⚠ 관리자 부여</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs w-fit px-2 mt-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemovePro(user)}
                                  >
                                    해제
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setSelectedUserForPro(user);
                                    setShowProDialog(true);
                                  }}
                                >
                                  Pro 부여
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {user.hasItemPackage ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs bg-gradient-to-r from-purple-400 to-pink-500 text-white px-2 py-1 rounded font-semibold">
                                    🎁 소유
                                  </span>
                                  {user.itemPackagePurchasedAt && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(user.itemPackagePurchasedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {user.status === 'withdrawn' ? (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  탈퇴
                                </span>
                              ) : (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  활동
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap text-xs">
                              {formatTimestamp(user.createdAt)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap text-xs">
                              {lastSignIn ? (
                                <div>
                                  <div>{formatTimestamp(user.lastSignInAt!)}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {daysSinceLogin === 0 ? '오늘' : 
                                     daysSinceLogin === 1 ? '어제' :
                                     daysSinceLogin < 7 ? `${daysSinceLogin}일 전` :
                                     daysSinceLogin < 30 ? `${Math.floor(daysSinceLogin / 7)}주 전` :
                                     `${Math.floor(daysSinceLogin / 30)}개월 전`}
                                  </div>
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>피드백 목록</CardTitle>
              <CardDescription>
                사용자들이 보낸 피드백을 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbacks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  아직 받은 피드백이 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <Card key={feedback.id}>
                      <CardContent className="pt-6">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm">
                          <span className="font-semibold">{feedback.nickname}</span>
                          <span className="text-gray-500">{feedback.email}</span>
                          <span className="text-gray-400 text-xs">
                            {formatTimestamp(feedback.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {feedback.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>탈퇴 통계</CardTitle>
              <CardDescription>
                총 {withdrawalStats?.total || 0}명의 사용자가 탈퇴했습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawalStats && withdrawalStats.total > 0 ? (
                <>
                  {/* Reason Statistics */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3">탈퇴 이유 통계</h3>
                    <div className="space-y-2">
                      {Object.entries(withdrawalStats.reasonStats)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([reason, count]) => {
                          const percentage = ((count as number) / withdrawalStats.total * 100).toFixed(1);
                          return (
                            <div key={reason} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm">{reason}</span>
                                  <span className="text-sm text-gray-600">
                                    {count}명 ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Withdrawal List */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">탈퇴 기록</h3>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>이메일</TableHead>
                            <TableHead>탈퇴 이유</TableHead>
                            <TableHead className="text-right">탈퇴일</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {withdrawals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-500">
                                탈퇴 기록이 없습니다
                              </TableCell>
                            </TableRow>
                          ) : (
                            withdrawals
                              .sort((a, b) => new Date(b.withdrawnAt).getTime() - new Date(a.withdrawnAt).getTime())
                              .map((withdrawal, index) => (
                                <TableRow key={index}>
                                  <TableCell className="truncate max-w-[200px]">
                                    {withdrawal.email}
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-md">
                                      <span className="text-sm">
                                        {withdrawal.customReason || withdrawal.reason}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right whitespace-nowrap text-xs">
                                    {formatTimestamp(withdrawal.withdrawnAt)}
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  아직 탈퇴한 사용자가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pro Cancellations Tab */}
        <TabsContent value="pro-cancellations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pro 구독 해제 신청 내역</CardTitle>
              <CardDescription>
                사용자들의 Pro 구독 해제 신청 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cancellationStats && cancellationStats.total > 0 ? (
                <>
                  {/* Stats */}
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-semibold text-gray-900">{cancellationStats.total}</div>
                      <p className="text-sm text-gray-600 mt-1">총 해제 신청</p>
                    </div>
                    {Object.entries(cancellationStats.reasonStats).map(([reason, count]) => {
                      const reasonLabels: Record<string, string> = {
                        'expensive': '가격',
                        'not_using': '미사용',
                        'features': '기능 부족',
                        'technical': '기술 문제',
                        'alternative': '대체 서비스',
                        'temporary': '일시 중단',
                        'other': '기타'
                      };
                      
                      return (
                        <div key={reason} className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-semibold text-blue-700">{count as number}</div>
                          <p className="text-sm text-gray-600 mt-1">{reasonLabels[reason] || reason}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Table */}
                  <div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>이메일</TableHead>
                            <TableHead>해제 사유</TableHead>
                            <TableHead>상세 내용</TableHead>
                            <TableHead className="text-right">신청일</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {proCancellations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-500">
                                해제 신청 내역이 없습니다
                              </TableCell>
                            </TableRow>
                          ) : (
                            proCancellations.map((cancellation) => {
                              const reasonLabels: Record<string, string> = {
                                'expensive': '가격이 비쌉니다',
                                'not_using': '자주 사용하지 않습니다',
                                'features': '필요한 기능이 부족합니다',
                                'technical': '기술적 문제가 있습니다',
                                'alternative': '다른 서비스를 사용합니다',
                                'temporary': '일시적으로 중단합니다',
                                'other': '기타'
                              };

                              return (
                                <TableRow key={cancellation.id}>
                                  <TableCell>{cancellation.email}</TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                      {reasonLabels[cancellation.reason] || cancellation.reason}
                                    </span>
                                  </TableCell>
                                  <TableCell className="max-w-md">
                                    {cancellation.customReason ? (
                                      <p className="text-sm text-gray-700 line-clamp-2">
                                        {cancellation.customReason}
                                      </p>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatTimestamp(cancellation.createdAt)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  아직 Pro 해제 신청이 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logo Download Tab */}
        <TabsContent value="logo" className="space-y-4">
          <LogoDownloadContent />
        </TabsContent>
      </Tabs>

      {/* System Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>시스템 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">서비스명:</span>
              <span>Wave I</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">슬로건:</span>
              <span>Ride your inner wave</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">관리자:</span>
              <span>khb1620@naver.com</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              알림 보내기
            </DialogTitle>
            <DialogDescription>
              {selectedUserIds.length === 0 
                ? '모든 사용자에게 알림을 보냅니다'
                : `${selectedUserIds.length}명의 사용자에게 알림을 보냅니다`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedUserIds.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm mb-2">선택된 사용자:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserIds.map(userId => {
                      const user = users.find(u => u.id === userId);
                      return (
                        <div key={userId} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {user?.nickname || user?.email}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <label className="text-sm">알림 메시지</label>
              <Textarea
                placeholder="사용자에게 보낼 메시지를 입력하세요..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                {notificationMessage.length} / 500자
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNotificationDialog(false);
                setNotificationMessage('');
              }}
              disabled={isSendingNotification}
            >
              취소
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={isSendingNotification || !notificationMessage.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isSendingNotification ? '전송 중...' : '알림 보내기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pro Setting Dialog */}
      <Dialog open={showProDialog} onOpenChange={setShowProDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ⭐ Wave Pro 부여
            </DialogTitle>
            <DialogDescription>
              사용자에게 Pro 구독을 부여합니다
            </DialogDescription>
          </DialogHeader>

          {selectedUserForPro && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">사용자</p>
                <p className="font-medium">{selectedUserForPro.name || selectedUserForPro.email}</p>
                {selectedUserForPro.name && (
                  <p className="text-sm text-gray-500">{selectedUserForPro.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="proDuration">구독 기간 (일)</Label>
                <div className="flex gap-2">
                  <Input
                    id="proDuration"
                    type="number"
                    value={proDuration}
                    onChange={(e) => setProDuration(e.target.value)}
                    placeholder="30"
                    min="1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setProDuration('30')}
                    size="sm"
                  >
                    30일
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setProDuration('365')}
                    size="sm"
                  >
                    1년
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {parseInt(proDuration) > 0 && (
                    <>
                      {new Date().toLocaleDateString()} ~ {new Date(Date.now() + parseInt(proDuration) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowProDialog(false);
                setSelectedUserForPro(null);
                setProDuration('30');
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleSetPro}
              disabled={!proDuration || parseInt(proDuration) <= 0}
              className="gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600"
            >
              ⭐ Pro 부여
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
