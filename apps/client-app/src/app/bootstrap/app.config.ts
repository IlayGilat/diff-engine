import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject } from '@angular/core';
import { InMemoryCache, split } from '@apollo/client/core';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient } from 'graphql-ws';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import {
  defaultGraphqlGatewayConfig,
  GRAPHQL_GATEWAY_CONFIG,
} from '../core/config/graphql-gateway.config';
import {
  REALTIME_DOMAIN_EFFECTS,
  REALTIME_DOMAIN_REDUCERS,
} from '../features/layers/config/layers.registration';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    {
      provide: GRAPHQL_GATEWAY_CONFIG,
      useValue: defaultGraphqlGatewayConfig,
    },
    provideApollo(() => {
      const gatewayConfig = inject(GRAPHQL_GATEWAY_CONFIG);
      const httpLink = inject(HttpLink);
      const http = httpLink.create({
        uri: gatewayConfig.httpUrl,
      });
      const ws = new GraphQLWsLink(
        createClient({
          url: gatewayConfig.wsUrl,
        }),
      );
      const link = split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === Kind.OPERATION_DEFINITION &&
            definition.operation === OperationTypeNode.SUBSCRIPTION
          );
        },
        ws,
        http,
      );

      return {
        link,
        cache: new InMemoryCache(),
      };
    }),
    provideStore(REALTIME_DOMAIN_REDUCERS as any),
    provideEffects(REALTIME_DOMAIN_EFFECTS),
  ],
};
