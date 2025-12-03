// API returns UTC time like "2025-12-03 12:30:00" - convert to ISO format with Z
function parseUTCDate(dateStr: string): Date {
  const utcStr = dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr);
}

export function formatDateShort(dateStr: string): string {
  const date = parseUTCDate(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLong(dateStr: string): string {
  const date = parseUTCDate(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
