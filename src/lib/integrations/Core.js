export const UploadFile = async ({ file }) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        file_url: reader.result
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const InvokeLLM = async ({ prompt, response_json_schema, add_context_from_internet = false }) => {
  try {
    // Use backend proxy to avoid CORS issues
    const response = await fetch('http://localhost:3000/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        response_json_schema: response_json_schema,
        add_context_from_internet: add_context_from_internet
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'LLM service unavailable');
    }

    const data = await response.json();
    
    // If response_json_schema was provided, try to parse the response as JSON
    if (response_json_schema && typeof data.response === 'string') {
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = data.response.match(/```json\s*([\s\S]*?)\s*```/) || 
                         data.response.match(/```\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : data.response;
        return JSON.parse(jsonString.trim());
      } catch (parseError) {
        console.error('Failed to parse LLM response as JSON:', parseError);
        return { error: 'Failed to parse response', raw: data.response };
      }
    }
    
    return data.response;
  } catch (error) {
    console.error('InvokeLLM error:', error);
    // Fallback to mock data for schedule parsing
    if (response_json_schema?.properties?.schedule) {
      return {
        schedule: [
          { start_time: "09:00", end_time: "12:00", activity: "Morning work session", task_reference: "" },
          { start_time: "13:00", end_time: "17:00", activity: "Afternoon work session", task_reference: "" }
        ]
      };
    }
    return "LLM service is currently unavailable. Please ensure the backend server is running.";
  }
};
