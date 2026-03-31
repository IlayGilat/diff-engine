import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  DEMO_MAP_WORLD_BOUNDS,
  GeoPoint,
  HotspotsLayerSnapshot,
  RegionsLayerSnapshot,
} from '@org/models';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="map-shell">
      <header class="map-header">
        <div>
          <p class="eyebrow">Live Map</p>
          <h2>Layer diff canvas</h2>
        </div>
        <div class="legend">
          <span><i class="regions"></i> Regions</span>
          <span><i class="hotspots"></i> Hotspots</span>
        </div>
      </header>

      <div #mapHost class="map-host"></div>
    </section>
  `,
  styles: [
    `
      .map-shell {
        display: grid;
        gap: 1rem;
        padding: 1.1rem;
        border-radius: 28px;
        border: 1px solid #d6dfeb;
        background:
          radial-gradient(circle at top left, rgb(15 118 110 / 0.08), transparent 28%),
          radial-gradient(circle at bottom right, rgb(194 65 12 / 0.12), transparent 30%),
          linear-gradient(180deg, #fff 0%, #f6f8fb 100%);
      }
      .map-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
      }
      .eyebrow {
        margin: 0 0 0.35rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.72rem;
        color: #1d4ed8;
      }
      h2 {
        margin: 0;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        color: #4b5563;
        font-size: 0.94rem;
      }
      .legend span {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }
      .legend i {
        width: 0.8rem;
        height: 0.8rem;
        border-radius: 999px;
        display: inline-block;
      }
      .legend i.regions {
        background: #0f766e;
      }
      .legend i.hotspots {
        background: #c2410c;
      }
      .map-host {
        min-height: 780px;
        border-radius: 24px;
        overflow: hidden;
        border: 1px solid #dbe3ef;
        background: #dbeafe;
      }
      :host ::ng-deep .map-label {
        background: rgb(15 23 42 / 0.86);
        border: 0;
        color: #fff;
        border-radius: 999px;
        box-shadow: none;
        padding: 0.1rem 0.45rem;
      }
      @media (max-width: 900px) {
        .map-header {
          align-items: flex-start;
          flex-direction: column;
        }
        .map-host {
          min-height: 520px;
        }
      }
    `,
  ],
})
export class MapCanvasComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() regions: RegionsLayerSnapshot | null = null;
  @Input() hotspots: HotspotsLayerSnapshot | null = null;
  @ViewChild('mapHost', { static: true }) private readonly mapHost?: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private readonly regionsLayer = L.layerGroup();
  private readonly hotspotsLayer = L.layerGroup();

  ngAfterViewInit(): void {
    if (!this.mapHost || !this.supportsLeafletRuntime()) {
      return;
    }

    const southWest = L.latLng(
      DEMO_MAP_WORLD_BOUNDS.minY,
      DEMO_MAP_WORLD_BOUNDS.minX,
    );
    const northEast = L.latLng(
      DEMO_MAP_WORLD_BOUNDS.maxY,
      DEMO_MAP_WORLD_BOUNDS.maxX,
    );

    this.map = L.map(this.mapHost.nativeElement, {
      attributionControl: true,
      zoomControl: true,
      minZoom: 6,
      maxZoom: 18,
      zoomSnap: 0.25,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.fitBounds(L.latLngBounds(southWest, northEast), {
      padding: [40, 40],
    });

    this.regionsLayer.addTo(this.map);
    this.hotspotsLayer.addTo(this.map);

    this.renderLayers();

    queueMicrotask(() => {
      this.map?.invalidateSize();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['regions'] ||
      changes['hotspots']
    ) {
      this.renderLayers();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private renderLayers(): void {
    this.regionsLayer.clearLayers();
    this.hotspotsLayer.clearLayers();

    this.regions?.features.forEach((feature) => {
      L.polygon(feature.points.map((point) => this.toLatLng(point)), {
        color: feature.stroke,
        fillColor: feature.fill,
        fillOpacity: this.opacityForIntensity(feature.intensity),
        weight: feature.status === 'critical' ? 3.5 : 2.25,
      })
        .bindTooltip(feature.label, {
          direction: 'center',
          className: 'map-label',
          sticky: true,
        })
        .bindPopup(
          '<strong>' +
            feature.label +
            '</strong><br>Status: ' +
            feature.status +
            '<br>Intensity: ' +
            feature.intensity.toFixed(0),
        )
        .addTo(this.regionsLayer);
    });

    this.hotspots?.features.forEach((feature) => {
      L.circle(this.toLatLng(feature.center), {
        radius: feature.radius,
        color: feature.color,
        weight: 1.25,
        fillColor: feature.color,
        fillOpacity: 0.22,
      })
        .bindTooltip(feature.label, {
          direction: 'top',
          className: 'map-label',
        })
        .bindPopup(
          '<strong>' +
            feature.label +
            '</strong><br>Status: ' +
            feature.status +
            '<br>Radius: ' +
            (feature.radius / 1000).toFixed(1) +
            ' km',
        )
        .addTo(this.hotspotsLayer);

      L.circle(this.toLatLng(feature.center), {
        radius: feature.radius * 1.55,
        stroke: false,
        fillColor: feature.color,
        fillOpacity: 0.07,
      }).addTo(this.hotspotsLayer);

      L.circleMarker(this.toLatLng(feature.center), {
        radius: 5,
        color: '#fff7ed',
        weight: 1.5,
        fillColor: feature.color,
        fillOpacity: 0.92,
      }).addTo(this.hotspotsLayer);
    });
  }

  private toLatLng(point: GeoPoint): L.LatLngExpression {
    return [point.y, point.x];
  }

  private opacityForIntensity(intensity: number): number {
    return Math.max(0.25, Math.min(0.78, intensity / 130));
  }

  private supportsLeafletRuntime(): boolean {
    return !/jsdom/i.test(globalThis.navigator?.userAgent ?? '');
  }
}
