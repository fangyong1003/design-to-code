export type JobStatus =
  | 'queued'
  | 'parsing'
  | 'analyzing'
  | 'generating'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  id: string;
  projectId: string;
  status: JobStatus;
  sourceName: string;
  targetId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  jobId: string;
  kind:
    | 'source'
    | 'design-ir'
    | 'asset'
    | 'generated-code'
    | 'reference'
    | 'screenshot'
    | 'diff'
    | 'report';
  storageKey: string;
  mimeType?: string;
  sha256?: string;
  size?: number;
  createdAt: string;
}

export interface JobEventRecord {
  id: string;
  jobId: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface ProjectRepository {
  create(input: { id: string; name: string }): Promise<ProjectRecord>;
  findById(id: string): Promise<ProjectRecord | null>;
}

export interface JobRepository {
  create(input: Omit<JobRecord, 'createdAt' | 'updatedAt'>): Promise<JobRecord>;
  findById(id: string): Promise<JobRecord | null>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  appendEvent(event: Omit<JobEventRecord, 'createdAt'>): Promise<void>;
}

export interface ArtifactRepository {
  create(input: Omit<ArtifactRecord, 'createdAt'>): Promise<ArtifactRecord>;
  listByJob(jobId: string): Promise<ArtifactRecord[]>;
}
