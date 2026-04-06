import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the appointment app login screen', () => {
  render(<App />);
  expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  expect(screen.getByText(/enter your details to get started with instant appointment bookings/i)).toBeInTheDocument();
});
