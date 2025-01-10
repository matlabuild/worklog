import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HiClock, HiClipboardList, HiStar, HiX } from 'react-icons/hi';

interface ProjectStatsSlideProps {
  projectId: string;
  userId: string;
  projectTitle: string;
  onClose: () => void;
}

interface WorkSession {
  id: string;
  startTime: { seconds: number };
  endTime: { seconds: number };
  focusLevel: number;
  accomplishments: string;
  comments?: string;
}

export function ProjectStatsSlidePanel({ projectId, userId, projectTitle, onClose }: ProjectStatsSlideProps) {
  const [stats, setStats] = useState({
    totalHours: 0,
    sessionCount: 0,
    averageFocus: 0
  });
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectStats() {
      if (!projectId || !userId) return;
      
      try {
        const q = query(
          collection(db, 'workSessions'),
          where('userId', '==', userId),
          where('project', '==', projectId)
        );
        
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WorkSession[];

        // Sort sessions by date (most recent first)
        sessions.sort((a, b) => b.startTime.seconds - a.startTime.seconds);
        
        const totalMinutes = sessions.reduce((acc, session) => {
          const start = new Date(session.startTime.seconds * 1000);
          const end = new Date(session.endTime.seconds * 1000);
          return acc + ((end.getTime() - start.getTime()) / (1000 * 60));
        }, 0);

        const totalFocus = sessions.reduce((acc, session) => acc + session.focusLevel, 0);
        
        setStats({
          totalHours: Math.round(totalMinutes / 60 * 10) / 10,
          sessionCount: sessions.length,
          averageFocus: sessions.length ? Math.round(totalFocus / sessions.length * 10) / 10 : 0
        });

        setWorkSessions(sessions);
      } catch (error) {
        console.error('Error fetching project stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjectStats();
  }, [projectId, userId]);

  const formatDate = (timestamp: { seconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp: { seconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateDuration = (start: { seconds: number }, end: { seconds: number }) => {
    const diffInMinutes = Math.round((end.seconds - start.seconds) / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="relative w-screen max-w-md">
            <div className="h-full flex flex-col bg-white shadow-xl">
              {/* Header */}
              <div className="px-4 py-6 bg-gray-50 sm:px-6">
                <div className="flex items-start justify-between space-x-3">
                  <h2 className="text-lg font-medium text-gray-900">
                    {projectTitle} - Statistics
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <HiX className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-6">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center mb-2">
                            <HiClock className="w-5 h-5 text-blue-500 mr-2" />
                            <span className="text-sm font-medium text-blue-900">Total Hours</span>
                          </div>
                          <p className="text-2xl font-semibold text-blue-900">{stats.totalHours}</p>
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center mb-2">
                            <HiClipboardList className="w-5 h-5 text-green-500 mr-2" />
                            <span className="text-sm font-medium text-green-900">Sessions</span>
                          </div>
                          <p className="text-2xl font-semibold text-green-900">{stats.sessionCount}</p>
                        </div>
                        
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="flex items-center mb-2">
                            <HiStar className="w-5 h-5 text-yellow-500 mr-2" />
                            <span className="text-sm font-medium text-yellow-900">Avg Focus</span>
                          </div>
                          <p className="text-2xl font-semibold text-yellow-900">{stats.averageFocus}/10</p>
                        </div>
                      </div>

                      {/* Work Sessions List */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Work Sessions</h3>
                        <div className="space-y-4">
                          {workSessions.map(session => (
                            <div
                              key={session.id}
                              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatDate(session.startTime)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-medium text-gray-900">
                                    {calculateDuration(session.startTime, session.endTime)}
                                  </span>
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                    Focus: {session.focusLevel}/10
                                  </span>
                                </div>
                              </div>
                              {session.accomplishments && (
                                <p className="mt-2 text-sm text-gray-600">
                                  {session.accomplishments}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 