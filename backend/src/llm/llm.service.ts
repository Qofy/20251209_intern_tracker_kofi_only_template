import { Injectable } from '@nestjs/common';

@Injectable()
export class LlmService {
  private ollamaUrl = 'http://localhost:11434/api/generate';

  async generate(prompt: string, responseJsonSchema?: any): Promise<any> {
    try {
      // If schema is provided, add it to the prompt
      let enhancedPrompt = prompt;
      if (responseJsonSchema) {
        enhancedPrompt += `\n\nIMPORTANT: Respond ONLY with valid JSON matching this schema:\n${JSON.stringify(responseJsonSchema, null, 2)}\n\nDo not include any explanation, markdown formatting, or code blocks. Return only the raw JSON object.`;
      }

      const response = await fetch(this.ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: enhancedPrompt,
          stream: false,
          format: responseJsonSchema ? 'json' : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama service responded with status ${response.status}`);
      }

      const data = await response.json();
      
      // If JSON schema was requested, try to parse the response
      if (responseJsonSchema) {
        try {
          return JSON.parse(data.response);
        } catch (parseError) {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = data.response.match(/```json\s*([\s\S]*?)\s*```/) || 
                           data.response.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[1].trim());
          }
          // Return raw response if parsing fails
          return data.response;
        }
      }
      
      return data.response;
    } catch (error) {
      console.error('Ollama API error:', error.message);
      throw new Error('Ollama service is not available. Please ensure Ollama is running with: ollama serve');
    }
  }
}
