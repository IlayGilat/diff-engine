export interface LayerUiMetadata {
  displayName: string;
  description: string;
  accentColor: string;
}

export const regionsLayerUiMetadata: LayerUiMetadata = {
  displayName: 'Regions',
  description: 'Territory polygons that pulse as area intensity changes.',
  accentColor: '#0f766e',
};

export const hotspotsLayerUiMetadata: LayerUiMetadata = {
  displayName: 'Hotspots',
  description: 'Circular alerts that expand, contract, and relocate over time.',
  accentColor: '#c2410c',
};
