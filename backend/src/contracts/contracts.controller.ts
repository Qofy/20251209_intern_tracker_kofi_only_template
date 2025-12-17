import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContractsService } from './contracts.service';
import { Contract } from './contract.entity';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Get()
  async findAll(@Request() req, @Query() filters: any) {
    const companyId = req.user.company_id;
    return this.contractsService.findAll(companyId, filters);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.contractsService.findOne(+id, companyId);
  }

  @Post()
  async create(@Request() req, @Body() contractData: Partial<Contract>) {
    const company_id = req.user.company_id;
    return this.contractsService.create({ ...contractData, company_id });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() contractData: Partial<Contract>) {
    return this.contractsService.update(+id, contractData);
  }

  @Put(':id/sign-student')
  async signStudent(
    @Param('id') id: string,
    @Body() signatureData: { signature: string; date: string }
  ) {
    return this.contractsService.updateStatus(+id, 'mentor_review', {
      student_signature: signatureData.signature,
      student_signed_date: signatureData.date
    });
  }

  @Put(':id/submit-to-admin')
  async submitToAdmin(
    @Param('id') id: string,
    @Body() signatureData: { signature: string; date: string }
  ) {
    return this.contractsService.updateStatus(+id, 'pending_approval', {
      mentor_signature: signatureData.signature,
      mentor_signed_date: signatureData.date
    });
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() data: { admin_notes?: string }) {
    return this.contractsService.updateStatus(+id, 'approved', data);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string, @Body() data: { rejection_reason: string }) {
    return this.contractsService.updateStatus(+id, 'rejected', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.contractsService.remove(+id);
  }
}
