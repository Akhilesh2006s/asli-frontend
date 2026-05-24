/**
 * Study Time Tracker Utility
 * Tracks study time using timestamps and ignores time when app is in background
 */

/** YYYY-MM-DD in the user's local timezone (matches session-time API keys). */
export function getLocalIsoDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get user-specific storage key
 */
function getStorageKey(): string {
  // Try to get user ID from JWT token
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Decode JWT to get user ID (simple base64 decode, no verification needed for storage key)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id || payload._id;
      if (userId) {
        return `studyTimeData_${userId}`;
      }
    }
  } catch (error) {
    console.warn('Could not extract user ID from token:', error);
  }
  
  // Fallback: try to get from user data in localStorage
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.id || user._id) {
        return `studyTimeData_${user.id || user._id}`;
      }
    }
  } catch (error) {
    console.warn('Could not extract user ID from userData:', error);
  }
  
  // Final fallback: use default key (for backward compatibility, but should be avoided)
  console.warn('⚠️ Using default study time storage key - data may be shared across users');
  return 'studyTimeData';
}

interface DailyData {
  totalMinutes: number;
  sessions: Array<{
    startTime: number;
    endTime?: number;
  }>;
  lastUpdate: number;
}

interface StudyTimeData {
  dailyData: { [dateKey: string]: DailyData };
  weekStart: string;
}

/**
 * Get start of week (Monday)
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get or initialize study time data
 */
function getStudyTimeData(): StudyTimeData {
  const STORAGE_KEY = getStorageKey();
  const stored = localStorage.getItem(STORAGE_KEY);
  const TODAY_KEY = new Date().toDateString();
  const WEEK_START = getStartOfWeek(new Date()).toDateString();
  
  let studyTimeData: StudyTimeData = {
    dailyData: {},
    weekStart: WEEK_START
  };
  
  if (stored) {
    try {
      studyTimeData = JSON.parse(stored);
    } catch (e) {
      studyTimeData = { dailyData: {}, weekStart: WEEK_START };
    }
  }
  
  // If it's a new week, reset weekly data but keep daily history
  if (studyTimeData.weekStart !== WEEK_START) {
    studyTimeData.weekStart = WEEK_START;
    studyTimeData.dailyData = studyTimeData.dailyData || {};
    // Clear old daily data (keep only last 7 days for reference)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    Object.keys(studyTimeData.dailyData || {}).forEach((dateKey) => {
      if (new Date(dateKey) < sevenDaysAgo) {
        delete studyTimeData.dailyData[dateKey];
      }
    });
  }
  
  // Initialize daily data structure
  if (!studyTimeData.dailyData) {
    studyTimeData.dailyData = {};
  }
  
      // If it's a new day, initialize today's data
      if (!studyTimeData.dailyData[TODAY_KEY]) {
        studyTimeData.dailyData[TODAY_KEY] = {
          totalMinutes: 0,
          sessions: [],
          lastUpdate: Date.now()
        };
      } else {
        // Ensure sessions array exists for existing data
        if (!studyTimeData.dailyData[TODAY_KEY].sessions) {
          studyTimeData.dailyData[TODAY_KEY].sessions = [];
        }
      }
  
  return studyTimeData;
}

/**
 * Save study time data to localStorage
 */
function saveStudyTimeData(data: StudyTimeData): void {
  const STORAGE_KEY = getStorageKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Start a new study session
 */
export function startSession(): void {
  // Only start if page is visible
  if (document.hidden) {
    return;
  }
  
  const data = getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  
  // Ensure sessions array exists
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  // Check if there's already an active session
  if (todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      // Session is already active, don't start a new one
      return;
    }
  }
  
  // End any active session first (shouldn't happen due to check above, but just in case)
  if (todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      lastSession.endTime = Date.now();
      const sessionDuration = Math.floor((lastSession.endTime - lastSession.startTime) / 60000);
      todayData.totalMinutes = (todayData.totalMinutes || 0) + sessionDuration;
    }
  }
  
  // Start new session
  const startTime = Date.now();
  todayData.sessions.push({
    startTime: startTime
  });
  todayData.lastUpdate = startTime;
  
  data.dailyData[TODAY_KEY] = todayData;
  saveStudyTimeData(data);
}

/**
 * End the current study session
 */
export function endSession(): void {
  const data = getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  
  // Ensure sessions array exists
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  if (todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      lastSession.endTime = Date.now();
      const sessionDuration = Math.floor((lastSession.endTime - lastSession.startTime) / 60000);
      todayData.totalMinutes = (todayData.totalMinutes || 0) + sessionDuration;
      todayData.lastUpdate = Date.now();
      
      data.dailyData[TODAY_KEY] = todayData;
      saveStudyTimeData(data);
    }
  }
}

/**
 * Update study time (called periodically)
 * This function should periodically end active sessions and save time
 */
export function updateStudyTime(): { today: number; thisWeek: number } {
  // Always get fresh data from localStorage
  const data = getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  const now = Date.now();
  
  // Ensure sessions array exists
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  // If no active session and page is visible, start one
  if (!document.hidden && todayData.sessions.length === 0) {
    // No sessions at all, start one
    todayData.sessions.push({
      startTime: now
    });
    todayData.lastUpdate = now;
    data.dailyData[TODAY_KEY] = todayData;
    saveStudyTimeData(data);
  } else if (!document.hidden && todayData.sessions.length > 0) {
    // Check if last session is ended (shouldn't happen if tracking correctly)
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (lastSession.endTime) {
      // All sessions are ended, start a new one
      todayData.sessions.push({
        startTime: now
      });
      todayData.lastUpdate = now;
      data.dailyData[TODAY_KEY] = todayData;
      saveStudyTimeData(data);
    }
  }
  
  // Re-fetch fresh data after any potential session changes
  const currentData = getStudyTimeData();
  const currentTodayData = currentData.dailyData[TODAY_KEY];
  if (!currentTodayData.sessions) {
    currentTodayData.sessions = [];
  }
  
  // If page is visible and there's an active session, periodically save time
  if (!document.hidden && currentTodayData.sessions.length > 0) {
    const lastSession = currentTodayData.sessions[currentTodayData.sessions.length - 1];
    if (!lastSession.endTime) {
      // Session is active - calculate time since start
      const sessionDurationSeconds = now - lastSession.startTime;
      const sessionDurationMinutes = sessionDurationSeconds / 60000;
      
      // If session is longer than 1 minute, save it periodically (every 1 minute)
      // This prevents losing time if the page closes unexpectedly
      if (sessionDurationMinutes >= 1) {
        // End current session and start a new one to save progress
        lastSession.endTime = now;
        const savedMinutes = Math.floor(sessionDurationSeconds / 60000);
        currentTodayData.totalMinutes = (currentTodayData.totalMinutes || 0) + savedMinutes;
        
        // Start new session
        currentTodayData.sessions.push({
          startTime: now
        });
        currentTodayData.lastUpdate = now;
        currentData.dailyData[TODAY_KEY] = currentTodayData;
        saveStudyTimeData(currentData);
        
        // Re-fetch data after saving to get updated values
        const updatedData = getStudyTimeData();
        const updatedTodayData = updatedData.dailyData[TODAY_KEY];
        
        // Calculate today's total with new session
        let todayTotal = updatedTodayData.totalMinutes || 0;
        if (updatedTodayData.sessions && updatedTodayData.sessions.length > 0) {
          const newLastSession = updatedTodayData.sessions[updatedTodayData.sessions.length - 1];
          if (!newLastSession.endTime) {
            const newActiveSeconds = now - newLastSession.startTime;
            const newActiveMinutes = newActiveSeconds / 60000;
            todayTotal += newActiveMinutes;
          }
        }
        
        // Recalculate weekly total with updated data
        let weeklyTotal = 0;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateKey = date.toDateString();
          
          if (updatedData.dailyData[dateKey]) {
            let dayTotal = updatedData.dailyData[dateKey].totalMinutes || 0;
            
            if (dateKey === TODAY_KEY && !document.hidden) {
              const dayData = updatedData.dailyData[dateKey];
              if (dayData.sessions && dayData.sessions.length > 0) {
                const dayLastSession = dayData.sessions[dayData.sessions.length - 1];
                if (!dayLastSession.endTime) {
                  const dayActiveSeconds = now - dayLastSession.startTime;
                  const dayActiveMinutes = dayActiveSeconds / 60000;
                  dayTotal += dayActiveMinutes;
                }
              }
            }
            
            weeklyTotal += dayTotal;
          }
        }
        
        return {
          today: Math.max(0, Math.round(todayTotal)),
          thisWeek: Math.max(0, Math.round(weeklyTotal))
        };
      }
    }
  }
  
  // Calculate today's total (including active session if any) - always use fresh calculation
  // Re-fetch data to ensure we have the latest
  const freshData = getStudyTimeData();
  const freshTodayData = freshData.dailyData[TODAY_KEY];
  if (!freshTodayData.sessions) {
    freshTodayData.sessions = [];
  }
  
  let todayTotal = freshTodayData.totalMinutes || 0;
  if (!document.hidden && freshTodayData.sessions.length > 0) {
    const lastSession = freshTodayData.sessions[freshTodayData.sessions.length - 1];
    if (!lastSession.endTime) {
      const activeSessionSeconds = now - lastSession.startTime;
      const activeSessionMinutes = activeSessionSeconds / 60000; // Convert to minutes (can be fractional)
      todayTotal += activeSessionMinutes;
    }
  }
  
  // Calculate weekly total - always recalculate from fresh data
  let weeklyTotal = 0;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    if (freshData.dailyData[dateKey]) {
      let dayTotal = freshData.dailyData[dateKey].totalMinutes || 0;
      
      // If it's today and there's an active session, add it
      if (dateKey === TODAY_KEY && !document.hidden) {
        const dayData = freshData.dailyData[dateKey];
        if (dayData.sessions && dayData.sessions.length > 0) {
          const lastSession = dayData.sessions[dayData.sessions.length - 1];
          if (!lastSession.endTime) {
            const activeSessionSeconds = now - lastSession.startTime;
            const activeSessionMinutes = activeSessionSeconds / 60000; // Can be fractional
            dayTotal += activeSessionMinutes;
          }
        }
      }
      
      weeklyTotal += dayTotal;
    }
  }
  
  // Round to nearest minute for display
  // Don't round down to 0 if there's any active time
  const roundedToday = Math.max(0, Math.round(todayTotal));
  const roundedWeek = Math.max(0, Math.round(weeklyTotal));
  
  return {
    today: roundedToday,
    thisWeek: roundedWeek
  };
}

/**
 * Get today's study time
 */
export function getTodayStudyTime(): number {
  const data = getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const todayData = data.dailyData[TODAY_KEY];
  const now = Date.now();
  
  // Ensure sessions array exists
  if (!todayData.sessions) {
    todayData.sessions = [];
  }
  
  let total = todayData.totalMinutes || 0;
  
  // Add active session time if page is visible
  if (!document.hidden && todayData.sessions.length > 0) {
    const lastSession = todayData.sessions[todayData.sessions.length - 1];
    if (!lastSession.endTime) {
      const activeSessionSeconds = now - lastSession.startTime;
      const activeSessionMinutes = activeSessionSeconds / 60000; // Can be fractional
      total += activeSessionMinutes;
    }
  }
  
  return Math.max(0, Math.round(total));
}

/**
 * Get weekly study time
 */
export function getWeeklyStudyTime(): number {
  const data = getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const now = Date.now();
  
  let weeklyTotal = 0;
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    if (data.dailyData[dateKey]) {
      let dayTotal = data.dailyData[dateKey].totalMinutes || 0;
      
      // If it's today and there's an active session, add it
      if (dateKey === TODAY_KEY && !document.hidden) {
        const dayData = data.dailyData[dateKey];
        if (dayData.sessions && dayData.sessions.length > 0) {
          const lastSession = dayData.sessions[dayData.sessions.length - 1];
          if (!lastSession.endTime) {
            const activeSessionMinutes = Math.floor((now - lastSession.startTime) / 60000);
            dayTotal += activeSessionMinutes;
          }
        }
      }
      
      weeklyTotal += dayTotal;
    }
  }
  
  return weeklyTotal;
}

/**
 * Get weekly study data for each day
 */
export function getWeeklyStudyData(): { [dateKey: string]: number } {
  const data = getStudyTimeData();
  const TODAY_KEY = new Date().toDateString();
  const now = Date.now();
  const weeklyData: { [dateKey: string]: number } = {};
  
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    if (data.dailyData[dateKey]) {
      let dayTotal = data.dailyData[dateKey].totalMinutes || 0;
      
      // If it's today and there's an active session, add it
      if (dateKey === TODAY_KEY && !document.hidden) {
        const dayData = data.dailyData[dateKey];
        if (dayData.sessions && dayData.sessions.length > 0) {
          const lastSession = dayData.sessions[dayData.sessions.length - 1];
          if (!lastSession.endTime) {
            const activeSessionMinutes = Math.floor((now - lastSession.startTime) / 60000);
            dayTotal += activeSessionMinutes;
          }
        }
      }
      
      weeklyData[dateKey] = dayTotal;
    } else {
      weeklyData[dateKey] = 0;
    }
  }
  
  return weeklyData;
}

