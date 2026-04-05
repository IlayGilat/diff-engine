import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RealtimeClientConfigService {
  readonly diffEngineWsUrl = 'ws://localhost:3335/graphql';
}
