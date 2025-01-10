import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { WorkSessionLog } from './components/WorkSessionLog';
import { WorkSessionForm } from './components/WorkSessionForm';
import { ProjectsPage } from './components/ProjectsPage';
import { collection, addDoc, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AnalyticsPage } from './components/AnalyticsPage';
import { SocialPage } from './components/SocialPage';
import { UsernameSetup } from './components/UsernameSetup';
import { ProfilePage } from './components/ProfilePage';
import { checkForSessionOverlap } from './utils/timeUtils';

function App() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState<'sessions' | 'projects' | 'analytics' | 'social' | 'profile'>('sessions');
  const [editingSession, setEditingSession] = useState<any>(null);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setNeedsUsernameSetup(true);
        }
      } catch (error) {
        console.error('Error checking user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserProfile();
  }, [user]);

  const handleUsernameSetupComplete = () => {
    setNeedsUsernameSetup(false);
  };

  const handleStartSession = async (data: any) => {
    if (!user) return;

    try {
      // Check for overlapping sessions
      const hasOverlap = await checkForSessionOverlap(
        user.uid,
        data.startTime,
        data.endTime,
        editingSession?.id
      );

      if (hasOverlap) {
        alert('This time slot overlaps with an existing work session. Please choose a different time.');
        return;
      }

      if (editingSession) {
        // Update existing session
        await updateDoc(doc(db, 'workSessions', editingSession.id), {
          project: data.project,
          projectName: data.projectName,
          focusLevel: data.focusLevel,
          accomplishments: data.accomplishments,
          comments: data.comments,
          startTime: Timestamp.fromDate(data.startTime),
          endTime: Timestamp.fromDate(data.endTime),
          updatedAt: Timestamp.now()
        });
      } else {
        // Create new session
        await addDoc(collection(db, 'workSessions'), {
          userId: user.uid,
          startTime: Timestamp.fromDate(data.startTime),
          endTime: Timestamp.fromDate(data.endTime),
          project: data.project,
          projectName: data.projectName,
          focusLevel: data.focusLevel,
          accomplishments: data.accomplishments,
          comments: data.comments,
          createdAt: Timestamp.now()
        });
      }

      setShowForm(false);
      setEditingSession(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error with session:', error);
      alert('Error saving work session. Please try again.');
    }
  };

  const handleEditSession = (session: any) => {
    setEditingSession(session);
    setShowForm(true);
  };

  if (!user) {
    return <Login />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (needsUsernameSetup) {
    return <UsernameSetup onComplete={handleUsernameSetupComplete} />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="space-x-4">
            <button
              onClick={() => setCurrentPage('sessions')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'sessions'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Work Sessions
            </button>
            <button
              onClick={() => setCurrentPage('projects')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'projects'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setCurrentPage('analytics')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setCurrentPage('social')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'social'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Social
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Profile
            </button>
          </div>
          {currentPage === 'sessions' && (
            <button
              onClick={() => {
                setEditingSession(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Work Session
            </button>
          )}
        </div>

        {currentPage === 'sessions' ? (
          <>
            <WorkSessionLog
              refreshTrigger={refreshTrigger}
              onEditSession={handleEditSession}
            />
            {showForm && (
              <WorkSessionForm
                onSubmit={handleStartSession}
                onCancel={() => {
                  setShowForm(false);
                  setEditingSession(null);
                }}
                initialData={editingSession}
              />
            )}
          </>
        ) : currentPage === 'projects' ? (
          <ProjectsPage />
        ) : currentPage === 'analytics' ? (
          <AnalyticsPage />
        ) : currentPage === 'social' ? (
          <SocialPage />
        ) : (
          <ProfilePage />
        )}
      </div>
    </Layout>
  );
}

export default App;
