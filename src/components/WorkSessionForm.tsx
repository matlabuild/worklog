import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './Modal';

interface Project {
  id: string;
  title: string;
  description?: string;
  estimatedTime?: string;
  icon?: string;
  createdAt: number;
  needsUpdate?: boolean;
}

interface WorkSessionFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onDelete?: (sessionId: string) => void;
  initialData?: any;
}

export function WorkSessionForm({ onSubmit, onCancel, onDelete, initialData }: WorkSessionFormProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [focusLevel, setFocusLevel] = useState(5);
  const [accomplishments, setAccomplishments] = useState('');
  const [comments, setComments] = useState('');
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with current date/time or edited session data
  useEffect(() => {
    if (initialData) {
      // For editing existing session
      const start = new Date(initialData.startTime.seconds * 1000);
      const end = new Date(initialData.endTime.seconds * 1000);
      
      setStartTime(formatDateTimeForInput(start));
      setEndTime(formatDateTimeForInput(end));
      setSelectedProject(initialData.project || '');
      setFocusLevel(initialData.focusLevel || 5);
      setAccomplishments(initialData.accomplishments || '');
      setComments(initialData.comments || '');
    } else {
      // For new session, default to current time
      const now = new Date();
      setStartTime(formatDateTimeForInput(now));
      setEndTime(formatDateTimeForInput(now));
    }
  }, [initialData]);

  // Helper function to format date for datetime-local input
  const formatDateTimeForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to parse datetime-local input value to Date
  const parseInputToDate = (value: string) => {
    const date = new Date(value);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date;
  };

  useEffect(() => {
    async function fetchProjects() {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, 'projects'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const projectData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Project[];
        
        setProjects(projectData);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse the dates
      const parsedStartTime = parseInputToDate(startTime);
      const parsedEndTime = parseInputToDate(endTime);

      // Validate that end time is after start time
      if (parsedEndTime <= parsedStartTime) {
        alert('End time must be after start time');
        return;
      }

      let projectId = selectedProject;

      // If creating a new project
      if (showNewProjectInput && newProjectTitle.trim()) {
        try {
          const projectRef = await addDoc(collection(db, 'projects'), {
            title: newProjectTitle.trim(),
            userId: user?.uid,
            createdAt: Date.now(),
            needsUpdate: true // Flag for updating in the projects page
          });
          projectId = projectRef.id;
        } catch (error) {
          console.error('Error creating quick project:', error);
          return;
        }
      }

      onSubmit({
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        project: projectId,
        projectName: showNewProjectInput ? newProjectTitle : projects.find(p => p.id === selectedProject)?.title,
        focusLevel,
        accomplishments,
        comments
      });
    } catch (error) {
      alert('Please enter valid dates');
    }
  };

  const handleDelete = () => {
    if (initialData?.id && onDelete) {
      onDelete(initialData.id);
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
    <Modal isOpen={true} onClose={onCancel} title={initialData ? "Edit Work Session" : "Log Work Session"}>
      {showDeleteConfirm ? (
        <div className="p-6 space-y-4">
          <p className="text-gray-700">Are you sure you want to delete this work session? This action cannot be undone.</p>
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
              Delete Session
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            {!showNewProjectInput ? (
              <div className="flex gap-2">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!showNewProjectInput}
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewProjectInput(true)}
                  className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  New Project
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Enter project name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={showNewProjectInput}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjectInput(false);
                    setNewProjectTitle('');
                  }}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Focus Level (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={focusLevel}
              onChange={(e) => setFocusLevel(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What did you accomplish?
            </label>
            <textarea
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex justify-between">
            {initialData && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Delete Session
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {initialData ? 'Update Session' : 'Log Session'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
} 