import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { Certificate } from './certificate.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  async create(@Body() certificateData: Partial<Certificate>, @Request() req): Promise<Certificate> {
    // Attach company_id from authenticated user
    if (req.user?.company_id) {
      certificateData.company_id = req.user.company_id;
    }
    return this.certificatesService.create(certificateData);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req): Promise<Certificate[]> {
    // Filter by company_id from authenticated user
    const filters = { ...query };
    if (req.user?.company_id) {
      filters.company_id = req.user.company_id;
    }
    return this.certificatesService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Certificate> {
    return this.certificatesService.findOne(+id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() certificateData: Partial<Certificate>,
  ): Promise<Certificate> {
    return this.certificatesService.update(+id, certificateData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.certificatesService.delete(+id);
  }
}
