import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { Project } from './project.entity';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  async findAll(@Request() req) {
    const userCompanyId = req.user.company_id;
    return this.projectsService.findAll(userCompanyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(+id);
  }

  @Post()
  async create(@Body() projectData: Partial<Project>, @Request() req) {
    projectData.company_id = req.user.company_id;
    return this.projectsService.create(projectData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() projectData: Partial<Project>) {
    return this.projectsService.update(+id, projectData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.projectsService.remove(+id);
    return { message: 'Project deleted successfully' };
  }
}
