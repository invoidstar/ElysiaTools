import type {DeadlineEvent, DeadlineRow, SubmissionTrack} from '../types';
export function isSubmissionEvent(event:DeadlineEvent):boolean;
export function isPrimaryTrack(track:SubmissionTrack):boolean;
export function dateSortMillis(event:DeadlineEvent):number;
export function isFutureDeadline(event:DeadlineEvent,now?:number):boolean;
export function hasUpcomingDeadline(rows:DeadlineRow[],now?:number):boolean;
export function pickNextDeadline(rows:DeadlineRow[],now?:number):DeadlineRow|undefined;
export function upcomingMainDeadlines(rows:DeadlineRow[],now?:number,limit?:number):DeadlineRow[];
