import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GeoCircleFeature, HotspotsLayerSnapshot } from '@org/models';
import { RealtimeDomainFeatureState } from '../../../core/store/realtime-domain-state.model';

@Component({
  selector: 'app-hotspots-layer-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel" *ngIf="state as viewState">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Circle Layer</p>
          <h2>Hotspots</h2>
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

      <div class="metrics" *ngIf="viewState.session.snapshot as snapshot">
        <article>
          <span>Features</span>
          <strong>{{ snapshot.features.length }}</strong>
        </article>
        <article>
          <span>Critical</span>
          <strong>{{ countByStatus(snapshot.features, 'critical') }}</strong>
        </article>
        <article>
          <span>Largest radius</span>
          <strong>{{ largestRadius(snapshot) | number: '1.0-0' }}</strong>
        </article>
      </div>

      <div class="feature-list" *ngIf="viewState.session.snapshot as snapshot">
        <article
          class="feature-card"
          *ngFor="let feature of snapshot.features"
          [class.watch]="feature.status === 'watch'"
          [class.critical]="feature.status === 'critical'"
        >
          <div class="feature-row">
            <strong>{{ feature.label }}</strong>
            <span>{{ feature.status }}</span>
          </div>
          <small>
            radius {{ feature.radius | number: '1.0-0' }} · intensity
            {{ feature.intensity | number: '1.0-0' }}
          </small>
        </article>
      </div>

      <div class="section">
        <h3>Patch trail</h3>
        <div class="patch-list">
          <div class="patch-item" *ngFor="let patch of viewState.patchLog">
            <strong>{{ patch.kind }}</strong>
            <span>v{{ patch.version }}</span>
            <span>{{ patch.operationCount }} ops</span>
            <small *ngIf="patch.message">{{ patch.message }}</small>
            <small *ngIf="patch.paths.length">{{ patch.paths.join(', ') }}</small>
            <small>{{ patch.receivedAt | date: 'mediumTime' }}</small>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        display: grid;
        gap: 1rem;
        padding: 1.1rem;
        border-radius: 24px;
        border: 1px solid #f2ceb9;
        background: linear-gradient(180deg, #fff7f1 0%, #fff 100%);
      }
      .panel-header,
      .metrics,
      .feature-list,
      .patch-list {
        display: grid;
        gap: 0.75rem;
      }
      .panel-header {
        grid-template-columns: 1fr auto;
      }
      .metrics {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .eyebrow {
        margin: 0 0 0.35rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.72rem;
        color: #c2410c;
      }
      h2,
      h3,
      p {
        margin: 0;
      }
      .description {
        color: #7c4a31;
      }
      .pill {
        border-radius: 999px;
        padding: 0.45rem 0.8rem;
        text-transform: capitalize;
        background: #ffe4d5;
        color: #9a3412;
      }
      .pill.active {
        background: #ffd8c2;
        color: #c2410c;
      }
      .panel-actions {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(2, minmax(0, 140px));
      }
      button {
        border: 0;
        border-radius: 14px;
        padding: 0.8rem 1rem;
        font-weight: 700;
        cursor: pointer;
        background: #c2410c;
        color: #fff;
      }
      button.ghost {
        background: #ffe4d5;
        color: #9a3412;
      }
      .metrics article,
      .feature-card,
      .patch-item {
        border-radius: 18px;
        border: 1px solid #f6e1d4;
        background: #fff;
        padding: 0.95rem;
      }
      .metrics span,
      .patch-item small {
        color: #7c4a31;
      }
      .feature-row {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
      }
      .feature-card.watch {
        background: #fff7ea;
      }
      .feature-card.critical {
        background: #fff1ef;
      }
      @media (max-width: 720px) {
        .metrics,
        .panel-actions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HotspotsLayerPanelComponent {
  @Input()
  state: RealtimeDomainFeatureState<HotspotsLayerSnapshot, 'hotspots'> | null =
    null;

  @Input() description = '';
  @Output() connect = new EventEmitter<void>();
  @Output() disconnect = new EventEmitter<void>();

  largestRadius(snapshot: HotspotsLayerSnapshot): number {
    return snapshot.features.reduce(
      (largest, feature) => Math.max(largest, feature.radius),
      0,
    );
  }

  countByStatus(features: GeoCircleFeature[], status: GeoCircleFeature['status']): number {
    return features.filter((feature) => feature.status === status).length;
  }
}
