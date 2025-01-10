import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProjectPanel } from './ProjectPanel';
import { ProjectStatsSlidePanel } from './ProjectStatsSlidePanel';
import { HiPlus, HiViewGrid, HiViewList, HiPencil, HiChartBar } from 'react-icons/hi';
import * as Icons from 'react-icons/hi';

type ProjectStatus = 'not_started' | 'in_progress' | 'completed';
type ViewMode = 'grid' | 'list';

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-orange-100 text-orange-600',
  completed: 'bg-green-100 text-green-600'
};

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed'
};

interface Project {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  icon: string;
  createdAt: number;
  status: ProjectStatus;
  userId: string;
}

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Load projects
  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'projects'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const projectData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || doc.data().name || '', // Handle both title and name fields
        description: doc.data().description || '',
        estimatedTime: doc.data().estimatedTime || '',
        icon: doc.data().icon || 'HiFolder',
        createdAt: doc.data().createdAt || Date.now(),
        status: doc.data().status || 'not_started',
        userId: doc.data().userId
      })) as Project[];
      
      setProjects(projectData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredProjects = projects.filter(project => 
    statusFilter === 'all' ? true : project.status === statusFilter
  );

  const handleOpenStats = (project: Project) => {
    setSelectedProject(project);
    setIsStatsOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Projects</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <HiViewGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <HiViewList className="w-5 h-5" />
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedProject(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <HiPlus className="w-5 h-5 mr-2" />
          New Project
        </button>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            statusFilter === 'all'
              ? 'bg-gray-200 text-gray-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as ProjectStatus)}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === status
                ? 'bg-gray-200 text-gray-800'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => {
            const IconComponent = Icons[project.icon as keyof typeof Icons] || Icons.HiFolder;
            return (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{project.title}</h3>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${STATUS_COLORS[project.status]}`}>
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenStats(project)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="View Stats"
                    >
                      <HiChartBar className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Edit Project"
                    >
                      <HiPencil className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <HiPlus className="w-4 h-4 mr-1" />
                  <span>{project.estimatedTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map(project => {
            const IconComponent = Icons[project.icon as keyof typeof Icons] || Icons.HiFolder;
            return (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{project.title}</h3>
                      <p className="text-sm text-gray-600">{project.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                    <div className="flex items-center text-sm text-gray-500">
                      <HiPlus className="w-4 h-4 mr-1" />
                      <span>{project.estimatedTime}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenStats(project)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View Stats"
                      >
                        <HiChartBar className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit Project"
                      >
                        <HiPencil className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <ProjectPanel
          project={selectedProject}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProject(null);
          }}
          onSave={async (updatedProject) => {
            if (!user) return;

            try {
              if (selectedProject) {
                // Update existing project
                await updateDoc(doc(db, 'projects', selectedProject.id), {
                  ...updatedProject,
                  updatedAt: Date.now()
                });
              } else {
                // Create new project
                await addDoc(collection(db, 'projects'), {
                  ...updatedProject,
                  userId: user.uid,
                  createdAt: Date.now()
                });
              }

              fetchProjects();
              setIsModalOpen(false);
              setSelectedProject(null);
            } catch (error) {
              console.error('Error saving project:', error);
            }
          }}
          onDelete={async () => {
            if (!selectedProject || !user) return;

            try {
              await deleteDoc(doc(db, 'projects', selectedProject.id));
              fetchProjects();
              setIsModalOpen(false);
              setSelectedProject(null);
            } catch (error) {
              console.error('Error deleting project:', error);
            }
          }}
        />
      )}

      {isStatsOpen && selectedProject && user && (
        <ProjectStatsSlidePanel
          projectId={selectedProject.id}
          userId={user.uid}
          projectTitle={selectedProject.title}
          onClose={() => {
            setIsStatsOpen(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
} 