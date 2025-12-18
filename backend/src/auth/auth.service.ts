import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { StudentsService } from '../students/students.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private companiesService: CompaniesService,
    private studentsService: StudentsService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, company_id: user.company_id };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company_id: user.company_id,
        companyKey: user.companyKey,
      },
    };
  }

  async register(userData: { email: string; password: string; full_name: string; role?: string; companyKey: string }) {
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    // Validate company key
    if (!userData.companyKey) {
      throw new BadRequestException('Company key is required');
    }

    const company = await this.companiesService.findByKey(userData.companyKey);
    if (!company) {
      throw new BadRequestException('Invalid company key');
    }

    const user = await this.usersService.create({
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name,
      role: userData.role as any || 'student',
      company_id: company.id,
      companyKey: userData.companyKey,
    });

    // If user is registering as a student, automatically create a student record
    if (user.role === 'student') {
      try {
        await this.studentsService.create({
          student_email: user.email,
          full_name: user.full_name,
          company_id: company.id,
          status: 'active'
        });
      } catch (error) {
        console.log('Student record may already exist or failed to create:', error.message);
      }
    }

    return this.login(user);
  }
}
