export type AppState = 'idle' | 'extracting' | 'ready' | 'listening';
export type FileType = 'pdf' | 'txt' | null;
export type ScrollMode = 'continuous' | 'page';

export interface ScriptLine {
  id: number;
  text: string;
}

export interface TrackerStatus {
  status: 'off' | 'listening' | 'matched';
  lastHeard: string;
}

/** A single PDF text item with its position and line mapping */
export interface TextItemData {
  str: string;
  transform: number[];  // PDF affine transform matrix [a, b, c, d, e, f]
  width: number;        // advance width in PDF user space
  lineIndex: number;    // index into lines[] (for fuzzy match cross-reference)
}

/** All text items for a single PDF page */
export interface PdfPageData {
  pageNum: number;      // 1-indexed
  textItems: TextItemData[];
}
