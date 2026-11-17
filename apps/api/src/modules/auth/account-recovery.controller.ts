import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SetPasswordWithTokenDto } from './dto/set-password-with-token.dto';
import { AccountRecoveryService } from './services/account-recovery.service';

/** Public (unauthenticated) self-service account endpoints. */
@Controller('auth')
export class AccountRecoveryController {
  constructor(private readonly recovery: AccountRecoveryService) {}

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({
    default: { limit: 5, ttl: 15 * 60_000 },
    hourly: { limit: 10, ttl: 3_600_000 },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.recovery.requestPasswordReset(dto.tenantSlug, dto.email);

    // Same answer whether or not the account exists.
    return {
      success: true,
      message: 'If the account exists, a reset link has been sent',
    };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async resetPassword(@Body() dto: SetPasswordWithTokenDto) {
    await this.recovery.resetPassword(dto.token, dto.password);
    return { success: true, message: 'Password updated' };
  }

  @Get('invitations/:token')
  @Throttle({ default: { limit: 20, ttl: 15 * 60_000 } })
  async getInvitation(@Param('token') token: string) {
    const data = await this.recovery.getInvitation(token);
    return { success: true, data };
  }

  @Post('accept-invite')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async acceptInvite(@Body() dto: SetPasswordWithTokenDto) {
    const data = await this.recovery.acceptInvitation(dto.token, dto.password);
    return { success: true, message: 'Invitation accepted', data };
  }
}
