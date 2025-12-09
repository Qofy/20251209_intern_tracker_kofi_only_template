import apiClient from '../api/client';

export const UploadFile = async ({ file }) => {
  try {
    const result = await apiClient.uploadFiles([file]);
    return { file_url: result.files[0] };
  } catch (error) {
    throw new Error('File upload failed');
  }
};

export const InvokeLLM = async ({ prompt, response_json_schema }) => {
  // Mock LLM response for schedule parsing
  const mockSchedule = [
    { start_time: "09:00", end_time: "12:00", activity: "Development work" },
    { start_time: "13:00", end_time: "17:00", activity: "Testing and documentation" }
  ];
  
  return { schedule: mockSchedule };
};

export const SendEmail = async ({ to, subject, body }) => {
  // Mock email sending
  console.log('Mock email sent:', { to, subject, body });
  return { success: true };
};