import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import * as Icons from 'react-icons/hi';
import { DayCalendar } from './DayCalendar';
import { WorkSessionForm } from './WorkSessionForm';
import { ProjectStatsSlidePanel } from './ProjectStatsSlidePanel';

interface IconMap {
  [key: string]: any;
}

interface WorkSession {
  id: string;
  startTime: { seconds: number };
  endTime: { seconds: number };
  project: string;
  projectName: string;
  focusLevel: number;
  accomplishments: string;
  comments: string;
  projectIcon?: string;
}

interface GroupedSessions {
  [date: string]: WorkSession[];
}

interface WorkSessionLogProps {
  refreshTrigger?: number;
  onEditSession: (session: WorkSession) => void;
}

export function WorkSessionLog({ refreshTrigger = 0, onEditSession }: WorkSessionLogProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [groupedSessions, setGroupedSessions] = useState<GroupedSessions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [selectedProjectForStats, setSelectedProjectForStats] = useState<{ id: string, title: string } | null>(null);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        // First, fetch all projects to get their icons
        const projectsQuery = query(
          collection(db, 'projects'),
          where('userId', '==', user.uid)
        );
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectIcons = new Map(
          projectsSnapshot.docs.map(doc => [doc.id, doc.data().icon || 'HiFolder'])
        );

        // Then fetch sessions with a fallback strategy
        let sessionsQuery;
        try {
          // Try the optimal query first
          sessionsQuery = query(
            collection(db, 'workSessions'),
            where('userId', '==', user.uid),
            orderBy('startTime', 'desc')
          );
          await getDocs(sessionsQuery); // Test if this works
        } catch (e: any) {
          if (e.code === 'failed-precondition') {
            // If index doesn't exist, fall back to a simpler query
            console.warn('Index not found, falling back to basic query');
            sessionsQuery = query(
              collection(db, 'workSessions'),
              where('userId', '==', user.uid)
            );
          } else {
            throw e; // Re-throw if it's not an index issue
          }
        }

        const querySnapshot = await getDocs(sessionsQuery);
        let sessionData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            projectIcon: data.project ? projectIcons.get(data.project) : null
          };
        }) as WorkSession[];

        // If we're using the fallback query, sort manually
        if (!sessionsQuery.toString().includes('orderBy')) {
          sessionData = sessionData.sort((a, b) => b.startTime.seconds - a.startTime.seconds);
        }

        setSessions(sessionData);

        // Group sessions by date
        const grouped = sessionData.reduce((acc: GroupedSessions, session) => {
          const date = new Date(session.startTime.seconds * 1000).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(session);
          return acc;
        }, {});

        setGroupedSessions(grouped);
      } catch (error: any) {
        console.error('Error fetching sessions:', error);
        if (error.code === 'failed-precondition') {
          setError('Database index required. Please check the instructions below to create the necessary index.');
        } else {
          setError('Error loading work sessions. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user, refreshTrigger]);

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
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const handleEditSubmit = async (data: any) => {
    try {
      if (!editingSession?.id) return;
      
      await updateDoc(doc(db, 'workSessions', editingSession.id), {
        ...data,
        updatedAt: new Date().getTime(),
      });

      // Update the session in the local state
      const updatedSessions = sessions.map(session => 
        session.id === editingSession.id 
          ? { ...session, ...data }
          : session
      );
      setSessions(updatedSessions);
      setEditingSession(null);
    } catch (error) {
      console.error('Error updating work session:', error);
      alert('Failed to update work session. Please try again.');
    }
  };

  const handleNewSubmit = async (data: any) => {
    try {
      const docRef = await addDoc(collection(db, 'workSessions'), {
        ...data,
        userId: user?.uid,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      });

      // Add the new session to the local state
      const newSession = {
        id: docRef.id,
        ...data,
        userId: user?.uid,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      };
      setSessions([...sessions, newSession]);
      setShowNewSessionForm(false);
    } catch (error) {
      console.error('Error creating work session:', error);
      alert('Failed to create work session. Please try again.');
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, 'workSessions', sessionId));
      setEditingSession(null);
      // Refresh the sessions list
      const updatedSessions = sessions.filter(session => session.id !== sessionId);
      setSessions(updatedSessions);

      // Update grouped sessions
      const updatedGrouped = { ...groupedSessions };
      Object.keys(updatedGrouped).forEach(date => {
        updatedGrouped[date] = updatedGrouped[date].filter(session => session.id !== sessionId);
        if (updatedGrouped[date].length === 0) {
          delete updatedGrouped[date];
        }
      });
      setGroupedSessions(updatedGrouped);
    } catch (error) {
      console.error('Error deleting work session:', error);
      alert('Failed to delete work session. Please try again.');
    }
  };

  // Add a handler for edit button clicks
  const handleEditClick = (session: WorkSession) => {
    setEditingSession(session);
  };

  const handleProjectClick = (projectId: string, projectName: string) => {
    setSelectedProjectForStats({ id: projectId, title: projectName });
    setShowStatsPanel(true);
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
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-2">Database index required</p>
              <p>Please create the following index in Firebase Console:</p>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Collection: workSessions</li>
                <li>Fields: 
                  <ul className="list-disc ml-4">
                    <li>userId (Ascending)</li>
                    <li>startTime (Descending)</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-2">
                <a 
                  href="https://console.firebase.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Open Firebase Console
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-semibold">Work Session History</h2>
          {Object.keys(groupedSessions).length === 0 ? (
            <p className="text-gray-600">No sessions recorded yet.</p>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedSessions).map(([date, dateSessions], index) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 sticky top-0 bg-gray-50 p-2 rounded z-10">
                    {date}
                  </h3>
                  <div className="space-y-4">
                    {dateSessions.map((session) => {
                      const IconComponent = session.projectIcon && (Icons as IconMap)[session.projectIcon] 
                        ? (Icons as IconMap)[session.projectIcon] 
                        : Icons.HiFolder;
                      return (
                        <div 
                          key={session.id} 
                          className="bg-white p-6 rounded-lg shadow relative hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">
                                  {calculateDuration(session.startTime, session.endTime)} work session
                                </h3>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                  Focus: {session.focusLevel}/10
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              </p>
                              {session.project && session.projectName && (
                                <button
                                  onClick={() => handleProjectClick(session.project, session.projectName)}
                                  className="inline-flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                  {session.projectIcon && (Icons as IconMap)[session.projectIcon] && (
                                    <IconComponent className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">{session.projectName}</span>
                                </button>
                              )}
                              <p className="text-gray-700 mt-2">{session.accomplishments}</p>
                              {session.comments && (
                                <p className="text-sm text-gray-600 italic">{session.comments}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleEditClick(session)}
                              className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-50"
                              title="Edit session"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-5 w-5" 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                              >
                                <path 
                                  d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Calendar sidebar */}
        <div className="sticky top-4 self-start">
          <DayCalendar 
            sessions={sessions.filter(session => {
              const sessionDate = new Date(session.startTime.seconds * 1000);
              return (
                sessionDate.getDate() === selectedDate.getDate() &&
                sessionDate.getMonth() === selectedDate.getMonth() &&
                sessionDate.getFullYear() === selectedDate.getFullYear()
              );
            })}
            date={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>
      </div>

      {editingSession && (
        <WorkSessionForm
          initialData={editingSession}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingSession(null)}
          onDelete={handleDelete}
        />
      )}

      {showNewSessionForm && (
        <WorkSessionForm
          onSubmit={handleNewSubmit}
          onCancel={() => setShowNewSessionForm(false)}
        />
      )}

      {showStatsPanel && selectedProjectForStats && user && (
        <ProjectStatsSlidePanel
          projectId={selectedProjectForStats.id}
          userId={user.uid}
          projectTitle={selectedProjectForStats.title}
          onClose={() => {
            setShowStatsPanel(false);
            setSelectedProjectForStats(null);
          }}
        />
      )}
    </div>
  );
} 