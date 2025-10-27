import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Heart, MessageCircle, Bookmark, Send, Trash2, Flag, Shield } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { ReportDialog } from './ReportDialog';
import { toast } from 'sonner';
import { PostDetailSkeleton } from './LoadingSkeletons';

const ADMIN_EMAIL = 'khb1620@naver.com';

interface CommunityPostDetailPageProps {
  accessToken: string;
  postId: string;
  currentUserId: string;
  onBack: () => void;
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

interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  nickname: string;
  email?: string;
  createdAt: string;
}

export function CommunityPostDetailPage({ accessToken, postId, currentUserId, onBack, onUserClick }: CommunityPostDetailPageProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [kept, setKept] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
  const [likingPost, setLikingPost] = useState(false);
  const [keepingPost, setKeepingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
    checkLikedStatus();
    checkKeptStatus();
    checkAdminStatus();
    increaseViewCount();
  }, [postId]);

  const increaseViewCount = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/view`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      console.log('View count increased for post:', postId);
    } catch (error) {
      console.error('Failed to increase view count:', error);
      // Silent fail - view count is not critical
    }
  };

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/profile/get`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Admin check - profile email:', data.profile?.email);
        setIsAdmin(data.profile?.email === 'khb1620@naver.com');
      } else {
        console.error('Admin check failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  const loadPost = async () => {
    try {
      console.log('Loading post with ID:', postId);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      console.log('Post response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Post data:', data);
        setPost(data.post);
      } else {
        const errorText = await response.text();
        console.error('Failed to load post:', response.status, errorText);
      }
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const checkLikedStatus = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/liked`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
      }
    } catch (error) {
      console.error('Failed to check liked status:', error);
    }
  };

  const checkKeptStatus = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/kept`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKept(data.kept);
      }
    } catch (error) {
      console.error('Failed to check kept status:', error);
    }
  };

  const handleLike = async () => {
    if (likingPost) return;
    
    setLikingPost(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/like`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        if (post) {
          setPost({ ...post, likes: data.likes });
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setLikingPost(false);
    }
  };

  const handleKeep = async () => {
    if (keepingPost) return;
    
    setKeepingPost(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/keep`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKept(data.kept);
      }
    } catch (error) {
      console.error('Failed to toggle keep:', error);
    } finally {
      setKeepingPost(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('댓글 내용을 입력해주세요');
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            content: commentText.trim(),
          }),
        }
      );

      if (response.ok) {
        setCommentText('');
        loadComments();
        if (post) {
          setPost({ ...post, commentCount: post.commentCount + 1 });
        }
        toast.success('✅ 댓글이 작성되었습니다!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '댓글 작성에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      toast.error('댓글 작성 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleGenerateAIComment = async () => {
    if (submittingComment) return;
    
    if (!confirm('AI가 이 게시글에 공감하는 댓글을 작성합니다. 계속하시겠습니까?')) {
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/ai-comment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success('✨ AI 댓글이 작성되었습니다');
        loadComments();
        if (post) {
          setPost({ ...post, commentCount: post.commentCount + 1 });
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'AI 댓글 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to generate AI comment:', error);
      toast.error('AI 댓글 생성 중 오류가 발생했습니다');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (deletingPost) return;
    if (!confirm('게시글을 삭제하시겠습니까? 모든 댓글도 함께 삭제됩니다.')) return;

    setDeletingPost(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success('✅ 게시글이 삭제되었습니다');
        onBack();
      } else if (response.status === 403) {
        toast.error('자신의 게시글만 삭제할 수 있습니다');
      } else if (response.status === 404) {
        toast.error('게시글을 찾을 수 없습니다');
      } else {
        toast.error('게시글 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('게시글 삭제 중 오류가 발생했습니다');
    } finally {
      setDeletingPost(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingComment) return;
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    setDeletingComment(commentId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/posts/${postId}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        loadComments();
        if (post) {
          setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
        }
      } else if (response.status === 403) {
        toast.error('자신의 댓글만 삭제할 수 있습니다');
      } else {
        toast.error('댓글 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('댓글 삭제 중 오류가 발생했습니다');
    } finally {
      setDeletingComment(null);
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

  if (loading) {
    return (
      <div className="p-4 space-y-6 pb-24">
        <Button onClick={onBack} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
        <PostDetailSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-4">
        <Button onClick={onBack} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">게시글을 찾을 수 없습니다</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <Button onClick={onBack} variant="ghost" size="sm">
        <ArrowLeft className="w-4 h-4 mr-2" />
        돌아가기
      </Button>

      {/* Post Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{post.title}</CardTitle>
              <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span 
                      onClick={() => onUserClick(post.userId)}
                      className="cursor-pointer hover:text-sky-600 transition-colors font-medium"
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
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })} · {formatTimeAgo(post.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {currentUserId && (post.userId === currentUserId || isAdmin) && (
                <Button
                  onClick={handleDeletePost}
                  variant="ghost"
                  size="sm"
                  disabled={deletingPost}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  title={isAdmin && post.userId !== currentUserId ? "관리자 권한으로 삭제" : "게시글 삭제"}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {currentUserId && post.userId !== currentUserId && !isAdmin && (
                <Button
                  onClick={() => {
                    setReportTarget({ type: 'post', id: post.id });
                    setReportDialogOpen(true);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                  title="게시글 신고"
                >
                  <Flag className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              onClick={handleLike}
              disabled={likingPost}
              className={`flex items-center gap-1 transition-colors ${
                liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              } ${likingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span className="text-sm">{post.likes || 0}</span>
            </button>

            <div className="flex items-center gap-1 text-gray-500">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.commentCount || 0}</span>
            </div>

            <div className="flex items-center gap-1 text-gray-500" title="조회수">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm">{post.viewCount || 0}</span>
            </div>

            <button
              onClick={handleKeep}
              disabled={keepingPost}
              className={`flex items-center gap-1 ml-auto transition-colors ${
                kept ? 'text-sky-600' : 'text-gray-500 hover:text-sky-600'
              } ${keepingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Bookmark className={`w-5 h-5 ${kept ? 'fill-current' : ''}`} />
              <span className="text-sm">{kept ? '저장됨' : '저장'}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            댓글 {comments.length}개
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment Input */}
          <div className="space-y-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              {isAdmin && (
                <Button
                  onClick={handleGenerateAIComment}
                  size="sm"
                  variant="outline"
                  className="text-sky-600 border-sky-300 hover:bg-sky-50"
                  disabled={submittingComment}
                >
                  🤖 AI 댓글 생성
                </Button>
              )}
              <Button
                onClick={handleSubmitComment}
                size="sm"
                disabled={submittingComment || !commentText.trim()}
                className="bg-sky-600 hover:bg-sky-700 ml-auto"
              >
                <Send className="w-4 h-4 mr-1" />
                {submittingComment ? '작성 중...' : '작성'}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                첫 번째 댓글을 남겨보세요
              </p>
            ) : (
              comments.map((comment) => {
                const isAIComment = comment.userId === 'ai_breezi_bot';
                return (
                  <div 
                    key={comment.id} 
                    className={`p-3 rounded-lg ${
                      isAIComment 
                        ? 'bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className={`text-sm ${
                              isAIComment 
                                ? 'text-sky-700 font-medium' 
                                : 'hover:text-sky-600 hover:underline cursor-pointer'
                            }`}
                            onClick={() => !isAIComment && onUserClick(comment.userId)}
                          >
                            {comment.nickname}
                          </span>
                          {isAIComment && (
                            <span className="text-xs px-2 py-0.5 bg-sky-600 text-white rounded-full">
                              AI
                            </span>
                          )}
                          {!isAIComment && comment.email === ADMIN_EMAIL && (
                            <Badge className="bg-slate-700 text-white text-[10px] px-1.5 py-0 h-4 flex items-center gap-0.5 border border-slate-600">
                              <Shield className="w-2.5 h-2.5" />
                              관리자
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${
                          isAIComment ? 'text-gray-800' : 'text-gray-700'
                        }`}>
                          {comment.content}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {currentUserId && (comment.userId === currentUserId || isAdmin) && !isAIComment && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingComment === comment.id}
                            className={`text-gray-400 hover:text-red-500 transition-colors ${
                              deletingComment === comment.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            aria-label="댓글 삭제"
                            title={isAdmin && comment.userId !== currentUserId ? "관리자 권한으로 삭제" : "댓글 삭제"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && isAIComment && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingComment === comment.id}
                            className={`text-gray-400 hover:text-red-500 transition-colors ${
                              deletingComment === comment.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            aria-label="AI 댓글 삭제"
                            title="AI 댓글 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {currentUserId && comment.userId !== currentUserId && !isAdmin && !isAIComment && (
                          <button
                            onClick={() => {
                              setReportTarget({ type: 'comment', id: comment.id });
                              setReportDialogOpen(true);
                            }}
                            className="text-orange-500 hover:text-orange-700 transition-colors"
                            aria-label="댓글 신고"
                            title="댓글 신고"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Dialog */}
      {reportTarget && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          accessToken={accessToken}
          onReportSuccess={() => {
            console.log('Report submitted successfully');
          }}
        />
      )}
    </div>
  );
}
