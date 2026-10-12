export interface JournalTierOption {value:string;label:string;group:string}
export interface JournalFilterable {
  indicators:Array<{system:string;value:string;category?:string}>;
  diagnostic?:{status?:Record<string,string>;issues?:string[]};
}
export const RATING_SYSTEMS:string[];
export function journalTierOptions(system?:string):JournalTierOption[];
export function matchesJournalRankFilters(journal:JournalFilterable,system?:string,status?:string,tier?:string):boolean;
