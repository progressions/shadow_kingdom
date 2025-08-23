export interface RegionGuardian {
  name: string;
  description: string;
  personality: string;
}

export interface RegionKey {
  name: string;
  description: string;
}

export interface RegionLockedExit {
  name: string;
  description: string;
}

export interface RegionConcept {
  name: string;
  theme: string;
  atmosphere: string;
  history: string;
  guardian: RegionGuardian;
  key: RegionKey;
  lockedExit: RegionLockedExit;
  suggestedElements: string[];
}