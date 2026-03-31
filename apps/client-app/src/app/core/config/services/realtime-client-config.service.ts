import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RealtimeClientConfigService {
  readonly diffEngineHttpUrl = 'http://localhost:3335/graphql';
  readonly diffEngineWsUrl = 'ws://localhost:3335/graphql';
}
