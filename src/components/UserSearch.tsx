import { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types/User';

export function UserSearch() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchQuery.toLowerCase()),
        where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
      );

      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
        .filter(profile => profile.id !== user.uid); // Exclude current user

      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      // Add to current user's outgoing requests
      await updateDoc(doc(db, 'users', user.uid), {
        'friendRequests.outgoing': arrayUnion(targetUserId)
      });

      // Add to target user's incoming requests
      await updateDoc(doc(db, 'users', targetUserId), {
        'friendRequests.incoming': arrayUnion(user.uid)
      });

      // Update UI to show request sent
      setSearchResults(results =>
        results.map(result =>
          result.id === targetUserId
            ? { ...result, requestSent: true }
            : result
        )
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('Failed to send friend request. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Find Friends</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-red-600">{error}</p>
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results</h3>
          {searchResults.map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div>
                <p className="font-medium">{result.displayName || result.username}</p>
                <p className="text-sm text-gray-600">@{result.username}</p>
              </div>
              <button
                onClick={() => sendFriendRequest(result.id)}
                disabled={result.requestSent}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {result.requestSent ? 'Request Sent' : 'Add Friend'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 