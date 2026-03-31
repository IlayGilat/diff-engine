import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  hotspotsLayerDefinition,
  hotspotsLayerActions,
} from './domains/hotspots/store/hotspots-layer.actions';
import { hotspotsLayerSelectors } from './domains/hotspots/store/hotspots-layer.reducer';
import { HotspotsLayerPanelComponent } from './domains/hotspots/ui/hotspots-layer-panel.component';
import {
  regionsLayerActions,
  regionsLayerDefinition,
} from './domains/regions/store/regions-layer.actions';
import { regionsLayerSelectors } from './domains/regions/store/regions-layer.reducer';
import { RegionsLayerPanelComponent } from './domains/regions/ui/regions-layer-panel.component';
import { MapCanvasComponent } from './map/map-canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MapCanvasComponent,
    RegionsLayerPanelComponent,
    HotspotsLayerPanelComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent {
  private readonly store = inject(Store);

  email = 'demo@example.com';
  readonly regionsDefinition = regionsLayerDefinition;
  readonly hotspotsDefinition = hotspotsLayerDefinition;
  readonly regionsState$ = this.store.select(
    regionsLayerSelectors.selectFeatureState,
  );
  readonly hotspotsState$ = this.store.select(
    hotspotsLayerSelectors.selectFeatureState,
  );
  readonly regionsSnapshot$ = this.store.select(
    regionsLayerSelectors.selectSnapshot,
  );
  readonly hotspotsSnapshot$ = this.store.select(
    hotspotsLayerSelectors.selectSnapshot,
  );
  readonly dashboardSummary$ = combineLatest([
    this.regionsState$,
    this.hotspotsState$,
  ]).pipe(
    map(([regionsState, hotspotsState]) => ({
      connectedDomains: [
        regionsState.session.connectionState,
        hotspotsState.session.connectionState,
      ].filter((state) => state === 'connected').length,
      patchEvents: regionsState.patchLog.length + hotspotsState.patchLog.length,
      visibleFeatures:
        (regionsState.session.snapshot?.features.length ?? 0) +
        (hotspotsState.session.snapshot?.features.length ?? 0),
      latestUpdate:
        regionsState.session.lastReceivedAt ||
        hotspotsState.session.lastReceivedAt ||
        'Waiting for data',
    })),
  );

  connectRegions(): void {
    this.store.dispatch(regionsLayerActions.connectRequested({ email: this.email }));
  }

  disconnectRegions(): void {
    this.store.dispatch(regionsLayerActions.disconnectRequested());
  }

  connectHotspots(): void {
    this.store.dispatch(
      hotspotsLayerActions.connectRequested({ email: this.email }),
    );
  }

  disconnectHotspots(): void {
    this.store.dispatch(hotspotsLayerActions.disconnectRequested());
  }
}
