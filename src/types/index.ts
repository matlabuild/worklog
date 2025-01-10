export interface WorkSession {
  id: string;
  startTime: Date;
  endTime: Date;
  project: string;
  focusLevel: number;
  description: string;
}

export type Project = {
  id: string;
  name: string;
}; 