import type { atoms as Es } from '../es/atoms';

/** English texts · zone «atoms». Must have exactly the same keys as ../es/atoms.ts. */
export const atoms: typeof Es = {
  searchInput: {
    placeholder: 'Search foods or ingredients…',
    accessibilityLabel: 'Search inventory',
    clearA11y: 'Clear search',
  },
  chip: {
    status: {
      fresh: 'Fresh',
      expiringSoon: 'Expiring soon',
      expired: 'Expired',
      unknown: 'No date',
    },
  },
  m3Dialog: { closeA11y: 'Close dialog' },
  actionSheet: { closeA11y: 'Close', confirm: 'Confirm', cancel: 'Cancel' },
  pagerDots: { stepA11y: 'Step {current} of {total}' },
};
