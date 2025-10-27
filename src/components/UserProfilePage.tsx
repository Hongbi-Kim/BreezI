import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ArrowLeft, Grid3x3, User, Shield } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { UserProfilePageSkeleton } from './LoadingSkeletons';

const ADMIN_EMAIL = 'khb1620@naver.com';

interface UserProfilePageProps {
  accessToken: string;
  userId: string;
  onBack: () => void;
  onPostClick: (postId: string) => void;
}

interface UserProfile {
  userId: string;
  nickname: string;
  email?: string;
  greeting?: string;
  bio?: string;
  avatar?: string;
}

interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  nickname: string;
  likes: number;
  commentCount: number;
  createdAt: string;
}

export function UserProfilePage({ accessToken, userId, onBack, onPostClick }: UserProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
    loadUserPosts();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/user-profile/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadUserPosts = async () => {
    setLoading(true);
    try {
      console.log('Loading posts for user:', userId);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/community/user-posts/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('User posts loaded:', data.posts?.length || 0);
        setPosts(data.posts || []);
      } else {
        console.error('Failed to load user posts:', response.status);
      }
    } catch (error) {
      console.error('Failed to load user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <UserProfilePageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
        </div>

        {/* Profile Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <Avatar className={`w-24 h-24 ${getAvatarColor(profile.nickname)}`}>
                <AvatarFallback className="text-white text-2xl">
                  {profile.nickname.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                  <h1 className="text-2xl">{profile.nickname}</h1>
                  {profile.email === ADMIN_EMAIL && (
                    <Badge className="bg-slate-700 text-white text-xs px-2 py-1 h-5 flex items-center gap-1 border border-slate-600">
                      <Shield className="w-3 h-3" />
                      관리자
                    </Badge>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex gap-6 mb-4 justify-center md:justify-start">
                  <div>
                    <span className="block">{posts.length}</span>
                    <span className="text-sm text-gray-600">게시글</span>
                  </div>
                </div>

                {/* Greeting */}
                <div className="p-3 bg-purple-50 rounded-lg mb-3">
                  <p className="text-gray-700 italic">"{profile.greeting || '인사말이 없습니다'}"</p>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-gray-700">{profile.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Grid - Instagram Style */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 border-t pt-4">
            <Grid3x3 className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg">게시글</h2>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-gray-500">게시글을 불러오는 중...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">아직 작성한 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onPostClick(post.id)}
                  className="aspect-square bg-white rounded cursor-pointer hover:opacity-80 transition-opacity relative group overflow-hidden border border-gray-200"
                >
                  {/* Post Preview */}
                  <div className="absolute inset-0 p-2 md:p-3 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs md:text-sm line-clamp-2 mb-1">{post.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-3">{post.content}</p>
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="text-white text-center space-y-2">
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <span>❤️</span>
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>💬</span>
                            {post.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
