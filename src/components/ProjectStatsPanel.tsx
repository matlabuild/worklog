import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HiClock, HiClipboardList, HiStar } from 'react-icons/hi';

interface ProjectStatsPanelProps {
  projectId: string;
  userId: string;
}

export function ProjectStatsPanel({ projectId, userId }: ProjectStatsPanelProps) {
  const [stats, setStats] = useState({
    totalHours: 0,
    sessionCount: 0,
    averageFocus: 0
  });
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
        const sessions = querySnapshot.docs.map(doc => doc.data());
        
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
      } catch (error) {
        console.error('Error fetching project stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjectStats();
  }, [projectId, userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
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
  );
}