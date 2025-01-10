import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    setError(null);

    try {
      const q = query(
        collection(db, 'projects'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const projectData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Project[];

      setProjects(projectData);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      if (error.code === 'failed-precondition') {
        setError('Database indexes are being created. Please wait a few minutes and try again.');
      } else {
        setError('Error loading projects. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (name: string) => {
    if (!user) return null;
    setError(null);

    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: name.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      const newProject = {
        id: docRef.id,
        name: name.trim(),
        userId: user.uid,
        createdAt: new Date(),
      };

      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (error: any) {
      console.error('Error adding project:', error);
      if (error.code === 'failed-precondition') {
        setError('Database indexes are being created. Please wait a few minutes and try again.');
      } else {
        setError('Error creating project. Please try again.');
      }
      return null;
    }
  };

  return {
    projects,
    loading,
    error,
    addProject,
    refreshProjects: fetchProjects,
  };
} 