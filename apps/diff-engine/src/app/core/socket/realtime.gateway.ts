import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  DIFF_ENGINE_SOCKET_EVENTS,
  PollingStopTarget,
  PollingSubscriptionTarget,
} from '@org/models';
import { Socket } from 'socket.io';
import { PollingOrchestratorService } from '../polling/polling-orchestrator.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly pollingOrchestratorService: PollingOrchestratorService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log('Socket connected: ' + client.id);
  }

  handleDisconnect(client: Socket): void {
    this.pollingOrchestratorService.stopSocket(client.id);
    this.logger.log('Socket disconnected: ' + client.id);
  }

  @SubscribeMessage(DIFF_ENGINE_SOCKET_EVENTS.startPolling)
  async handleStartPolling(
    @MessageBody() payload: PollingSubscriptionTarget<string>,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.pollingOrchestratorService.start(client, payload);
  }

  @SubscribeMessage(DIFF_ENGINE_SOCKET_EVENTS.stopPolling)
  handleStopPolling(
    @MessageBody() payload: PollingStopTarget<string>,
    @ConnectedSocket() client: Socket,
  ): void {
    this.pollingOrchestratorService.stopDomain(client.id, payload);
  }
}
