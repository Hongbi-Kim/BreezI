import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiCall } from './api';

interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
  loading: boolean;
  error: Error | null;
}

interface DataCacheContextType {
  // Profile data
  profileData: CacheEntry<any>;
  loadProfile: (force?: boolean) => Promise<any>;
  
  // Chat list data
  chatListData: CacheEntry<any>;
  loadChatList: (force?: boolean) => Promise<any>;
  
  // Chat messages data (per character)
  loadChatMessages: (characterId: string, force?: boolean) => Promise<any>;
  refreshChatMessages: (characterId: string) => Promise<any>;
  
  // Diaries data
  diariesData: CacheEntry<any[]>;
  loadDiaries: (force?: boolean) => Promise<any[]>;
  
  // Report data
  reportData: CacheEntry<{ week: any; month: any }>;
  loadReports: (force?: boolean) => Promise<any>;
  
  // AI Memories data
  aiMemoriesData: CacheEntry<any[]>;
  loadAIMemories: (force?: boolean) => Promise<any[]>;
  
  // Ripple dates data
  rippleDatesData: CacheEntry<string[]>;
  loadRippleDates: (force?: boolean) => Promise<string[]>;
  
  // Clear cache
  clearCache: () => void;
  
  // Manual refresh specific data
  refreshProfile: () => Promise<any>;
  refreshChatList: () => Promise<any>;
  refreshDiaries: () => Promise<any[]>;
  refreshReports: () => Promise<any>;
  refreshAIMemories: () => Promise<any[]>;
  refreshRippleDates: () => Promise<string[]>;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

// Cache duration in milliseconds (5 minutes for optimal performance)
// 프론트엔드 캐싱으로 API 호출 빈도를 줄여 Rate Limit 문제 방지
const CACHE_DURATION = 300000; // 5 minutes

function createEmptyCache<T>(): CacheEntry<T> {
  return {
    data: null,
    timestamp: 0,
    loading: false,
    error: null,
  };
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [profileData, setProfileData] = useState<CacheEntry<any>>(createEmptyCache());
  const [chatListData, setChatListData] = useState<CacheEntry<any>>(createEmptyCache());
  const [chatMessagesCache, setChatMessagesCache] = useState<Record<string, CacheEntry<any>>>({});
  const [diariesData, setDiariesData] = useState<CacheEntry<any[]>>(createEmptyCache());
  const [reportData, setReportData] = useState<CacheEntry<{ week: any; month: any }>>(createEmptyCache());
  const [aiMemoriesData, setAIMemoriesData] = useState<CacheEntry<any[]>>(createEmptyCache());
  const [rippleDatesData, setRippleDatesData] = useState<CacheEntry<string[]>>(createEmptyCache());

  // Profile
  const loadProfile = useCallback(async (force = false) => {
    // Return cached data if valid
    if (!force && isCacheValid(profileData.timestamp) && profileData.data) {
      const cacheAge = Math.floor((Date.now() - profileData.timestamp) / 1000);
      console.log(`[DataCache] ✅ Returning cached profile data (age: ${cacheAge}s)`);
      return profileData.data;
    }

    // If already loading, return cached data immediately
    if (profileData.loading) {
      console.log('[DataCache] ⏳ Profile already loading, returning cached data');
      return profileData.data;
    }

    console.log('[DataCache] 🔄 Loading profile data from API...');
    setProfileData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall('/profile');
      console.log('[DataCache] Profile data loaded successfully');
      const newData = {
        data,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setProfileData(newData);
      return data;
    } catch (error: any) {
      console.error('[DataCache] Failed to load profile:', error);
      setProfileData(prev => ({ ...prev, loading: false, error }));
      // Return cached data even on error if available
      if (profileData.data) {
        console.log('[DataCache] Returning stale profile data due to error');
        return profileData.data;
      }
      throw error;
    }
  }, [profileData.timestamp, profileData.loading, profileData.data]);

  // Chat List
  const loadChatList = useCallback(async (force = false) => {
    // Return cached data if valid
    if (!force && isCacheValid(chatListData.timestamp) && chatListData.data) {
      const cacheAge = Math.floor((Date.now() - chatListData.timestamp) / 1000);
      console.log(`[DataCache] ✅ Returning cached chat list data (age: ${cacheAge}s)`);
      return chatListData.data;
    }

    // If already loading, return cached data immediately
    if (chatListData.loading) {
      console.log('[DataCache] ⏳ Chat list already loading, returning cached data');
      return chatListData.data;
    }

    console.log('[DataCache] 🔄 Loading chat list data from API...');
    setChatListData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [charactersData, summariesData] = await Promise.all([
        apiCall('/characters'),
        apiCall('/chat/list/summary')
      ]);

      const result = {
        characters: charactersData.characters || [],
        summaries: summariesData.summaries || []
      };

      console.log('[DataCache] Chat list data loaded successfully');
      const newData = {
        data: result,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setChatListData(newData);
      return result;
    } catch (error: any) {
      console.error('[DataCache] Failed to load chat list:', error);
      setChatListData(prev => ({ ...prev, loading: false, error }));
      // Return cached data even on error if available
      if (chatListData.data) {
        console.log('[DataCache] Returning stale chat list data due to error');
        return chatListData.data;
      }
      throw error;
    }
  }, [chatListData.timestamp, chatListData.loading, chatListData.data]);

  // Diaries
  const loadDiaries = useCallback(async (force = false) => {
    if (!force && isCacheValid(diariesData.timestamp) && diariesData.data) {
      console.log('[DataCache] Returning cached diaries data');
      return diariesData.data;
    }

    if (diariesData.loading) {
      console.log('[DataCache] Diaries already loading, returning cached data');
      return diariesData.data || [];
    }

    console.log('[DataCache] Loading diaries data...');
    setDiariesData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall('/diaries');
      const diariesList = data.diaries || [];

      console.log('[DataCache] Diaries data loaded successfully:', diariesList.length, 'entries');
      const newData = {
        data: diariesList,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setDiariesData(newData);
      return diariesList;
    } catch (error: any) {
      console.error('[DataCache] Failed to load diaries:', error);
      setDiariesData(prev => ({ ...prev, loading: false, error }));
      // Return cached data even on error if available
      if (diariesData.data && diariesData.data.length > 0) {
        console.log('[DataCache] Returning stale diaries data due to error');
        return diariesData.data;
      }
      // Return empty array instead of throwing
      return [];
    }
  }, [diariesData.timestamp, diariesData.loading, diariesData.data]);

  // Reports
  const loadReports = useCallback(async (force = false) => {
    if (!force && isCacheValid(reportData.timestamp) && reportData.data) {
      console.log('[DataCache] Returning cached reports data');
      return reportData.data;
    }

    if (reportData.loading) {
      console.log('[DataCache] Reports already loading, returning cached data');
      return reportData.data;
    }

    console.log('[DataCache] Loading reports data...');
    setReportData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [week, month] = await Promise.all([
        apiCall('/reports/emotions?period=week'),
        apiCall('/reports/emotions?period=month')
      ]);

      const result = { week, month };

      console.log('[DataCache] Reports data loaded successfully');
      const newData = {
        data: result,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setReportData(newData);
      return result;
    } catch (error: any) {
      console.error('[DataCache] Failed to load reports:', error);
      setReportData(prev => ({ ...prev, loading: false, error }));
      // Return cached data even on error if available
      if (reportData.data) {
        console.log('[DataCache] Returning stale reports data due to error');
        return reportData.data;
      }
      throw error;
    }
  }, [reportData.timestamp, reportData.loading, reportData.data]);

  // AI Memories
  const loadAIMemories = useCallback(async (force = false) => {
    if (!force && isCacheValid(aiMemoriesData.timestamp) && aiMemoriesData.data) {
      return aiMemoriesData.data;
    }

    if (aiMemoriesData.loading) {
      return aiMemoriesData.data || [];
    }

    setAIMemoriesData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall('/ai-memories');
      const memories = data.memories || [];
      
      const newData = {
        data: memories,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setAIMemoriesData(newData);
      return memories;
    } catch (error: any) {
      setAIMemoriesData(prev => ({ ...prev, loading: false, error }));
      throw error;
    }
  }, [aiMemoriesData.timestamp, aiMemoriesData.loading, aiMemoriesData.data]);

  // Ripple Dates
  const loadRippleDates = useCallback(async (force = false) => {
    if (!force && isCacheValid(rippleDatesData.timestamp) && rippleDatesData.data) {
      const cacheAge = Math.floor((Date.now() - rippleDatesData.timestamp) / 1000);
      console.log(`[DataCache] ✅ Returning cached ripple dates (age: ${cacheAge}s)`);
      return rippleDatesData.data;
    }

    if (rippleDatesData.loading) {
      console.log('[DataCache] ⏳ Ripple dates already loading, returning cached data');
      return rippleDatesData.data || [];
    }

    console.log('[DataCache] 🔄 Loading ripple dates from API...');
    setRippleDatesData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall('/time-ripple/all-dates');
      const dates = data.dates || [];
      
      console.log('[DataCache] Ripple dates loaded successfully:', dates.length, 'dates');
      const newData = {
        data: dates,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setRippleDatesData(newData);
      return dates;
    } catch (error: any) {
      console.error('[DataCache] Failed to load ripple dates:', error);
      setRippleDatesData(prev => ({ ...prev, loading: false, error }));
      // Return cached data even on error if available
      if (rippleDatesData.data && rippleDatesData.data.length > 0) {
        console.log('[DataCache] Returning stale ripple dates due to error');
        return rippleDatesData.data;
      }
      // Return empty array instead of throwing
      return [];
    }
  }, [rippleDatesData.timestamp, rippleDatesData.loading, rippleDatesData.data]);

  // Chat Messages (per character)
  const loadChatMessages = useCallback(async (characterId: string, force = false) => {
    const cached = chatMessagesCache[characterId];
    
    // Return cached data if valid
    if (!force && cached && isCacheValid(cached.timestamp) && cached.data) {
      const cacheAge = Math.floor((Date.now() - cached.timestamp) / 1000);
      console.log(`[DataCache] ✅ Returning cached chat messages for ${characterId} (age: ${cacheAge}s)`);
      return cached.data;
    }

    // If already loading, return cached data immediately
    if (cached?.loading) {
      console.log(`[DataCache] ⏳ Chat messages for ${characterId} already loading, returning cached data`);
      return cached.data;
    }

    console.log(`[DataCache] 🔄 Loading chat messages for ${characterId} from API...`);
    setChatMessagesCache(prev => ({
      ...prev,
      [characterId]: { ...createEmptyCache(), loading: true }
    }));

    try {
      const data = await apiCall(`/chat/${characterId}`);
      
      // Handle empty chat - initialize
      if (!data.messages || data.messages.length === 0) {
        console.log(`[DataCache] Initializing chat for ${characterId}`);
        await apiCall(`/chat/${characterId}/init`, { method: 'POST' });
        const updatedData = await apiCall(`/chat/${characterId}`);
        
        const newCache = {
          data: updatedData,
          timestamp: Date.now(),
          loading: false,
          error: null,
        };
        setChatMessagesCache(prev => ({ ...prev, [characterId]: newCache }));
        return updatedData;
      }

      console.log(`[DataCache] Chat messages loaded successfully for ${characterId}`);
      const newCache = {
        data,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setChatMessagesCache(prev => ({ ...prev, [characterId]: newCache }));
      return data;
    } catch (error: any) {
      console.error(`[DataCache] Failed to load chat messages for ${characterId}:`, error);
      setChatMessagesCache(prev => ({
        ...prev,
        [characterId]: { ...prev[characterId], loading: false, error }
      }));
      // Return cached data even on error if available
      if (cached?.data) {
        console.log(`[DataCache] Returning stale chat messages for ${characterId} due to error`);
        return cached.data;
      }
      throw error;
    }
  }, [chatMessagesCache]);

  // Clear all cache
  const clearCache = useCallback(() => {
    setProfileData(createEmptyCache());
    setChatListData(createEmptyCache());
    setChatMessagesCache({});
    setDiariesData(createEmptyCache());
    setReportData(createEmptyCache());
    setAIMemoriesData(createEmptyCache());
    setRippleDatesData(createEmptyCache());
  }, []);

  // Manual refresh methods
  const refreshProfile = useCallback(() => loadProfile(true), [loadProfile]);
  const refreshChatList = useCallback(() => loadChatList(true), [loadChatList]);
  const refreshChatMessages = useCallback((characterId: string) => loadChatMessages(characterId, true), [loadChatMessages]);
  const refreshDiaries = useCallback(() => loadDiaries(true), [loadDiaries]);
  const refreshReports = useCallback(() => loadReports(true), [loadReports]);
  const refreshAIMemories = useCallback(() => loadAIMemories(true), [loadAIMemories]);
  const refreshRippleDates = useCallback(() => loadRippleDates(true), [loadRippleDates]);

  const value: DataCacheContextType = {
    profileData,
    loadProfile,
    chatListData,
    loadChatList,
    loadChatMessages,
    refreshChatMessages,
    diariesData,
    loadDiaries,
    reportData,
    loadReports,
    aiMemoriesData,
    loadAIMemories,
    rippleDatesData,
    loadRippleDates,
    clearCache,
    refreshProfile,
    refreshChatList,
    refreshDiaries,
    refreshReports,
    refreshAIMemories,
    refreshRippleDates,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}
