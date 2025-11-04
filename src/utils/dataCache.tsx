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

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30000;

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
    if (!force && isCacheValid(profileData.timestamp) && profileData.data) {
      return profileData.data;
    }

    if (profileData.loading) {
      return profileData.data;
    }

    setProfileData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall('/profile');
      const newData = {
        data,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setProfileData(newData);
      return data;
    } catch (error: any) {
      setProfileData(prev => ({ ...prev, loading: false, error }));
      throw error;
    }
  }, [profileData.timestamp, profileData.loading, profileData.data]);

  // Chat List
  const loadChatList = useCallback(async (force = false) => {
    if (!force && isCacheValid(chatListData.timestamp) && chatListData.data) {
      return chatListData.data;
    }

    if (chatListData.loading) {
      return chatListData.data;
    }

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

      const newData = {
        data: result,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setChatListData(newData);
      return result;
    } catch (error: any) {
      setChatListData(prev => ({ ...prev, loading: false, error }));
      throw error;
    }
  }, [chatListData.timestamp, chatListData.loading, chatListData.data]);

  // Diaries
  const loadDiaries = useCallback(async (force = false) => {
    if (!force && isCacheValid(diariesData.timestamp) && diariesData.data) {
      return diariesData.data;
    }

    if (diariesData.loading) {
      return diariesData.data || [];
    }

    setDiariesData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall('/diaries');
      const diariesList = data.diaries || [];

      const newData = {
        data: diariesList,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setDiariesData(newData);
      return diariesList;
    } catch (error: any) {
      setDiariesData(prev => ({ ...prev, loading: false, error }));
      throw error;
    }
  }, [diariesData.timestamp, diariesData.loading, diariesData.data]);

  // Reports
  const loadReports = useCallback(async (force = false) => {
    if (!force && isCacheValid(reportData.timestamp) && reportData.data) {
      return reportData.data;
    }

    if (reportData.loading) {
      return reportData.data;
    }

    setReportData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [week, month] = await Promise.all([
        apiCall('/reports/emotions?period=week'),
        apiCall('/reports/emotions?period=month')
      ]);

      const result = { week, month };

      const newData = {
        data: result,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };
      setReportData(newData);
      return result;
    } catch (error: any) {
      setReportData(prev => ({ ...prev, loading: false, error }));
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
