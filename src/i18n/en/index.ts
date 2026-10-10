import type { es } from '../es';
import { common } from './common';
import { settings } from './settings';
import { atoms } from './atoms';
import { molecules } from './molecules';
import { organisms } from './organisms';
import { sheets } from './sheets';
import { screensMain } from './screensMain';
import { screensFlow } from './screensFlow';
import { misc } from './misc';
import { data } from './data';

/** English dictionary: same shape as Spanish (TypeScript checks it). */
export const en: typeof es = { common, settings, atoms, molecules, organisms, sheets, screensMain, screensFlow, misc, data };
