export type AppState = 'idle' | 'extracting' | 'ready' | 'listening';

export interface ScriptLine {
  id: number;
  text: string;
}

export interface TrackerStatus {
  status: 'off' | 'listening' | 'matched';
  lastHeard: string;
}
