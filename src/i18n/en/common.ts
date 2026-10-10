import type { common as Es } from '../es/common';

export const common: typeof Es = {
  cancel: 'Cancel',
  accept: 'OK',
  save: 'Save',
  delete: 'Delete',
  back: 'Back',
  close: 'Close',
  retry: 'Try again',
  loading: 'Loading…',
  gotIt: 'Got it',
  syncing: 'Syncing…',
  diets: {
    any: 'Any',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    keto: 'Keto',
    gluten_free: 'Gluten-free',
    low_carb: 'Low carb',
  },
  days_one: '{count} day',
  days_other: '{count} days',
  daysBefore_one: '{count} day before',
  daysBefore_other: '{count} days before',
  servings_one: '{count} serving',
  servings_other: '{count} servings',
};
