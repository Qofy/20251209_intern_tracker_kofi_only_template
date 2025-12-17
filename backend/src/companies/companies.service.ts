import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import * as crypto from 'crypto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
  ) {}

  generateCompanyKey(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  async create(createCompanyDto: Partial<Company>): Promise<Company> {
    // Check if company name already exists
    const existingCompany = await this.companiesRepository.findOne({
      where: { name: createCompanyDto.name },
    });

    if (existingCompany) {
      throw new ConflictException('Company name already exists');
    }

    // Generate unique company key
    const companyKey = this.generateCompanyKey();

    const company = this.companiesRepository.create({
      ...createCompanyDto,
      companyKey,
    });

    return this.companiesRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return this.companiesRepository.find({
      relations: ['users'],
    });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async findByKey(companyKey: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { companyKey },
      relations: ['users'],
    });

    if (!company) {
      throw new NotFoundException('Invalid company key');
    }

    return company;
  }

  async update(id: number, updateCompanyDto: Partial<Company>): Promise<Company> {
    const company = await this.findOne(id);

    Object.assign(company, updateCompanyDto);

    return this.companiesRepository.save(company);
  }

  async remove(id: number): Promise<void> {
    const company = await this.findOne(id);
    await this.companiesRepository.remove(company);
  }

  async getCompanyStats(companyId: number) {
    const company = await this.findOne(companyId);
    
    const stats = {
      totalUsers: company.users?.length || 0,
      admins: company.users?.filter(u => u.role === 'admin').length || 0,
      mentors: company.users?.filter(u => u.role === 'mentor').length || 0,
      students: company.users?.filter(u => u.role === 'student').length || 0,
    };

    return {
      company,
      stats,
    };
  }
}
