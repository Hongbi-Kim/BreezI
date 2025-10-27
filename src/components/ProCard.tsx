import React from 'react';
import { Crown, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';

interface ProCardProps {
  isPro?: boolean;
  proExpireDate?: string;
}

export function ProCard({ isPro, proExpireDate }: ProCardProps) {
  const [showProDialog, setShowProDialog] = React.useState(false);

  return (
    <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-600" />
          <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            BreezI Pro
          </span>
          {isPro && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              Pro
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPro ? (
          <>
            {/* Pro 구독 중 */}
            <div className="bg-white/60 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <p className="font-semibold text-amber-900">Pro 구독 중입니다</p>
              </div>
              <div className="text-sm text-gray-700">
                <p>만료일: {proExpireDate ? new Date(proExpireDate).toLocaleDateString('ko-KR') : '-'}</p>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <p className="text-sm text-gray-600 mb-2">🎉 Pro 혜택 이용 중</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>채팅방 10개 이용</li>
                  <li>긴 대화 지원</li>
                  <li>AI 캘린더 어시스턴트</li>
                  <li>프리미엄 AI 캐릭터</li>
                  <li>심화 감정 분석 리포트</li>
                  <li>일기 사진 첨부</li>
                  <li>리포트 PDF 다운로드</li>
                  <li>커뮤니티 Pro 배지</li>
                </ul>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              구독 관리 (준비 중)
            </Button>
          </>
        ) : (
          <>
            {/* Pro 구독 안내 */}
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Pro로 업그레이드하고 더 많은 기능을 이용하세요!
              </p>
              <div className="bg-white/60 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900">월 5,900원</span>
                  <Badge variant="outline" className="border-amber-600 text-amber-600">첫 달 무료</Badge>
                </div>
                <ul className="text-xs text-gray-600 space-y-1.5 mt-2">
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>채팅방 10개</strong> (무료: 3개)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>긴 대화 지원</strong> - 더 깊은 대화 가능</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>AI 캘린더 어시스턴트</strong> - 일정 추천 및 관리</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>프리미엄 AI 캐릭터</strong> - 특별한 성격의 캐릭터</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>심화 감정 분석 리포트</strong> - 더 상세한 인사이트</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>일기 사진 첨부</strong> - 추억을 이미지로 저장</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>리포트 PDF 다운로드</strong> - 감정 기록 보관</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span><strong>커뮤니티 Pro 배지</strong> - 특별한 표시</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <Dialog open={showProDialog} onOpenChange={setShowProDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                  <Crown className="w-4 h-4 mr-2" />
                  Pro로 업그레이드
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      Pro 업그레이드
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    더 나은 심리 케어 경험을 위한 프리미엄 기능들
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200">
                    <div className="text-center mb-4">
                      <p className="text-3xl font-bold text-amber-900">₩5,900</p>
                      <p className="text-sm text-gray-600">월 정기 결제</p>
                      <Badge className="mt-2 bg-red-500">첫 달 무료</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>언제든지 해지 가능</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>자동 갱신 (해지 전까지)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💳 현재 결제 기능은 준비 중입니다.<br/>
                      곧 카카오페이, 토스페이 등 다양한 결제 수단을 지원할 예정입니다.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        toast.error('결제 기능은 곧 오픈됩니다! 조금만 기다려주세요 😊');
                        setShowProDialog(false);
                      }}
                      disabled
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
                    >
                      결제하기 (준비 중)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowProDialog(false)}
                      className="flex-1"
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
