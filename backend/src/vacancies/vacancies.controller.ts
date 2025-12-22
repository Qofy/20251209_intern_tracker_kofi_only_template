import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VacanciesService } from './vacancies.service';
import { Vacancy } from './vacancy.entity';

@Controller('vacancies')
export class VacanciesController {
  constructor(private vacanciesService: VacanciesService) {}

  // Public endpoint - anyone can view vacancies
  // Always show public vacancies, regardless of authentication
  @Get()
  async findAll() {
    return this.vacanciesService.findAll();
  }

  // Public endpoint - anyone can view individual vacancy
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vacanciesService.findOne(+id);
  }

  // Protected endpoint - only authenticated users can create vacancies
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: Partial<Vacancy>, @Request() req) {
    data.posted_by = req.user?.email || data.posted_by;
    data.company_id = req.user?.company_id || data.company_id;
    return this.vacanciesService.create(data);
  }

  // Protected endpoint - only authenticated users can update vacancies
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() data: Partial<Vacancy>) {
    return this.vacanciesService.update(+id, data);
  }

  // Protected endpoint - only authenticated users can delete vacancies
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.vacanciesService.remove(+id);
    return { message: 'Vacancy deleted' };
  }
}
