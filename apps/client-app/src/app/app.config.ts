import { ApplicationConfig } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import {
  REALTIME_DOMAIN_EFFECTS,
  REALTIME_DOMAIN_REDUCERS,
} from './domains/realtime-domain.registration';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore(REALTIME_DOMAIN_REDUCERS as any),
    provideEffects(REALTIME_DOMAIN_EFFECTS),
  ],
};
