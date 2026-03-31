import {
  GeoCircleFeature,
  LayerMeta,
} from '../models/geo-map.model';
import { JsonObject } from '../../common/models/json-value.model';

export interface HotspotsLayerSnapshot extends JsonObject {
  meta: LayerMeta<'hotspots'>;
  features: GeoCircleFeature[];
}
