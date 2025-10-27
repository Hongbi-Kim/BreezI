import React from 'react';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader } from './ui/card';

/**
 * 커뮤니티 게시글 목록 스켈레톤
 */
export function CommunityPostsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                {/* 제목 */}
                <Skeleton className="h-6 w-3/4" />
                {/* 작성자 정보 */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              {/* 감정 아이콘 */}
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* 본문 미리보기 */}
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-3" />
            {/* 통계 정보 */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 게시글 상세 페이지 스켈레톤
 */
export function PostDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* 게시글 카드 */}
      <Card>
        <CardHeader>
          <div className="space-y-3">
            {/* 제목 */}
            <Skeleton className="h-8 w-2/3" />
            {/* 작성자 정보 */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 본문 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          {/* 통계 */}
          <div className="flex items-center gap-4 pt-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardContent>
      </Card>

      {/* 댓글 섹션 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 pb-4 border-b last:border-b-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 리포트 페이지 스켈레톤
 */
export function ReportPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* 기간 선택 */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>

      {/* 주요 지표 카드들 */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 그래프 카드 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* AI 인사이트 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>

      {/* 감정 달력 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 채팅 메시지 로딩 스켈레톤
 */
export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          {/* 사용자 메시지 */}
          <div className="flex justify-end">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
          </div>
          {/* AI 응답 */}
          <div className="flex justify-start">
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 일기 목록 스켈레톤
 */
export function DiaryListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full ml-3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 캘린더 스켈레톤
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* 월 선택 헤더 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <Card>
        <CardContent className="p-4">
          {/* 요일 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center">
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
          {/* 날짜 */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 프로필 스켈레톤
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 유저 프로필 페이지 스켈레톤
 */
export function UserProfilePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* 프로필 정보 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 게시글 목록 */}
      <CommunityPostsSkeleton />
    </div>
  );
}
