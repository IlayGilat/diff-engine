import { Injectable } from '@nestjs/common';
import { JsonObject } from '@org/models';
import { Operation, compare } from 'fast-json-patch';

@Injectable()
export class DiffPatchService {
  createPatch(
    previousSnapshot: JsonObject,
    nextSnapshot: JsonObject,
  ): Operation[] {
    return compare(previousSnapshot, nextSnapshot);
  }
}
