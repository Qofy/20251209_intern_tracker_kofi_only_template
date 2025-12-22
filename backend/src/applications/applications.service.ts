import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private applicationsRepository: Repository<Application>,
  ) {}

  async create(applicationData: Partial<Application>): Promise<Application> {
    const application = this.applicationsRepository.create(applicationData);
    return this.applicationsRepository.save(application);
  }

  async findAll(filters?: any): Promise<Application[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.company_id) query.company_id = filters.company_id;
    return this.applicationsRepository.find({
      where: query,
      order: { created_at: 'DESC' }
    });
  }

  async findOne(id: number): Promise<Application> {
    return this.applicationsRepository.findOne({ where: { id } });
  }

  async update(id: number, applicationData: Partial<Application>): Promise<Application> {
    await this.applicationsRepository.update(id, applicationData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.applicationsRepository.delete(id);
  }
}
