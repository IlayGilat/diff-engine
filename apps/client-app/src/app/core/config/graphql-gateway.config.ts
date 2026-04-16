import { InjectionToken } from '@angular/core';

export interface GraphqlGatewayConfig {
  httpUrl: string;
  wsUrl: string;
}

export const GRAPHQL_GATEWAY_CONFIG =
  new InjectionToken<GraphqlGatewayConfig>('GRAPHQL_GATEWAY_CONFIG');

export const defaultGraphqlGatewayConfig: GraphqlGatewayConfig = {
  httpUrl: 'http://localhost:3335/graphql',
  wsUrl: 'ws://localhost:3335/graphql',
};
