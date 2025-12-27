import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './certificate.entity';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private certificatesRepository: Repository<Certificate>,
  ) {}

  async create(certificateData: Partial<Certificate>): Promise<Certificate> {
    // Generate certificate number if not provided
    if (!certificateData.certificate_number) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      certificateData.certificate_number = `CERT-${timestamp}-${random}`;
    }

    const certificate = this.certificatesRepository.create(certificateData);
    return this.certificatesRepository.save(certificate);
  }

  async findAll(filters?: any): Promise<Certificate[]> {
    const query: any = {};

    if (filters?.company_id) {
      query.company_id = filters.company_id;
    }

    if (filters?.student_name) {
      query.student_name = filters.student_name;
    }

    if (filters?.student_email) {
      query.student_email = filters.student_email;
    }

    const orderBy = filters?.order_by || 'created_date';
    const orderDirection = orderBy.startsWith('-') ? 'DESC' : 'ASC';
    const orderField = orderBy.replace('-', '');

    return this.certificatesRepository.find({
      where: query,
      order: { [orderField]: orderDirection }
    });
  }

  async findOne(id: number): Promise<Certificate> {
    return this.certificatesRepository.findOne({ where: { id } });
  }

  async update(id: number, certificateData: Partial<Certificate>): Promise<Certificate> {
    await this.certificatesRepository.update(id, certificateData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.certificatesRepository.delete(id);
  }
}
