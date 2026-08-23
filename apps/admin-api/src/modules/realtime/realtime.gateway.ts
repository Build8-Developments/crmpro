import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload } from '../auth/auth.types';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      const token = authHeader?.split(' ')[1] || client.handshake.auth?.token;

      if (!token) {
        throw new Error('No token provided');
      }

      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const adminId = payload.sub;

      client.join(`admin:${adminId}`);
      client.join('admin-broadcast');
      this.logger.debug(`Admin ${adminId} connected to websocket`);
    } catch (error) {
      this.logger.error(`WebSocket connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected`);
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: { conversationId: string; userId: string; isTyping: boolean }) {
    this.server.to(`user:${payload.userId}`).emit('typing', {
      conversationId: payload.conversationId,
      actorType: 'ADMIN',
      isTyping: payload.isTyping,
    });
  }
}
