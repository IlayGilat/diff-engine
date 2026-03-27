import { Injectable } from '@nestjs/common';
import {
  ActivityChannelSnapshot,
  ActivityEventSnapshot,
  ActivitySnapshot,
  ActivityWorkerSnapshot,
  DemoPollingDomain,
  OverviewHighlight,
  OverviewMetricCard,
  OverviewQueueSnapshot,
  OverviewRegionSnapshot,
  OverviewSnapshot,
} from '@org/models';

interface EmailDomainState {
  requestCount: number;
  overview: OverviewSnapshot;
  activity: ActivitySnapshot;
}

@Injectable()
export class MockDataService {
  private readonly states = new Map<string, EmailDomainState>();

  getData(email: string, domain: DemoPollingDomain): OverviewSnapshot | ActivitySnapshot {
    const state = this.getOrCreateState(email);
    state.requestCount += 1;

    this.mutateOverview(state.overview, state.requestCount);
    this.mutateActivity(state.activity, state.requestCount);

    return domain === 'overview'
      ? structuredClone(state.overview)
      : structuredClone(state.activity);
  }

  private getOrCreateState(email: string): EmailDomainState {
    const existingState = this.states.get(email);
    if (existingState) {
      return existingState;
    }

    const createdState = this.createState(email);
    this.states.set(email, createdState);
    return createdState;
  }

  private createState(email: string): EmailDomainState {
    const seededRandom = this.createSeededRandom(email);

    return {
      requestCount: 0,
      overview: {
        meta: {
          ownerEmail: email,
          domain: 'overview',
          generatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          requestCount: 0,
        },
        summary: {
          liveUsers: 850 + Math.floor(seededRandom() * 200),
          throughputPerMinute: 2200 + Math.floor(seededRandom() * 500),
          errorRate: 0.8 + Number((seededRandom() * 1.7).toFixed(2)),
          revenueImpact: 12000 + Math.floor(seededRandom() * 3500),
        },
        metrics: Array.from({ length: 4 }, (_, index) =>
          this.createMetricCard(index, seededRandom),
        ),
        queues: Array.from({ length: 4 }, (_, index) =>
          this.createQueueSnapshot(index, seededRandom),
        ),
        regions: Array.from({ length: 4 }, (_, index) =>
          this.createRegionSnapshot(index, seededRandom),
        ),
        highlights: Array.from({ length: 3 }, (_, index) =>
          this.createHighlight(index, seededRandom),
        ),
      },
      activity: {
        meta: {
          ownerEmail: email,
          domain: 'activity',
          generatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          requestCount: 0,
        },
        stream: {
          eventsPerMinute: 160 + Math.floor(seededRandom() * 40),
          activeWorkers: 12 + Math.floor(seededRandom() * 6),
          patchBurst: 0,
          averageResponseMs: 140 + Math.floor(seededRandom() * 70),
        },
        workers: Array.from({ length: 6 }, (_, index) =>
          this.createWorkerSnapshot(index, seededRandom),
        ),
        channels: Array.from({ length: 4 }, (_, index) =>
          this.createChannelSnapshot(index, seededRandom),
        ),
        events: Array.from({ length: 10 }, (_, index) =>
          this.createEventSnapshot(index + 1, seededRandom),
        ),
      },
    };
  }

  private mutateOverview(snapshot: OverviewSnapshot, requestCount: number): void {
    const now = new Date().toISOString();
    snapshot.meta.lastUpdated = now;
    snapshot.meta.requestCount = requestCount;

    snapshot.summary.liveUsers += this.randomBetween(-12, 16);
    snapshot.summary.throughputPerMinute += this.randomBetween(-60, 75);
    snapshot.summary.errorRate = this.clampNumber(
      Number(
        (snapshot.summary.errorRate + this.randomBetween(-12, 18) / 100).toFixed(
          2,
        ),
      ),
      0.2,
      5,
    );
    snapshot.summary.revenueImpact += this.randomBetween(-220, 310);

    snapshot.metrics = snapshot.metrics.map((metric) => {
      const nextValue = metric.value + this.randomBetween(-14, 18);
      const nextDelta = this.randomBetween(-8, 11);

      return {
        ...metric,
        value: Math.max(1, nextValue),
        delta: nextDelta,
        direction: nextDelta >= 0 ? 'up' : 'down',
      };
    });

    snapshot.queues = snapshot.queues.map((queue) => {
      const loadPercent = this.clampNumber(
        queue.loadPercent + this.randomBetween(-10, 14),
        15,
        99,
      );

      return {
        ...queue,
        backlog: Math.max(0, queue.backlog + this.randomBetween(-20, 24)),
        loadPercent,
        status: this.resolveQueueStatus(loadPercent),
      };
    });

    snapshot.regions = snapshot.regions.map((region) => ({
      ...region,
      traffic: Math.max(50, region.traffic + this.randomBetween(-30, 35)),
      latencyMs: this.clampNumber(
        region.latencyMs + this.randomBetween(-18, 21),
        70,
        340,
      ),
      errorRate: this.clampNumber(
        Number((region.errorRate + this.randomBetween(-10, 15) / 100).toFixed(2)),
        0.1,
        4.5,
      ),
    }));

    const strongestQueue = snapshot.queues
      .slice()
      .sort((left, right) => right.loadPercent - left.loadPercent)[0];

    snapshot.highlights = [
      {
        headline: strongestQueue.label + ' demand spike',
        detail:
          'Queue pressure moved to ' +
          strongestQueue.loadPercent +
          '% with backlog ' +
          strongestQueue.backlog +
          '.',
        tone:
          strongestQueue.status === 'critical'
            ? 'critical'
            : strongestQueue.status === 'warning'
              ? 'warning'
              : 'good',
      },
      {
        headline: 'Live user movement',
        detail:
          'Active users shifted to ' + snapshot.summary.liveUsers + ' users.',
        tone: snapshot.summary.liveUsers > 950 ? 'good' : 'warning',
      },
      {
        headline: 'Revenue forecast',
        detail:
          'Projected revenue impact now ' +
          snapshot.summary.revenueImpact +
          ' USD for the current window.',
        tone: snapshot.summary.revenueImpact > 13000 ? 'good' : 'warning',
      },
    ];

    if (requestCount % 3 === 0) {
      snapshot.highlights.push({
        headline: 'Burst window opened',
        detail: 'A temporary highlight was injected to exercise add/remove patches.',
        tone: 'warning',
      });
    }

    if (requestCount % 5 === 0 && snapshot.highlights.length > 2) {
      snapshot.highlights.pop();
    }
  }

  private mutateActivity(snapshot: ActivitySnapshot, requestCount: number): void {
    const now = new Date().toISOString();
    snapshot.meta.lastUpdated = now;
    snapshot.meta.requestCount = requestCount;

    snapshot.stream.eventsPerMinute = Math.max(
      60,
      snapshot.stream.eventsPerMinute + this.randomBetween(-12, 17),
    );
    snapshot.stream.activeWorkers = this.clampNumber(
      snapshot.stream.activeWorkers + this.randomBetween(-1, 2),
      6,
      18,
    );
    snapshot.stream.patchBurst = this.randomBetween(2, 9);
    snapshot.stream.averageResponseMs = this.clampNumber(
      snapshot.stream.averageResponseMs + this.randomBetween(-15, 20),
      70,
      280,
    );

    snapshot.workers = snapshot.workers.map((worker) => ({
      ...worker,
      online: Math.random() > 0.08,
      utilization: this.clampNumber(
        worker.utilization + this.randomBetween(-16, 20),
        10,
        98,
      ),
      tasksInFlight: Math.max(
        0,
        worker.tasksInFlight + this.randomBetween(-3, 5),
      ),
    }));

    snapshot.channels = snapshot.channels.map((channel) => ({
      ...channel,
      ratePerMinute: Math.max(
        20,
        channel.ratePerMinute + this.randomBetween(-10, 14),
      ),
      successRate: this.clampNumber(
        Number((channel.successRate + this.randomBetween(-5, 6) / 100).toFixed(2)),
        0.72,
        0.99,
      ),
      backlog: Math.max(0, channel.backlog + this.randomBetween(-8, 10)),
    }));

    if (requestCount % 2 === 0) {
      snapshot.events.push(
        this.createLiveEventSnapshot(requestCount, snapshot.channels),
      );
    }

    if (requestCount % 3 === 0 && snapshot.events.length > 6) {
      snapshot.events.pop();
    }

    if (snapshot.events.length < 6) {
      snapshot.events.push(
        this.createLiveEventSnapshot(requestCount + 1000, snapshot.channels),
      );
    }
  }

  private createMetricCard(
    index: number,
    seededRandom: () => number,
  ): OverviewMetricCard {
    const definitions = [
      { id: 'conversion', label: 'Conversion', unit: '%' },
      { id: 'retention', label: 'Retention', unit: '%' },
      { id: 'latency', label: 'Latency', unit: 'ms' },
      { id: 'sla', label: 'SLA', unit: '%' },
    ];

    const definition = definitions[index];
    const delta = this.randomSeededDelta(seededRandom);

    return {
      id: definition.id,
      label: definition.label,
      value: 40 + Math.floor(seededRandom() * 120),
      unit: definition.unit,
      delta,
      direction: delta >= 0 ? 'up' : 'down',
    };
  }

  private createQueueSnapshot(
    index: number,
    seededRandom: () => number,
  ): OverviewQueueSnapshot {
    const labels = ['Ingestion', 'Enrichment', 'Scoring', 'Delivery'];
    const loadPercent = 35 + Math.floor(seededRandom() * 50);

    return {
      id: 'queue-' + (index + 1),
      label: labels[index],
      backlog: 70 + Math.floor(seededRandom() * 140),
      loadPercent,
      status: this.resolveQueueStatus(loadPercent),
    };
  }

  private createRegionSnapshot(
    index: number,
    seededRandom: () => number,
  ): OverviewRegionSnapshot {
    const labels = ['NA', 'EU', 'LATAM', 'APAC'];

    return {
      id: 'region-' + (index + 1),
      label: labels[index],
      traffic: 130 + Math.floor(seededRandom() * 220),
      latencyMs: 90 + Math.floor(seededRandom() * 80),
      errorRate: Number((0.4 + seededRandom() * 1.3).toFixed(2)),
    };
  }

  private createHighlight(
    index: number,
    seededRandom: () => number,
  ): OverviewHighlight {
    const tones: Array<'good' | 'warning' | 'critical'> = [
      'good',
      'warning',
      'critical',
    ];

    return {
      headline: 'Signal ' + (index + 1),
      detail: 'Auto-generated insight ' + Math.floor(seededRandom() * 100),
      tone: tones[index],
    };
  }

  private createWorkerSnapshot(
    index: number,
    seededRandom: () => number,
  ): ActivityWorkerSnapshot {
    return {
      id: 'worker-' + (index + 1),
      label: 'Worker ' + (index + 1),
      online: seededRandom() > 0.12,
      utilization: 30 + Math.floor(seededRandom() * 55),
      tasksInFlight: 2 + Math.floor(seededRandom() * 7),
    };
  }

  private createChannelSnapshot(
    index: number,
    seededRandom: () => number,
  ): ActivityChannelSnapshot {
    const labels = ['Webhook', 'Kafka', 'Import', 'Notifier'];

    return {
      id: 'channel-' + (index + 1),
      label: labels[index],
      ratePerMinute: 35 + Math.floor(seededRandom() * 40),
      successRate: Number((0.85 + seededRandom() * 0.12).toFixed(2)),
      backlog: 4 + Math.floor(seededRandom() * 16),
    };
  }

  private createEventSnapshot(
    index: number,
    seededRandom: () => number,
  ): ActivityEventSnapshot {
    const severities: Array<'info' | 'warning' | 'critical'> = [
      'info',
      'warning',
      'critical',
    ];
    const types: Array<'SYNC' | 'IMPORT' | 'ALERT' | 'CHECKPOINT'> = [
      'SYNC',
      'IMPORT',
      'ALERT',
      'CHECKPOINT',
    ];

    return {
      id: 'event-' + index,
      at: new Date(Date.now() - index * 18000).toISOString(),
      channel: ['Webhook', 'Kafka', 'Import', 'Notifier'][index % 4],
      type: types[index % 4],
      severity: severities[index % 3],
      message: 'Pipeline event ' + index + ' recalculated downstream load.',
    };
  }

  private createLiveEventSnapshot(
    requestCount: number,
    channels: ActivityChannelSnapshot[],
  ): ActivityEventSnapshot {
    const selectedChannel =
      channels[Math.floor(Math.random() * channels.length)]?.label ?? 'Webhook';
    const severities: Array<'info' | 'warning' | 'critical'> = [
      'info',
      'warning',
      'critical',
    ];
    const types: Array<'SYNC' | 'IMPORT' | 'ALERT' | 'CHECKPOINT'> = [
      'SYNC',
      'IMPORT',
      'ALERT',
      'CHECKPOINT',
    ];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    return {
      id: 'event-live-' + requestCount,
      at: new Date().toISOString(),
      channel: selectedChannel,
      type: types[Math.floor(Math.random() * types.length)],
      severity,
      message:
        severity === 'critical'
          ? 'Critical pressure detected in ' + selectedChannel + '.'
          : severity === 'warning'
            ? 'Rising backlog detected in ' + selectedChannel + '.'
            : 'Fresh checkpoint processed for ' + selectedChannel + '.',
    };
  }

  private createSeededRandom(seed: string): () => number {
    let state = 0;
    for (let index = 0; index < seed.length; index += 1) {
      state = (state * 31 + seed.charCodeAt(index)) >>> 0;
    }

    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomSeededDelta(seededRandom: () => number): number {
    return Math.floor(seededRandom() * 16) - 6;
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private resolveQueueStatus(
    loadPercent: number,
  ): 'healthy' | 'warning' | 'critical' {
    if (loadPercent >= 80) {
      return 'critical';
    }

    if (loadPercent >= 60) {
      return 'warning';
    }

    return 'healthy';
  }
}
