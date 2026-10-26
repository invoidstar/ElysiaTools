/** Source-backed deadlines: distinguish main submissions from separate calls. */
const submissionKinds=new Set(['abstract','paper','commitment','supplement','revision']);
export const isSubmissionEvent=event=>submissionKinds.has(event.kind);
export const isPrimaryTrack=track=>{
  const id=String(track.id||'').toLowerCase();
  const name=String(track.name||'').toLowerCase();
  if(/workshop|tutorial|industry|applied|arts?|demo|competition|community/.test(id+' '+name))
    return false;
  if(/^(main|papers|technical|research(?:-|$)|cycle[-_]\d)/.test(id))
    return true;
  return /main conference|main technical|main track|technical papers|research track|full papers|contributed papers/.test(name);
};
export const dateSortMillis=event=>event.utc
  ? Date.parse(event.utc) : Date.parse(event.original+'T12:00:00Z');
/* A day-only announcement has no official hour or timezone. 23:59 UTC is
 * used solely as a conservative comparison bound, never shown as an event. */
export const isFutureDeadline=(event,now=Date.now())=> event.precision==='date'
  ? Date.parse(event.original+'T23:59:59Z')>=now
  : Number.isFinite(dateSortMillis(event))&&dateSortMillis(event)>=now;
export const hasUpcomingDeadline=(rows,now=Date.now())=>
  rows.some(row=>isSubmissionEvent(row.event)&&isFutureDeadline(row.event,now));
const byDate=(a,b)=>dateSortMillis(a.event)-dateSortMillis(b.event);
export function pickNextDeadline(rows,now=Date.now()){
  const eligible=rows.filter(row=>isSubmissionEvent(row.event));
  const future=eligible.filter(row=>isFutureDeadline(row.event,now));
  if(future.length){
    const main=future.filter(row=>isPrimaryTrack(row.track));
    return [...(main.length?main:future)].sort(byDate)[0];
  }
  const historicalMain=eligible.filter(row=>isPrimaryTrack(row.track));
  return [...(historicalMain.length?historicalMain:eligible)]
    .sort((a,b)=>dateSortMillis(b.event)-dateSortMillis(a.event))[0];
}
export function upcomingMainDeadlines(rows,now=Date.now(),limit=20){
  const filtered=rows.filter(row=>isSubmissionEvent(row.event)&&isFutureDeadline(row.event,now));
  const main=filtered.filter(row=>isPrimaryTrack(row.track));
  // Showcase focuses on main conference when available, never calls a workshop
  // an ordinary main-conference paper deadline.
  return [...(main.length?main:filtered)].sort(byDate).slice(0,limit);
}
