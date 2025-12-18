import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './contract.entity';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractsRepository: Repository<Contract>,
  ) {}

  async create(contractData: Partial<Contract>): Promise<Contract> {
    const contract = this.contractsRepository.create(contractData);
    return this.contractsRepository.save(contract);
  }

  async findAll(companyId: number, filters?: any): Promise<Contract[]> {
    const query: any = { company_id: companyId };
    
    if (filters?.status) query.status = filters.status;
    if (filters?.mentor_email) query.mentor_email = filters.mentor_email;
    if (filters?.student_email) query.student_email = filters.student_email;
    
    return this.contractsRepository.find({ 
      where: query, 
      order: { created_at: 'DESC' } 
    });
  }

  async findOne(id: number, companyId: number): Promise<Contract> {
    return this.contractsRepository.findOne({ 
      where: { id, company_id: companyId } 
    });
  }

  async update(id: number, contractData: Partial<Contract>): Promise<Contract> {
    await this.contractsRepository.update(id, contractData);
    return this.contractsRepository.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.contractsRepository.delete(id);
  }

  async updateStatus(id: number, status: string, additionalData?: any): Promise<Contract> {
    const updateData: any = { status, ...additionalData };
    await this.contractsRepository.update(id, updateData);
    return this.contractsRepository.findOne({ where: { id } });
  }

  async studentSignContract(id: number): Promise<Contract> {
    const currentDate = new Date().toISOString().split('T')[0];
    await this.contractsRepository.update(id, {
      status: 'mentor_reviewing',
      student_signed_date: currentDate
    });
    return this.contractsRepository.findOne({ where: { id } });
  }

  async mentorReviewContract(id: number, approved: boolean, feedback?: string): Promise<Contract> {
    const status = approved ? 'admin_reviewing' : 'student_signed';
    const currentDate = new Date().toISOString().split('T')[0];
    await this.contractsRepository.update(id, {
      status,
      mentor_reviewed_at: currentDate,
      mentor_feedback: feedback
    });
    return this.contractsRepository.findOne({ where: { id } });
  }

  async adminReviewContract(id: number, approved: boolean, feedback?: string): Promise<Contract> {
    const status = approved ? 'admin_approved' : 'admin_rejected';
    const currentDate = new Date().toISOString().split('T')[0];
    await this.contractsRepository.update(id, {
      status,
      admin_reviewed_at: currentDate,
      admin_feedback: feedback
    });
    return this.contractsRepository.findOne({ where: { id } });
  }
}
