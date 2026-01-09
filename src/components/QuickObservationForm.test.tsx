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
        isActive: true,
        createdAt: Date.now()
      },
      {
        id: 'hive2',
        name: 'Stade B',
        apiaryId: 'apiary1',
        queenYear: 2024,
        notes: '',
        isActive: true,
        createdAt: Date.now()
      },
      {
        id: 'hive3',
        name: 'Stade C',
        apiaryId: 'apiary2',
        queenYear: 2023,
        notes: '',
        isActive: true,
        createdAt: Date.now()
      }
    ]);
    
    vi.mocked(repository.getAllApiaries).mockResolvedValue([
      {
        id: 'apiary1',
        name: 'Bigård 1',
        location: 'Test Location',
        isActive: true,
        createdAt: Date.now()
      },
      {
        id: 'apiary2',
        name: 'Bigård 2',
        location: 'Test Location 2',
        isActive: true,
        createdAt: Date.now()
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
    
    // Wait for hives to load and be displayed with apiary prefix
    await waitFor(() => {
      expect(screen.getByText(/bigård 1 - stade a/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/bigård 1 - stade b/i)).toBeInTheDocument();
    expect(screen.getByText(/bigård 2 - stade c/i)).toBeInTheDocument();
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
    
    // Check that onSuccess callback was called (indicating successful submission)
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
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
    
    // Check that onSuccess callback was called (indicating successful treatment submission)
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
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
