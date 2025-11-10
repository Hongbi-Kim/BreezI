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
  
  // Diaries data
  diariesData: CacheEntry<any[]>;
  loadDiaries: (force?: boolean) => Promise<any[]>;
  
  // Report data
  reportData: CacheEntry<{ week: any; month: any }>;
  loadReports: (force?: boolean) => Promise<any>;
  
  // AI Memories data
  aiMemoriesData: CacheEntry<any[]>;
  loadAIMemories: (force?: boolean) => Promise<any[]>;
  
  // Clear cache
  clearCache: () => void;
  
  // Manual refresh specific data
  refreshProfile: () => Promise<any>;
  refreshChatList: () => Promise<any>;
  refreshDiaries: () => Promise<any[]>;
  refreshReports: () => Promise<any>;
  refreshAIMemories: () => Promise<any[]>;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

// Cache duration in milliseconds (2 minutes for better performance)
const CACHE_DURATION = 120000;

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
  const [diariesData, setDiariesData] = useState<CacheEntry<any[]>>(createEmptyCache());
  const [reportData, setReportData] = useState<CacheEntry<{ week: any; month: any }>>(createEmptyCache());
  const [aiMemoriesData, setAIMemoriesData] = useState<CacheEntry<any[]>>(createEmptyCache());

  // Profile
  const loadProfile = useCallback(async (force = false) => {
    // Return cached data if valid
    if (!force && isCacheValid(profileData.timestamp) && profileData.data) {
      const cacheAge = Math.floor((Date.now() - profileData.timestamp) / 1000);
      console.log(`[DataCache] ✅ Returning cached profile data (age: ${cacheAge}s)`);
      return profileData.data;
    }

    // If already loading, wait for current request
    if (profileData.loading) {
      console.log('[DataCache] ⏳ Profile already loading, waiting...');
      // Wait a bit and return cached data if available
      await new Promise(resolve => setTimeout(resolve, 100));
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

    // If already loading, wait for current request
    if (chatListData.loading) {
      console.log('[DataCache] ⏳ Chat list already loading, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
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
      console.log('[DataCache] Diaries already loading, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
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
      console.log('[DataCache] Reports already loading, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
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

  // Clear all cache
  const clearCache = useCallback(() => {
    setProfileData(createEmptyCache());
    setChatListData(createEmptyCache());
    setDiariesData(createEmptyCache());
    setReportData(createEmptyCache());
    setAIMemoriesData(createEmptyCache());
  }, []);

  // Manual refresh methods
  const refreshProfile = useCallback(() => loadProfile(true), [loadProfile]);
  const refreshChatList = useCallback(() => loadChatList(true), [loadChatList]);
  const refreshDiaries = useCallback(() => loadDiaries(true), [loadDiaries]);
  const refreshReports = useCallback(() => loadReports(true), [loadReports]);
  const refreshAIMemories = useCallback(() => loadAIMemories(true), [loadAIMemories]);

  const value: DataCacheContextType = {
    profileData,
    loadProfile,
    chatListData,
    loadChatList,
    diariesData,
    loadDiaries,
    reportData,
    loadReports,
    aiMemoriesData,
    loadAIMemories,
    clearCache,
    refreshProfile,
    refreshChatList,
    refreshDiaries,
    refreshReports,
    refreshAIMemories,
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
