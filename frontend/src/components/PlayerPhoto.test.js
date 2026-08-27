import { fireEvent, render, screen } from '@testing-library/react';
import PlayerPhoto from './PlayerPhoto';

test('does not render fallback initials behind a player photo', () => {
  const { container } = render(<PlayerPhoto code={123} name="Example Player" />);

  expect(screen.queryByText('EP')).not.toBeInTheDocument();
  fireEvent.error(container.querySelector('img'));
  expect(screen.queryByText('EP')).not.toBeInTheDocument();
  fireEvent.error(container.querySelector('img'));
  expect(screen.getByText('EP')).toBeInTheDocument();
});
