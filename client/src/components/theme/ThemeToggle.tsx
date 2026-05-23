import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppTheme, type ThemePreference } from './theme-context';

const options: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'system',
    label: 'System',
    description: 'Match device preference',
    icon: Monitor,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Use the light interface',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use the dark interface',
    icon: Moon,
  },
];

export function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useAppTheme();
  const TriggerIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Theme: ${preference}`}
                />
              }
            />
          }
        >
          <TriggerIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Theme</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const Icon = option.icon;
          const selected = option.value === preference;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setPreference(option.value)}
              className="items-start gap-2"
            >
              <Icon className="mt-0.5 size-4" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
              {selected ? <Check className="mt-0.5 size-4" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
