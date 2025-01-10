import { useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface UsernameSetupProps {
  onComplete: () => void;
}

export function UsernameSetup({ onComplete }: UsernameSetupProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Check if username is available
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', username.toLowerCase())
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setError('This username is already taken. Please choose another one.');
        return;
      }

      // Create user profile
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        username: username.toLowerCase(),
        displayName: user.displayName,
        createdAt: Date.now(),
        friends: [],
        friendRequests: {
          incoming: [],
          outgoing: []
        },
        privacySettings: {
          showWorkSessions: true,
          showFocusStats: true,
          showProjects: true
        }
      });

      onComplete();
    } catch (error) {
      console.error('Error setting up username:', error);
      setError('Failed to set up username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Work Log</h2>
          <p className="mt-2 text-gray-600">
            Choose a username to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="mt-1">
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your username"
                pattern="^[a-zA-Z0-9_]{3,20}$"
                title="Username must be between 3 and 20 characters and can only contain letters, numbers, and underscores"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Username must be between 3 and 20 characters and can only contain letters, numbers, and underscores.
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
} 