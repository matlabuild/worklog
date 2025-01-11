import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TimeRange {
  startTime: Date | { seconds: number };
  endTime: Date | { seconds: number };
}

interface Session {
  id: string;
  startTime: { seconds: number };
  endTime: { seconds: number };
}

export function hasOverlap(sessions: Session[], newSession: TimeRange): boolean {
  return sessions.some(session => {
    const existingRange = {
      startTime: session.startTime,
      endTime: session.endTime
    };
    return (
      (newSession.startTime >= existingRange.startTime && newSession.startTime < existingRange.endTime) ||
      (newSession.endTime > existingRange.startTime && newSession.endTime <= existingRange.endTime) ||
      (newSession.startTime <= existingRange.startTime && newSession.endTime >= existingRange.endTime)
    );
  });
}

export function checkForOverlap(sessions: Session[], newSession: TimeRange): boolean {
  if (sessions.length === 0) return false;
  return hasOverlap(sessions, newSession);
}

export async function checkForSessionOverlap(userId: string, newSession: TimeRange): Promise<boolean> {
  const sessionsQuery = query(
    collection(db, 'workSessions'),
    where('userId', '==', userId)
  );

  const querySnapshot = await getDocs(sessionsQuery);
  const sessions = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Session[];

  return checkForOverlap(sessions, newSession);
} 