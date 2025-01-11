import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const TOTAL_MOCK_DAYS = 30; // Number of days to generate mock data for

interface DummyProject {
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  icon: string;
  estimatedTime: string;
}

const dummyProjects: DummyProject[] = [
  {
    title: "Mobile App Development",
    description: "Building a cross-platform mobile app with React Native",
    status: "in_progress",
    icon: "HiDeviceMobile",
    estimatedTime: "3 months"
  },
  {
    title: "Website Redesign",
    description: "Modernizing the company website with new UI/UX",
    status: "completed",
    icon: "HiDesktopComputer",
    estimatedTime: "2 months"
  },
  {
    title: "API Integration",
    description: "Implementing third-party API integrations for payment processing",
    status: "not_started",
    icon: "HiCode",
    estimatedTime: "1 month"
  },
  {
    title: "Database Optimization",
    description: "Improving database performance and query optimization",
    status: "in_progress",
    icon: "HiDatabase",
    estimatedTime: "2 weeks"
  },
  {
    title: "User Authentication System",
    description: "Implementing secure user authentication and authorization",
    status: "completed",
    icon: "HiLockClosed",
    estimatedTime: "3 weeks"
  },
  {
    title: "Analytics Dashboard",
    description: "Creating a real-time analytics dashboard for business metrics",
    status: "not_started",
    icon: "HiChartBar",
    estimatedTime: "1 month"
  },
  {
    title: "Content Management System",
    description: "Building a custom CMS for content editors",
    status: "in_progress",
    icon: "HiDocument",
    estimatedTime: "6 weeks"
  }
];

const accomplishments = [
  "Implemented new features and fixed bugs",
  "Completed code review and made suggested changes",
  "Wrote comprehensive documentation",
  "Optimized performance bottlenecks",
  "Added unit tests and integration tests",
  "Refactored legacy code",
  "Set up CI/CD pipeline",
  "Conducted team training session",
  "Debugged production issues",
  "Created technical specifications"
];

const comments = [
  "Great progress today!",
  "Need to follow up on some edge cases",
  "Collaboration with the team was productive",
  "Found some interesting challenges to solve",
  "Making steady progress",
  "Had some technical difficulties but resolved them",
  "Productive session overall",
  "Need to discuss some architectural decisions",
  "Good momentum on the project",
  ""
];

// Helper function to get random item from array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export async function createDummyData(userId: string) {
  try {
    // First, create projects
    const projectRefs = await Promise.all(
      dummyProjects.map(async (project) => {
        const docRef = await addDoc(collection(db, 'projects'), {
          ...project,
          userId,
          createdAt: Timestamp.now()
        });
        return { id: docRef.id, ...project };
      })
    );

    // Create mock sessions for the past 30 days
    const mockSessions = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    for (let i = 0; i < TOTAL_MOCK_DAYS; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Skip if the date is in the future
      if (date > today) {
        continue;
      }
      
      // Generate 2-5 sessions per day
      const sessionsCount = Math.floor(Math.random() * 4) + 2;
      
      for (let j = 0; j < sessionsCount; j++) {
        const randomProject = getRandomItem(projectRefs);
        const startHour = 8 + Math.floor(Math.random() * 10); // Between 8 AM and 6 PM
        const duration = Math.floor(Math.random() * 4) + 1; // 1-4 hours
        
        const startTime = new Date(date);
        startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + duration);

        // Create the session document
        await addDoc(collection(db, 'workSessions'), {
          userId,
          startTime: Timestamp.fromDate(startTime),
          endTime: Timestamp.fromDate(endTime),
          project: randomProject.id,
          projectName: randomProject.title,
          projectIcon: randomProject.icon,
          focusLevel: Math.floor(Math.random() * 5) + 6, // 6-10
          accomplishments: getRandomItem(accomplishments),
          comments: Math.random() > 0.5 ? getRandomItem(comments) : '',
          createdAt: Timestamp.now()
        });

        mockSessions.push({
          startTime,
          endTime
        });
      }
    }

    return {
      projectsCreated: projectRefs.length,
      sessionsCreated: mockSessions.length
    };
  } catch (error) {
    console.error('Error creating dummy data:', error);
    throw error;
  }
} 