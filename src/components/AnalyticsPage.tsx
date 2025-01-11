import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { createDummyData } from '../utils/createDummyData';
import { deleteAllData } from '../utils/deleteAllData';
import { HiX } from 'react-icons/hi';

interface WorkSession {
  id: string;
  startTime: { seconds: number };
  endTime: { seconds: number };
  focusLevel: number;
}

interface ChartDataPoint {
  date: string;
  hours: number;
  focusLevel: number;
  isToday: boolean;
  previousHours?: number;
  previousFocusLevel?: number;
  comparisonDate?: string;
}

const DATE_RANGES = [
  {
    label: 'Last 7 Days',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6); // 7 days including today
      return { start, end };
    }
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29); // 30 days including today
      return { start, end };
    }
  },
  {
    label: 'This Month',
    getValue: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date()
      };
    }
  },
  {
    label: 'Last Month',
    getValue: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0)
      };
    }
  },
  {
    label: 'This Year',
    getValue: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date()
      };
    }
  },
  {
    label: 'Last Year',
    getValue: () => {
      const now = new Date();
      now.setFullYear(2025);
      return {
        start: new Date(2024, 0, 1),
        end: new Date(2024, 11, 31, 23, 59, 59, 999)
      };
    }
  },
  {
    label: 'Custom Range',
    getValue: () => null // This will be handled separately
  }
];

export function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [dateRange, setDateRange] = useState(DATE_RANGES[0].getValue());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedRangeLabel, setSelectedRangeLabel] = useState(DATE_RANGES[0].label);
  const [showComparison, setShowComparison] = useState(false);

  const handleDateRangeClick = (range: typeof DATE_RANGES[0]) => {
    if (range.label === 'Custom Range') {
      setShowCustomRange(true);
      // Set initial custom date values to current range if exists
      const now = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(now.getDate() - 7); // Default to last 7 days
      
      setCustomStartDate((dateRange?.start || defaultStart).toISOString().split('T')[0]);
      setCustomEndDate((dateRange?.end || now).toISOString().split('T')[0]);
    } else {
      const newRange = range.getValue();
      if (newRange) {
        setSelectedRangeLabel(range.label);
        setDateRange(newRange);
      }
    }
  };

  const handleCustomRangeSubmit = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      
      if (start > end) {
        alert('Start date must be before end date');
        return;
      }

      setDateRange({ start, end });
      setSelectedRangeLabel('Custom Range');
      setShowCustomRange(false);
    }
  };

  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const sessionsQuery = query(
          collection(db, 'workSessions'),
          where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(sessionsQuery);
        const sessionData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WorkSession[];

        setSessions(sessionData);
      } catch (error: any) {
        console.error('Error fetching sessions:', error);
        setError('Error loading analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user]);

  // Helper function to get previous period dates
  const getPreviousPeriodDates = (start: Date, end: Date) => {
    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1); // Day before start
    const previousStart = new Date(previousEnd.getTime() - duration);
    return { start: previousStart, end: previousEnd };
  };

  const chartData = useMemo(() => {
    if (!dateRange) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper function to get local date string in YYYY-MM-DD format
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Get previous period dates if comparison is enabled
    const previousPeriod = showComparison ? getPreviousPeriodDates(dateRange.start, dateRange.end) : null;

    // Create array of all dates in the range
    const dates: ChartDataPoint[] = [];
    const currentDate = new Date(dateRange.start);
    const rangeEndDate = new Date(dateRange.end);

    while (currentDate <= rangeEndDate) {
      const isToday = (
        currentDate.getDate() === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()
      );
      
      const dateStr = getLocalDateString(currentDate);
      
      // If comparison is enabled, calculate the comparison date
      let comparisonDate: string | undefined;
      if (previousPeriod) {
        const comparisonTime = currentDate.getTime() - (dateRange.end.getTime() - dateRange.start.getTime());
        comparisonDate = getLocalDateString(new Date(comparisonTime));
      }
      
      dates.push({
        date: dateStr,
        hours: 0,
        focusLevel: 0,
        isToday,
        previousHours: 0,
        previousFocusLevel: 0,
        comparisonDate
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Set start and end of day for date ranges
    const rangeStart = new Date(dateRange.start);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(dateRange.end);
    rangeEnd.setHours(23, 59, 59, 999);

    // Process current period sessions
    const filteredSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime.seconds * 1000);
      return sessionDate >= rangeStart && sessionDate <= rangeEnd;
    });

    filteredSessions.forEach(session => {
      const date = new Date(session.startTime.seconds * 1000);
      const dateStr = getLocalDateString(date);
      const durationInHours = Math.round((session.endTime.seconds - session.startTime.seconds) / 36) / 100;
      
      const existingDay = dates.find(d => d.date === dateStr);
      if (existingDay) {
        if (existingDay.hours === 0) {
          existingDay.focusLevel = session.focusLevel;
        } else {
          const totalHours = existingDay.hours + durationInHours;
          existingDay.focusLevel = (
            (existingDay.focusLevel * existingDay.hours) + 
            (session.focusLevel * durationInHours)
          ) / totalHours;
        }
        existingDay.hours = Math.round((existingDay.hours + durationInHours) * 100) / 100;
      }
    });

    // Process previous period sessions if comparison is enabled
    if (previousPeriod) {
      const previousSessions = sessions.filter(session => {
        const sessionDate = new Date(session.startTime.seconds * 1000);
        return sessionDate >= previousPeriod.start && sessionDate <= previousPeriod.end;
      });

      previousSessions.forEach(session => {
        const date = new Date(session.startTime.seconds * 1000);
        const durationInHours = Math.round((session.endTime.seconds - session.startTime.seconds) / 36) / 100;
        
        // Find the corresponding day in the current period
        const targetDate = new Date(date.getTime() + (dateRange.end.getTime() - previousPeriod.end.getTime()));
        const targetDateStr = getLocalDateString(targetDate);
        
        const existingDay = dates.find(d => d.date === targetDateStr);
        if (existingDay) {
          if (existingDay.previousHours === 0) {
            existingDay.previousFocusLevel = session.focusLevel;
          } else {
            const totalHours = (existingDay.previousHours || 0) + durationInHours;
            existingDay.previousFocusLevel = (
              ((existingDay.previousFocusLevel || 0) * (existingDay.previousHours || 0)) + 
              (session.focusLevel * durationInHours)
            ) / totalHours;
          }
          existingDay.previousHours = Math.round((existingDay.previousHours! + durationInHours) * 100) / 100;
        }
      });
    }

    return dates;
  }, [sessions, dateRange, showComparison]);

  const handleGenerateDummyData = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const result = await createDummyData(user.uid);
      alert(`Successfully created ${result.projectsCreated} projects and ${result.sessionsCreated} work sessions!`);
      window.location.reload(); // Refresh to show new data
    } catch (error) {
      console.error('Error generating dummy data:', error);
      alert('Error generating dummy data. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user || !window.confirm('Are you sure you want to delete all data? This cannot be undone.')) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteAllData(user.uid);
      alert(`Successfully deleted ${result.projectsDeleted} projects and ${result.sessionsDeleted} work sessions!`);
      window.location.reload(); // Refresh to show empty state
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Error deleting data. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <div className="space-x-2">
          <button
            onClick={handleGenerateDummyData}
            disabled={isGenerating || isDeleting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Test Data'}
          </button>
          <button
            onClick={handleDeleteAllData}
            disabled={isGenerating || isDeleting}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete All Data'}
          </button>
        </div>
      </div>

      {/* Date range selector with comparison toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => handleDateRangeClick(range)}
              className={`px-4 py-2 rounded-full ${
                selectedRangeLabel === range.label
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`px-4 py-2 rounded-full ${
            showComparison
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showComparison ? 'Hide Comparison' : 'Compare with Previous Period'}
        </button>
      </div>

      {/* Custom Range Modal */}
      {showCustomRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Custom Date Range</h3>
              <button
                onClick={() => setShowCustomRange(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowCustomRange(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomRangeSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work Hours Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Work Hours</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'hours') return [`${value.toFixed(1)} hours`, 'Current Period'];
                  if (name === 'previousHours') return [`${value.toFixed(1)} hours`, 'Previous Period'];
                  return [value, name];
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
              <Bar 
                dataKey="hours"
                fill="#93C5FD"
                className="[&.recharts-bar-rectangle:has([data-today='true'])]:fill-blue-500"
              />
              {showComparison && (
                <Bar 
                  dataKey="previousHours"
                  fill="#E9D5FF"
                  className="opacity-70"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Focus Level Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Focus Level</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
              <YAxis domain={[0, 10]} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'focusLevel') return [`${value.toFixed(1)}/10`, 'Current Period'];
                  if (name === 'previousFocusLevel') return [`${value.toFixed(1)}/10`, 'Previous Period'];
                  return [value, name];
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
              <Line 
                type="monotone" 
                dataKey="focusLevel" 
                stroke="#3B82F6"
                strokeWidth={2}
                dot={({ cx, cy, payload }) => (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.isToday ? 6 : 4}
                    fill={payload.isToday ? "#3B82F6" : "#93C5FD"}
                    stroke="white"
                    strokeWidth={2}
                  />
                )}
              />
              {showComparison && (
                <Line 
                  type="monotone" 
                  dataKey="previousFocusLevel"
                  stroke="#A855F7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={({ cx, cy }) => (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#A855F7"
                      stroke="white"
                      strokeWidth={2}
                    />
                  )}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 