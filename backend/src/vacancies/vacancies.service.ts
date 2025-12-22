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
      // Company-scoped: show all vacancies for the company
      const companyVacancies = await this.vacanciesRepository.find({
        where: { company_id: companyId },
        order: { created_at: 'DESC' }
      });
      console.log(`[Vacancies] Found ${companyVacancies.length} vacancies for company ${companyId}`);
      return companyVacancies;
    }
    // Public access: show only open vacancies
    const openVacancies = await this.vacanciesRepository.find({
      where: { status: 'open' },
      order: { created_at: 'DESC' }
    });
    console.log(`[Vacancies] PUBLIC ACCESS - Found ${openVacancies.length} open vacancies`);
    return openVacancies;
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
