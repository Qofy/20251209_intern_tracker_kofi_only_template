import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Company } from './company.entity';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Body() createCompanyDto: Partial<Company>) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(+id);
  }

  @Get('key/:key')
  findByKey(@Param('key') key: string) {
    return this.companiesService.findByKey(key);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  getStats(@Param('id') id: string) {
    return this.companiesService.getCompanyStats(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateCompanyDto: Partial<Company>) {
    return this.companiesService.update(+id, updateCompanyDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.companiesService.remove(+id);
  }
}
