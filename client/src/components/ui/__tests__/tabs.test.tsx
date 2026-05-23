import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';

function TabsHarness() {
  const [value, setValue] = useState('overview');

  return (
    <Tabs value={value} onValueChange={(nextValue) => setValue(String(nextValue))}>
      <TabsList aria-label="Sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="members">Members panel</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  afterEach(cleanup);

  it('exposes semantic tab markup and selected state', async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);

    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toHaveTextContent(
      'Overview panel',
    );

    await user.click(screen.getByRole('tab', { name: 'Members' }));

    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Members' })).toHaveTextContent('Members panel');
  });
});
