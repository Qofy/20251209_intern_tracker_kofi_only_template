import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacancy } from './vacancy.entity';

@Injectable()
export class VacanciesService {
  constructor(
    @InjectRepository(Vacancy)
    private vacanciesRepository: Repository<Vacancy>,
  ) {}

  async create(data: Partial<Vacancy>): Promise<Vacancy> {
    const v = this.vacanciesRepository.create(data);
    return this.vacanciesRepository.save(v);
  }

  async findAll(companyId?: number): Promise<Vacancy[]> {
    if (companyId) {
      return this.vacanciesRepository.find({ where: { company_id: companyId }, order: { created_at: 'DESC' } });
    }
    return this.vacanciesRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<Vacancy> {
    return this.vacanciesRepository.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Vacancy>): Promise<Vacancy> {
    await this.vacanciesRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.vacanciesRepository.delete(id);
  }
}
