import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface TermsOfServicePageProps {
  onBack: () => void;
}

export function TermsOfServicePage({ onBack }: TermsOfServicePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">BreezI 이용약관</CardTitle>
            <p className="text-sm text-gray-500">최종 수정일: 2025.10.25</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-200px)] pr-4">
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
                  <p><strong>시행일:</strong> 2024년 12월</p>
                  <p className="mt-2 text-xs">
                    ※ 베타 서비스 기간 중 약관이 수시로 업데이트될 수 있습니다.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
