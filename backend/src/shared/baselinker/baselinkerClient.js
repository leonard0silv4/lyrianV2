// Cliente HTTP para a API do BaseLinker (https://api.baselinker.com/connector.php).
// Contrato de request identico ao ja validado em producao no sistema antigo
// (crawler-backend/src/services/atelies/inventory.js): POST form-urlencoded com
// "method" + "parameters" (JSON), autenticado via header X-BLToken.

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;

class BaseLinkerError extends Error {
  constructor(message, { errorCode } = {}) {
    super(message);
    this.name = "BaseLinkerError";
    this.errorCode = errorCode;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callBaseLinker(method, parameters, { attempt = 1 } = {}) {
  const apiUrl = process.env.BASELINKER_API_URL;
  const token = process.env.BASELINKER_API_TOKEN;
  if (!apiUrl || !token) {
    throw new BaseLinkerError("BASELINKER_API_URL/BASELINKER_API_TOKEN nao configurados");
  }

  const body = new URLSearchParams({ method, parameters: JSON.stringify(parameters) });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: { "X-BLToken": token, "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (attempt < MAX_ATTEMPTS) {
      await sleep(500 * attempt);
      return callBaseLinker(method, parameters, { attempt: attempt + 1 });
    }
    throw new BaseLinkerError(`Falha de rede ao chamar BaseLinker (${method}): ${err.message}`);
  }
  clearTimeout(timeout);

  const data = await response.json();
  if (data?.status !== "SUCCESS") {
    throw new BaseLinkerError(`BaseLinker ${method}: ${data?.error_message || data?.error_code || "erro desconhecido"}`, {
      errorCode: data?.error_code,
    });
  }
  return data;
}

module.exports = { callBaseLinker, BaseLinkerError };
