import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import { ActivityDomainFacade } from './domains/activity/store/activity-domain.facade';
import { ActivityPanelComponent } from './domains/activity/ui/activity-panel.component';
import { OverviewDomainFacade } from './domains/overview/store/overview-domain.facade';
import { OverviewPanelComponent } from './domains/overview/ui/overview-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OverviewPanelComponent,
    ActivityPanelComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent {
  readonly overviewDomainFacade = inject(OverviewDomainFacade);
  readonly activityDomainFacade = inject(ActivityDomainFacade);

  email = 'demo@example.com';
  readonly overviewState$ = this.overviewDomainFacade.state$;
  readonly activityState$ = this.activityDomainFacade.state$;
  readonly dashboardSummary$ = combineLatest([
    this.overviewState$,
    this.activityState$,
  ]).pipe(
    map(([overviewState, activityState]) => ({
      connectedDomains: [
        overviewState.session.connectionState,
        activityState.session.connectionState,
      ].filter((state) => state === 'connected').length,
      patchEvents:
        overviewState.patchLog.length + activityState.patchLog.length,
      latestUpdate:
        overviewState.session.lastReceivedAt ||
        activityState.session.lastReceivedAt ||
        'Waiting for data',
    })),
  );

  connectOverview(): void {
    this.overviewDomainFacade.connect(this.email);
  }

  disconnectOverview(): void {
    this.overviewDomainFacade.disconnect();
  }

  connectActivity(): void {
    this.activityDomainFacade.connect(this.email);
  }

  disconnectActivity(): void {
    this.activityDomainFacade.disconnect();
  }
}
