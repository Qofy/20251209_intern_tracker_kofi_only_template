import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from './portfolio.entity';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectRepository(Portfolio)
    private portfoliosRepository: Repository<Portfolio>,
  ) {}

  async create(data: Partial<Portfolio>): Promise<Portfolio> {
    const p = this.portfoliosRepository.create(data);
    return this.portfoliosRepository.save(p);
  }

  async findAll(studentEmail?: string): Promise<Portfolio[]> {
    if (studentEmail) {
      return this.portfoliosRepository.find({ where: { student_email: studentEmail }, order: { created_at: 'DESC' } });
    }
    return this.portfoliosRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<Portfolio> {
    return this.portfoliosRepository.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Portfolio>): Promise<Portfolio> {
    await this.portfoliosRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.portfoliosRepository.delete(id);
  }
}
