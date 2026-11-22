import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthRateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { InvitationTokenDto } from './dto/invitation-token.dto';
import { SetPasswordWithTokenDto } from './dto/set-password-with-token.dto';
import { AccountRecoveryService } from './services/account-recovery.service';

/** Public (signed-out) account endpoints: password reset and invitations. */
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AccountRecoveryController {
  constructor(private readonly recovery: AccountRecoveryService) {}

  @Post('forgot-password')
  @HttpCode(200)
  @AuthRateLimit('password-reset')
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
  @AuthRateLimit('account-token')
  async resetPassword(@Body() dto: SetPasswordWithTokenDto) {
    await this.recovery.resetPassword(dto.token, dto.password);
    return { success: true, message: 'Password updated' };
  }

  /** Invitation details for the accept page (token in the body, not the path). */
  @Post('invitations/peek')
  @HttpCode(200)
  @AuthRateLimit('account-token')
  async getInvitation(@Body() dto: InvitationTokenDto) {
    const data = await this.recovery.getInvitation(dto.token);
    return { success: true, data };
  }

  @Post('accept-invite')
  @HttpCode(200)
  @AuthRateLimit('account-token')
  async acceptInvite(@Body() dto: SetPasswordWithTokenDto) {
    const data = await this.recovery.acceptInvitation(dto.token, dto.password);
    return { success: true, message: 'Invitation accepted', data };
  }
}
