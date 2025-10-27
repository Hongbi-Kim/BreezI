import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Heart, MessageCircle, Bookmark, Plus, Search, TrendingUp, Clock, BookmarkCheck, Shield } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { CommunityPostsSkeleton } from './LoadingSkeletons';
import { fetchWithCache, createCacheKey, cache } from '../utils/cache';

const ADMIN_EMAIL = 'khb1620@naver.com';

interface CommunityPageProps {
  accessToken: string;
  onPostClick: (postId: string) => void;
  onUserClick: (userId: string) => void;
}

interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  nickname: string;
  email?: string;
  likes: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export function CommunityPage({ accessToken, onPostClick, onUserClick }: CommunityPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [filterType, setFilterType] = useState<'all' | 'kept' | 'my'>('all');
  const [showWriteDialog, setShowWriteDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
    loadPosts();
  }, [sortBy]);

  useEffect(() => {
    setCurrentPage(1);
    if (filterType === 'kept') {
      loadKeptPosts();
    } else if (filterType === 'my') {
      loadMyPosts();
    } else {
      loadPosts();
    }
  }, [filterType]);

  const loadPosts = async (retryCount = 0) => {
    setLoading(true);
    try {
      const cacheKey = createCacheKey('community', 'posts', sortBy);
      
      // 캐시된 데이터를 먼저 표시
      const cachedData = cache.get<Post[]>(cacheKey);
      if (cachedData) {
        setPosts(cachedData);
        setFilteredPosts(cachedData);
        setLoading(false);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts?sort=${sortBy}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const posts = data.posts || [];
        setPosts(posts);
        setFilteredPosts(posts);
        
        // 캐시에 저장 (3분 TTL)
        cache.set(cacheKey, posts, 3 * 60 * 1000);
      } else if (response.status >= 500 && retryCount < 2) {
        toast.error('서버 오류가 발생했습니다. 다시 시도합니다...');
        setTimeout(() => loadPosts(retryCount + 1), 1000);
      } else if (response.status === 401) {
        toast.error('로그인이 필요합니다.');
      }
    } catch (error: any) {
      console.error('Failed to load posts:', error);
      if (error.name === 'AbortError') {
        toast.error('게시글을 불러오는 시간이 초과되었습니다.');
      } else if (retryCount < 2) {
        setTimeout(() => loadPosts(retryCount + 1), 1000);
      } else {
        toast.error('게시글을 불러올 수 없습니다. 네트워크를 확인해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadKeptPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/kept-posts`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setFilteredPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to load kept posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/my-posts?sort=${sortBy}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setFilteredPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to load my posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    if (!query.trim()) {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter(
        post =>
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          post.content.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const getPreviewText = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl text-gray-800 mb-2">마음 나누기</h1>
        <p className="text-sm text-gray-600">
          여러분의 마음을 자유롭게 나누어보세요 💭
        </p>
      </div>

      {/* Search Bar and Write Button */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="게시글 검색..."
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setShowWriteDialog(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all shrink-0"
          size="default"
        >
          <Plus className="w-4 h-4 mr-1" />
          글쓰기
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={sortBy === 'recent' && filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSortBy('recent');
            setFilterType('all');
          }}
          className={sortBy === 'recent' && filterType === 'all' ? 'bg-purple-600' : ''}
        >
          <Clock className="w-4 h-4 mr-1" />
          최신순
        </Button>
        <Button
          variant={sortBy === 'popular' && filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSortBy('popular');
            setFilterType('all');
          }}
          className={sortBy === 'popular' && filterType === 'all' ? 'bg-purple-600' : ''}
        >
          <TrendingUp className="w-4 h-4 mr-1" />
          인기순
        </Button>
        <Button
          variant={filterType === 'kept' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('kept')}
          className={filterType === 'kept' ? 'bg-purple-600' : ''}
        >
          <BookmarkCheck className="w-4 h-4 mr-1" />
          저장한 글
        </Button>
        <Button
          variant={filterType === 'my' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('my')}
          className={filterType === 'my' ? 'bg-purple-600' : ''}
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          내 글 보기
        </Button>
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {loading ? (
          <CommunityPostsSkeleton />
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">
                {filterType === 'kept' ? '저장한 게시글이 없습니다' : filterType === 'my' ? '작성한 게시글이 없습니다' : '아직 게시글이 없습니다'}
              </p>
              {filterType === 'all' && (
                <p className="text-sm text-gray-400 mt-2">
                  첫 번째 글을 작성해보세요!
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((post) => (
              <Card
                key={post.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onPostClick(post.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-base mb-1 text-gray-800 line-clamp-1">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {getPreviewText(post.content)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="text-xs hover:text-purple-600 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick(post.userId);
                          }}
                        >
                          {post.nickname}
                        </span>
                        {post.email === ADMIN_EMAIL && (
                          <Badge className="bg-slate-700 text-white text-[10px] px-1.5 py-0 h-4 flex items-center gap-0.5 border border-slate-600">
                            <Shield className="w-2.5 h-2.5" />
                            관리자
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString('ko-KR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })} · {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span className="text-xs">{post.likes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{post.commentCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="조회수">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-xs">{post.viewCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination */}
            {Math.ceil(filteredPosts.length / itemsPerPage) > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
                <span className="text-sm text-gray-600">
                  {currentPage} / {Math.ceil(filteredPosts.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredPosts.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(filteredPosts.length / itemsPerPage)}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Write Dialog */}
      {showWriteDialog && (
        <WritePostDialog
          accessToken={accessToken}
          onClose={() => setShowWriteDialog(false)}
          onSuccess={() => {
            setShowWriteDialog(false);
            loadPosts();
          }}
        />
      )}
    </div>
  );
}

interface WritePostDialogProps {
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

function WritePostDialog({ accessToken, onClose, onSuccess }: WritePostDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
          }),
        }
      );

      if (response.ok) {
        toast.success('✅ 게시글이 작성되었습니다!');
        onSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '게시글 작성에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('게시글 작성 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>마음 공유하기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여러분의 마음을 자유롭게 표현해보세요..."
              className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length}/1000자
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={submitting || !title.trim() || !content.trim()}
            >
              {submitting ? '작성 중...' : '작성 완료'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
