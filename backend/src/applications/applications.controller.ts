import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './application.entity';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@Body() applicationData: Partial<Application>) {
    return this.applicationsService.create(applicationData);
  }

  @Get()
  findAll(@Query() filters: any) {
    return this.applicationsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() applicationData: Partial<Application>) {
    return this.applicationsService.update(+id, applicationData);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.applicationsService.delete(+id);
  }
}
