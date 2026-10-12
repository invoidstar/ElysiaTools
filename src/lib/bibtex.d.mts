export interface BibEntry {
  id:number; key:string; type:string;
  fields:Record<string,string>;fieldNames:string[];
}
export interface ParsedBibtex {entries:BibEntry[];directives:string[];warnings:string[]}
export interface BibDuplicateGroup {reason:string;identity:string;ids:number[];survivor:number}
export interface BibAnalysis {issues:string[];duplicateGroups:BibDuplicateGroup[];duplicateIds:number[];suspicious:string[]}
export const MAX_BIB_BYTES:number;
export const MAX_BIB_ENTRIES:number;
export function parseBibtex(input:string):ParsedBibtex;
export function plainBibValue(input:string):string;
export function canonicalDoi(input:string):string;
export function canonicalArxiv(entry:BibEntry):string;
export function bibYear(entry:BibEntry):number|null;
export function analyzeBibtex(parsed:ParsedBibtex):BibAnalysis;
export function formatBibtex(parsed:ParsedBibtex,options?:{sort?:string;excluded?:number[]}):string;
