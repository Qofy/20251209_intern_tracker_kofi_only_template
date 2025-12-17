import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async create(projectData: Partial<Project>): Promise<Project> {
    const project = this.projectsRepository.create(projectData);
    return this.projectsRepository.save(project);
  }

  async findAll(companyId?: number): Promise<Project[]> {
    if (companyId) {
      return this.projectsRepository.find({ where: { company_id: companyId } });
    }
    return this.projectsRepository.find();
  }

  async findOne(id: number): Promise<Project> {
    return this.projectsRepository.findOne({ where: { id } });
  }

  async update(id: number, projectData: Partial<Project>): Promise<Project> {
    await this.projectsRepository.update(id, projectData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.projectsRepository.delete(id);
  }
}
