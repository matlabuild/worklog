import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TimeRange {
  startTime: Date | Timestamp;
  endTime: Date | Timestamp;
}

export function hasOverlap(range1: TimeRange, range2: TimeRange): boolean {
  const start1 = range1.startTime instanceof Date ? range1.startTime : new Date(range1.startTime.seconds * 1000);
  const end1 = range1.endTime instanceof Date ? range1.endTime : new Date(range1.endTime.seconds * 1000);
  const start2 = range2.startTime instanceof Date ? range2.startTime : new Date(range2.startTime.seconds * 1000);
  const end2 = range2.endTime instanceof Date ? range2.endTime : new Date(range2.endTime.seconds * 1000);

  return start1 < end2 && start2 < end1;
}

export async function checkForSessionOverlap(
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string
): Promise<boolean> {
  const sessionsQuery = query(
    collection(db, 'workSessions'),
    where('userId', '==', userId)
  );

  const querySnapshot = await getDocs(sessionsQuery);
  const sessions = querySnapshot.docs
    .filter(doc => excludeSessionId ? doc.id !== excludeSessionId : true)
    .map(doc => ({ 
      ...doc.data(),
      id: doc.id 
    }));

  const newSession = { startTime, endTime };
  
  return sessions.some(session => hasOverlap(
    newSession,
    { 
      startTime: session.startTime,
      endTime: session.endTime
    }
  ));
} 