import {
  JsonObject,
  JsonPrimitive,
  JsonValue,
  isJsonObject,
} from '../../common/models/json-value.model';

export function createSnapshotHash(snapshot: JsonObject): string {
  const normalizedSnapshot = normalizeJsonValue(snapshot);
  return hashString(JSON.stringify(normalizedSnapshot));
}

function normalizeJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (isJsonObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((normalizedObject, key) => {
        normalizedObject[key] = normalizeJsonValue(value[key] as JsonValue);
        return normalizedObject;
      }, {} as JsonObject);
  }

  return value as JsonPrimitive;
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
