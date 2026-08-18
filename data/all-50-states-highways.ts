/**
 * All 50 US States Highway Database
 * Comprehensive highway data for complete US coverage
 * 
 * Generated: 2025-10-30T18:26:00.389Z
 */

import { ALL_AK_HIGHWAYS } from './ak-highways';
import { ALL_AL_HIGHWAYS } from './al-highways';
import { ALL_AR_HIGHWAYS } from './ar-highways';
import { ALL_AZ_HIGHWAYS } from './az-highways';
import { ALL_CA_HIGHWAYS } from './ca-highways';
import { ALL_CO_HIGHWAYS } from './co-highways';
import { ALL_CT_HIGHWAYS } from './ct-highways';
import { ALL_DE_HIGHWAYS } from './de-highways';
import { ALL_FL_HIGHWAYS } from './fl-highways';
import { ALL_GA_HIGHWAYS } from './ga-highways';
import { ALL_HI_HIGHWAYS } from './hi-highways';
import { ALL_IA_HIGHWAYS } from './ia-highways';
import { ALL_ID_HIGHWAYS } from './id-highways';
import { ALL_IL_HIGHWAYS } from './il-highways';
import { ALL_IN_HIGHWAYS } from './in-highways';
import { ALL_KS_HIGHWAYS } from './ks-highways';
import { ALL_KY_HIGHWAYS } from './ky-highways';
import { ALL_LA_HIGHWAYS } from './la-highways';
import { ALL_MA_HIGHWAYS } from './ma-highways';
import { ALL_MD_HIGHWAYS } from './md-highways';
import { ALL_ME_HIGHWAYS } from './me-highways';
import { ALL_MI_HIGHWAYS } from './mi-highways';
import { ALL_MN_HIGHWAYS } from './mn-highways';
import { ALL_MO_HIGHWAYS } from './mo-highways';
import { ALL_MS_HIGHWAYS } from './ms-highways';
import { ALL_MT_HIGHWAYS } from './mt-highways';
import { ALL_NC_HIGHWAYS } from './nc-highways';
import { ALL_ND_HIGHWAYS } from './nd-highways';
import { ALL_NE_HIGHWAYS } from './ne-highways';
import { ALL_NH_HIGHWAYS } from './nh-highways';
import { ALL_NJ_HIGHWAYS } from './nj-highways';
import { ALL_NM_HIGHWAYS } from './nm-highways';
import { ALL_NV_HIGHWAYS } from './nv-highways';
import { ALL_NY_HIGHWAYS } from './ny-highways';
import { ALL_OH_HIGHWAYS } from './oh-highways';
import { ALL_OK_HIGHWAYS } from './ok-highways';
import { ALL_OR_HIGHWAYS } from './or-highways';
import { ALL_PA_HIGHWAYS } from './pa-highways';
import { ALL_RI_HIGHWAYS } from './ri-highways';
import { ALL_SC_HIGHWAYS } from './sc-highways';
import { ALL_SD_HIGHWAYS } from './sd-highways';
import { ALL_TEXAS_HIGHWAYS } from './texas-highways-complete';
import { ALL_TN_HIGHWAYS } from './tn-highways';
import { ALL_UT_HIGHWAYS } from './ut-highways';
import { ALL_VA_HIGHWAYS } from './va-highways';
import { ALL_VT_HIGHWAYS } from './vt-highways';
import { ALL_WA_HIGHWAYS } from './wa-highways';
import { ALL_WI_HIGHWAYS } from './wi-highways';
import { ALL_WV_HIGHWAYS } from './wv-highways';
import { ALL_WY_HIGHWAYS } from './wy-highways';


export const ALL_50_STATES_HIGHWAYS: any[] = [
  ...ALL_AK_HIGHWAYS,
  ...ALL_AL_HIGHWAYS,
  ...ALL_AR_HIGHWAYS,
  ...ALL_AZ_HIGHWAYS,
  ...ALL_CA_HIGHWAYS,
  ...ALL_CO_HIGHWAYS,
  ...ALL_CT_HIGHWAYS,
  ...ALL_DE_HIGHWAYS,
  ...ALL_FL_HIGHWAYS,
  ...ALL_GA_HIGHWAYS,
  ...ALL_HI_HIGHWAYS,
  ...ALL_IA_HIGHWAYS,
  ...ALL_ID_HIGHWAYS,
  ...ALL_IL_HIGHWAYS,
  ...ALL_IN_HIGHWAYS,
  ...ALL_KS_HIGHWAYS,
  ...ALL_KY_HIGHWAYS,
  ...ALL_LA_HIGHWAYS,
  ...ALL_MA_HIGHWAYS,
  ...ALL_MD_HIGHWAYS,
  ...ALL_ME_HIGHWAYS,
  ...ALL_MI_HIGHWAYS,
  ...ALL_MN_HIGHWAYS,
  ...ALL_MO_HIGHWAYS,
  ...ALL_MS_HIGHWAYS,
  ...ALL_MT_HIGHWAYS,
  ...ALL_NC_HIGHWAYS,
  ...ALL_ND_HIGHWAYS,
  ...ALL_NE_HIGHWAYS,
  ...ALL_NH_HIGHWAYS,
  ...ALL_NJ_HIGHWAYS,
  ...ALL_NM_HIGHWAYS,
  ...ALL_NV_HIGHWAYS,
  ...ALL_NY_HIGHWAYS,
  ...ALL_OH_HIGHWAYS,
  ...ALL_OK_HIGHWAYS,
  ...ALL_OR_HIGHWAYS,
  ...ALL_PA_HIGHWAYS,
  ...ALL_RI_HIGHWAYS,
  ...ALL_SC_HIGHWAYS,
  ...ALL_SD_HIGHWAYS,
  ...ALL_TN_HIGHWAYS,
  ...ALL_TEXAS_HIGHWAYS,
  ...ALL_UT_HIGHWAYS,
  ...ALL_VA_HIGHWAYS,
  ...ALL_VT_HIGHWAYS,
  ...ALL_WA_HIGHWAYS,
  ...ALL_WI_HIGHWAYS,
  ...ALL_WV_HIGHWAYS,
  ...ALL_WY_HIGHWAYS,
];

export const ALL_50_STATES_STATS = {
  totalHighways: ALL_50_STATES_HIGHWAYS.length,
  totalStates: 50,
  interstates: ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === 'interstate').length,
  usHighways: ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === 'us-highway').length,
  stateHighways: ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === 'state-highway').length,
  totalExits: ALL_50_STATES_HIGHWAYS.reduce((sum, h) => sum + h.totalExits, 0),
  averageHighwaysPerState: Math.round(ALL_50_STATES_HIGHWAYS.length / 50),
};

/**
 * Helper Functions
 */
export function getAllHighwaysByState(stateCode: string): any[] {
  return ALL_50_STATES_HIGHWAYS.filter(h => h.states.includes(stateCode));
}

export function getAllHighwaysByType(type: string): any[] {
  return ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === type);
}

export function getHighwayById(id: string): any | undefined {
  return ALL_50_STATES_HIGHWAYS.find(h => h.id === id);
}

export function getHighwayStats() {
  return ALL_50_STATES_STATS;
}
