import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { LlmService } from './llm.service';

@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('generate')
  async generate(
    @Body() body: { 
      prompt: string; 
      response_json_schema?: any; 
      add_context_from_internet?: boolean 
    }
  ) {
    try {
      const response = await this.llmService.generate(
        body.prompt, 
        body.response_json_schema
      );
      return { response };
    } catch (error) {
      throw new HttpException(
        { message: error.message || 'LLM service error' },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
