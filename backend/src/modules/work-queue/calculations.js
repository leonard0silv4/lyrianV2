const CUSTO_POR_METRO = 0.4;
const FATOR_FITA = 0.35;
const DIVISOR_ROLO = 48;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function calculateMetrics({ larguraBobina, comprimentoBobina, quantidadeFardo, emenda }) {
  const larg = Number(larguraBobina) || 0;
  const compr = Number(comprimentoBobina) || 0;
  const qtd = Number(quantidadeFardo) || 0;

  const totalMetros = emenda ? (larg * 2 + compr * 3) * qtd : (larg * 2 + compr * 2) * qtd;
  const orcamento = totalMetros * CUSTO_POR_METRO;
  const qtdRolos = (totalMetros * FATOR_FITA) / DIVISOR_ROLO;

  return {
    totalMetros: round2(totalMetros),
    orcamento: round2(orcamento),
    qtdRolos: round2(qtdRolos),
  };
}

module.exports = { calculateMetrics, CUSTO_POR_METRO, FATOR_FITA, DIVISOR_ROLO, round2 };
