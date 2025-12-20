import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VacanciesService } from './vacancies.service';
import { Vacancy } from './vacancy.entity';

@Controller('vacancies')
@UseGuards(JwtAuthGuard)
export class VacanciesController {
  constructor(private vacanciesService: VacanciesService) {}

  @Get()
  async findAll(@Request() req) {
    const companyId = req.user?.company_id;
    return this.vacanciesService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vacanciesService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Partial<Vacancy>, @Request() req) {
    data.posted_by = req.user?.email || data.posted_by;
    data.company_id = req.user?.company_id || data.company_id;
    return this.vacanciesService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Vacancy>) {
    return this.vacanciesService.update(+id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.vacanciesService.remove(+id);
    return { message: 'Vacancy deleted' };
  }
}
