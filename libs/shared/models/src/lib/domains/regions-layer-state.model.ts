import {
  GeoPolygonFeature,
  LayerMeta,
} from '../geo-map.model';
import { JsonObject } from '../json-value.model';

export interface RegionsLayerSnapshot extends JsonObject {
  meta: LayerMeta<'regions'>;
  features: GeoPolygonFeature[];
}
