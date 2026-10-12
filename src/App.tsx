import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Github, Globe2, LibraryBig, Menu, Moon, Search, Sparkles, Star, Sun, Wrench, X } from 'lucide-react';
import { HomePage } from './features/HomePage';
import { ConferencePage, emptyConferenceFilters, type ConferenceFilters } from './features/ConferencePage';
import { JournalPage } from './features/JournalPage';
import { AcademicPage } from './features/AcademicPage';
import { ToolsPage } from './features/ToolsPage';
import { DetailDrawer } from './components/DetailDrawer';
import { JournalCompare } from './components/JournalCompare';
import { calendarICS } from './lib/ics';
import { deadlineRows } from './lib/catalog';
import { downloadContent, exportAcademic, parseAcademic, readAcademic, writeAcademic } from './lib/storage';
import { localZone, type ZoneChoice } from './lib/time';
import type { AcademicState } from './types';

const menu = [
  { id: 'home', title: '首页', icon: Sparkles },
  { id: 'conference', title: '学术会议', icon: CalendarDays },
  { id: 'journal', title: '学术期刊', icon: LibraryBig },
  { id: 'academic', title: '我的科研', icon: Star },
  { id: 'tools', title: '科研工具', icon: Wrench }
];

function initialRoute(): string {
  return decodeURIComponent(window.location.hash.replace(/^#\/?/, '')) || 'home';
}
function initialTheme(): 'light' | 'dark' {
  try { return localStorage.getItem('elysiatools-theme') === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}
function initialZone(): ZoneChoice {
  try {
    const value = localStorage.getItem('elysiatools-zone');
    if (value && ['local', 'aoe', 'utc', 'Asia/Shanghai', 'Asia/Singapore', 'America/Los_Angeles', 'Europe/London'].includes(value)) return value as ZoneChoice;
  } catch { /* fall back to browser timezone */ }
  return 'local';
}

export default function App() {
  const [route, setRoute] = useState(initialRoute);
  const [academic, setAcademic] = useState<AcademicState>(readAcademic);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const [zone, setZone] = useState<ZoneChoice>(initialZone);
  const [now, setNow] = useState(Date.now);
  const [confFilters, setConfFilters] = useState<ConferenceFilters>(emptyConferenceFilters);
  const [journalKeyword, setJournalKeyword] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');

  const activePage = route.split('/')[0] || 'home';
  const detailId = route.split('/')[1];

  useEffect(() => {
    const listener = () => { setRoute(initialRoute()); setMobileMenu(false); };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { writeAcademic(academic); }, [academic]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('elysiatools-theme', theme); } catch { /* disabled storage */ }
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem('elysiatools-zone', zone); } catch { /* disabled storage */ }
  }, [zone]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (compareOpen) setCompareOpen(false);
      else if (detailId) navigate(activePage);
      else if (mobileMenu) setMobileMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function navigate(path: string) {
    window.location.hash = '#' + path;
    setRoute(path);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function toggleFavorite(kind: 'conference' | 'journal', id: string) {
    const key = kind === 'conference' ? 'conferences' : 'journals';
    setAcademic(prev => {
      const updated = prev[key].includes(id) ? prev[key].filter(x => x !== id) : [...prev[key], id];
      return { ...prev, [key]: updated };
    });
  }
  function toggleCompare(id: string) {
    setAcademic(prev => {
      if (prev.compare.includes(id)) return { ...prev, compare: prev.compare.filter(x => x !== id) };
      if (prev.compare.length >= 4) { setToast('最多同时对比 4 本期刊'); return prev; }
      return { ...prev, compare: [...prev.compare, id] };
    });
  }
  function saveFilter() {
    const f = confFilters;
    const label = [f.keyword || '会议', f.grade ? 'CCF ' + f.grade : '', f.field, f.status === 'upcoming' ? '待截稿' : ''].filter(Boolean).join(' · ').slice(0, 60);
    setAcademic(prev => ({ ...prev, savedFilters: [...prev.savedFilters.slice(-18), { id: String(Date.now()), label, keyword: f.keyword, grade: f.grade, field: f.field, status: f.status, from: f.from, to: f.to }] }));
    setToast('已保存当前会议筛选');
  }
  function restoreFilter(id: string) {
    const filter = academic.savedFilters.find(f => f.id === id);
    if (!filter) return;
    setConfFilters({ ...emptyConferenceFilters, keyword: filter.keyword, grade: filter.grade, field: filter.field, status: filter.status || '', from: filter.from || '', to: filter.to || '' });
    navigate('conference');
  }
  function exportCalendar() {
    const rows = deadlineRows.filter(r => academic.conferences.includes(r.conference.id));
    if (!rows.length) { setToast('关注的会议暂无可导出的时间节点'); return; }
    downloadContent('elysiatools-my-deadlines.ics', calendarICS(rows, true), 'text/calendar;charset=utf-8');
    setToast('已生成日历文件');
  }
  function importData(text: string) {
    try { setAcademic(parseAcademic(text)); setToast('备份已导入至当前浏览器'); }
    catch (error) { setToast(error instanceof Error ? error.message : '导入失败，请检查文件格式'); }
  }
  function conferenceSearch(value: string, field = '') {
    setConfFilters({ ...emptyConferenceFilters, keyword: value, field });
    navigate('conference');
  }
  function journalSearch(value: string) {
    setJournalKeyword(value);
    navigate('journal');
  }

  return <div className="site-shell">
    <header className="site-header"><div className="header-inner">
      <a href="#home" className="brand" onClick={e => { e.preventDefault(); navigate('home'); }} aria-label="ElysiaTools 首页">
        <span className="brand-mark"><span>E</span><i /></span><span className="brand-copy"><strong>Elysia<span>Tools</span></strong><small>ACADEMIC RESEARCH TOOLKIT</small></span>
      </a>
      <nav className={'desktop-nav ' + (mobileMenu ? 'show-mobile' : '')} aria-label="主导航">
        {menu.map(item => <button key={item.id} onClick={() => navigate(item.id)} className={activePage === item.id ? 'nav-active' : ''}><item.icon size={16}/>{item.title}</button>)}
      </nav>
      <div className="header-actions">
        <div className="zone-picker"><Globe2 size={15}/><select value={zone} onChange={e => setZone(e.target.value as ZoneChoice)} aria-label="显示时区">
          <option value="local">本地 · {localZone()}</option><option value="aoe">AoE · UTC−12</option><option value="utc">UTC</option><option value="Asia/Shanghai">北京 · UTC+8</option><option value="Asia/Singapore">新加坡 · UTC+8</option><option value="America/Los_Angeles">洛杉矶</option><option value="Europe/London">伦敦</option>
        </select></div>
        <button className="icon-button theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} title="切换主题">{theme === 'light' ? <Moon size={19}/> : <Sun size={19}/>}</button>
        <a className="header-github" href="https://github.com/invoidstar/ElysiaTools" target="_blank" rel="noopener noreferrer" title="GitHub repository" aria-label="GitHub"><Github size={20}/></a>
        <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(v => !v)} aria-label="打开导航">{mobileMenu ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>
    </div></header>
    <main className="main-container">
      {activePage === 'home' && <HomePage academic={academic} zone={zone} now={now} onNavigate={navigate} onConferenceSearch={conferenceSearch} onJournalSearch={journalSearch}/>}
      {activePage === 'conference' && <ConferencePage filters={confFilters} onFilters={setConfFilters} academic={academic} toggleFavorite={id=>toggleFavorite('conference',id)} openConference={id=>navigate('conference/'+id)} zone={zone} now={now} saveFilter={saveFilter}/>}
      {activePage === 'journal' && <JournalPage academic={academic} toggleFavorite={id=>toggleFavorite('journal',id)} toggleCompare={toggleCompare} openJournal={id=>navigate('journal/'+id)} openComparison={()=>setCompareOpen(true)} keyword={journalKeyword} setKeyword={setJournalKeyword}/>}
      {activePage === 'academic' && <AcademicPage academic={academic} zone={zone} now={now} toggleFavorite={toggleFavorite} openConference={id=>navigate('conference/'+id)} openJournal={id=>navigate('journal/'+id)} exportData={()=>{downloadContent('elysiatools-backup.json',exportAcademic(academic),'application/json');setToast('备份已导出');}} importData={importData} exportCalendar={exportCalendar} restoreFilter={restoreFilter} removeFilter={id=>setAcademic(prev=>({...prev,savedFilters:prev.savedFilters.filter(x=>x.id!==id)}))} openComparison={()=>setCompareOpen(true)}/>}
      {activePage === 'tools' && <ToolsPage/>}
      {!menu.some(item=>item.id===activePage) && <section className="unknown-route"><Search size={30}/><h2>暂未找到该页面</h2><button className="primary-button" onClick={()=>navigate('home')}>返回首页 <ArrowRight size={16}/></button></section>}
    </main>
    <footer className="site-footer"><div className="footer-inner"><div className="footer-identity"><span className="footer-mark">E.</span><div><strong>ElysiaTools</strong><small>Research, Made Easier.</small></div></div><div className="footer-links"><button onClick={()=>navigate('conference')}>Conferences</button><button onClick={()=>navigate('journal')}>Journals</button><button onClick={()=>navigate('academic')}>My Academic</button><a href="https://www.ccf.org.cn/Academic_Evaluation/By_category/" target="_blank" rel="noopener noreferrer">CCF Source</a><a href="https://github.com/invoidstar/ElysiaTools" target="_blank" rel="noopener noreferrer">GitHub</a></div><div className="footer-bottom"><span>© 2026 ElysiaTools · Open source, built for research.</span><span><Check size={14}/> GitHub Pages · Static &amp; Privacy-first</span></div></div></footer>
    {((activePage === 'conference' || activePage === 'journal') && detailId) && <DetailDrawer kind={activePage} id={detailId} onClose={()=>navigate(activePage)} academic={academic} toggleFavorite={toggleFavorite} toggleCompare={toggleCompare} zone={zone} now={now}/>}
    {compareOpen && <JournalCompare academic={academic} toggleCompare={toggleCompare} onClose={()=>setCompareOpen(false)}/>}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </div>;
}
