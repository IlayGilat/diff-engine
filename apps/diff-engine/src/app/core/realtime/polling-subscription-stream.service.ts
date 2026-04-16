import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  JsonObject,
  PollingPatchEnvelope,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  RealtimeDomainClientEvent,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { AbstractPollingDomainSource } from '../polling/abstractions/polling-domain-source.abstract';
import { DiffPatchService } from '../polling/services/diff-patch.service';
import { PollingDomainRegistryService } from '../polling/services/polling-domain-registry.service';

interface PollingSubscriptionSession<TSnapshot extends JsonObject = JsonObject> {
  domainSource: AbstractPollingDomainSource<string, TSnapshot>;
  target: PollingSubscriptionTarget<string>;
  sourceKey: string;
  version: number;
  lastSnapshot: TSnapshot;
}

@Injectable()
export class PollingSubscriptionStreamService {
  private readonly logger = new Logger(PollingSubscriptionStreamService.name);

  constructor(
    private readonly pollingDomainRegistryService: PollingDomainRegistryService,
    private readonly diffPatchService: DiffPatchService,
  ) {}

  async *stream(
    rawTarget: PollingSubscriptionTarget<string>,
  ): AsyncGenerator<string> {
    const session = await this.createSession(rawTarget);
    this.logger.log('Opened realtime stream on ' + session.sourceKey + '.');

    try {
      yield JSON.stringify({
        kind: 'snapshot',
        envelope: this.buildSnapshotEnvelope(session),
      } satisfies RealtimeDomainClientEvent<JsonObject, string>);

      while (true) {
        await this.wait(session.domainSource.getPollIntervalMs());
        const nextEvent = await this.poll(session);
        if (nextEvent) {
          yield JSON.stringify(nextEvent);
        }
      }
    } finally {
      this.logger.log('Closed realtime stream on ' + session.sourceKey + '.');
    }
  }

  private async createSession(
    rawTarget: PollingSubscriptionTarget<string>,
  ): Promise<PollingSubscriptionSession<JsonObject>> {
    const target = normalizePollingTarget(rawTarget);
    if (!target.domain || !target.email) {
      throw new BadRequestException('Both domain and email are required.');
    }

    let domainSource: AbstractPollingDomainSource<string, JsonObject>;
    try {
      domainSource = this.pollingDomainRegistryService.resolve(target);
    } catch (error) {
      throw new BadRequestException(
        this.getErrorMessage(error, 'Unsupported polling domain.'),
      );
    }

    return {
      domainSource,
      target,
      sourceKey: buildSourceKey(target),
      version: 1,
      lastSnapshot: await domainSource.fetch(target),
    };
  }

  private async poll(
    session: PollingSubscriptionSession<JsonObject>,
  ): Promise<RealtimeDomainClientEvent<JsonObject, string> | null> {
    try {
      const latestSnapshot = await session.domainSource.fetch(session.target);
      const operations = this.diffPatchService.createPatch(
        session.lastSnapshot,
        latestSnapshot,
      );

      if (operations.length === 0) {
        return null;
      }

      session.version += 1;
      session.lastSnapshot = latestSnapshot;

      return {
        kind: 'patch',
        envelope: {
          sourceKey: session.sourceKey,
          target: session.target,
          version: session.version,
          receivedAt: new Date().toISOString(),
          operations,
        } satisfies PollingPatchEnvelope<string>,
      };
    } catch (error) {
      return {
        kind: 'error',
        envelope: {
          sourceKey: session.sourceKey,
          target: session.target,
          phase: 'poll',
          receivedAt: new Date().toISOString(),
          message: this.getErrorMessage(
            error,
            'Failed to poll the latest state.',
          ),
        } satisfies PollingStreamErrorEnvelope<string>,
      };
    }
  }

  private buildSnapshotEnvelope(
    session: PollingSubscriptionSession<JsonObject>,
  ): PollingSnapshotEnvelope<JsonObject, string> {
    return {
      sourceKey: session.sourceKey,
      target: session.target,
      version: session.version,
      receivedAt: new Date().toISOString(),
      snapshot: session.lastSnapshot,
    };
  }

  private wait(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }
}
