import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RealtimeClientConfigService {
  readonly diffEngineUrl = 'http://localhost:3335';
}
