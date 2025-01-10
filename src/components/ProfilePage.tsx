import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types/User';

export function ProfilePage() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUsername(userData.username || '');
          setCurrentUsername(userData.username || '');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile information.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to update your username.');
      return;
    }

    const newUsername = username.trim().toLowerCase();
    if (!newUsername) {
      setError('Username cannot be empty.');
      return;
    }

    if (newUsername === currentUsername) {
      setError('Please choose a different username.');
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Check if username is available
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', newUsername)
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setError('This username is already taken. Please choose another one.');
        setUpdating(false);
        return;
      }

      // Get current user document reference
      const userRef = doc(db, 'users', user.uid);
      
      // Update username
      await updateDoc(userRef, {
        username: newUsername
      });

      setCurrentUsername(newUsername);
      setSuccessMessage('Username updated successfully!');
    } catch (error) {
      console.error('Error updating username:', error);
      setError('Failed to update username. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {successMessage && (
            <div className="text-green-600 text-sm">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={updating || username.trim().toLowerCase() === currentUsername}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update Username'}
          </button>
        </form>
      </div>
    </div>
  );
} 