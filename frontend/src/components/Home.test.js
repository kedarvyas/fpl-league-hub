import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from './Home';

const renderHome = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/my-team" element={<p>MY TEAM DESTINATION</p>} />
      <Route path="/weekly-matchups/:leagueId" element={<p>H2H DESTINATION</p>} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => window.localStorage.clear());

test('starts without implying a manager or league and saves explicit setup', () => {
  renderHome();
  expect(screen.getByRole('heading', { name: 'Make FPL yours.' })).toBeInTheDocument();
  expect(screen.queryByText('Saved ID')).not.toBeInTheDocument();

  const teamInput = screen.getByLabelText('Numeric ID', { selector: '#home-team-id' });
  fireEvent.change(teamInput, { target: { value: '12345' } });
  fireEvent.submit(teamInput.closest('form'));

  expect(JSON.parse(window.localStorage.getItem('fpl_my_entry'))).toBe('12345');
  expect(screen.getByText('MY TEAM DESTINATION')).toBeInTheDocument();
});

test('resumes saved context and persists a deliberately changed league', () => {
  window.localStorage.setItem('fpl_my_entry', JSON.stringify('12345'));
  window.localStorage.setItem('fpl_league_id', JSON.stringify('777'));
  renderHome();

  expect(screen.getByRole('heading', { name: 'Pick up where you left off.' })).toBeInTheDocument();
  expect(screen.getByText('12345')).toBeInTheDocument();
  expect(screen.getByText('777')).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: 'Change' })[1]);
  const leagueInput = screen.getByLabelText('Numeric ID', { selector: '#home-league-id' });
  fireEvent.change(leagueInput, { target: { value: '888' } });
  fireEvent.submit(leagueInput.closest('form'));

  expect(JSON.parse(window.localStorage.getItem('fpl_league_id'))).toBe('888');
  expect(screen.getByText('H2H DESTINATION')).toBeInTheDocument();
});
