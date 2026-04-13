/* ======================================================
   Marathi Grammarly — API Module (UPDATED)
====================================================== */

const API_CONFIG = {
  models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  systemPrompt: `You are a Marathi language grammar and spelling correction assistant. The user will give you Marathi text. You must: 
1) Correct all spelling mistakes 
2) Fix grammar errors 
3) Improve sentence structure if needed 
4) Return ONLY the corrected Marathi text — no explanation, no English, no extra words. 
If the input is already correct, return it as-is.`
};

// ✅ NEW BODY FORMAT (generateContent)
function buildRequestBody(text) {
  return {
    contents: [
      {
        parts: [
          {
            text: `${API_CONFIG.systemPrompt}\n\n${text}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048
    }
  };
}

// ✅ NEW RESPONSE PARSER
function parseGeminiResponse(data) {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ===== API Call =====
async function callGeminiAPI(text, apiKey) {
  let lastError;

  for (const model of API_CONFIG.models) {
    const url = `${API_CONFIG.baseUrl}/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(text))
      });

      if (response.ok) {
        const data = await response.json();
        const result = parseGeminiResponse(data);

        if (result) return result.trim();
        lastError = 'Empty response';
      } else {
        const errData = await response.json().catch(() => ({}));
        lastError = errData?.error?.message || `HTTP ${response.status}`;
      }

    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'All models failed.');
}

// ===== Error Handling =====
function getErrorMessages(error) {
  let mrMsg = 'त्रुटी आली. कृपया पुन्हा प्रयत्न करा.';
  let hiMsg = 'त्रुटि आई। कृपया पुनः प्रयास करें।';
  let enMsg = `Error: ${error.message}`;

  if (error.message.includes('API key')) {
    mrMsg = 'API Key चुकीची आहे.';
    hiMsg = 'API Key गलत है।';
    enMsg = 'Invalid API Key.';
  }

  if (error.message.includes('Failed to fetch')) {
    mrMsg = 'इंटरनेट समस्या.';
    hiMsg = 'इंटरनेट समस्या।';
    enMsg = 'Network error.';
  }

  return { mrMsg, hiMsg, enMsg };
}

window.API = {
  callGeminiAPI,
  getErrorMessages
};
