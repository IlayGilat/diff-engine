import {
  GeoPolygonFeature,
  LayerMeta,
} from '../models/geo-map.model';
import { JsonObject } from '../../common/models/json-value.model';

export interface RegionsLayerSnapshot extends JsonObject {
  meta: LayerMeta<'regions'>;
  features: GeoPolygonFeature[];
}
