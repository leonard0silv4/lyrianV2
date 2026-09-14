function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id, value) {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function sanitize(value, maxLength) {
  const clean = String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim();
  return clean.slice(0, maxLength) || "NA";
}

/**
 * Gera o payload EMV (Pix "copia e cola") estatico, sem chamada de rede,
 * a partir da chave Pix, nome/cidade do beneficiario e valor.
 */
function buildPixPayload({ pixKey, merchantName, merchantCity, amount, txid }) {
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", String(pixKey).trim());

  let payload =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986");

  if (amount !== undefined && amount !== null && amount > 0) {
    payload += tlv("54", Number(amount).toFixed(2));
  }

  payload +=
    tlv("58", "BR") +
    tlv("59", sanitize(merchantName, 25)) +
    tlv("60", sanitize(merchantCity, 15)) +
    tlv("62", tlv("05", sanitize(txid || "***", 25)));

  payload += "6304";
  return payload + crc16(payload);
}

module.exports = { buildPixPayload, crc16 };
