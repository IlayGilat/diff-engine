import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RealtimeClientConfigService {
  readonly realtimeGraphqlWsUrl = 'ws://localhost:3335/graphql';
}
