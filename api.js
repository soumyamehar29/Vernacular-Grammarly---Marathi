/* ======================================================
   Marathi Grammarly — API Module (Backend Integration)
====================================================== */

// ===== API Call =====
async function callBackendAPI(text) {
  try {
    const response = await fetch('/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (response.ok) {
      const data = await response.json();
      return data.corrected || text;
    } else {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  } catch (err) {
    throw new Error(err.message || 'Failed to connect to the server.');
  }
}

// ===== Error Handling =====
function getErrorMessages(error) {
  let mrMsg = 'त्रुटी आली. कृपया पुन्हा प्रयत्न करा.';
  let hiMsg = 'त्रुटि आई। कृपया पुनः प्रयास करें।';
  let enMsg = `Error: ${error.message}`;

  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to connect')) {
    mrMsg = 'सर्व्हरशी संपर्क होऊ शकला नाही.';
    hiMsg = 'सर्वर से संपर्क नहीं हो सका।';
    enMsg = 'Network error. Please check if the server is running.';
  }

  return { mrMsg, hiMsg, enMsg };
}

window.API = {
  callBackendAPI,
  getErrorMessages
};
