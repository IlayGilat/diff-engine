import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import { Store } from '@ngrx/store';
import { JsonObject, JsonValue, isJsonObject } from '@org/models';
import {
  hotspotsLayerActions,
} from '../entities/hotspots/state/hotspots-layer.actions';
import { hotspotsLayerSelectors } from '../entities/hotspots/state/hotspots-layer.reducer';
import {
  regionsLayerActions,
} from '../entities/regions/state/regions-layer.actions';
import { regionsLayerSelectors } from '../entities/regions/state/regions-layer.reducer';
import { HotspotsLayerPanelComponent } from '../features/layers/panels/hotspots-layer-panel.component';
import {
  hotspotsLayerUiMetadata,
  regionsLayerUiMetadata,
} from '../features/layers/config/layer-ui-metadata';
import { RegionsLayerPanelComponent } from '../features/layers/panels/regions-layer-panel.component';
import { MapCanvasComponent } from '../features/map/map-canvas.component';

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
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  private readonly store = inject(Store);

  paramsJson = '{\n  "email": "demo@example.com"\n}';
  paramsError: string | null = null;
  readonly regionsLayerUiMetadata = regionsLayerUiMetadata;
  readonly hotspotsLayerUiMetadata = hotspotsLayerUiMetadata;
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

  // Starts the regions stream with the current params payload.
  connectRegions(): void {
    const params = this.readParams();
    if (!params) {
      return;
    }

    this.store.dispatch(regionsLayerActions.connectRequested({ params }));
  }

  // Stops the regions stream.
  disconnectRegions(): void {
    this.store.dispatch(regionsLayerActions.disconnectRequested());
  }

  // Starts the hotspots stream with the current params payload.
  connectHotspots(): void {
    const params = this.readParams();
    if (!params) {
      return;
    }

    this.store.dispatch(
      hotspotsLayerActions.connectRequested({ params }),
    );
  }

  // Stops the hotspots stream.
  disconnectHotspots(): void {
    this.store.dispatch(hotspotsLayerActions.disconnectRequested());
  }

  // Parses the params editor value into a plain JSON object.
  private readParams(): JsonObject | null {
    try {
      const parsedValue = JSON.parse(this.paramsJson) as JsonValue;
      if (!isJsonObject(parsedValue)) {
        this.paramsError = 'Params must be a JSON object.';
        return null;
      }

      this.paramsError = null;
      return parsedValue;
    } catch {
      this.paramsError = 'Params must be valid JSON.';
      return null;
    }
  }
}
