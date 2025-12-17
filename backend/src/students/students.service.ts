import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
  ) {}

  async create(studentData: Partial<Student>): Promise<Student> {
    const student = this.studentsRepository.create(studentData);
    return this.studentsRepository.save(student);
  }

  async findAll(companyId?: number): Promise<Student[]> {
    if (companyId) {
      return this.studentsRepository.find({ where: { company_id: companyId } });
    }
    return this.studentsRepository.find();
  }

  async findByMentor(mentorEmail: string, companyId?: number): Promise<Student[]> {
    const where: any = { mentor_email: mentorEmail };
    if (companyId) {
      where.company_id = companyId;
    }
    return this.studentsRepository.find({ where });
  }

  async findByEmail(email: string): Promise<Student> {
    return this.studentsRepository.findOne({ where: { student_email: email } });
  }

  async findOne(id: number): Promise<Student> {
    return this.studentsRepository.findOne({ where: { id } });
  }

  async update(id: number, studentData: Partial<Student>): Promise<Student> {
    await this.studentsRepository.update(id, studentData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.studentsRepository.delete(id);
  }

  async findByCompany(companyId: number): Promise<Student[]> {
    return this.studentsRepository.find({ where: { company_id: companyId } });
  }
}
