import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App (walking skeleton)', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Music Recorder' })).toBeInTheDocument();
  });
});
