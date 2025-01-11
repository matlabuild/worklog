import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/User';
import { format } from 'date-fns';

interface FriendProfileProps {
  friendId: string;
  onClose: () => void;
}

interface WorkSession {
  id: string;
  startTime: { seconds: number };
  endTime: { seconds: number };
  focusLevel: number;
  projectName: string;
  accomplishments: string;
  userId: string;
}

interface WorkStats {
  totalHours: number;
  averageFocus: number;
  totalSessions: number;
  recentSessions: WorkSession[];
}

export function FriendProfile({ friendId, onClose }: FriendProfileProps) {
  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<WorkStats | null>(null);

  useEffect(() => {
    const fetchFriendProfile = async () => {
      setLoading(true);

      try {
        // Fetch friend's profile
        const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', friendId)));
        const userData = userDoc.docs[0].data() as UserProfile;
        setFriend(userData);

        // Only fetch work sessions if friend allows it
        if (userData.privacySettings.showWorkSessions) {
          // Fetch recent work sessions
          const sessionsQuery = query(
            collection(db, 'workSessions'),
            where('userId', '==', friendId),
            orderBy('startTime', 'desc'),
            limit(5)
          );
          const sessionsSnapshot = await getDocs(sessionsQuery);
          const sessions = sessionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as WorkSession[];

          // Calculate stats
          const totalHours = sessions.reduce((acc, session) => {
            const duration = (session.endTime.seconds - session.startTime.seconds) / 3600;
            return acc + duration;
          }, 0);

          const averageFocus = sessions.reduce((acc, session) => acc + session.focusLevel, 0) / sessions.length;

          setStats({
            totalHours: Math.round(totalHours * 10) / 10,
            averageFocus: Math.round(averageFocus * 10) / 10,
            totalSessions: sessions.length,
            recentSessions: sessions
          });
        }
      } catch (error) {
        console.error('Error fetching friend profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendProfile();
  }, [friendId]);

  const formatTime = (timestamp: { seconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="p-4">
        <p className="text-red-600">Friend not found.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{friend.displayName || friend.username}</h2>
              <p className="text-gray-600">@{friend.username}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {friend.privacySettings.showWorkSessions && stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Hours</p>
                  <p className="text-2xl font-bold">{stats.totalHours}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Average Focus</p>
                  <p className="text-2xl font-bold">{stats.averageFocus}/10</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Total Sessions</p>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Work Sessions</h3>
                <div className="space-y-4">
                  {stats.recentSessions.map(session => (
                    <div key={session.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{session.projectName}</p>
                          <p className="text-sm text-gray-600">
                            {formatTime(session.startTime)}
                          </p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Focus: {session.focusLevel}/10
                        </span>
                      </div>
                      <p className="text-gray-700">{session.accomplishments}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">This user's work sessions are private.</p>
          )}
        </div>
      </div>
    </div>
  );
} 