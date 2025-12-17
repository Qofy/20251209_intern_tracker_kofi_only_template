import { Controller, Get, Put, Delete, UseGuards, Request, Query, Param, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.userId);
    const { password, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(@Request() req, @Query('role') role?: string) {
    const userCompanyId = req.user.company_id;
    
    if (role) {
      const users = await this.usersService.findByCompanyAndRole(userCompanyId, role);
      return users.map(({ password, ...user }) => user);
    }
    
    const users = await this.usersService.findAll(userCompanyId);
    return users.map(({ password, ...user }) => user);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() userData: Partial<any>) {
    const user = await this.usersService.update(+id, userData);
    const { password, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.remove(+id);
    return { message: 'User deleted successfully' };
  }
}
