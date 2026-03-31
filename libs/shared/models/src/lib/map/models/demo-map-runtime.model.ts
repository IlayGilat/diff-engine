import type { Dictionary } from 'lodash';
import { HotspotsLayerSnapshot } from '../snapshots/hotspots-layer-state.model';
import { RegionsLayerSnapshot } from '../snapshots/regions-layer-state.model';

export type RandomSource = () => number;

export interface EmailLayerState {
  requestCount: number;
  regions: RegionsLayerSnapshot;
  hotspots: HotspotsLayerSnapshot;
}

export type EmailLayerStateDictionary = Dictionary<EmailLayerState>;
