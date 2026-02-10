import { Observable, Subject, throttleTime } from 'rxjs';

import { ExecutionStatus, Profile } from '@frontend/common';

import { generateProfileEntityKey, sortProfiles } from '../../utils';

const profileUpdateThrottleTime = 200;

/**
 * ProfileManager class for handling execution profiles
 */
export class ProfileManager {
  private _profileUpdate$: Subject<Profile[]> = new Subject();
  private profileEntities: Map<string, Profile> = new Map();
  private profile: Profile[] = [];
  private _requests: string[] = [];

  /**
   * Observable which trigger action if should update profile
   * @returns {Observable<Profile[]>} Actual observable
   */
  get profileUpdate$(): Observable<Profile[]> {
    return this._profileUpdate$.pipe(
      throttleTime(profileUpdateThrottleTime, undefined, {
        leading: true,
        trailing: true,
      })
    );
  }

  get requests(): string[] {
    return this._requests;
  }

  /**
   * Updates the execution profile data
   * @param requestId The ID of the request that initiated this profile update
   * @param profile The profile to save
   */
  public saveProfileData(requestId: string, profile: Profile): void {
    if (!profile) return;

    const entityKey = generateProfileEntityKey(requestId, profile);

    if (!entityKey) return;

    if (profile.status === ExecutionStatus.RUNNING) {
      this.profileEntities.set(entityKey, profile);
    }

    if (profile.status === ExecutionStatus.COMPLETED) {
      this.profileEntities.delete(entityKey);
    }

    this.updateProfile();
  }

  public startRequest(requestId: string): void {
    this._requests.push(requestId);
    this.triggerProfileUpdate([]);
  }

  /**
   * Handles cleanup when a request finished
   * Removes profiles associated with the failed request
   * @param requestId The ID of the finished request
   */
  public finishRequest(requestId: string): void {
    if (!requestId) return;

    this._requests = this._requests.filter((req) => req !== requestId);
    const requestIdProfilesKeys = Array.from(
      this.profileEntities.keys()
    ).filter((key) => key.startsWith(`req:${requestId};`));

    requestIdProfilesKeys.forEach((key) => {
      this.profileEntities.delete(key);
    });

    this.triggerProfileUpdate([]);
  }

  /**
   * Get current profiles
   * @returns Current profiles
   */
  public getProfiles(): Profile[] {
    return this.profile;
  }

  /**
   * Clear all profile data
   */
  public clear(): void {
    this.profile = [];
    this.profileEntities.clear();
    this._requests = [];

    this.triggerProfileUpdate([]);

    if (this._profileUpdate$.closed) {
      this._profileUpdate$ = new Subject();
    }
  }

  /**
   * Rebuilds the profile array
   * Only includes entities that are still running
   */
  private updateProfile(): void {
    let runningProfiles: Profile[] = [];

    const profilesByKey = Array.from(this.profileEntities.entries()).reduce<
      Record<string, Profile>
    >((acc, [key, profile]) => {
      const cleanKey = key.replace(/^req:[0-9a-zA-Z-]+;/, '');
      acc[cleanKey] = profile;

      return acc;
    }, {});
    runningProfiles = Object.values(profilesByKey);

    this.profile = sortProfiles(runningProfiles);
    this.triggerProfileUpdate(this.profile);
  }

  /**
   * Trigger grid profile update
   */
  private triggerProfileUpdate(profile: Profile[]): void {
    this._profileUpdate$.next(profile);
  }
}
