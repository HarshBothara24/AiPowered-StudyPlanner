// Study Session type
interface StudySession {
    subject: string;
    topic: string;
    startTime: string;
    endTime: string;
    duration: number;
    notes?: string;
    completed?: boolean;
  }
  
  // Daily schedule type
  interface DailySchedule {
    date: string;
    sessions: StudySession[];
  }
  
  // Full schedule type
  interface Schedule {
    id: string;
    userId: string;
    schedule: DailySchedule[];
    [key: string]: any; // For any additional properties
  }
  
  // Study Group Meeting type
  interface Meeting {
    id: string;
    title: string;
    date: string;
    time: string;
    meetLink?: string;
    notes?: string;
    groupName?: string;
    isUpcoming?: boolean;
  }
  
  // Group Schedule Session type
  interface GroupScheduleSession {
    day: string;
    time: string;
    duration: number;
    subject: string;
    topic: string;
    groupName?: string;
  }
  
  // Study Group type
  interface StudyGroup {
    id: string;
    name: string;
    description?: string;
    subject?: string;
    members: string[];
    createdBy: string;
    createdAt: any; // Firestore Timestamp
    meetings?: Meeting[];
    schedule: GroupScheduleSession[];
    stats: {
      activeMembers: number;
      totalSessions?: number;
      completedSessions?: number;
      [key: string]: any;
    };
    [key: string]: any; // For any additional properties
  }
  
  export type {
    StudySession,
    DailySchedule,
    Schedule,
    Meeting,
    GroupScheduleSession,
    StudyGroup
  };