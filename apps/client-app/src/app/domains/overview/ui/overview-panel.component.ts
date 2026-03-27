import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OverviewSnapshot } from '@org/models';
import { RealtimeDomainFeatureState } from '../../../core/store/realtime-domain-state.model';

@Component({
  selector: 'app-overview-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel" *ngIf="state as viewState">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Overview Domain</p>
          <h2>Operational Pulse</h2>
          <p class="description">{{ description }}</p>
        </div>
        <div class="pill" [class.active]="viewState.session.connectionState === 'connected'">
          {{ viewState.session.connectionState }}
        </div>
      </header>

      <div class="panel-actions">
        <button type="button" (click)="connect.emit()">Connect</button>
        <button type="button" class="ghost" (click)="disconnect.emit()">
          Disconnect
        </button>
      </div>

      <div class="hero" *ngIf="viewState.session.snapshot as snapshot">
        <div class="hero-card">
          <span>Live users</span>
          <strong>{{ snapshot.summary.liveUsers }}</strong>
        </div>
        <div class="hero-card">
          <span>Throughput / min</span>
          <strong>{{ snapshot.summary.throughputPerMinute }}</strong>
        </div>
        <div class="hero-card">
          <span>Error rate</span>
          <strong>{{ snapshot.summary.errorRate }}%</strong>
        </div>
        <div class="hero-card accent">
          <span>Revenue impact</span>
          <strong>{{ snapshot.summary.revenueImpact | number }}</strong>
        </div>
      </div>

      <div class="section" *ngIf="viewState.session.snapshot as snapshot">
        <h3>Metric cards</h3>
        <div class="metric-grid">
          <article class="metric-card" *ngFor="let metric of snapshot.metrics">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}{{ metric.unit }}</strong>
            <small [class.down]="metric.direction === 'down'">
              {{ metric.delta >= 0 ? '+' : '' }}{{ metric.delta }} since last patch
            </small>
          </article>
        </div>
      </div>

      <div class="split" *ngIf="viewState.session.snapshot as snapshot">
        <div class="section">
          <h3>Queues</h3>
          <div class="queue" *ngFor="let queue of snapshot.queues">
            <div class="queue-header">
              <span>{{ queue.label }}</span>
              <span>{{ queue.backlog }} backlog</span>
            </div>
            <div class="bar-track">
              <div
                class="bar-fill"
                [class.warning]="queue.status === 'warning'"
                [class.critical]="queue.status === 'critical'"
                [style.width.%]="queue.loadPercent"
              ></div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Highlights</h3>
          <article
            class="highlight"
            *ngFor="let highlight of snapshot.highlights"
            [class.warning]="highlight.tone === 'warning'"
            [class.critical]="highlight.tone === 'critical'"
          >
            <strong>{{ highlight.headline }}</strong>
            <p>{{ highlight.detail }}</p>
          </article>
        </div>
      </div>

      <div class="section" *ngIf="viewState.session.snapshot as snapshot">
        <h3>Regions</h3>
        <div class="region-grid">
          <article class="region-card" *ngFor="let region of snapshot.regions">
            <strong>{{ region.label }}</strong>
            <span>{{ region.traffic }} req/min</span>
            <span>{{ region.latencyMs }} ms</span>
            <span>{{ region.errorRate }}% errors</span>
          </article>
        </div>
      </div>

      <div class="section">
        <h3>Patch trail</h3>
        <div class="patch-list">
          <div class="patch-item" *ngFor="let patch of viewState.patchLog">
            <strong>{{ patch.kind }}</strong>
            <span>v{{ patch.version }}</span>
            <span>{{ patch.operationCount }} ops</span>
            <small *ngIf="patch.message">{{ patch.message }}</small>
            <small *ngIf="patch.paths.length">
              {{ patch.paths.join(', ') }}
            </small>
            <small>{{ patch.receivedAt | date: 'mediumTime' }}</small>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        background: linear-gradient(180deg, #fff 0%, #eef5ff 100%);
        border: 1px solid #c9d8ef;
        border-radius: 24px;
        padding: 1.25rem;
        display: grid;
        gap: 1rem;
      }
      .panel-header,
      .panel-actions,
      .queue-header,
      .split,
      .hero,
      .metric-grid,
      .region-grid,
      .patch-list {
        display: grid;
        gap: 0.75rem;
      }
      .panel-header {
        grid-template-columns: 1fr auto;
      }
      .panel-actions {
        grid-template-columns: repeat(2, minmax(0, 140px));
      }
      .hero,
      .metric-grid,
      .region-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      .split {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.72rem;
        color: #1f6feb;
      }
      h2,
      h3,
      p {
        margin: 0;
      }
      .description {
        color: #476280;
      }
      .pill {
        border-radius: 999px;
        background: #dde8f7;
        color: #33506f;
        padding: 0.45rem 0.8rem;
        text-transform: capitalize;
      }
      .pill.active {
        background: #d7f5e4;
        color: #1d6a41;
      }
      button {
        border: 0;
        border-radius: 14px;
        padding: 0.8rem 1rem;
        font-weight: 700;
        cursor: pointer;
        background: #1f6feb;
        color: #fff;
      }
      button.ghost {
        background: #dde8f7;
        color: #23456a;
      }
      .hero-card,
      .metric-card,
      .region-card,
      .highlight,
      .patch-item {
        border-radius: 18px;
        background: #fff;
        padding: 1rem;
        border: 1px solid #dbe6f6;
      }
      .hero-card.accent {
        background: #1f6feb;
        color: #fff;
      }
      .metric-card small.down {
        color: #b42318;
      }
      .queue {
        display: grid;
        gap: 0.45rem;
      }
      .bar-track {
        background: #d9e6f7;
        height: 12px;
        border-radius: 999px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #1f6feb, #53a6ff);
      }
      .bar-fill.warning {
        background: linear-gradient(90deg, #f59e0b, #f7c948);
      }
      .bar-fill.critical {
        background: linear-gradient(90deg, #d92d20, #ff6b6b);
      }
      .highlight.warning {
        background: #fff7e8;
      }
      .highlight.critical {
        background: #fff0ef;
      }
      @media (max-width: 900px) {
        .split {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class OverviewPanelComponent {
  @Input() state: RealtimeDomainFeatureState<OverviewSnapshot, 'overview'> | null =
    null;
  @Input() description = '';
  @Output() connect = new EventEmitter<void>();
  @Output() disconnect = new EventEmitter<void>();
}
