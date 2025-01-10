import { useState } from 'react';
import { UserSearch } from './UserSearch';
import { FriendsList } from './FriendsList';

export function SocialPage() {
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('friends')}
          className={`py-2 px-4 text-sm font-medium mr-4 border-b-2 ${
            activeTab === 'friends'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`py-2 px-4 text-sm font-medium border-b-2 ${
            activeTab === 'search'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Find Friends
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'friends' ? (
          <FriendsList />
        ) : (
          <UserSearch />
        )}
      </div>
    </div>
  );
} 