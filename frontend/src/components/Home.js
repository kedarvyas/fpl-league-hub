import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useMyEntry } from '../hooks/useMyEntry';

const actionClass = 'flex min-h-[44px] items-center justify-center bg-primary-chip px-4 text-center text-[9px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40';
const secondaryActionClass = 'flex min-h-[44px] items-center justify-center bg-panel px-4 text-center text-[9px] font-medium uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset';
const inputClass = 'min-h-[44px] min-w-0 flex-1 bg-background px-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary';

const SetupPanel = ({ eyebrow, title, savedId, editing, value, onChange, onSubmit, onEdit, onCancel, submitLabel, resumeLabel, help, inputId }) => (
  <section className="flex min-h-full flex-col bg-panel p-[14px] md:p-5">
    <p className="text-[8.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
    <h2 className="mt-2 text-[18px] font-bold uppercase leading-[1.1] tracking-[-0.03em] text-foreground md:text-[22px]">{title}</h2>
    {savedId && !editing ? (
      <div className="mt-auto pt-7">
        <p className="text-[8px] uppercase tracking-[0.13em] text-muted-foreground">Saved ID</p>
        <p className="mt-1.5 break-all text-[28px] font-bold leading-none tracking-[-0.04em] text-foreground md:text-[34px]">{savedId}</p>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-px bg-border">
          <button type="button" onClick={onSubmit} className={actionClass}>{resumeLabel}</button>
          <button type="button" onClick={onEdit} className={secondaryActionClass}>Change</button>
        </div>
      </div>
    ) : (
      <form onSubmit={onSubmit} className="mt-auto pt-7">
        <label htmlFor={inputId} className="mb-2 block text-[8px] font-medium uppercase tracking-[0.13em] text-muted-foreground">Numeric ID</label>
        <div className="flex gap-px bg-border">
          <input id={inputId} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))} placeholder="ENTER ID" className={inputClass} />
          <button type="submit" disabled={!value.trim()} className={`${actionClass} shrink-0`}>{submitLabel}</button>
        </div>
        <div className="mt-3 flex min-h-[44px] items-start justify-between gap-3">
          <p className="max-w-[34rem] text-[9px] leading-[1.55] text-muted-foreground">{help}</p>
          {savedId && <button type="button" onClick={onCancel} className="-mr-2 min-h-[44px] shrink-0 px-2 text-[8px] font-medium uppercase tracking-[0.13em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancel</button>}
        </div>
      </form>
    )}
  </section>
);

const RouteCell = ({ to, label, description }) => (
  <Link to={to} className="group flex min-h-[76px] items-center gap-4 bg-panel px-[14px] py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary md:px-5">
    <span className="min-w-0 flex-1">
      <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-foreground md:text-[12px]">{label}</span>
      <span className="mt-1.5 block text-[8.5px] leading-[1.45] text-muted-foreground md:text-[10px]">{description}</span>
    </span>
    <span aria-hidden="true" className="text-[14px] text-muted-foreground group-hover:text-foreground">→</span>
  </Link>
);

const Home = () => {
  const navigate = useNavigate();
  const [savedTeamId, setSavedTeamId] = useMyEntry();
  const [savedLeagueId, setSavedLeagueId] = useLocalStorage('fpl_league_id', '');
  const [teamId, setTeamId] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [editingTeam, setEditingTeam] = useState(false);
  const [editingLeague, setEditingLeague] = useState(false);

  const handleTeamSubmit = (event) => {
    event?.preventDefault?.();
    if (savedTeamId && !editingTeam) {
      navigate('/my-team', { state: { teamId: String(savedTeamId) } });
      return;
    }
    const nextId = teamId.trim();
    if (!nextId) return;
    setSavedTeamId(nextId);
    navigate('/my-team', { state: { teamId: nextId } });
  };

  const handleLeagueSubmit = (event) => {
    event?.preventDefault?.();
    if (savedLeagueId && !editingLeague) {
      navigate(`/weekly-matchups/${savedLeagueId}`);
      return;
    }
    const nextId = leagueId.trim();
    if (!nextId) return;
    setSavedLeagueId(nextId);
    navigate(`/weekly-matchups/${nextId}`);
  };

  const hasContext = Boolean(savedTeamId || savedLeagueId);

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="px-4 pb-7 pt-8 md:px-7 md:pb-10 md:pt-12">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">FPL League Hub · 2026/27</p>
        <h1 className="mt-3 max-w-[850px] text-[32px] font-bold uppercase leading-[0.94] tracking-[-0.045em] text-foreground sm:text-[40px] md:text-[52px]">{hasContext ? 'Pick up where you left off.' : 'Make FPL yours.'}</h1>
        <p className="mt-4 max-w-[620px] text-[10px] leading-[1.6] text-muted-foreground md:text-[12px]">{hasContext ? 'Your saved manager and league stay in this browser. Resume either view or change the context deliberately.' : 'Identify your manager and H2H league once, then use this page as the front door to your season.'}</p>
      </header>

      <div className="flex items-center gap-2 px-4 pb-2.5 md:px-7">
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{hasContext ? 'Resume' : 'Set up'}</span>
        <span className="h-px flex-1 bg-border" />
        <span className="text-[7.5px] uppercase tracking-[0.12em] text-muted-foreground">Stored locally</span>
      </div>

      <div className="mx-4 grid gap-px bg-border md:mx-7 md:grid-cols-2">
        <SetupPanel eyebrow="Identity" title="My Team" savedId={savedTeamId} editing={editingTeam} value={teamId} onChange={setTeamId} onSubmit={handleTeamSubmit} onEdit={() => { setTeamId(String(savedTeamId)); setEditingTeam(true); }} onCancel={() => setEditingTeam(false)} submitLabel="Save + View" resumeLabel="View My Team" inputId="home-team-id" help="Find it in the official FPL address: /entry/[YOUR ID]/event/…" />
        <SetupPanel eyebrow="League Context" title="My H2H League" savedId={savedLeagueId} editing={editingLeague} value={leagueId} onChange={setLeagueId} onSubmit={handleLeagueSubmit} onEdit={() => { setLeagueId(String(savedLeagueId)); setEditingLeague(true); }} onCancel={() => setEditingLeague(false)} submitLabel="Save + View" resumeLabel="View Matchups" inputId="home-league-id" help="Open your H2H league on the official FPL site; the league number appears in its address." />
      </div>

      <div className="flex items-center gap-2 px-4 pb-2.5 pt-[22px] md:px-7">
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Explore FPL</span>
        <span className="h-px flex-1 bg-border" />
        <span className="text-[7.5px] uppercase tracking-[0.12em] text-muted-foreground">No setup needed</span>
      </div>
      <nav aria-label="Explore FPL" className="mx-4 mb-10 grid gap-px bg-border md:mx-7 md:grid-cols-2">
        <RouteCell to="/dashboard" label="Gameweek Dashboard" description="The gameweek at large — fixtures, returns, transfers and chips across FPL." />
        <RouteCell to="/player-statistics" label="Player Hub" description="Search the player pool and compare form, output, ownership and fixtures." />
      </nav>
    </div>
  );
};

export default Home;
