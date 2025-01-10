import { useState } from 'react';
import { Modal } from './Modal';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Icons from 'react-icons/hi';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'>) => void;
}

export function ProjectModal({ project, onClose, onSave }: ProjectModalProps) {
  const [title, setTitle] = useState(project?.title || '');
  const [description, setDescription] = useState(project?.description || '');
  const [estimatedTime, setEstimatedTime] = useState(project?.estimatedTime || '');
  const [selectedIcon, setSelectedIcon] = useState(project?.icon || 'HiFolder');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, description, estimatedTime, icon: selectedIcon });
  };

  const handleDelete = async () => {
    if (!project?.id) return;
    try {
      await deleteDoc(doc(db, 'projects', project.id));
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={project ? 'Edit Project' : 'Create New Project'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Estimated Time</label>
          <input
            type="text"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., 2 weeks"
          />
        </div>

        <div className="flex justify-end items-center space-x-4">
          {project && !showDeleteConfirm && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Delete
            </button>
          )}
          {showDeleteConfirm && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-red-600">Are you sure?</span>
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-600 hover:text-gray-700"
              >
                No, keep it
              </button>
            </div>
          )}
          <div className="flex space-x-3">
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
    </Modal>
  );
} 