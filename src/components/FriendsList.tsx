import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types/User';
import { FriendProfile } from './FriendProfile';

export function FriendsList() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFriendsAndRequests = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch user's profile to get friend IDs and requests
        const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', user.uid)));
        const userData = userDoc.docs[0].data() as UserProfile;

        // Fetch friends' profiles
        const friendsQuery = query(
          collection(db, 'users'),
          where('id', 'in', userData.friends)
        );
        const friendsSnapshot = await getDocs(friendsQuery);
        const friendsData = friendsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as UserProfile));
        setFriends(friendsData);

        // Fetch incoming requests' profiles
        if (userData.friendRequests.incoming.length > 0) {
          const requestsQuery = query(
            collection(db, 'users'),
            where('id', 'in', userData.friendRequests.incoming)
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          const requestsData = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as UserProfile));
          setIncomingRequests(requestsData);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
        setError('Failed to load friends. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFriendsAndRequests();
  }, [user]);

  const acceptFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      // Add to current user's friends
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(friendId),
        'friendRequests.incoming': arrayRemove(friendId)
      });

      // Add current user to friend's friends list
      await updateDoc(doc(db, 'users', friendId), {
        friends: arrayUnion(user.uid),
        'friendRequests.outgoing': arrayRemove(user.uid)
      });

      // Update UI
      const acceptedFriend = incomingRequests.find(request => request.id === friendId);
      if (acceptedFriend) {
        setFriends(prev => [...prev, acceptedFriend]);
        setIncomingRequests(prev => prev.filter(request => request.id !== friendId));
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setError('Failed to accept friend request. Please try again.');
    }
  };

  const rejectFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      // Remove from current user's incoming requests
      await updateDoc(doc(db, 'users', user.uid), {
        'friendRequests.incoming': arrayRemove(friendId)
      });

      // Remove from sender's outgoing requests
      await updateDoc(doc(db, 'users', friendId), {
        'friendRequests.outgoing': arrayRemove(user.uid)
      });

      // Update UI
      setIncomingRequests(prev => prev.filter(request => request.id !== friendId));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      setError('Failed to reject friend request. Please try again.');
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
      {/* Friend Requests Section */}
      {incomingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
          <div className="space-y-4">
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div>
                  <p className="font-medium">{request.displayName || request.username}</p>
                  <p className="text-sm text-gray-600">@{request.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptFriendRequest(request.id)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(request.id)}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List Section */}
      <div>
        <h2 className="text-xl font-bold mb-4">Friends</h2>
        {friends.length === 0 ? (
          <p className="text-gray-600">No friends added yet.</p>
        ) : (
          <div className="space-y-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div>
                  <p className="font-medium">{friend.displayName || friend.username}</p>
                  <p className="text-sm text-gray-600">@{friend.username}</p>
                </div>
                <button
                  onClick={() => setSelectedFriend(friend.id)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-red-600">{error}</p>
      )}

      {selectedFriend && (
        <FriendProfile
          friendId={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  );
} 