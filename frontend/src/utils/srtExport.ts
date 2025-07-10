import { TranscriptSegment } from '@/types';

/**
 * 將秒數轉換為 SRT 時間格式 (HH:MM:SS,mmm)
 */
export function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const milliseconds = Math.floor((secs - wholeSecs) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${wholeSecs.toString().padStart(2, '0')},${milliseconds
      .toString()
      .padStart(3, '0')}`;
}

/**
 * 生成 SRT 格式內容
 */
export function generateSrtContent(segments: TranscriptSegment[]): string {
  if (segments.length === 0) {
    return '';
  }

  return segments
    .map((segment, index) => {
      const sequenceNumber = index + 1;
      const startTime = formatSrtTime(segment.start_time);
      const endTime = formatSrtTime(segment.end_time);
      const speakerText = `${segment.speaker}: ${segment.text}`;

      return `${sequenceNumber}\n${startTime} --> ${endTime}\n${speakerText}\n`;
    })
    .join('\n');
}

/**
 * 觸發 SRT 檔案下載
 */
export function downloadSrtFile(segments: TranscriptSegment[], filename?: string): void {
  const srtContent = generateSrtContent(segments);
  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const defaultFilename = `transcript_${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.srt`;
  const finalFilename = filename || defaultFilename;

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 向後相容：從純文字生成 SRT（無時間戳）
 */
export function generateSrtFromPlainText(text: string): TranscriptSegment[] {
  if (!text.trim()) {
    return [];
  }

  // 將文字按句號分割成句子
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim());
  const avgDuration = 3; // 平均每句3秒

  return sentences.map((sentence, index) => ({
    text: sentence.trim(),
    speaker: 'Speaker A',
    start_time: index * avgDuration,
    end_time: (index + 1) * avgDuration,
    confidence: 0.8
  }));
}

/**
 * 向後相容：從純文字導出 SRT
 */
export function downloadSrtFromPlainText(text: string, filename?: string): void {
  const segments = generateSrtFromPlainText(text);
  downloadSrtFile(segments, filename);
} 