import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickObservationForm from './QuickObservationForm';
import * as repository from '../db/repository';

// Mock the repository module
vi.mock('../db/repository', () => ({
  getAllHives: vi.fn(),
  getAllApiaries: vi.fn(),
  createObservation: vi.fn(),
  createTreatment: vi.fn(),
}));

describe('QuickObservationForm Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(repository.getAllHives).mockResolvedValue([
      {
        id: 'hive1',
        name: 'Stade A',
        apiaryId: 'apiary1',
        queenYear: 2025,
        notes: '',
        isActive: true
      },
      {
        id: 'hive2',
        name: 'Stade B',
        apiaryId: 'apiary1',
        queenYear: 2024,
        notes: '',
        isActive: true
      }
    ]);
    
    vi.mocked(repository.getAllApiaries).mockResolvedValue([
      {
        id: 'apiary1',
        name: 'Bigård 1',
        location: 'Test Location',
        isActive: true
      }
    ]);
  });

  it('should render the form with default state', async () => {
    render(<QuickObservationForm />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    });
    
    // Check that form elements are present
    expect(screen.getByLabelText('quickObservation.dateLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quickObservation.submitButton/i })).toBeInTheDocument();
  });

  it('should load and display hives grouped by apiary', async () => {
    render(<QuickObservationForm />);
    
    await waitFor(() => {
      expect(repository.getAllHives).toHaveBeenCalledWith(true);
      expect(repository.getAllApiaries).toHaveBeenCalledWith(true);
    });
    
    // Check that hives are displayed with apiary prefix
    expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    expect(screen.getByText(/bigård 1 - stade b/i)).toBeInTheDocument();
  });

  it('should submit an observation with valid data', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    
    vi.mocked(repository.createObservation).mockResolvedValue('obs-id');
    
    render(<QuickObservationForm onSuccess={mockOnSuccess} />);
    
    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    });
    
    // Fill in the form for observation
    const miteCountInput = screen.getByLabelText('quickObservation.miteCountLabel');
    const trayDaysInput = screen.getByLabelText('quickObservation.trayDaysLabel');
    
    await user.clear(miteCountInput);
    await user.type(miteCountInput, '15');
    
    await user.clear(trayDaysInput);
    await user.type(trayDaysInput, '3');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /quickObservation.submitButton/i });
    await user.click(submitButton);
    
    // Check that createObservation was called
    await waitFor(() => {
      expect(repository.createObservation).toHaveBeenCalledWith(
        'hive1',
        expect.any(String), // date
        15,
        3,
        undefined
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should validate mite count is a positive number', async () => {
    const user = userEvent.setup();
    
    render(<QuickObservationForm />);
    
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    });
    
    // Try to submit with invalid (empty) mite count
    const miteCountInput = screen.getByLabelText('quickObservation.miteCountLabel');
    await user.clear(miteCountInput);
    
    const submitButton = screen.getByRole('button', { name: /quickObservation.submitButton/i });
    await user.click(submitButton);
    
    // The HTML5 validation should prevent submission
    // Verify that createObservation was not called
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(repository.createObservation).not.toHaveBeenCalled();
  });

  it('should validate tray days is at least 1', async () => {
    const user = userEvent.setup();
    
    render(<QuickObservationForm />);
    
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    });
    
    // Fill in mite count
    const miteCountInput = screen.getByLabelText('quickObservation.miteCountLabel');
    await user.clear(miteCountInput);
    await user.type(miteCountInput, '10');
    
    // Clear tray days (leaving it empty should trigger validation)
    const trayDaysInput = screen.getByLabelText('quickObservation.trayDaysLabel');
    await user.clear(trayDaysInput);
    
    const submitButton = screen.getByRole('button', { name: /quickObservation.submitButton/i });
    await user.click(submitButton);
    
    // HTML5 validation should prevent submission
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(repository.createObservation).not.toHaveBeenCalled();
  });

  it('should switch to treatment mode and submit treatment', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    
    vi.mocked(repository.createTreatment).mockResolvedValue('treatment-id');
    
    render(<QuickObservationForm onSuccess={mockOnSuccess} />);
    
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    });
    
    // Switch to treatment mode
    const treatmentRadio = screen.getByLabelText('quickObservation.treatment');
    await user.click(treatmentRadio);
    
    // Verify treatment-specific fields appear
    expect(screen.getByLabelText('quickObservation.productLabel')).toBeInTheDocument();
    
    // Submit treatment
    const submitButton = screen.getByRole('button', { name: /quickObservation.submitButton/i });
    await user.click(submitButton);
    
    // Check that createTreatment was called
    await waitFor(() => {
      expect(repository.createTreatment).toHaveBeenCalledWith(
        'hive1',
        expect.any(String), // date
        'Oxalsyre',
        undefined
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();
    
    render(<QuickObservationForm onCancel={mockOnCancel} />);
    
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    });
    
    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: 'quickObservation.cancelButton' });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should use defaultHiveId when provided', async () => {
    render(<QuickObservationForm defaultHiveId="hive2" />);
    
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade b/i)).toBeInTheDocument();
    });
    
    // Verify hive2 is selected
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('hive2');
  });
});
