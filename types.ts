
export interface UserProfile {
  name: string;
  role: string;
  preferences: string;
  avatar?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  dataSource?: string; // Tracks which file was used
  visualization?: VisualizationData;
}

export interface VisualizationData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: any[];
  xAxisKey: string;
  yAxisKey?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  uploadDate: Date;
  isIndexed: boolean;
}

export interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  type: 'automation' | 'reminder' | 'report';
  metadata?: any;
}

export interface AppState {
  profile: UserProfile;
  messages: Message[];
  files: UploadedFile[];
  tasks: ScheduledTask[];
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface AIResponse {
  text: string;
  detectedAction?: 'create_task' | 'generate_report' | 'update_profile' | 'query_knowledge';
  actionData?: any;
  sourceUsed?: string;
  visualization?: VisualizationData;
}
