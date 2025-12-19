import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './contract.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractsRepository: Repository<Contract>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(contractData: Partial<Contract>): Promise<Contract> {
    // Populate student and mentor names from User table
    if (contractData.student_email) {
      const student = await this.usersRepository.findOne({ 
        where: { email: contractData.student_email } 
      });
      if (student) {
        contractData.student_name = student.full_name;
      }
    }

    if (contractData.mentor_email) {
      const mentor = await this.usersRepository.findOne({ 
        where: { email: contractData.mentor_email } 
      });
      if (mentor) {
        contractData.mentor_name = mentor.full_name;
      }
    }

    const contract = this.contractsRepository.create(contractData);
    return this.contractsRepository.save(contract);
  }

  async findAll(companyId: number, filters?: any): Promise<Contract[]> {
    const query: any = { company_id: companyId };
    
    if (filters?.status) query.status = filters.status;
    if (filters?.mentor_email) query.mentor_email = filters.mentor_email;
    if (filters?.student_email) query.student_email = filters.student_email;
    
    const contracts = await this.contractsRepository.find({ 
      where: query, 
      order: { created_at: 'DESC' } 
    });

    // Populate missing names for contracts that don't have them
    for (const contract of contracts) {
      let needsUpdate = false;
      const updateData: any = {};

      if (!contract.student_name && contract.student_email) {
        const student = await this.usersRepository.findOne({ 
          where: { email: contract.student_email } 
        });
        if (student) {
          updateData.student_name = student.full_name;
          contract.student_name = student.full_name;
          needsUpdate = true;
        }
      }

      if (!contract.mentor_name && contract.mentor_email) {
        const mentor = await this.usersRepository.findOne({ 
          where: { email: contract.mentor_email } 
        });
        if (mentor) {
          updateData.mentor_name = mentor.full_name;
          contract.mentor_name = mentor.full_name;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await this.contractsRepository.update(contract.id, updateData);
      }
    }

    return contracts;
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
