import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivitySnapshot } from '@org/models';
import { RealtimeDomainFeatureState } from '../../../core/store/realtime-domain-state.model';

@Component({
  selector: 'app-activity-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel" *ngIf="state as viewState">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Activity Domain</p>
          <h2>Live Event Stream</h2>
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
          <span>Events / min</span>
          <strong>{{ snapshot.stream.eventsPerMinute }}</strong>
        </div>
        <div class="hero-card">
          <span>Active workers</span>
          <strong>{{ snapshot.stream.activeWorkers }}</strong>
        </div>
        <div class="hero-card accent">
          <span>Patch burst</span>
          <strong>{{ snapshot.stream.patchBurst }}</strong>
        </div>
        <div class="hero-card">
          <span>Avg response</span>
          <strong>{{ snapshot.stream.averageResponseMs }} ms</strong>
        </div>
      </div>

      <div class="split" *ngIf="viewState.session.snapshot as snapshot">
        <div class="section">
          <h3>Workers</h3>
          <article class="worker-card" *ngFor="let worker of snapshot.workers">
            <div class="worker-row">
              <strong>{{ worker.label }}</strong>
              <span [class.offline]="!worker.online">
                {{ worker.online ? 'online' : 'offline' }}
              </span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" [style.width.%]="worker.utilization"></div>
            </div>
            <small>{{ worker.utilization }}% utilized · {{ worker.tasksInFlight }} tasks</small>
          </article>
        </div>

        <div class="section">
          <h3>Channels</h3>
          <article class="channel-card" *ngFor="let channel of snapshot.channels">
            <div class="worker-row">
              <strong>{{ channel.label }}</strong>
              <span>{{ channel.ratePerMinute }}/min</span>
            </div>
            <small>
              Success {{ channel.successRate * 100 | number: '1.0-0' }}% · Backlog
              {{ channel.backlog }}
            </small>
          </article>
        </div>
      </div>

      <div class="section" *ngIf="viewState.session.snapshot as snapshot">
        <h3>Event feed</h3>
        <article
          class="event-card"
          *ngFor="let event of snapshot.events"
          [class.warning]="event.severity === 'warning'"
          [class.critical]="event.severity === 'critical'"
        >
          <div class="worker-row">
            <strong>{{ event.type }}</strong>
            <span>{{ event.at | date: 'mediumTime' }}</span>
          </div>
          <p>{{ event.message }}</p>
          <small>{{ event.channel }} · {{ event.severity }}</small>
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
        background: linear-gradient(180deg, #fff7f0 0%, #fff 100%);
        border: 1px solid #f2d4bf;
        border-radius: 24px;
        padding: 1.25rem;
        display: grid;
        gap: 1rem;
      }
      .panel-header,
      .hero,
      .split,
      .patch-list {
        display: grid;
        gap: 0.75rem;
      }
      .panel-header {
        grid-template-columns: 1fr auto;
      }
      .hero {
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
        color: #ef6c00;
      }
      h2,
      h3,
      p {
        margin: 0;
      }
      .description {
        color: #84553a;
      }
      .pill {
        border-radius: 999px;
        background: #fae2d1;
        color: #7b4b30;
        padding: 0.45rem 0.8rem;
        text-transform: capitalize;
      }
      .pill.active {
        background: #ffe1c2;
        color: #b45309;
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
        background: #ef6c00;
        color: #fff;
      }
      button.ghost {
        background: #fae2d1;
        color: #7b4b30;
      }
      .hero-card,
      .worker-card,
      .channel-card,
      .event-card,
      .patch-item {
        border-radius: 18px;
        background: #fff;
        padding: 1rem;
        border: 1px solid #f6ddcd;
      }
      .hero-card.accent {
        background: #ef6c00;
        color: #fff;
      }
      .worker-row {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
      }
      .offline {
        color: #b42318;
      }
      .bar-track {
        background: #fde7d7;
        height: 12px;
        border-radius: 999px;
        overflow: hidden;
        margin: 0.5rem 0;
      }
      .bar-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #ef6c00, #f7a046);
      }
      .event-card.warning {
        background: #fff6e4;
      }
      .event-card.critical {
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
export class ActivityPanelComponent {
  @Input() state: RealtimeDomainFeatureState<ActivitySnapshot, 'activity'> | null =
    null;
  @Input() description = '';
  @Output() connect = new EventEmitter<void>();
  @Output() disconnect = new EventEmitter<void>();
}
