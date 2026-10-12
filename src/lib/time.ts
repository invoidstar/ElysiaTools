import type { DeadlineEvent } from '../types';

export type ZoneChoice = 'local' | 'aoe' | 'utc' | 'Asia/Shanghai' | 'Asia/Singapore' | 'America/Los_Angeles' | 'Europe/London';

export function localZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}
export function zoneValue(zone: ZoneChoice): string {
  if (zone === 'aoe') return 'Etc/GMT+12';
  if (zone === 'utc') return 'UTC';
  if (zone === 'local') return localZone();
  return zone;
}
export function zoneName(zone: ZoneChoice): string {
  if (zone === 'aoe') return 'AoE · UTC−12';
  if (zone === 'utc') return 'UTC';
  if (zone === 'local') return '本地 · ' + localZone();
  return zone;
}
export function prettyDate(day: string): string {
  if (!day) return 'TBD';
  const [year, month, date] = day.slice(0, 10).split('-');
  return year + '.' + month + '.' + date;
}
export function displayEvent(event: DeadlineEvent, zone: ZoneChoice = 'local'): string {
  if (event.precision === 'date') return prettyDate(event.original) + ' · 仅公布日期';
  if (!event.utc) return 'TBD';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: zoneValue(zone), year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  return formatter.format(new Date(event.utc));
}
export function originalDate(event: DeadlineEvent): string {
  return event.original.replace('T', ' ') + (event.timezone === 'Etc/GMT+12' ? ' AoE (UTC−12)' : ' · ' + event.timezone);
}
export function countdown(event: DeadlineEvent, now = Date.now()): string {
  if (!event.utc) return '—';
  const diff = new Date(event.utc).getTime() - now;
  if (diff < 0) return '已截止';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days >= 100) return days + ' 天';
  if (days > 0) return days + ' 天 ' + hours + ' 小时';
  if (hours > 0) return hours + ' 小时';
  return Math.max(1, Math.ceil(diff / 60000)) + ' 分钟';
}
export function monthKey(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}
export const kindLabel: Record<string, string> = {
  abstract: '摘要 / 注册', paper: '论文投稿', supplement: '补充材料',
  rebuttal: '答辩 / Rebuttal', notification: '录用通知',
  'camera-ready': '终稿', review: '评审进展', revision: '修订提交'
};
