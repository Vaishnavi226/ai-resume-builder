const axios = require('axios');

/**
 * Compiles a LaTeX string into a PDF buffer using the latexonline.cc public API.
 * @param {string} texString - The complete LaTeX document markup.
 * @returns {Promise<Buffer>} - The compiled PDF binary buffer.
 */
async function compileLatex(texString) {
  try {
    const response = await axios.get('https://latexonline.cc/compile', {
      params: {
        text: texString
      },
      responseType: 'arraybuffer',
      timeout: 30000 // 30 seconds timeout for compile
    });

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/pdf')) {
      return response.data;
    } else {
      // Compilation error logs are returned in plain text
      const errorLogs = Buffer.from(response.data).toString('utf8');
      console.error('LaTeX compilation logs:', errorLogs);
      throw new Error(`LaTeX compiler error. Log summary: ${errorLogs.slice(0, 500)}...`);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      const errorMsg = Buffer.from(error.response.data).toString('utf8');
      console.error('LaTeX compile endpoint error response:', errorMsg);
      throw new Error(`LaTeX Service Error: ${errorMsg.slice(0, 500)}`);
    }
    console.error('LaTeX Compile Exception:', error.message);
    throw new Error(`Failed to contact LaTeX compilation server: ${error.message}`);
  }
}

module.exports = { compileLatex };

