export interface PiSessionEntry {
  id?: string;
  parentId?: string | null;
  type?: string;
  timestamp?: string | number;
  [key: string]: unknown;
}

export interface PiRuntimeEvent {
  type?: string;
  [key: string]: unknown;
}
