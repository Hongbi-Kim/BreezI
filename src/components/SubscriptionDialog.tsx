import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Crown, Sparkles, Check, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
// import { projectId, publicAnonKey } from '../utils/supabase/info';

const getSupabaseConfig = () => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!projectId || !publicAnonKey) {
    throw new Error(
      'Supabase 환경 변수가 설정되지 않았습니다.\n' +
      '필요한 변수: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_ANON_KEY'
    );
  }

  return { projectId, publicAnonKey };
};

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialProductType?: ProductType;
}

type PaymentMethod = 'toss' | 'naver' | 'kakao' | 'card';
type ProductType = 'pro' | 'item-package';

export function SubscriptionDialog({ open, onOpenChange, onSuccess, initialProductType = 'pro' }: SubscriptionDialogProps) {
  const [productType, setProductType] = useState<ProductType>(initialProductType);
  const [selectedPlan, setSelectedPlan] = useState<'1month' | '3months' | '1year'>('1month');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('toss');
  const [isProcessing, setIsProcessing] = useState(false);

  // 다이얼로그가 열릴 때마다 초기 탭으로 설정
  useEffect(() => {
    if (open) {
      setProductType(initialProductType);
    }
  }, [open, initialProductType]);

  const plans = {
    '1month': {
      price: 6900,
      period: '1개월',
      save: 0,
      discount: 0,
    },
    '3months': {
      price: 18900,
      period: '3개월',
      save: 1800,
      discount: 9,
      originalPrice: 20700,
    },
    '1year': {
      price: 69000,
      period: '1년',
      save: 13800,
      discount: 17,
      originalPrice: 82800,
    },
  };

  const itemPackagePrice = 19900;

  const paymentMethods = [
    { 
      id: 'toss' as PaymentMethod, 
      name: '토스페이', 
      logo: (
        <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="6" fill="#0064FF"/>
          <text x="20" y="25" fontSize="14" fontWeight="700" fill="white" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">toss</text>
        </svg>
      )
    },
    { 
      id: 'naver' as PaymentMethod, 
      name: '네이버페이', 
      logo: (
        <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="6" fill="#03C75A"/>
          <path d="M14 12H18.5L23.5 22V12H26V28H21.5L16.5 18V28H14V12Z" fill="white"/>
        </svg>
      )
    },
    { 
      id: 'kakao' as PaymentMethod, 
      name: '카카오페이', 
      logo: (
        <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#FEE500"/>
          <path d="M20 12C15.0294 12 11 15.134 11 19C11 21.395 12.5255 23.5065 14.8235 24.7305L13.8823 28.4118C13.8235 28.6471 14.0882 28.8235 14.2941 28.6765L18.5882 25.6176C19.0588 25.6765 19.5294 25.7059 20 25.7059C24.9706 25.7059 29 22.5718 29 18.7059C29 14.84 24.9706 12 20 12Z" fill="#3C1E1E"/>
        </svg>
      )
    },
    { 
      id: 'card' as PaymentMethod, 
      name: '신용/체크카드', 
      logo: (
        <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#6B7280"/>
          <rect x="8" y="13" width="24" height="14" rx="2" fill="white"/>
          <rect x="8" y="15" width="24" height="3" fill="#6B7280"/>
          <rect x="11" y="22" width="8" height="2" rx="1" fill="#D1D5DB"/>
        </svg>
      )
    },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        toast.error('로그인이 필요합니다');
        setIsProcessing(false);
        return;
      }

      const amount = productType === 'pro' ? plans[selectedPlan].price : itemPackagePrice;

      // STEP 1: Initialize payment order
      const initResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-71735bdc/payment/init`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productType,
            plan: productType === 'pro' ? selectedPlan : undefined,
            paymentMethod: selectedPayment,
            amount,
          }),
        }
      );

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.error || '결제 초기화 실패');
      }

      const { orderId, customerKey } = await initResponse.json();
      console.log('Payment initialized:', { orderId, amount, customerKey });

      // STEP 2: 토스페이먼츠 연동 (현재는 테스트 모드)
      // 실제 토스페이먼츠 키가 있으면 여기서 SDK를 호출합니다
      // const tossPayments = TossPayments('your-client-key');
      // await tossPayments.requestPayment({ ... });

      // 테스트 모드: 시뮬레이션 결제 (1.5초 딜레이 후 성공)
      toast.info('결제를 처리하고 있습니다... (테스트 모드)');
      
      setTimeout(async () => {
        try {
          // STEP 3: Confirm payment (simulate successful payment)
          await handlePaymentSuccess(orderId, 'test_payment_key_' + Date.now(), amount);
        } catch (err) {
          console.error('Payment confirmation error:', err);
          toast.error('결제 확인 중 오류가 발생했습니다');
          setIsProcessing(false);
        }
      }, 1500);

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다');
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (orderId: string, paymentKey: string, amount: number) => {
    try {
      const accessToken = localStorage.getItem('access_token');
      
      const endpoint = productType === 'pro' 
        ? '/payment/confirm' 
        : '/payment/confirm-item-package';

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-71735bdc${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            paymentKey,
            amount,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '결제 확인 실패');
      }

      const data = await response.json();
      console.log('Payment confirmed:', data);

      if (productType === 'pro') {
        toast.success('Wave Pro 구독이 시작되었습니다! 🎉');
      } else {
        toast.success('정원 아이템 패키지 구매가 완료되었습니다! 🎁');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast.error(error instanceof Error ? error.message : '결제 확인 중 오류가 발생했습니다');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {productType === 'pro' ? (
              <>
                <Crown className="w-5 h-5 text-yellow-600" />
                Wave Pro 구독
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-purple-600" />
                정원 아이템 패키지
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {productType === 'pro' 
              ? '프리미엄 기능을 이용하고 더 나은 경험을 즐겨보세요'
              : '모든 프리미엄 정원 아이템을 영구적으로 사용하세요'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setProductType('pro')}
              className={`p-4 rounded-lg border-2 transition-all ${
                productType === 'pro'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Crown className={`w-6 h-6 mx-auto mb-2 ${productType === 'pro' ? 'text-yellow-600' : 'text-gray-400'}`} />
              <div className={`font-medium ${productType === 'pro' ? 'text-yellow-900' : 'text-gray-600'}`}>
                Pro 구독
              </div>
              <div className="text-xs text-gray-500 mt-1">구독형</div>
            </button>
            <button
              onClick={() => setProductType('item-package')}
              className={`p-4 rounded-lg border-2 transition-all ${
                productType === 'item-package'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Sparkles className={`w-6 h-6 mx-auto mb-2 ${productType === 'item-package' ? 'text-purple-600' : 'text-gray-400'}`} />
              <div className={`font-medium ${productType === 'item-package' ? 'text-purple-900' : 'text-gray-600'}`}>
                아이템 패키지
              </div>
              <div className="text-xs text-gray-500 mt-1">영구 소장</div>
            </button>
          </div>

          {productType === 'pro' ? (
            <>
              {/* Plan Selection */}
              <div className="space-y-3">
            <Label>구독 기간 선택</Label>
            <RadioGroup value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as '1month' | '3months' | '1year')}>
              <div className="space-y-2">
                {/* 1 Month Plan */}
                <div className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedPlan === '1month' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="1month" id="1month" />
                    <Label htmlFor="1month" className="cursor-pointer">
                      <div>
                        <p>1개월 구독</p>
                        <p className="text-sm text-gray-500">매월 자동 결제</p>
                      </div>
                    </Label>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{plans['1month'].price.toLocaleString()}원</p>
                    <p className="text-sm text-gray-500">/ {plans['1month'].period}</p>
                  </div>
                </div>

                {/* 3 Months Plan */}
                <div className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedPlan === '3months' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="3months" id="3months" />
                    <Label htmlFor="3months" className="cursor-pointer">
                      <div>
                        <p className="flex items-center gap-2">
                          3개월 구독
                          <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full">
                            {plans['3months'].discount}% 할인
                          </span>
                        </p>
                        <p className="text-sm text-gray-500">3개월 동안 사용</p>
                      </div>
                    </Label>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 line-through">{plans['3months'].originalPrice?.toLocaleString()}원</p>
                    <p className="font-semibold">{plans['3months'].price.toLocaleString()}원</p>
                    <p className="text-xs text-green-600">{plans['3months'].save.toLocaleString()}원 절약</p>
                  </div>
                </div>

                {/* 1 Year Plan */}
                <div className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedPlan === '1year' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="1year" id="1year" />
                    <Label htmlFor="1year" className="cursor-pointer">
                      <div>
                        <p className="flex items-center gap-2">
                          1년 구독
                          <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full">
                            {plans['1year'].discount}% 할인
                          </span>
                        </p>
                        <p className="text-sm text-gray-500">1년 동안 사용</p>
                      </div>
                    </Label>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 line-through">{plans['1year'].originalPrice?.toLocaleString()}원</p>
                    <p className="font-semibold">{plans['1year'].price.toLocaleString()}원</p>
                    <p className="text-xs text-green-600">{plans['1year'].save.toLocaleString()}원 절약</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Benefits */}
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
            <p className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-600" />
              Pro 혜택
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span>다양한 AI 캐릭터와 무제한 대화</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span>무제한 일기 작성 및 AI 초안 생성</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span>고급 감정 분석 리포트 및 인사이트</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span>프로필에 Pro 뱃지 표시</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span>우선 고객 지원</span>
              </li>
            </ul>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>결제 수단</Label>
            <RadioGroup value={selectedPayment} onValueChange={(v) => setSelectedPayment(v as PaymentMethod)}>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPayment === method.id 
                        ? 'border-yellow-500 bg-yellow-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RadioGroupItem value={method.id} id={method.id} />
                    <Label htmlFor={method.id} className="cursor-pointer flex items-center gap-2">
                      <span className="flex-shrink-0">{method.logo}</span>
                      <span className="text-sm">{method.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Total */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">결제 금액</span>
              <span className="text-2xl">{plans[selectedPlan].price.toLocaleString()}원</span>
            </div>
            {selectedPlan === 'yearly' && (
              <p className="text-sm text-green-600 text-right">
                월 {Math.round(plans.yearly.price / 12).toLocaleString()}원으로 이용
              </p>
            )}
          </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {isProcessing ? '처리 중...' : `${plans[selectedPlan].price.toLocaleString()}원 결제하기`}
              </Button>
            </>
          ) : (
            <>
              {/* Item Package Content */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <p className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  패키지 포함 아이템
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>프리미엄 펫 4종 (말티즈, 골든 리트리버, 점박이 고양이, 눈송이 고양이)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>프리미엄 장식 3종 (분수대, 요정, 반딧불이)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>프리미엄 배경 8종 (비, 무지개, 천둥번개, 눈, 별밤, 석양, 오로라, 벚꽃)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold text-purple-700">영구 소장 - 한 번 구매하면 평생 사용</span>
                  </li>
                </ul>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label>결제 수단</Label>
                <RadioGroup value={selectedPayment} onValueChange={(v) => setSelectedPayment(v as PaymentMethod)}>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedPayment === method.id 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <RadioGroupItem value={method.id} id={`item-${method.id}`} />
                        <Label htmlFor={`item-${method.id}`} className="cursor-pointer flex items-center gap-2">
                          <span className="flex-shrink-0">{method.logo}</span>
                          <span className="text-sm">{method.name}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Total */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">결제 금액</span>
                  <span className="text-2xl">{itemPackagePrice.toLocaleString()}원</span>
                </div>
                <p className="text-sm text-purple-600 text-right">
                  ✨ 영구 소장 - 추가 비용 없음
                </p>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {isProcessing ? '처리 중...' : `${itemPackagePrice.toLocaleString()}원 결제하기`}
              </Button>
            </>
          )}

          <p className="text-xs text-center text-gray-500">
            💡 현재 테스트 모드로 운영 중입니다. 실제 결제는 진행되지 않으며, 모든 결제가 자동으로 승인됩니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
