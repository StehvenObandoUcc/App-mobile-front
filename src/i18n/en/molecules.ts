import type { molecules as Es } from '../es/molecules';

/** English texts · zone «molecules». Must have exactly the same keys as ../es/molecules.ts. */
export const molecules: typeof Es = {
  offlineBanner: {
    offlineTitle: 'Offline',
    offlineBody_one: '{count} change will sync when back online',
    offlineBody_other: '{count} changes will sync when back online',
    offlineSaved: 'What you saved is still available',
    authTitle: 'Your session expired',
    authBody_one: 'Sign in to sync {count} change',
    authBody_other: 'Sign in to sync {count} changes',
    attentionTitle: 'Review your changes',
    attentionBody_one: '{count} change could not be synced',
    attentionBody_other: '{count} changes could not be synced',
    syncedTitle: 'All synced',
    retryA11y: 'Retry sync',
    retry: 'Retry',
  },
  focusFolders: {
    groupA11y: 'Culinary focus',
    chosenA11y: '{title}, selected. {description}',
  },
  speedDialFab: {
    closeA11y: 'Close options',
  },
  iconTextField: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  quantityStepper: {
    valueA11y: 'Quantity {value}',
    empty: 'empty',
    decreaseA11y: 'Decrease quantity',
    inputA11y: 'Quantity',
    increaseA11y: 'Increase quantity',
  },
  categoryPicker: {
    groupA11y: 'Category',
    more: '{count} more',
    seeMoreA11y_one: 'Show {count} more category',
    seeMoreA11y_other: 'Show {count} more categories',
  },
  dateField: {
    hasDateA11y: 'Expiry date: {date}, {relative}. Change in the calendar',
    noDateA11y: 'No expiry date. Choose in the calendar',
    chooseInCalendar: 'Choose in the calendar',
    plus3d: '+3 days',
    plus1w: '+1 wk',
    plus1m: '+1 mo',
    noDate: 'No date',
  },
  calendarMonth: {
    prevMonthA11y: 'Previous month',
    nextMonthA11y: 'Next month',
    todayA11y: ', today',
  },
  pantryHealthCard: {
    title: 'Your pantry health',
    seeExpiring: 'See expiring',
    fresh: 'fresh',
    expiringSoon: 'expiring soon',
    expired_one: 'expired',
    expired_other: 'expired',
    unknown: 'no date',
    expiredA11y_one: '{count} expired',
    expiredA11y_other: '{count} expired',
    a11y: 'Pantry status: {fresh} fresh, {expiringSoon} expiring soon, {expiredText}, {unknown} no date. See expiring',
  },
  ingredientToggleChip: {
    expiredShort: 'exp.',
    todayShort: 'today',
    daysShort: '{count} d',
    expiredA11y: ', expired',
    dueTodayA11y: ', expires today',
    dueA11y: ', expires in {when}',
  },
  difficultyPicker: {
    groupA11y: 'Difficulty level',
    levelA11y: 'Difficulty {level}',
  },
  inlineErrorCard: {
    retry: 'Retry',
  },
  errorState: {
    defaultTitle: 'Something went',
    defaultEmphasis: 'wrong',
    retry: 'Retry',
  },
};
