import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SlidePanel } from './SlidePanel';
import * as Icons from 'react-icons/hi';
import { HiClock } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';

type ProjectStatus = 'not_started' | 'in_progress' | 'completed';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed'
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800'
};

// List of icons from react-icons/hi that we want to show
const iconList = [
  'HiFolder',
  'HiCode',
  'HiDocument',
  'HiPencil',
  'HiBookOpen',
  'HiLightBulb',
  'HiClock',
  'HiCalendar',
  'HiChartBar',
  'HiCube',
  'HiDatabase',
  'HiDesktopComputer',
  'HiGlobe',
  'HiPuzzle',
  'HiSparkles',
  'HiStar'
] as const;

interface Project {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  icon: string;
  createdAt: number;
  needsUpdate?: boolean;
  status: ProjectStatus;
}

interface WorkSession {
  id: string;
  startTime: { seconds: number };
  endTime: { seconds: number };
  focusLevel: number;
  accomplishments: string;
  comments?: string;
}

interface ProjectPanelProps {
  project: Project | null;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'>) => void;
  onDelete?: (project: Project) => void;
}

type TabType = 'edit' | 'stats';

export function ProjectPanel({ project, onClose, onSave, onDelete }: ProjectPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('edit');
  const [title, setTitle] = useState(project?.title || '');
  const [description, setDescription] = useState(project?.description || '');
  const [estimatedTime, setEstimatedTime] = useState(project?.estimatedTime || '');
  const [selectedIcon, setSelectedIcon] = useState(project?.icon || 'HiFolder');
  const [status, setStatus] = useState<ProjectStatus>(project?.status || 'not_started');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projectStats, setProjectStats] = useState({
    totalHours: 0,
    sessionCount: 0,
    averageFocus: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description);
      setEstimatedTime(project.estimatedTime);
      setSelectedIcon(project.icon);
      setStatus(project.status);
    } else {
      // Reset form for new project
      setTitle('');
      setDescription('');
      setEstimatedTime('');
      setSelectedIcon('HiFolder');
      setStatus('not_started');
    }
  }, [project]);

  useEffect(() => {
    if (project && activeTab === 'stats') {
      fetchWorkSessions();
    }
  }, [project, activeTab]);

  useEffect(() => {
    async function fetchProjectStats() {
      if (!project?.id || !user) return;
      
      try {
        const q = query(
          collection(db, 'workSessions'),
          where('userId', '==', user.uid),
          where('project', '==', project.id)
        );
        
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => doc.data());
        
        const totalMinutes = sessions.reduce((acc, session) => {
          const start = new Date(session.startTime.seconds * 1000);
          const end = new Date(session.endTime.seconds * 1000);
          return acc + ((end.getTime() - start.getTime()) / (1000 * 60));
        }, 0);

        const totalFocus = sessions.reduce((acc, session) => acc + session.focusLevel, 0);
        
        setProjectStats({
          totalHours: Math.round(totalMinutes / 60 * 10) / 10,
          sessionCount: sessions.length,
          averageFocus: sessions.length ? Math.round(totalFocus / sessions.length * 10) / 10 : 0
        });
      } catch (error) {
        console.error('Error fetching project stats:', error);
      }
    }

    fetchProjectStats();
  }, [project?.id, user]);

  const fetchWorkSessions = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'workSessions'),
        where('project', '==', project.id)
      );
      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkSession[];

      // Sort sessions by date (most recent first)
      sessions.sort((a, b) => b.startTime.seconds - a.startTime.seconds);

      // Calculate total hours
      const total = sessions.reduce((acc, session) => {
        return acc + (session.endTime.seconds - session.startTime.seconds) / 3600;
      }, 0);

      setWorkSessions(sessions);
      setTotalHours(Math.round(total * 10) / 10); // Round to 1 decimal place
    } catch (error) {
      console.error('Error fetching work sessions:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const hours = Math.floor((end.seconds - start.seconds) / 3600);
    const minutes = Math.floor(((end.seconds - start.seconds) % 3600) / 60);
    if (hours === 0) {
      return `${minutes}m`;
    }
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  };

  const renderTabs = () => (
    <div className="flex border-b">
      <button
        onClick={() => setActiveTab('edit')}
        className={`px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'edit'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Edit
      </button>
      <button
        onClick={() => setActiveTab('stats')}
        className={`px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'stats'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Stats
      </button>
    </div>
  );

  const renderStats = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-blue-900">Total Time Spent</h4>
          <div className="flex items-center text-blue-900">
            <HiClock className="w-5 h-5 mr-1" />
            <span className="text-lg font-semibold">{totalHours} hours</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">Work Sessions</h4>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : workSessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No work sessions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {workSessions.map(session => (
              <div
                key={session.id}
                className="bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors cursor-pointer"
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
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {session.accomplishments}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData = {
      title,
      description,
      estimatedTime,
      icon: selectedIcon,
      status,
      createdAt: project?.createdAt || Date.now()
    };

    onSave(projectData);
    onClose();
  };

  const handleDelete = () => {
    if (project && onDelete) {
      onDelete(project);
      onClose();
    }
  };

  return (
    <SlidePanel
      isOpen={true}
      onClose={onClose}
      panelTitle={project ? `Edit ${project.title}` : 'New Project'}
    >
      {renderTabs()}
      <div className="p-6">
        {activeTab === 'edit' ? (
          showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-gray-700">Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete Project
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex space-x-2">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value as ProjectStatus)}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        status === value
                          ? STATUS_COLORS[value as ProjectStatus]
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What is this project about?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Time to Complete
                </label>
                <input
                  type="text"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="e.g. 2 weeks, 3 months"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select an Icon
                </label>
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-300 rounded-md">
                  {iconList.map((iconName) => {
                    const IconComponent = (Icons as any)[iconName];
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setSelectedIcon(iconName)}
                        className={`p-2 rounded-md hover:bg-gray-100 ${
                          selectedIcon === iconName ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Project Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <div className="text-sm text-gray-500">Total Hours</div>
                    <div className="text-lg font-semibold text-gray-900">{projectStats.totalHours}</div>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <div className="text-sm text-gray-500">Work Sessions</div>
                    <div className="text-lg font-semibold text-gray-900">{projectStats.sessionCount}</div>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <div className="text-sm text-gray-500">Avg. Focus</div>
                    <div className="text-lg font-semibold text-gray-900">{projectStats.averageFocus}/10</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                {project && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Delete Project
                  </button>
                )}
                <div className="flex space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {project ? 'Update Project' : 'Create Project'}
                  </button>
                </div>
              </div>
            </form>
          )
        ) : (
          renderStats()
        )}
      </div>
    </SlidePanel>
  );
} 