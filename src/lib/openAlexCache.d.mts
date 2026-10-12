export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
export interface CachedProfile {source:any;fetchedAt:number;stale:boolean}
export const OPENALEX_CACHE_KEY:string;
export const CACHE_MAX:number;
export const CACHE_TTL_MS:number;
export const STALE_TTL_MS:number;
export function getCachedSource(key:string,now?:number,storage?:StorageLike,includeStale?:boolean):CachedProfile|null;
export function putCachedSource(key:string,source:any,now?:number,storage?:StorageLike):void;
export function getMissingSource(key:string,now?:number,storage?:StorageLike):boolean;
export function putMissingSource(key:string,now?:number,storage?:StorageLike):void;
export function getApiCooldown(now?:number,storage?:StorageLike):number;
export function setApiCooldown(until:number,now?:number,storage?:StorageLike):void;
export function retryAfterMs(value:string|null,now?:number):number;
export function utcResetMs(now?:number):number;
