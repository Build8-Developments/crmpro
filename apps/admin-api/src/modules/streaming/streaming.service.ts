import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface SseMessageEvent {
  data: any;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class StreamingService implements OnModuleInit, OnModuleDestroy {
  private readonly clients = new Map<string, Set<Subject<SseMessageEvent>>>();
  private readonly pub: Redis;
  private readonly sub: Redis;

  constructor(
    private readonly config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);
  }

  onModuleInit() {
    this.sub.subscribe('realtime-events');
    this.sub.on('message', (channel, message) => {
      if (channel === 'realtime-events') {
        const { userId, event } = JSON.parse(message);
        this.pushToUserLocal(userId, event);
      }
    });
  }

  onModuleDestroy() {
    this.pub.quit();
    this.sub.quit();
    for (const userSubjects of this.clients.values()) {
      userSubjects.forEach(subject => subject.complete());
    }
    this.clients.clear();
  }

  subscribeUser(userId: string): Subject<SseMessageEvent> {
    // Admin clients connect here. We register them both under their ID and 'admin-broadcast'
    let userSubjects = this.clients.get(userId);
    if (!userSubjects) {
      userSubjects = new Set();
      this.clients.set(userId, userSubjects);
    }
    const subject = new Subject<SseMessageEvent>();
    userSubjects.add(subject);
    
    let adminBroadcast = this.clients.get('admin-broadcast');
    if (!adminBroadcast) {
      adminBroadcast = new Set();
      this.clients.set('admin-broadcast', adminBroadcast);
    }
    adminBroadcast.add(subject);
    
    return subject;
  }

  unsubscribeUser(userId: string, subject: Subject<SseMessageEvent>): void {
    const userSubjects = this.clients.get(userId);
    if (userSubjects) {
      userSubjects.delete(subject);
      if (userSubjects.size === 0) {
        this.clients.delete(userId);
      }
    }
    
    const adminBroadcast = this.clients.get('admin-broadcast');
    if (adminBroadcast) {
      adminBroadcast.delete(subject);
    }
    
    subject.complete();
  }

  public publishToRedis(userId: string, event: SseMessageEvent) {
    this.pub.publish('realtime-events', JSON.stringify({ userId, event }));
  }

  private pushToUserLocal(userId: string, event: SseMessageEvent) {
    const userSubjects = this.clients.get(userId);
    if (userSubjects) {
      userSubjects.forEach(subject => subject.next(event));
    }
  }
}
