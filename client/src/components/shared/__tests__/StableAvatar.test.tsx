import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StableAvatar } from '../StableAvatar';

type ImageHandler = ((event: Event) => void) | null;

interface MockPreloadImage {
  decoding: string;
  onload: ImageHandler;
  onerror: ImageHandler;
  src: string;
}

describe('StableAvatar', () => {
  const createdImages: MockPreloadImage[] = [];

  beforeEach(() => {
    createdImages.length = 0;
    vi.stubGlobal(
      'Image',
      vi.fn(function MockImage() {
        const image: MockPreloadImage = {
          decoding: 'auto',
          onload: null,
          onerror: null,
          src: '',
        };
        createdImages.push(image);
        return image as unknown as HTMLImageElement;
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the fallback until the image preload completes', () => {
    render(<StableAvatar src="https://cdn.example.test/server.png" alt="Server" fallback="S" />);

    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.queryByAltText('Server')).not.toBeInTheDocument();

    act(() => {
      createdImages[0]?.onload?.(new Event('load'));
    });

    expect(screen.getByAltText('Server')).toHaveAttribute(
      'src',
      'https://cdn.example.test/server.png',
    );
  });

  it('keeps the fallback when the image preload fails', () => {
    render(<StableAvatar src="https://cdn.example.test/missing.png" alt="Server" fallback="S" />);

    act(() => {
      createdImages[0]?.onerror?.(new Event('error'));
    });

    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.queryByAltText('Server')).not.toBeInTheDocument();
  });
});
