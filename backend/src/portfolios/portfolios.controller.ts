import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PortfoliosService } from './portfolios.service';
import { Portfolio } from './portfolio.entity';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private portfoliosService: PortfoliosService) {}

  @Get()
  async findAll(@Query('student_email') student_email: string) {
    return this.portfoliosService.findAll(student_email);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.portfoliosService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() data: Partial<Portfolio>, @Request() req) {
    data.student_email = req.user?.email || data.student_email;
    return this.portfoliosService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Portfolio>) {
    return this.portfoliosService.update(+id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.portfoliosService.remove(+id);
    return { message: 'Portfolio item deleted' };
  }
}
