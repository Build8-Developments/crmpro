import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { StringValue } from 'ms';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { TenantAccessModule } from '../../common/tenant-access/tenant-access.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { AccountRecoveryController } from './account-recovery.controller';
import { AuthController } from './auth.controller';
import { AccountRecoveryService } from './services/account-recovery.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    AuthRbacModule,
    TenantAccessModule,
    UsersModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.accessSecret'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            'auth.accessExpiration',
          ) as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController, AccountRecoveryController],
  providers: [AuthService, TokenService, JwtStrategy, AccountRecoveryService],
  exports: [TokenService],
})
export class AuthModule {}
