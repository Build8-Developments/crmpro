import { Global, Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { UserTokensService } from './user-tokens.service';

@Global()
@Module({
  providers: [PasswordService, UserTokensService],
  exports: [PasswordService, UserTokensService],
})
export class SecurityModule {}
