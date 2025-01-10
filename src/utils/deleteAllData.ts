import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function deleteAllData(userId: string) {
  try {
    // Delete all projects
    const projectsQuery = query(
      collection(db, 'projects'),
      where('userId', '==', userId)
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    await Promise.all(
      projectsSnapshot.docs.map(doc => deleteDoc(doc.ref))
    );

    // Delete all work sessions
    const sessionsQuery = query(
      collection(db, 'workSessions'),
      where('userId', '==', userId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    await Promise.all(
      sessionsSnapshot.docs.map(doc => deleteDoc(doc.ref))
    );

    return {
      projectsDeleted: projectsSnapshot.size,
      sessionsDeleted: sessionsSnapshot.size
    };
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
} 