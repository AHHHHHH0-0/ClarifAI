export interface User {
  id: string;
  email: string;
  name: string;
  progress: UserProgress;
}

export interface UserProgress {
  conceptsLearned: string[];
  lecturesAttended: number;
  teachModeScore: number;
}

export interface Concept {
  id: string;
  term: string;
  explanation: string;
  confidence: number;
  timestamp: string;
}

export interface AudioStreamState {
  isRecording: boolean;
  duration: number;
  error?: string;
}
