import { ExternalLink, Inbox, Star } from 'lucide-react';
import type { Grade } from '../types';

export function GradeTag({ grade, year = 2026 }: { grade: Grade; year?: number | null }) {
  return grade
    ? <span className={'grade-tag grade-' + grade.toLowerCase()} title={'CCF 推荐目录 ' + year}>CCF {grade}</span>
    : <span className="grade-tag grade-unset">CCF —</span>;
}

export function SourceAnchor({ href, children }: { href: string | null | undefined; children: React.ReactNode }) {
  return href
    ? <a className="source-link" href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={13} /></a>
    : <span className="muted">暂无可确认的官方链接</span>;
}

export function FavoriteButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" className={'icon-button star-button ' + (active ? 'is-active' : '')} onClick={onClick}
    title={active ? '取消收藏' : '加入收藏'} aria-label={(active ? '取消收藏 ' : '收藏 ') + label} aria-pressed={active}>
    <Star size={18} fill={active ? 'currentColor' : 'none'} />
  </button>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="empty-state"><div className="empty-icon"><Inbox size={24} /></div>
    <strong>{title}</strong>{description && <p>{description}</p>}</div>;
}
