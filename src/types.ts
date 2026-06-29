export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "Citizen" | "Volunteer" | "Admin";
  points: number;
  badges: string[];
  joinedAt: string;
}

export interface Complaint {
  id: string;
  reporterId: string;
  reporterName: string;
  title: string;
  description: string;
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  gpsLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  imageUrl: string;
  status: "Pending" | "Verified" | "In-Progress" | "Resolved" | "Rejected";
  upvotesCount: number;
  commentsCount: number;
  priorityScore: number;
  suggestedDepartment: string;
  aiReasoning: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedEvidenceUrl?: string;
  verifiedBy?: string[]; // volunteer ids
}

export interface Comment {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  evidenceUrl?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  text: string;
  type: "status" | "points" | "system" | "verify";
  isRead: boolean;
  createdAt: string;
}
