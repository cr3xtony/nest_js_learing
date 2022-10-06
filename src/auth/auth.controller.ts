import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { getUser, Public } from './decorator';
import { AuthDto, SignupDto } from './dto';
import { JwtGuard } from './guard/jwt.guard';
import { User } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signin(@Body() dto: AuthDto) {
    return this.authService.signin(dto);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  @Put('logout')
  logout(@getUser() user: User) {
    return this.authService.logout(user);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh-token')
  refreshToken(@getUser() user: User) {
    return this.authService.refreshTokens(user);
  }
}
