import React, { useState } from 'react';
import { FileText, Shield, CheckCircle2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface TermsAgreementDialogProps {
  open: boolean;
  onAgree: () => void;
  onDisagree: () => void;
  onViewTerms: () => void;
  onViewPrivacy: () => void;
}

type ViewMode = 'agreement' | 'terms' | 'privacy';

export function TermsAgreementDialog({
  open,
  onAgree,
  onDisagree,
  onViewTerms,
  onViewPrivacy,
}: TermsAgreementDialogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('agreement');
  const [allAgreed, setAllAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [ageAgreed, setAgeAgreed] = useState(false);
  const viewModeRef = React.useRef<ViewMode>('agreement');

  // viewMode가 변경될 때마다 ref 업데이트
  React.useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // 다이얼로그가 열릴 때마다 agreement 모드로 초기화
  React.useEffect(() => {
    if (open) {
      setViewMode('agreement');
      // 다이얼로그가 열릴 때 초기 히스토리 상태 추가
      window.history.pushState({ termsDialog: 'open' }, '');
    }
  }, [open]);

  // 브라우저 뒤로가기 이벤트 처리
  React.useEffect(() => {
    if (!open) return;

    const handlePopState = () => {
      const currentMode = viewModeRef.current;
      // console.log('[TermsDialog] popstate 이벤트 발생, 현재 viewMode:', currentMode);
      
      // 현재 상세 화면이면 agreement로 돌아가기
      if (currentMode === 'terms' || currentMode === 'privacy') {
        // console.log('[TermsDialog] 상세 화면에서 agreement로 이동');
        setViewMode('agreement');
        // agreement 상태를 유지하기 위해 히스토리 다시 추가
        window.history.pushState({ termsDialog: 'agreement' }, '');
      } else {
        // console.log('[TermsDialog] agreement 화면에서 다이얼로그 닫기');
        // agreement 화면에서 뒤로가기하면 다이얼로그 닫기
        onDisagree();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open, onDisagree]);

  // viewMode가 변경될 때 히스토리 관리
  const changeViewMode = (mode: ViewMode) => {
    // console.log('[TermsDialog] changeViewMode 호출:', mode);
    if (mode !== 'agreement') {
      // 상세 화면으로 이동할 때 히스토리 추가
      // console.log('[TermsDialog] 히스토리에 상태 추가:', mode);
      window.history.pushState({ termsDialog: mode }, '');
    }
    setViewMode(mode);
  };

  // 뒤로가기 버튼 클릭 핸들러
  const handleBackToAgreement = () => {
    window.history.back();
  };

  const handleAllAgree = (checked: boolean) => {
    setAllAgreed(checked);
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setAgeAgreed(checked);
  };

  const handleIndividualAgree = (
    setter: (value: boolean) => void,
    value: boolean
  ) => {
    setter(value);
    // 개별 체크박스 변경 시 전체 동의 상태 업데이트
    if (!value) {
      setAllAgreed(false);
    }
  };

  // 모든 개별 항목이 체크되면 전체 동의도 체크
  React.useEffect(() => {
    if (termsAgreed && privacyAgreed && ageAgreed) {
      setAllAgreed(true);
    }
  }, [termsAgreed, privacyAgreed, ageAgreed]);

  const canProceed = termsAgreed && privacyAgreed && ageAgreed;

  // 약관/개인정보처리방침 내용 렌더링
  const renderTermsContent = () => {
    if (viewMode === 'terms') {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToAgreement}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">BreezI 이용약관</CardTitle>
              <p className="text-sm text-gray-500">최종 수정일: 2025.10.25</p>
            </CardHeader>
            <CardContent>
              {/* <ScrollArea className="h-[calc(100vh-200px)] pr-4"> */}
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl mb-3">제1조 (목적)</h2>
                    <p className="text-gray-700 leading-relaxed">
                      본 약관은 BreezI(이하 "서비스")가 제공하는 AI 심리 케어 서비스의 이용과 관련하여 
                      회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제2조 (정의)</h2>
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        <strong>1. "서비스"</strong>란 BreezI가 제공하는 AI 캐릭터 채팅, 일기 작성, 
                        감정 리포트, 커뮤니티, 캘린더 등 모든 기능을 의미합니다.
                      </li>
                      <li>
                        <strong>2. "회원"</strong>이란 본 약관에 동의하고 서비스에 가입하여 
                        서비스를 이용하는 자를 말합니다.
                      </li>
                      <li>
                        <strong>3. "게시물"</strong>이란 회원이 서비스에 게시한 문자, 이미지, 
                        각종 파일 및 링크 등을 의미합니다.
                      </li>
                      <li>
                        <strong>4. "Pro 회원"</strong>이란 유료 구독을 통해 프리미엄 기능을 
                        이용하는 회원을 의미합니다.
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제3조 (약관의 효력 및 변경)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. 본 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그 효력을 발생합니다.
                      </p>
                      <p>
                        2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 
                        변경된 약관은 시행일 7일 전부터 공지합니다.
                      </p>
                      <p>
                        3. 회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제4조 (회원가입)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. 회원가입은 이용자가 약관의 내용에 대하여 동의를 하고 
                        회원가입 신청을 한 후 회사가 이러한 신청에 대하여 승낙함으로써 체결됩니다.
                      </p>
                      <p>
                        2. 회원은 회원가입 시 실명 및 실제 정보를 기재해야 하며, 
                        허위 정보를 기재하거나 타인의 정보를 도용한 경우 서비스 이용이 제한될 수 있습니다.
                      </p>
                      <p>
                        3. 만 14세 미만의 아동은 보호자의 동의가 필요합니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제5조 (서비스의 제공)</h2>
                    <div className="space-y-3">
                      <p className="text-gray-700">
                        회사는 다음과 같은 서비스를 제공합니다:
                      </p>
                      <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded">
                        <h3 className="mb-2">무료 서비스</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>AI 캐릭터와의 채팅 (최대 3개 채팅방)</li>
                          <li>한 줄 일기 작성</li>
                          <li>기본 감정 리포트 (주간·월간)</li>
                          <li>커뮤니티 이용</li>
                          <li>캘린더 및 일정 관리</li>
                        </ul>
                      </div>
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                        <h3 className="mb-2">Pro 서비스 (유료)</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
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
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제6조 (서비스의 중단)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. 회사는 다음 각 호의 경우 서비스 제공을 일시적으로 중단할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>시스템 점검, 보수 또는 교체</li>
                        <li>통신 장애 또는 운영상 상당한 이유가 있는 경우</li>
                        <li>천재지변, 국가비상사태 등 불가항력적인 사유가 있는 경우</li>
                      </ul>
                      <p className="mt-2">
                        2. 서비스 중단 시 회사는 사전에 공지하며, 
                        부득이한 경우 사후에 통지할 수 있습니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제7조 (회원의 의무)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>회원은 다음 행위를 하여서는 안 됩니다:</p>
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                        <ul className="list-disc list-inside space-y-1">
                          <li>타인의 정보 도용</li>
                          <li>회사가 게시한 정보의 변경</li>
                          <li>회사가 정한 정보 이외의 정보 등의 송신 또는 게시</li>
                          <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                          <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                          <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 공개 또는 게시</li>
                          <li>허위 사실을 유포하거나 타인을 비방하는 행위</li>
                          <li>영리 목적의 광고성 정보 게시</li>
                          <li>자살, 자해 등 위험한 행위를 조장하거나 권유하는 행위</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제8조 (게시물의 관리)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. 회원이 작성한 게시물에 대한 저작권은 회원에게 있으며, 
                        회사는 서비스 운영을 위해 필요한 범위 내에서 게시물을 사용할 수 있습니다.
                      </p>
                      <p>
                        2. 회사는 다음 각 호에 해당하는 게시물을 사전 통지 없이 삭제하거나 
                        이동 또는 등록 거부할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>타인을 모욕하거나 명예를 훼손하는 내용</li>
                        <li>불법적이거나 부당한 내용</li>
                        <li>공서양속에 위반되는 내용</li>
                        <li>범죄적 행위에 결부된다고 인정되는 내용</li>
                        <li>제3자의 저작권 등 권리를 침해하는 내용</li>
                        <li>회사에서 규정한 게시 기간을 초과한 내용</li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제9조 (유료 서비스 및 환불)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. Pro 서비스는 월 5,900원의 정기 결제로 제공됩니다.
                      </p>
                      <p>
                        2. 결제는 카카오페이, 토스페이 등 다양한 방식을 지원합니다.
                      </p>
                      <p>
                        3. 회원은 언제든지 구독을 취소할 수 있으며, 
                        취소 시점까지 이용한 기간에 대한 비용은 환불되지 않습니다.
                      </p>
                      <p>
                        4. 서비스 장애로 인해 정상적인 이용이 불가능한 경우, 
                        해당 기간만큼 이용 기간을 연장하거나 환불 처리합니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제10조 (AI 서비스 이용 시 유의사항)</h2>
                    <div className="space-y-2">
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                        <p className="text-amber-900 mb-2">
                          <strong>⚠️ 중요한 안내</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-amber-900">
                          <li>본 서비스는 전문적인 심리 상담이나 의료 서비스를 대체할 수 없습니다.</li>
                          <li>AI 캐릭터의 응답은 참고용이며, 개인의 의사 결정에 절대적 기준이 되어서는 안 됩니다.</li>
                          <li>심각한 정신 건강 문제나 위기 상황에서는 반드시 전문가의 도움을 받으시기 바랍니다.</li>
                          <li>자살, 자해 등의 위험이 있는 경우 즉시 정신건강복지센터(1577-0199) 또는 생명의전화(1588-9191)로 연락하세요.</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제11조 (계정 정지 및 이용 제한)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. 회사는 회원이 본 약관을 위반한 경우 다음과 같은 조치를 취할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>경고:</strong> 1차 위반 시 경고 조치</li>
                        <li><strong>일시 정지:</strong> 2차 위반 시 7일~30일 이용 정지</li>
                        <li><strong>영구 정지:</strong> 3차 위반 또는 중대한 위반 시 영구 정지</li>
                      </ul>
                      <p className="mt-2">
                        2. 정지된 회원은 이의신청을 할 수 있으며, 
                        회사는 이를 검토하여 정당한 사유가 인정되는 경우 정지를 해제할 수 있습니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제12조 (회원 탈퇴 및 자격 상실)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. 회원은 언제든지 프로필 페이지를 통해 탈퇴를 요청할 수 있습니다.
                      </p>
                      <p>
                        2. 탈퇴 시 회원의 모든 데이터는 즉시 삭제되며, 복구할 수 없습니다.
                      </p>
                      <p>
                        3. 서비스 남용 방지를 위해 이메일, 신고 이력, IP 주소 등은 
                        개인정보 처리방침에 따라 1년간 보관 후 자동 삭제됩니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제13조 (면책 조항)</h2>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        1. 회사는 천재지변, 전쟁, 기타 이에 준하는 불가항력으로 인하여 
                        서비스를 제공할 수 없는 경우 책임이 면제됩니다.
                      </p>
                      <p>
                        2. 회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
                      </p>
                      <p>
                        3. 회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 
                        상실한 것에 대하여 책임을 지지 않습니다.
                      </p>
                      <p>
                        4. 회사는 회원 간 또는 회원과 제3자 간의 상호작용으로 발생하는 
                        분쟁에 대해 개입할 의무가 없으며 이로 인한 손해를 배상할 책임이 없습니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제14조 (분쟁 해결)</h2>
                    <p className="text-gray-700">
                      본 약관과 관련된 분쟁은 대한민국 법률에 따라 해결하며, 
                      관할 법원은 민사소송법에 따릅니다.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">제15조 (고객 지원)</h2>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-gray-700 mb-2">
                        서비스 이용 중 문의사항이 있으시면 아래로 연락주세요:
                      </p>
                      {/* <p><strong>이메일:</strong> khb1620@naver.com</p> */}
                      <p className="text-sm text-gray-600 mt-2">
                        영업일 기준 24시간 이내 답변드리겠습니다.
                      </p>
                    </div>
                  </section>

                  <section className="text-sm text-gray-500 pt-4 border-t">
                    <p><strong>시행일:</strong> 2025년 11월</p>
                    <p className="mt-2 text-xs">
                      ※ 베타 서비스 기간 중 약관이 수시로 업데이트될 수 있습니다.
                    </p>
                  </section>
                </div>
              {/* </ScrollArea> */}
            </CardContent>
          </Card>
          </ScrollArea>
          
          <Button
            variant="outline"
            onClick={onViewTerms}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            전체 약관 새 페이지에서 보기
          </Button>
        </div>
      );
    }

    if (viewMode === 'privacy') {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToAgreement}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">개인정보 처리방침</CardTitle>
              <p className="text-sm text-gray-500">최종 수정일: 2025.10.25</p>
            </CardHeader>
            <CardContent>
              {/* <ScrollArea className="h-[calc(100vh-200px)] pr-4"> */}
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl mb-3">1. 개인정보의 수집 및 이용 목적</h2>
                    <p className="text-gray-700 leading-relaxed">
                      BreezI는 다음의 목적을 위하여 개인정보를 처리합니다:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                      <li>회원 가입 및 관리</li>
                      <li>AI 캐릭터와의 채팅 서비스 제공</li>
                      <li>일기 및 감정 관리 기능 제공</li>
                      <li>커뮤니티 서비스 제공</li>
                      <li>감정 리포트 생성 및 제공</li>
                      <li>캘린더 및 일정 관리 서비스 제공</li>
                      <li>서비스 개선 및 맞춤형 서비스 제공</li>
                      <li>부정 이용 방지 및 서비스 안전성 확보</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">2. 수집하는 개인정보 항목</h2>
                    <div className="space-y-3">
                      <div>
                        <h3 className="mb-2">필수 정보</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>이메일 주소</li>
                          <li>이름</li>
                          {/* <li>비밀번호 (암호화 저장)</li> */}
                        </ul>
                      </div>
                      <div>
                        <h3 className="mb-2">카카오 로그인 시 수집 정보</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>카카오 계정 이메일 주소</li>
                          <li>카카오 프로필 닉네임 (선택)</li>
                          <li>카카오 고유 식별자 (OAuth ID)</li>
                        </ul>
                        <p className="text-xs text-gray-600 mt-2">
                          ※ 카카오 로그인 시 비밀번호는 수집되지 않으며, 
                          카카오 서버에서 인증을 처리합니다.
                        </p>
                      </div>
                      <div>
                        <h3 className="mb-2">선택 정보</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>생년월일</li>
                          <li>프로필 이미지</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="mb-2">서비스 이용 과정에서 자동 수집되는 정보</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>IP 주소</li>
                          <li>서비스 이용 기록</li>
                          <li>접속 로그</li>
                          <li>쿠키 및 세션 정보</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">3. 개인정보의 보유 및 이용 기간</h2>
                    <div className="space-y-3 text-gray-700">
                      <div>
                        <h3 className="mb-2">가. 회원 정보</h3>
                        <p>
                          회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.
                          단, 아래의 경우는 명시한 기간 동안 보관합니다.
                        </p>
                      </div>
                      
                      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                        <h3 className="mb-2 text-amber-900">나. 탈퇴 시 보관되는 정보 (남용 방지 목적)</h3>
                        <p className="mb-2 text-amber-900">
                          서비스 남용 방지 및 부정 이용 차단을 위해 다음 정보를 <strong>1년간 보관</strong>합니다:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-amber-900">
                          <li><strong>이메일 주소</strong> - 재가입 시 남용 이력 확인</li>
                          <li><strong>신고 이력</strong> - 신고 접수 및 신고 당한 기록</li>
                          <li><strong>경고 및 정지 이력</strong> - 반복적 규칙 위반자 관리</li>
                          {/* <li><strong>IP 주소</strong> - 불법 행위 추적 및 대응</li> */}
                        </ul>
                        <p className="mt-3 text-sm text-amber-800 bg-amber-100 p-2 rounded">
                          <strong>📅 1년 경과 후 자동 삭제되는 내용:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 mt-2 ml-2">
                          <li>탈퇴 기록에서 이메일 완전 삭제</li>
                          <li>모든 신고 기록에서 이메일 및 IP 주소 익명화</li>
                          <li><strong>신고 당한 게시글/댓글 내용 영구 삭제</strong></li>
                          <li>활동 로그 영구 삭제</li>
                          <li>경고/정지 이력 영구 삭제</li>
                        </ul>
                        <p className="mt-2 text-sm text-amber-900">
                          ※ 시스템이 매일 자동으로 보관 기한을 확인하여 만료된 데이터를 삭제합니다.
                        </p>
                      </div>

                      <div>
                        <h3 className="mb-2">다. 법령에 따른 보관</h3>
                        <p>관계 법령에 따라 다음과 같이 보관합니다:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                          <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                          <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                          <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">4. 신고 시스템 및 IP 주소 기록</h2>
                    <div className="space-y-3 text-gray-700">
                      <p>
                        서비스 안전성 확보 및 악의적 사용자 관리를 위해 다음 정보를 수집·보관합니다:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>게시글/댓글 작성 시:</strong> 작성자 IP 주소 기록</li>
                        <li><strong>신고 접수 시:</strong> 신고자 IP 주소 및 신고 내용 기록</li>
                        <li><strong>신고된 콘텐츠:</strong> 원본 내용 및 작성자 IP 주소 보관</li>
                      </ul>
                      <p className="mt-2">
                        이 정보는 불법 행위 대응, 법적 분쟁 해결, 서비스 남용 방지 목적으로 사용되며,
                        관련 법령에 따라 최대 1년간 보관 후 자동 삭제됩니다.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">5. 개인정보의 제3자 제공</h2>
                    <p className="text-gray-700">
                      BreezI는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
                      다만, 다음의 경우 예외로 합니다:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                      <li>이용자가 사전에 동의한 경우</li>
                      <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                    </ul>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mt-4">
                      <h3 className="mb-2 text-blue-900">가. 서비스 제공을 위한 위탁</h3>
                      <p className="text-blue-900 mb-2">
                        다음의 업체에 개인정보 처리를 위탁합니다:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-blue-900">
                        <li><strong>Supabase (데이터베이스 및 인증)</strong></li>
                        <li className="ml-4 text-sm">- 처리 항목: 이메일, 닉네임, 서비스 이용 기록</li>
                        <li className="ml-4 text-sm">- 보유 기간: 회원 탈퇴 시까지</li>
                        
                        <li className="mt-2"><strong>카카오 (소셜 로그인)</strong></li>
                        <li className="ml-4 text-sm">- 처리 항목: 카카오 계정 이메일, 닉네임, OAuth ID</li>
                        <li className="ml-4 text-sm">- 보유 기간: 회원 탈퇴 시까지</li>
                        
                        {/* <li className="mt-2"><strong>OpenAI (AI 서비스)</strong></li>
                        <li className="ml-4 text-sm">- 처리 항목: 채팅 내용, 일기 내용 (익명화 처리)</li>
                        <li className="ml-4 text-sm">- 보유 기간: 처리 완료 후 즉시 삭제</li> */}
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">6. 개인정보의 파기</h2>
                    <div className="space-y-3 text-gray-700">
                      <p>
                        회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체없이 해당 개인정보를 파기합니다.
                      </p>
                      <div>
                        <h3 className="mb-2">파기 절차</h3>
                        <p>
                          이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.
                        </p>
                      </div>
                      <div>
                        <h3 className="mb-2">자동 파기 시스템</h3>
                        <p>
                          탈퇴 계정의 이메일 및 신고 이력은 보관 기한(1년) 경과 시 시스템에 의해 자동으로 영구 삭제됩니다.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">7. 이용자의 권리</h2>
                    <p className="text-gray-700">
                      이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                      <li>개인정보 열람 요구</li>
                      <li>개인정보 정정·삭제 요구</li>
                      <li>개인정보 처리 정지 요구</li>
                      <li>회원 탈퇴 (개인정보 삭제)</li>
                    </ul>
                    <p className="mt-2 text-gray-700">
                      위 권리 행사는 프로필 페이지 또는 고객센터를 통해 가능합니다.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">8. 개인정보 보호책임자</h2>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-gray-700">
                        BreezI는 개인정보 처리에 관한 업무를 총괄해서 책임지고,
                        개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여
                        아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                      </p>
                      <div className="mt-3 space-y-1">
                        {/* <p><strong>이메일:</strong> khb1620@naver.com</p> */}
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl mb-3">9. 개인정보처리방침 변경</h2>
                    <p className="text-gray-700">
                      이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
                      변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                    </p>
                  </section>

                  <section className="text-sm text-gray-500 pt-4 border-t">
                    <p>본 방침은 2025년 11월부터 시행됩니다.</p>
                    <p className="mt-2 text-xs">
                      ※ 베타 서비스 기간 중 수시로 업데이트될 수 있습니다.
                    </p>
                  </section>
                </div>
              {/* </ScrollArea> */}
              </CardContent>
            </Card>
          </ScrollArea>
            
          <Button
            variant="outline"
            onClick={onViewPrivacy}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            전체 개인정보 처리방침 새 페이지에서 보기
          </Button>
        </div>
      );
    }

    // 기본 약관 동의 화면
    return renderAgreementView();
  };

  const renderAgreementView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-600" />
          약관 동의
        </DialogTitle>
        <DialogDescription>
          BreezI 서비스 이용을 위해 아래 약관에 동의해주세요
        </DialogDescription>
      </DialogHeader>

        <div className="space-y-4">
          {/* 전체 동의 */}
          <div className="bg-sky-50 border-2 border-sky-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="all-agree"
                checked={allAgreed}
                onCheckedChange={handleAllAgree}
                className="w-5 h-5"
              />
              <label
                htmlFor="all-agree"
                className="flex-1 cursor-pointer select-none"
              >
                <p className="font-semibold text-sky-900">전체 동의</p>
                <p className="text-xs text-sky-700">
                  아래 모든 약관에 동의합니다
                </p>
              </label>
            </div>
          </div>

          <Separator />

          {/* 개별 약관 */}
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-4">
              {/* 이용약관 (필수) */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="terms-agree"
                  checked={termsAgreed}
                  onCheckedChange={(checked) =>
                    handleIndividualAgree(setTermsAgreed, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="terms-agree"
                    className="cursor-pointer select-none block"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">이용약관</span>
                      <span className="text-xs text-red-600 font-semibold">
                        (필수)
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      서비스 이용에 관한 기본 약관입니다
                    </p>
                  </label>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeViewMode('terms');
                    }}
                    className="h-auto p-0 mt-1 text-xs text-sky-600"
                  >
                    약관 전문 보기 →
                  </Button>
                </div>
              </div>

              {/* 개인정보 처리방침 (필수) */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="privacy-agree"
                  checked={privacyAgreed}
                  onCheckedChange={(checked) =>
                    handleIndividualAgree(setPrivacyAgreed, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="privacy-agree"
                    className="cursor-pointer select-none block"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">개인정보 처리방침</span>
                      <span className="text-xs text-red-600 font-semibold">
                        (필수)
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      개인정보 수집·이용·보관에 관한 안내입니다
                    </p>
                  </label>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeViewMode('privacy');
                    }}
                    className="h-auto p-0 mt-1 text-xs text-sky-600"
                  >
                    전문 보기 →
                  </Button>
                </div>
              </div>

              {/* 만 14세 이상 확인 (필수) */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="age-agree"
                  checked={ageAgreed}
                  onCheckedChange={(checked) =>
                    handleIndividualAgree(setAgeAgreed, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="age-agree"
                    className="cursor-pointer select-none block"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">만 14세 이상입니다</span>
                      <span className="text-xs text-red-600 font-semibold">
                        (필수)
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      만 14세 미만은 보호자 동의가 필요합니다
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* AI 서비스 안내 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>⚠️ AI 서비스 이용 안내</strong>
              <br />
              본 서비스는 전문적인 심리 상담이나 의료 서비스를 대체할 수 없습니다.
              심각한 정신 건강 문제가 있는 경우 반드시 전문가의 도움을 받으세요.
              <br />
              <span className="text-amber-800">
                • 정신건강복지센터: 1577-0199
                <br />• 생명의전화: 1588-9191
              </span>
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onDisagree}
              className="flex-1"
            >
              동의하지 않음
            </Button>
            <Button
              onClick={onAgree}
              disabled={!canProceed}
              className="flex-1 bg-sky-600 hover:bg-sky-700"
            >
              {canProceed ? '동의하고 시작하기' : '필수 약관에 동의해주세요'}
            </Button>
          </div>
        </div>
    </>
  );

  // Dialog onOpenChange 처리
  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // 다이얼로그를 닫으려고 할 때
      if (viewMode !== 'agreement') {
        // 상세 화면이면 뒤로가기
        handleBackToAgreement();
      } else {
        // agreement 화면이면 다이얼로그 닫기
        onDisagree();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className={viewMode === 'agreement' ? "sm:max-w-md max-h-[90vh]" : "sm:max-w-2xl max-h-[90vh]"}>
        {renderTermsContent()}
      </DialogContent>
    </Dialog>
  );
}
