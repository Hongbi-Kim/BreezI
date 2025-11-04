import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { apiCall } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { WaveLoopAnimation } from './WaveLoopAnimation';

interface TimeRippleAnswer {
  id: string;
  date: string; // YYYY-MM-DD
  answer: string;
  createdAt: string;
}

interface QuestionWithAnswers {
  monthDay: string; // MM-DD
  question: string;
  answers: TimeRippleAnswer[];
}

// 365개의 질문 정의 (MM-DD 형식)
export const TIME_RIPPLE_QUESTIONS: Record<string, string> = {
  '01-01': '올해는 어떤 한 해가 되길 바라나요?',
  '01-02': '지금 나에게 가장 필요한 것은 무엇인가요?',
  '01-03': '최근 가장 감사했던 순간은 언제인가요?',
  '01-04': '나를 가장 행복하게 만드는 것은 무엇인가요?',
  '01-05': '올해 꼭 이루고 싶은 목표는 무엇인가요?',
  '01-06': '지금의 나를 한 문장으로 표현한다면?',
  '01-07': '가장 소중하게 여기는 사람은 누구인가요?',
  '01-08': '최근 배운 것 중 가장 인상 깊은 것은?',
  '01-09': '나를 성장시킨 경험은 무엇인가요?',
  '01-10': '지금 가장 하고 싶은 일은 무엇인가요?',
  '01-11': '나에게 휴식이란 어떤 의미인가요?',
  '01-12': '최근 가장 뿌듯했던 일은 무엇인가요?',
  '01-13': '내가 가진 강점은 무엇이라고 생각하나요?',
  '01-14': '지금 이 순간, 나는 어떤 기분인가요?',
  '01-15': '올해 새롭게 시작하고 싶은 것은?',
  '01-16': '나를 위로하는 방법은 무엇인가요?',
  '01-17': '최근 가장 즐거웠던 순간은 언제인가요?',
  '01-18': '내가 변화시키고 싶은 습관은 무엇인가요?',
  '01-19': '지금 가장 관심있는 분야는 무엇인가요?',
  '01-20': '나에게 용기를 주는 말은 무엇인가요?',
  '01-21': '최근 느낀 작은 행복은 무엇인가요?',
  '01-22': '내가 좋아하는 나의 모습은 무엇인가요?',
  '01-23': '지금 가장 걱정되는 것은 무엇인가요?',
  '01-24': '나를 동기부여하는 것은 무엇인가요?',
  '01-25': '최근 감동받은 일은 무엇인가요?',
  '01-26': '내가 이루고 싶은 꿈은 무엇인가요?',
  '01-27': '지금 나��게 가장 ������한 가치는?',
  '01-28': '나를 편안하게 만드는 것은 무엇인가요?',
  '01-29': '최근 도전해본 것이 있나요?',
  '01-30': '내가 사랑하는 것들은 무엇인가요?',
  '01-31': '1월을 한 문장으로 정리한다면?',
  
  '02-01': '2월에 기대하는 것은 무엇인가요?',
  '02-02': '나에게 사랑이란 어떤 의미인가요?',
  '02-03': '최근 받은 가장 따뜻한 말은?',
  '02-04': '내가 누군가에게 전하고 싶은 말은?',
  '02-05': '지금 가장 보고 싶은 사람은 누구인가요?',
  '02-06': '나를 설레게 만드는 것은 무엇인가요?',
  '02-07': '최근 마음이 따뜻해진 순간은?',
  '02-08': '내가 소중히 간직하고 싶은 추억은?',
  '02-09': '나에게 위로가 되는 것은 무엇인가요?',
  '02-10': '지금 가장 표현하고 싶은 감정은?',
  '02-11': '나를 이해해주는 사람은 누구인가요?',
  '02-12': '최근 누군가에게 감사한 일은?',
  '02-13': '내가 베풀고 싶은 사랑은 어떤 모습인가요?',
  '02-14': '나를 사랑하는 방법은 무엇인가요?',
  '02-15': '지금 가장 기대되는 일은 무엇인가요?',
  '02-16': '나에게 용기를 준 사람은 누구인가요?',
  '02-17': '최근 마음이 편안했던 순간은?',
  '02-18': '내가 지키고 싶�� 관계는 무엇인가요?',
  '02-19': '지금 하고 싶은 말이 있나요?',
  '02-20': '나를 응원하는 사람들에게 하고 싶은 말은?',
  '02-21': '최근 누군가를 응원한 일이 있나요?',
  '02-22': '내가 함께하고 싶은 사람은 누구인가요?',
  '02-23': '지금 가장 듣고 싶은 말은 무엇인가요?',
  '02-24': '나를 웃게 만드는 것은 무엇인가요?',
  '02-25': '최근 마음이 포근했던 순간은?',
  '02-26': '내가 전하고 싶은 따뜻함은 어떤 것인가요?',
  '02-27': '지금 나에게 필요한 위로는 무엇인가요?',
  '02-28': '2월을 한 문장으로 정리한다면?',
  '02-29': '4년에 한 번 오는 오늘, 특별한 소망이 있나요?',
  
  '03-01': '3월에 새롭게 시작하고 싶은 것은?',
  '03-02': '봄이 주는 느낌은 어떤가요?',
  '03-03': '최근 새로운 시작을 한 일이 있나요?',
  '03-04': '나에게 변화란 어떤 의미인가요?',
  '03-05': '지금 가장 기대하는 변화는?',
  '03-06': '내가 피우고 싶은 꽃은 무엇인가요?',
  '03-07': '최근 성장했다고 느낀 순간은?',
  '03-08': '나를 응원하는 말을 스스로에게 해준다면?',
  '03-09': '지금 가장 도전하고 싶은 것은?',
  '03-10': '내가 극복하고 싶은 두려움은?',
  '03-11': '최근 용기를 낸 일은 무엇인가요?',
  '03-12': '나에게 희망이란 무엇인가요?',
  '03-13': '지금 나를 설레게 하는 것은?',
  '03-14': '내가 만들고 싶은 미래는 어떤 모습인가요?',
  '03-15': '최근 새롭게 발견한 나의 모습은?',
  '03-16': '나를 자유롭게 만드는 것은 무엇인가요?',
  '03-17': '지금 가장 탐험하고 싶은 것은?',
  '03-18': '내가 키우고 싶은 것은 무엇인가요?',
  '03-19': '최근 감탄한 순간이 있나요?',
  '03-20': '봄의 시작, 나에게 어떤 의미인가요?',
  '03-21': '지금 가장 활력을 주는 것은?',
  '03-22': '내가 맞이하고 싶은 변화는?',
  '03-23': '최근 새로운 경험을 했나요?',
  '03-24': '나를 깨어나게 만드는 것은?',
  '03-25': '지금 가장 빛나는 순간은 언제인가요?',
  '03-26': '내가 틀을 깨고 싶은 것은?',
  '03-27': '최근 활기를 느낀 순간은?',
  '03-28': '나에게 봄은 어떤 계절인가요?',
  '03-29': '지금 가장 싱그러운 것은 무엇인가요?',
  '03-30': '내가 꽃피우고 싶은 재능은?',
  '03-31': '3월을 한 문장으로 정리한다면?',
  
  '04-01': '4월에 이루고 싶은 작은 목표는?',
  '04-02': '나를 새롭게 만드는 것은 무엇인가요?',
  '04-03': '최근 가장 활기찬 순간은?',
  '04-04': '내가 가꾸고 싶은 것은 무엇인가요?',
  '04-05': '지금 나를 생동감있게 만드는 것은?',
  '04-06': '최근 즐거운 발견이 있었나요?',
  '04-07': '나에게 청춘이란 무엇인가요?',
  '04-08': '지금 가장 젊게 느껴지는 순간은?',
  '04-09': '내가 열정을 느끼는 것은?',
  '04-10': '최근 신나는 일이 있었나요?',
  '04-11': '나를 들뜨게 만드는 것은?',
  '04-12': '지금 가장 기쁜 일은 무엇인가요?',
  '04-13': '내가 만개하고 싶은 분야는?',
  '04-14': '최근 아름다움을 느낀 순간은?',
  '04-15': '나에게 아름다움이란 무엇인가요?',
  '04-16': '지금 가장 눈부신 것은?',
  '04-17': '내가 감상하고 싶은 것은 무엇인가요?',
  '04-18': '최근 마음이 풍요로웠던 순간은?',
  '04-19': '나를 풍성하게 만드는 것은?',
  '04-20': '지금 가장 만족스러운 것은?',
  '04-21': '내가 누리고 싶은 행복은?',
  '04-22': '최근 평화로웠던 순간은?',
  '04-23': '나에게 평온이란 어떤 상태인가요?',
  '04-24': '지금 가장 고요한 순간은 언제인가요?',
  '04-25': '내가 간직하고 싶은 순간은?',
  '04-26': '최근 감격한 일이 있나요?',
  '04-27': '나를 충만하게 만드는 것은?',
  '04-28': '지금 가장 풍요로운 것은?',
  '04-29': '내가 향유하고 싶은 것은 무엇인가요?',
  '04-30': '4월을 한 문장으로 정리한다면?',
  
  '05-01': '5월에 기대하는 것은 무엇인가요?',
  '05-02': '나에게 가정이란 어떤 의미인가요?',
  '05-03': '최근 가족에게 감사한 일은?',
  '05-04': '내가 지키고 싶은 것은 무엇인가요?',
  '05-05': '어린 시절 가장 행복했던 기억은?',
  '05-06': '지금 나를 위로하는 기억은?',
  '05-07': '내가 소중히 여기는 추억은?',
  '05-08': '부모님께 하고 싶은 말이 있나요?',
  '05-09': '최근 가족과 함께한 특별한 순간은?',
  '05-10': '나에게 사랑하는 사람들이란?',
  '05-11': '지금 가장 보고 싶은 사람은?',
  '05-12': '내가 전하고 싶은 감사의 말은?',
  '05-13': '최근 누군가의 사랑을 느낀 순간은?',
  '05-14': '나를 있게 해준 사람들은?',
  '05-15': '스승의 날, 감사한 선생님이 계신가요?',
  '05-16': '지금 내가 배우고 싶은 것은?',
  '05-17': '내가 가르쳐주고 싶은 것은?',
  '05-18': '최근 배움의 기쁨을 느낀 순간은?',
  '05-19': '나에게 성장이란 무엇인가요?',
  '05-20': '지금 가장 발전하고 싶은 부분은?',
  '05-21': '내가 이어가고 싶은 전통은?',
  '05-22': '최근 세대 간 소통을 한 경험은?',
  '05-23': '나를 키워준 가르침은 무엇인가요?',
  '05-24': '지금 가장 존경하는 사람은?',
  '05-25': '내가 본받고 싶은 모습은?',
  '05-26': '최근 누군가를 도운 일이 있나요?',
  '05-27': '나에게 봉사란 어떤 의미인가요?',
  '05-28': '지금 베풀고 싶은 것은?',
  '05-29': '내가 함께 나누고 싶은 것은?',
  '05-30': '최근 가슴 따뜻해진 순간은?',
  '05-31': '5월을 한 문장으로 정리한다면?',
  
  '06-01': '6월에 도전하고 싶은 것은?',
  '06-02': '나에게 여름이란 어떤 계절인가요?',
  '06-03': '최근 뜨거운 열정을 느낀 순간은?',
  '06-04': '내가 불태우고 싶은 것은 무엇인가요?',
  '06-05': '환경의 날, 지구를 위해 하고 싶은 일은?',
  '06-06': '지금 가장 소중히 지키고 싶은 것은?',
  '06-07': '내가 보호하고 싶은 가치는?',
  '06-08': '최근 자연에서 느낀 감동은?',
  '06-09': '나를 시원하게 만드는 것은?',
  '06-10': '지금 가장 청량한 것은 무엇인가요?',
  '06-11': '내가 담고 싶은 여름은?',
  '06-12': '최근 생동감을 느낀 순간은?',
  '06-13': '나��게 활력소는 무엇인가요?',
  '06-14': '지금 가장 에너지를 주는 것은?',
  '06-15': '내가 충전하는 방법은?',
  '06-16': '최근 재충전한 경험이 있나요?',
  '06-17': '나를 상쾌하게 만드는 것은?',
  '06-18': '지금 가장 개운한 순간은?',
  '06-19': '내가 누리고 싶은 여유는?',
  '06-20': '최근 여유를 즐긴 순간은?',
  '06-21': '여름 시작, 나에게 어떤 의미인가요?',
  '06-22': '지금 가장 따뜻한 것은 무엇인가요?',
  '06-23': '내가 품고 싶은 온기는?',
  '06-24': '최근 뜨겁게 살아있다고 느낀 순간은?',
  '06-25': '나를 뜨겁게 만드는 것은?',
  '06-26': '지금 가장 열중하는 것은?',
  '06-27': '내가 몰입하고 싶은 것은?',
  '06-28': '최근 시간 가는 줄 몰랐던 순간은?',
  '06-29': '나에게 몰입이란 무엇인가요?',
  '06-30': '6월을 한 문장으로 정리한다면?',
  
  '07-01': '7월에 가장 기대하는 것은?',
  '07-02': '나를 시원하게 만드는 것은?',
  '07-03': '최근 더위를 이긴 나만의 방법은?',
  '07-04': '내가 피서 가고 싶은 곳은?',
  '07-05': '지금 가장 그리운 장소는?',
  '07-06': '최근 휴식을 취한 경험은?',
  '07-07': '칠석, 만나고 싶은 사람이 있나요?',
  '07-08': '나에게 그리움이란 무엇인가요?',
  '07-09': '지금 가��� 그리운 것은?',
  '07-10': '내가 다시 가고 싶은 곳은?',
  '07-11': '최근 추억을 떠올린 순간은?',
  '07-12': '나를 추억하게 만드는 것은?',
  '07-13': '지금 간직하고 싶은 순간은?',
  '07-14': '내가 영원히 기억하고 싶은 것은?',
  '07-15': '최근 특별했던 순간은?',
  '07-16': '나에게 여름휴가란 무엇인가요?',
  '07-17': '지금 가장 하고 싶은 휴식은?',
  '07-18': '내가 쉬는 방법은 무엇인가요?',
  '07-19': '최근 완전히 쉰 적이 있나요?',
  '07-20': '나를 편안하게 하는 공간은?',
  '07-21': '지금 가장 평화로운 순간은?',
  '07-22': '내가 치유받는 방법은?',
  '07-23': '최근 힐링한 경험은?',
  '07-24': '나에게 치유란 무엇인가요?',
  '07-25': '지금 나를 회복시키는 것은?',
  '07-26': '내가 재생하는 방법은?',
  '07-27': '최근 에너지를 얻은 순간은?',
  '07-28': '나를 리프레시하는 것은?',
  '07-29': '지금 가장 생생한 기억은?',
  '07-30': '내가 만들고 싶은 여름 추억은?',
  '07-31': '7월을 한 문장으로 정리한다면?',
  
  '08-01': '8월에 이루고 싶은 것은?',
  '08-02': '나를 뜨겁게 만드는 열정은?',
  '08-03': '최근 열심히 한 일은 무엇인가요?',
  '08-04': '내가 불태우고 싶은 순간은?',
  '08-05': '지금 가장 집중하고 있는 것은?',
  '08-06': '최근 몰두한 경험은?',
  '08-07': '나에게 집중이란 무엇인가요?',
  '08-08': '지금 가장 중요하게 여기는 것은?',
  '08-09': '내가 우선순위에 두는 것은?',
  '08-10': '최�� 선택한 일이 있나요?',
  '08-11': '나를 결정하게 만드는 기준은?',
  '08-12': '지금 가장 확신하는 것은?',
  '08-13': '내가 믿는 가치는 무엇인가요?',
  '08-14': '최근 신념을 지킨 경험은?',
  '08-15': '광복절, 나에게 자유란 무엇인가요?',
  '08-16': '지금 가장 자유로운 순간은?',
  '08-17': '내가 해방되고 싶은 것은?',
  '08-18': '최근 자유를 느낀 순간은?',
  '08-19': '나를 속박하는 것은 무엇인가요?',
  '08-20': '지금 벗어나고 싶은 것은?',
  '08-21': '내가 극복하고 싶은 것은?',
  '08-22': '최근 이겨낸 일이 있나요?',
  '08-23': '나에게 용기란 무엇인가요?',
  '08-24': '지금 가장 용감한 선택은?',
  '08-25': '내가 도전하고 있는 것은?',
  '08-26': '최근 새로운 시도를 했나요?',
  '08-27': '나를 성장시키는 도전은?',
  '08-28': '지금 가장 의미있는 일은?',
  '08-29': '내가 가치있게 여기는 시간은?',
  '08-30': '최근 보람찬 순간은?',
  '08-31': '8월을 한 문장으로 정리한다면?',
  
  '09-01': '9월에 새롭게 시작하고 싶은 것은?',
  '09-02': '나에게 가을이란 어떤 계절인가요?',
  '09-03': '최근 결실을 맺은 일이 있나요?',
  '09-04': '내가 수확하고 싶은 것은?',
  '09-05': '지금 가장 풍성한 것은 무엇인가요?',
  '09-06': '최근 감사한 수확은?',
  '09-07': '나를 성숙하게 만든 경험은?',
  '09-08': '지금 가장 성장한 부분은?',
  '09-09': '내가 발전한 모습은 무엇인가요?',
  '09-10': '최근 변화를 느낀 순간은?',
  '09-11': '나에게 변화란 무엇인가요?',
  '09-12': '지금 가장 달라진 것은?',
  '09-13': '내가 변모하고 싶은 부분은?',
  '09-14': '최근 새로워진 것이 있나요?',
  '09-15': '나를 갱신하는 방법은?',
  '09-16': '지금 가장 신선한 것은?',
  '09-17': '내가 리뉴얼하고 싶은 것은?',
  '09-18': '최근 재정비한 것이 있나요?',
  '09-19': '나에게 정리란 무엇인가요?',
  '09-20': '지금 가장 정돈하고 싶은 것은?',
  '09-21': '내가 비우고 싶은 것은 ��엇인가요?',
  '09-22': '가을 시작, 나에게 �����떤 의미인가요?',
  '09-23': '지금 가장 여유로운 것은?',
  '09-24': '최근 느긋했던 순간은?',
  '09-25': '나를 차분하게 만드는 것은?',
  '09-26': '지금 가장 고요한 것은?',
  '09-27': '내가 조용히 즐기는 것은?',
  '09-28': '최근 침착했던 순간은?',
  '09-29': '나에게 평정이란 무엇인가요?',
  '09-30': '9월을 한 문장으로 정리한다면?',
  
  '10-01': '10월에 기대하는 것은 무엇인가요?',
  '10-02': '나를 물들이는 것은 무엇인가요?',
  '10-03': '개천절, 나에게 시작이란 무엇인가요?',
  '10-04': '최근 새로운 출발을 한 일은?',
  '10-05': '내가 개척하고 싶은 길은?',
  '10-06': '지금 가장 탐험하고 싶은 것은?',
  '10-07': '최근 모험한 경험은?',
  '10-08': '나에게 모험이란 무엇인가요?',
  '10-09': '한글날, 나를 표현하는 단어는?',
  '10-10': '지금 가장 전하고 싶은 말은?',
  '10-11': '내가 쓰고 싶은 이야기는?',
  '10-12': '최근 기록한 것이 있나요?',
  '10-13': '나에게 기록이란 무엇인가요?',
  '10-14': '지금 가장 남기고 싶은 것은?',
  '10-15': '내가 전승하고 싶은 것은?',
  '10-16': '최근 소중히 간직한 것은?',
  '10-17': '나를 보존하는 방법은?',
  '10-18': '지금 가장 지키고 싶은 것은?',
  '10-19': '내가 유지하고 싶은 것은?',
  '10-20': '최근 꾸준히 한 일은?',
  '10-21': '나에게 지속이란 무엇인가요?',
  '10-22': '지금 가장 계속하고 싶은 것은?',
  '10-23': '내가 이어가고 싶은 것은?',
  '10-24': '최근 연결을 느낀 순간은?',
  '10-25': '나를 이어주는 것은 무엇인가요?',
  '10-26': '지금 가장 연대하고 싶은 것은?',
  '10-27': '내가 함께하고 싶은 가치는?',
  '10-28': '최근 공감한 순간은?',
  '10-29': '나에게 공감이란 무엇인가요?',
  '10-30': '지금 가장 이해하고 싶은 것은?',
  '10-31': '10월을 한 문장으로 정리한다면?',
  
  '11-01': '11월에 감사하고 싶은 것은?',
  '11-02': '나를 따뜻하게 만드는 것은?',
  '11-03': '최근 온기를 느낀 순간은?',
  '11-04': '내가 데우고 싶은 것은 무엇인가요?',
  '11-05': '지금 가장 포근한 것은?',
  '11-06': '최근 아늑했던 순간은?',
  '11-07': '나에게 안식이란 무엇인가요?',
  '11-08': '지금 가장 편안한 곳은?',
  '11-09': '내가 쉬고 싶은 공간은?',
  '11-10': '최근 안정을 느낀 순간은?',
  '11-11': '나에게 평안이란 무엇인가요?',
  '11-12': '지금 가장 고요한 순간은?',
  '11-13': '내가 정적을 즐기는 시간은?',
  '11-14': '최근 평온했던 경���은?',
  '11-15': '나를 진정시키는 것은?',
  '11-16': '지금 가장 차분한 것은?',
  '11-17': '내가 안정되는 방법은?',
  '11-18': '최근 균형을 찾은 일은?',
  '11-19': '나에게 조화란 무엇인가요?',
  '11-20': '지금 가장 균형잡힌 것은?',
  '11-21': '내가 조율하고 싶은 것은?',
  '11-22': '최근 조정한 것이 있나요?',
  '11-23': '나를 맞추는 기준은 무엇인가요?',
  '11-24': '지금 가장 적절한 것은?',
  '11-25': '내가 알맞게 하고 싶은 것은?',
  '11-26': '최근 적당함을 찾은 순간은?',
  '11-27': '나에게 중용이란 무엇인가요?',
  '11-28': '지금 가장 중도적인 선택은?',
  '11-29': '내가 절제하고 싶은 것은?',
  '11-30': '11월을 한 문장으로 정리한다면?',
  
  '12-01': '12월에 이루고 싶은 마지막 목표는?',
  '12-02': '나를 돌아보게 만드는 것은?',
  '12-03': '최근 반성한 일이 있나요?',
  '12-04': '내가 성찰하고 싶은 것은?',
  '12-05': '지금 가장 깊이 생각하는 것은?',
  '12-06': '최근 사색한 시간은?',
  '12-07': '나에게 사색이란 무엇인가요?',
  '12-08': '지금 가장 명상하고 싶은 것은?',
  '12-09': '내가 내면을 들여다보는 방법은?',
  '12-10': '최근 자아를 발견한 순간은?',
  '12-11': '나에게 나란 누구인가요?',
  '12-12': '지금 가장 확실한 나의 모습은?',
  '12-13': '내가 정의하는 나는 어떤 사람인가요?',
  '12-14': '최근 나를 알게 된 경험은?',
  '12-15': '나를 이해하는 방법은?',
  '12-16': '지금 가장 파악하고 싶은 나의 부분은?',
  '12-17': '내가 인정하고 싶은 나의 모습은?',
  '12-18': '최근 수용한 것이 있나요?',
  '12-19': '나에게 수용이란 무엇인가요?',
  '12-20': '지금 가장 받아들이고 싶은 것은?',
  '12-21': '겨울 시작, 나에게 어떤 의미인가요?',
  '12-22': '내가 품고 싶은 것은 무엇인가요?',
  '12-23': '최근 안아준 것이 있나요?',
  '12-24': '나에게 사랑이란 무엇인가요?',
  '12-25': '성탄절, 나에게 선물하고 싶은 것은?',
  '12-26': '지금 가장 축복받은 것은?',
  '12-27': '내가 감사한 것들은 무엇인가요?',
  '12-28': '최근 고마웠던 순간은?',
  '12-29': '나를 풍요롭게 만든 한 해는?',
  '12-30': '올해 가장 의미있었던 순간은?',
  '12-31': '올해를 한 문장으로 정리한다면?',
};

export function TimeRippleSection() {
  const [todayAnswer, setTodayAnswer] = useState<string>('');
  const [savedAnswer, setSavedAnswer] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [pastAnswers, setPastAnswers] = useState<TimeRippleAnswer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [selectedAnswers, setSelectedAnswers] = useState<TimeRippleAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPastAnswers, setShowPastAnswers] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [userBirthDate, setUserBirthDate] = useState<string>('');

  // Get today's date in Korea timezone (YYYY-MM-DD)
  const getTodayDate = () => {
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDateStr = currentDate || getTodayDate();
  const todayMonthDay = todayDateStr.substring(5); // MM-DD
  
  // Check if today is user's birthday
  const userBirthMonthDay = userBirthDate ? userBirthDate.substring(5) : ''; // MM-DD
  const isBirthday = userBirthMonthDay && todayMonthDay === userBirthMonthDay;
  
  // Use birthday question if it's user's birthday, otherwise use regular question
  const todayQuestion = isBirthday 
    ? '🎂 생일 축하합니다! 올해의 나에게 축하 메시지를 남긴다면?' 
    : (TIME_RIPPLE_QUESTIONS[todayMonthDay] || '오늘의 질문이 준비되지 않았어요.');

  useEffect(() => {
    // Set initial date
    const initialDate = getTodayDate();
    setCurrentDate(initialDate);
    
    // Load data
    loadTodayAnswer(initialDate);
    loadUserProfile();

    // Check for date change every minute
    const intervalId = setInterval(() => {
      const newDate = getTodayDate();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
        loadTodayAnswer(newDate);
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, []);

  // Reload when date changes
  useEffect(() => {
    if (currentDate) {
      loadTodayAnswer(currentDate);
    }
  }, [currentDate]);

  const loadUserProfile = async () => {
    try {
      const data = await apiCall('/profile');
      if (data.profile?.birthDate) {
        setUserBirthDate(data.profile.birthDate);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadTodayAnswer = async (dateStr: string) => {
    try {
      const data = await apiCall(`/time-ripple/${dateStr}`);
      if (data.answer) {
        setSavedAnswer(data.answer.answer);
        setTodayAnswer(data.answer.answer);
        setIsEditing(false);
        setPastAnswers(data.pastAnswers || []);
      } else {
        setSavedAnswer('');
        setTodayAnswer('');
        setIsEditing(true);
        setPastAnswers(data.pastAnswers || []);
      }
    } catch (error) {
      console.error('Failed to load answer:', error);
    }
  };



  const loadAnswersForDate = async (monthDay: string) => {
    setIsLoading(true);
    try {
      const data = await apiCall(`/time-ripple/by-month-day/${monthDay}`);
      setSelectedAnswers(data.answers || []);
    } catch (error) {
      console.error('Failed to load answers:', error);
      setSelectedAnswers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = async () => {
    if (!todayAnswer.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await apiCall('/time-ripple', {
        method: 'POST',
        body: JSON.stringify({
          date: todayDateStr,
          monthDay: todayMonthDay,
          answer: todayAnswer.trim(),
        }),
      });
      
      setSavedAnswer(todayAnswer.trim());
      setIsEditing(false);
      toast.success('답변이 저장되었습니다! 🌊');
    } catch (error: any) {
      console.error('Failed to save answer:', error);
      toast.error('답변 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const openQuestionDialog = (monthDay: string) => {
    setSelectedDate(monthDay);
    // Check if this is the user's birthday
    const isBirthdayQuestion = userBirthMonthDay && monthDay === userBirthMonthDay;
    const question = isBirthdayQuestion 
      ? '🎂 생일 축하합니다! 올해의 나에게 축하 메시지를 남긴다면?'
      : TIME_RIPPLE_QUESTIONS[monthDay];
    setSelectedQuestion(question);
    loadAnswersForDate(monthDay);
    setIsDialogOpen(true);
  };



  return (
    <div className="space-y-6">
      {/* Today's Question Card - Modern Gray Design */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br shadow-lg ${
        isBirthday 
          ? 'from-pink-50 to-pink-100 border-2 border-pink-300' 
          : 'from-slate-50 to-gray-100 border border-gray-200'
      }`}>


        {/* Content */}
        <div className="relative z-10 p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            {/* Title - Left */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-gray-900 text-xl">Wave Loop</h3>
                {isBirthday && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-full"
                  >
                    🎂 생일 특별 질문
                  </motion.span>
                )}
              </div>
              <p className="text-sm text-gray-600">매년 같은 날, 같은 질문</p>
            </div>
            
            {/* Wave Animation - Right */}
            <WaveLoopAnimation showCloud={true} showPlane={true} className="w-24 h-12" />
          </div>

          {/* Question Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            {/* Card Content */}
            <div className={`relative bg-white/80 backdrop-blur-xl rounded-2xl p-6 border transition-colors shadow-sm ${
              isBirthday 
                ? 'border-pink-300 hover:border-pink-400' 
                : 'border-gray-200 hover:border-blue-300'
            }`}>
              {/* Date */}
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className={`w-4 h-4 ${isBirthday ? 'text-pink-400' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-500 tracking-wide">
                  {todayDateStr.replace(/-/g, '. ')}
                </span>
              </div>
              
              {/* Question Text */}
              <p className={`text-l leading-relaxed ${isBirthday ? 'text-pink-900' : 'text-gray-900'}`}>
                {todayQuestion}
              </p>
              
              {/* Bottom Accent */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className={`mt-4 h-px bg-gradient-to-r ${
                  isBirthday 
                    ? 'from-pink-500 to-pink-300' 
                    : 'from-blue-500 to-blue-300'
                }`}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </motion.div>

          {/* Saved Answer Display or Answer Input */}
          <AnimatePresence mode="wait">
            {!isEditing && savedAnswer ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">나의 답변</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-gray-500 hover:text-gray-900 h-auto py-1 hover:bg-gray-100"
                  >
                    수정
                  </Button>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{savedAnswer}</p>
              </motion.div>
            ) : (
              <motion.div
                key="editing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <Textarea
                  placeholder="오늘의 나를 솔직하게 기록해보세요..."
                  value={todayAnswer}
                  onChange={(e) => setTodayAnswer(e.target.value)}
                  className="min-h-[140px] bg-white/80 backdrop-blur-xl border border-gray-200 focus:border-blue-400 rounded-2xl resize-none text-gray-900 placeholder:text-gray-400"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={saveAnswer}
                    disabled={isSaving || !todayAnswer.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl disabled:opacity-50"
                  >
                    {isSaving ? '저장 중...' : (savedAnswer ? '수정' : '저장')}
                  </Button>
                  {savedAnswer && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTodayAnswer(savedAnswer);
                        setIsEditing(false);
                      }}
                      className="px-8 border border-gray-300 hover:bg-gray-50 text-gray-700 h-11 rounded-xl"
                    >
                      취소
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Past Answers Timeline - Collapsible */}
          {pastAnswers.length > 0 && (
            <Collapsible open={showPastAnswers} onOpenChange={setShowPastAnswers}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="border-t border-gray-200 pt-5 mt-2"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                        <span className="text-blue-600 text-sm">{pastAnswers.length}</span>
                      </div>
                      <p className="text-gray-700">
                        과거 같은 날의 기록
                      </p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showPastAnswers ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-3 mt-3">
                    {pastAnswers.map((answer, index) => {
                      // Parse YYYY-MM-DD as local date (not UTC)
                      const [year, month, day] = answer.date.split('-').map(Number);
                      const answerDate = new Date(year, month - 1, day);
                      const currentYear = parseInt(todayDateStr.split('-')[0]);
                      const yearsAgo = currentYear - answerDate.getFullYear();
                      
                      return (
                        <motion.div
                          key={answer.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative bg-white/60 backdrop-blur rounded-xl p-4 border border-gray-200 hover:border-blue-200 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm text-gray-600">
                              {answerDate.getFullYear()}. {String(answerDate.getMonth() + 1).padStart(2, '0')}. {String(answerDate.getDate()).padStart(2, '0')}
                            </p>
                            {yearsAgo > 0 && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                {yearsAgo}년 전
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">{answer.answer}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </motion.div>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Question Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl">{selectedQuestion}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {selectedDate && `${parseInt(selectedDate.split('-')[0])}월 ${parseInt(selectedDate.split('-')[1])}일의 질문`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : selectedAnswers.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {selectedAnswers
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((answer, index) => {
                      // Parse YYYY-MM-DD as local date (not UTC)
                      const [year, month, day] = answer.date.split('-').map(Number);
                      const answerDate = new Date(year, month - 1, day);
                      return (
                        <motion.div
                          key={answer.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border border-gray-200 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-gray-50"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {answerDate.getFullYear()}. {String(answerDate.getMonth() + 1).padStart(2, '0')}. {String(answerDate.getDate()).padStart(2, '0')}
                            </span>
                            {index === 0 && (
                              <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">최신</span>
                            )}
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap">{answer.answer}</p>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500">아직 답변이 없습니다</p>
                <p className="text-sm text-gray-400 mt-2">
                  해당 날짜에 답변을 작성해보세요
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
