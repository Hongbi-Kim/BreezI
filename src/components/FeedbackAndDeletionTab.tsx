import React, { useState } from 'react';
import { MessageSquare, AlertCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';

interface Feedback {
  id: string;
  message: string;
  timestamp: string;
  userId: string;
  userNickname: string;
  userEmail: string;
  isRead: boolean;
}

interface AdminStats {
  userCount: number;
  deletionCount: number;
  deletionReasons: Record<string, number>;
  ageGroups: Record<string, number>;
  deletedAgeGroups?: Record<string, number>;
}

interface FeedbackAndDeletionTabProps {
  feedback: Feedback[];
  stats: AdminStats | null;
  formatDate: (timestamp: string) => string;
  getReasonLabel: (reason: string) => string;
  mode?: 'both' | 'feedback' | 'deletions';
}

export function FeedbackAndDeletionTab({ 
  feedback, 
  stats,
  formatDate,
  getReasonLabel,
  mode = 'both'
}: FeedbackAndDeletionTabProps) {
  const showFeedback = mode === 'both' || mode === 'feedback';
  const showDeletions = mode === 'both' || mode === 'deletions';
  
  // Pagination state
  const [feedbackPage, setFeedbackPage] = useState(1);
  const itemsPerPage = 10;
  
  // Sort feedback by timestamp (newest first) - isRead 상태는 이제 표시하지 않음
  const sortedFeedback = [...feedback].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  
  // Paginate feedback
  const totalFeedbackPages = Math.ceil(sortedFeedback.length / itemsPerPage);
  const paginatedFeedback = sortedFeedback.slice(
    (feedbackPage - 1) * itemsPerPage,
    feedbackPage * itemsPerPage
  );
  
  const getAgeLabel = (ageGroup: string) => {
    const labels: Record<string, string> = {
      '10s': '10대',
      '20s': '20대',
      '30s': '30대',
      '40s': '40대',
      '50s': '50대',
      '60+': '60대 이상',
      'unknown': '미상',
    };
    return labels[ageGroup] || ageGroup;
  };
  
  return (
    <div className={`grid grid-cols-1 ${mode === 'both' ? 'lg:grid-cols-2' : mode === 'deletions' ? 'lg:grid-cols-2' : ''} gap-6`}>
      {/* Feedback Card */}
      {showFeedback && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            사용자 피드백
          </CardTitle>
          <CardDescription>
            최근 피드백 목록 (총 {feedback.length}건)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedback.length > 0 ? (
            <>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {paginatedFeedback.map((fb, index) => (
                    <div key={fb.id}>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {fb.userNickname}
                              </Badge>
                              <span className="text-xs text-gray-600">
                                {fb.userEmail}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(fb.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {fb.message}
                        </p>
                      </div>
                      {index < paginatedFeedback.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Pagination */}
              {totalFeedbackPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setFeedbackPage(p => Math.max(1, p - 1))}
                          className={feedbackPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalFeedbackPages }, (_, i) => i + 1).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setFeedbackPage(page)}
                            isActive={feedbackPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setFeedbackPage(p => Math.min(totalFeedbackPages, p + 1))}
                          className={feedbackPage === totalFeedbackPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-center py-8">아직 피드백이 없습니다.</div>
          )}
        </CardContent>
      </Card>}

      {/* Deletion Reasons Card */}
      {showDeletions && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            탈퇴 이유 통계
          </CardTitle>
          <CardDescription>
            사용자들이 선택한 탈퇴 이유
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats && Object.keys(stats.deletionReasons).length > 0 ? (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {Object.entries(stats.deletionReasons)
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => {
                    const total = Object.values(stats.deletionReasons).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    
                    return (
                      <div key={reason} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">{getReasonLabel(reason)}</span>
                          <span className="text-sm text-gray-600">
                            {count}명 ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-red-500 h-3 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-gray-500 text-center py-8">탈퇴한 사용자가 없습니다.</div>
          )}
        </CardContent>
      </Card>}
      
      {/* Deletion Age Groups Card */}
      {showDeletions && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            탈퇴 연령대 통계
          </CardTitle>
          <CardDescription>
            탈퇴한 사용자들의 연령대 분포
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats && stats.deletedAgeGroups && Object.keys(stats.deletedAgeGroups).length > 0 ? (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {Object.entries(stats.deletedAgeGroups)
                  .sort(([, a], [, b]) => b - a)
                  .map(([ageGroup, count]) => {
                    const total = Object.values(stats.deletedAgeGroups || {}).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    
                    return (
                      <div key={ageGroup} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">{getAgeLabel(ageGroup)}</span>
                          <span className="text-sm text-gray-600">
                            {count}명 ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-gray-500 text-center py-8">탈퇴한 사용자가 없습니다.</div>
          )}
        </CardContent>
      </Card>}
    </div>
  );
}
