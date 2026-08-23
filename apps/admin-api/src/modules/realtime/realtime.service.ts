import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  notifyUser(userId: string, payload: any) {
    this.gateway.server.to(`user:${userId}`).emit(payload.event, payload.data);
  }

  notifyAdmins(payload: any) {
    this.gateway.server.to('admin-broadcast').emit(payload.event, payload.data);
  }
}
