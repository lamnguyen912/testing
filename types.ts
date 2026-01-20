
export interface Release {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Archived';
}

export interface MemberSummary {
  release: string;
  member: string;
  tickets: number;
  loeDays: number;
  loeDoneDays: number;
  loeRemainingDays: number;
  maxCapacity: number;
  timebox?: string;
}

export interface SubTask {
  id: string;
  name: string;
  status: 'Todo' | 'In Progress' | 'Done' | 'Backlog' | 'Blocked';
  loeHrs: number;
  actualHrs: number;
  startDate?: string;
  eta?: string;
  notes?: string;
  owner?: string;
}

export interface TaskItem {
  id: string;
  releaseId: string;
  type: 'FEA' | 'BUG' | 'ENH' | 'TEST';
  ticketNo: string;
  summary: string;
  status: 'Open' | 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Blocked';
  priority: 'High' | 'Medium' | 'Low';
  owner: string;
  loeHrs: number;
  actualHrs: number;
  startDate?: string;
  eta?: string;
  notes: string;
  subtasks?: SubTask[];
}

export interface DashboardStats {
  totalLOE: number;
  totalDone: number;
  totalRemaining: number;
  totalTickets: number;
  completionRate: number;
  spilloverCount: number;
  overloadCount: number;
}
