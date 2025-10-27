import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
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
            <CardTitle className="text-2xl">개인정보 처리방침</CardTitle>
            <p className="text-sm text-gray-500">최종 수정일: 2025.10.25</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-200px)] pr-4">
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
                        <li>닉네임</li>
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
                        <li><strong>IP 주소</strong> - 불법 행위 추적 및 대응</li>
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
                      
                      <li className="mt-2"><strong>OpenAI (AI 서비스)</strong></li>
                      <li className="ml-4 text-sm">- 처리 항목: 채팅 내용, 일기 내용 (익명화 처리)</li>
                      <li className="ml-4 text-sm">- 보유 기간: 처리 완료 후 즉시 삭제</li>
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
                      <p><strong>이메일:</strong> khb1620@naver.com</p>
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
                  <p>본 방침은 2024년 12월부터 시행됩니다.</p>
                  <p className="mt-2 text-xs">
                    ※ 베타 서비스 기간 중 수시로 업데이트될 수 있습니다.
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
