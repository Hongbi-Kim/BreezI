import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

interface CustomEmotion {
  id: string;
  label: string;
  emoji: string;
  color: string;
  isCustom: boolean;
  isPositive: boolean;
}

interface EmotionManagerProps {
  accessToken: string;
  onEmotionChange: () => void;
}

const colorOptions = [
  'bg-yellow-100 text-yellow-700',
  'bg-blue-100 text-blue-700',
  'bg-red-100 text-red-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-gray-100 text-gray-700',
];

export function EmotionManager({ accessToken, onEmotionChange }: EmotionManagerProps) {
  const [customEmotions, setCustomEmotions] = useState<CustomEmotion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmotion, setEditingEmotion] = useState<CustomEmotion | null>(null);
  const [newEmotion, setNewEmotion] = useState({ label: '', emoji: '', color: colorOptions[0], isPositive: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomEmotions();
    }
  }, [isOpen]);

  const loadCustomEmotions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotions/custom`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCustomEmotions(data.emotions || []);
      }
    } catch (error) {
      console.error('Failed to load custom emotions:', error);
    }
  };

  const addEmotion = async () => {
    if (!newEmotion.label.trim() || !newEmotion.emoji.trim()) {
      toast.error('기분 이름과 이모티콘을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotions/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(newEmotion),
        }
      );

      if (response.ok) {
        setNewEmotion({ label: '', emoji: '', color: colorOptions[0], isPositive: true });
        loadCustomEmotions();
        onEmotionChange();
        toast.success('✅ 새로운 기분이 추가되었습니다!');
      } else {
        toast.error('기분 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error adding emotion:', error);
      toast.error('기분 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateEmotion = async () => {
    if (!editingEmotion || !editingEmotion.label.trim() || !editingEmotion.emoji.trim()) {
      toast.error('기분 이름과 이모티콘을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotions/${editingEmotion.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            label: editingEmotion.label,
            emoji: editingEmotion.emoji,
            color: editingEmotion.color,
            isPositive: editingEmotion.isPositive,
          }),
        }
      );

      if (response.ok) {
        setEditingEmotion(null);
        loadCustomEmotions();
        onEmotionChange();
        toast.success('✅ 기분이 수정되었습니다!');
      } else {
        toast.error('기분 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating emotion:', error);
      toast.error('기분 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deleteEmotion = async (emotionId: string) => {
    if (!confirm('이 기분을 삭제하시겠습니까? 이 기분을 사용한 일기들은 "선택안함"으로 변경됩니다.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-58f75568/emotions/${emotionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        loadCustomEmotions();
        onEmotionChange();
        toast.success('✅ 기분이 삭제되었습니다');
      } else {
        toast.error('기분 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting emotion:', error);
      toast.error('기분 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          기분 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>기분 관리</DialogTitle>
          <DialogDescription>
            나만의 기분을 추가하고 관리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new emotion */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-medium">새 기분 추가</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="기분 이름"
                  value={newEmotion.label}
                  onChange={(e) => setNewEmotion({ ...newEmotion, label: e.target.value })}
                />
                <Input
                  placeholder="이모티콘"
                  value={newEmotion.emoji}
                  onChange={(e) => setNewEmotion({ ...newEmotion, emoji: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">이 기분이 긍정적인가요?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewEmotion({ ...newEmotion, isPositive: true })}
                    className={`px-3 py-1 rounded-full text-sm ${
                      newEmotion.isPositive 
                        ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    긍정적
                  </button>
                  <button
                    onClick={() => setNewEmotion({ ...newEmotion, isPositive: false })}
                    className={`px-3 py-1 rounded-full text-sm ${
                      !newEmotion.isPositive 
                        ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    부정적
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">색상 선택</p>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewEmotion({ ...newEmotion, color })}
                      className={`w-6 h-6 rounded-full border-2 ${
                        newEmotion.color === color ? 'border-gray-900' : 'border-gray-300'
                      } ${color}`}
                    />
                  ))}
                </div>
              </div>
              <Button 
                onClick={addEmotion} 
                disabled={loading || !newEmotion.label.trim() || !newEmotion.emoji.trim()}
                className="w-full"
              >
                {loading ? '추가 중...' : '기분 추가'}
              </Button>
            </CardContent>
          </Card>

          {/* Custom emotions list */}
          {customEmotions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">나만의 기분들</h4>
              {customEmotions.map((emotion) => (
                <Card key={emotion.id} className="p-3">
                  {editingEmotion?.id === emotion.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editingEmotion.label}
                          onChange={(e) => setEditingEmotion({ ...editingEmotion, label: e.target.value })}
                        />
                        <Input
                          value={editingEmotion.emoji}
                          onChange={(e) => setEditingEmotion({ ...editingEmotion, emoji: e.target.value })}
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">색상 선택</p>
                        <div className="flex flex-wrap gap-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditingEmotion({ ...editingEmotion, color })}
                              className={`w-6 h-6 rounded-full border-2 ${
                                editingEmotion.color === color ? 'border-gray-900' : 'border-gray-300'
                              } ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={updateEmotion} disabled={loading} size="sm">
                          <Save className="w-4 h-4 mr-1" />
                          저장
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingEmotion(null)}
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-1" />
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emotion.emoji}</span>
                        <span className={`px-2 py-1 rounded-full text-sm ${emotion.color}`}>
                          {emotion.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEmotion(emotion)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEmotion(emotion.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}