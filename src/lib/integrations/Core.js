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

export const InvokeLLM = async ({ prompt, add_context_from_internet = false }) => {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) throw new Error('Ollama not available');

    const data = await response.json();
    return data.response;
  } catch (error) {
    return "I'm your QuoteFlow AI assistant. Please ensure Ollama is running with 'ollama serve' and the llama3.2:latest model is installed with 'ollama pull llama3.2:latest'.";
  }
};
