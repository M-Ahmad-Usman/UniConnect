import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataState, FormField, TableSurface } from '../AdminDataPrimitives';

describe('AdminDataPrimitives', () => {
  afterEach(cleanup);

  it('announces loading and error states', () => {
    const retry = vi.fn();
    const { rerender } = render(
      <DataState isLoading isError={false} empty={false} onRetry={retry}>
        Loaded
      </DataState>,
    );

    expect(screen.getByRole('status', { name: 'Loading data' })).toBeInTheDocument();

    rerender(
      <DataState isLoading={false} isError empty={false} onRetry={retry}>
        Loaded
      </DataState>,
    );

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('keeps form labels and validation messages accessible', () => {
    render(
      <FormField label="Department" error="Department is required">
        <select aria-invalid="true">
          <option>Choose department</option>
        </select>
      </FormField>,
    );

    expect(screen.getByLabelText('Department')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Department is required');
  });

  it('adds an accessible table caption', () => {
    render(
      <TableSurface title="Class students" description="Students assigned to this class.">
        <tbody>
          <tr>
            <td>Student</td>
          </tr>
        </tbody>
      </TableSurface>,
    );

    expect(screen.getByText('Class students. Students assigned to this class.')).toHaveClass(
      'sr-only',
    );
  });
});
