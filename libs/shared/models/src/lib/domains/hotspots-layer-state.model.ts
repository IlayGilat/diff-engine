import {
  GeoCircleFeature,
  LayerMeta,
} from '../geo-map.model';
import { JsonObject } from '../json-value.model';

export interface HotspotsLayerSnapshot extends JsonObject {
  meta: LayerMeta<'hotspots'>;
  features: GeoCircleFeature[];
}
