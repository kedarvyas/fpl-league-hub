import { render, screen } from '@testing-library/react';
import App from './App';

// This is a routing smoke test, not a test of every page's data loader. Mocking
// the route elements keeps it deterministic and, importantly, catches broken
// imports and route declarations in App.js. The old test was CRA's untouched
// "learn react" placeholder and had never described this application.
jest.mock('./components/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
}));
jest.mock('./components/Home', () => () => <h1>Home route</h1>);
jest.mock('./components/Dashboard', () => () => <h1>Dashboard route</h1>);
jest.mock('./components/WeeklyMatchups', () => () => <h1>H2H route</h1>);
jest.mock('./components/PlayerStatisticsHub', () => () => <h1>Players route</h1>);
jest.mock('./components/PlayerStats', () => () => <h1>Player route</h1>);
jest.mock('./components/MyTeam', () => () => <h1>My Team route</h1>);

test('renders the home route', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Home route' })).toBeInTheDocument();
});
