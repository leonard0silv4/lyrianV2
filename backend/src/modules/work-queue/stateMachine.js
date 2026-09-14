const ROLE_ATELIER = "atelier";
const ROLE_ADMIN_OWNER = "admin_owner";

const ALLOWED_TRANSITIONS = {
  criado: ["em_atelie"],
  em_atelie: ["em_producao"],
  em_producao: ["pronto"],
  pronto: ["coletado"],
  coletado: ["descarregado"],
  descarregado: ["auditoria_aprovada", "auditoria_divergente"],
  auditoria_divergente: ["em_producao", "auditoria_aprovada"],
  auditoria_aprovada: [],
};

const WHO_CAN_TRANSITION = {
  "criado->em_atelie": [ROLE_ATELIER, ROLE_ADMIN_OWNER],
  "em_atelie->em_producao": [ROLE_ATELIER, ROLE_ADMIN_OWNER],
  "em_producao->pronto": [ROLE_ATELIER, ROLE_ADMIN_OWNER],
  "pronto->coletado": [ROLE_ADMIN_OWNER],
  "coletado->descarregado": [ROLE_ADMIN_OWNER],
  "descarregado->auditoria_aprovada": [ROLE_ADMIN_OWNER],
  "descarregado->auditoria_divergente": [ROLE_ADMIN_OWNER],
  "auditoria_divergente->em_producao": [ROLE_ADMIN_OWNER],
  "auditoria_divergente->auditoria_aprovada": [ROLE_ADMIN_OWNER],
};

const STATUS_DATE_FIELD = {
  em_atelie: "emAtelieEm",
  em_producao: "emProducaoEm",
  pronto: "prontoEm",
  coletado: "coletadoEm",
  descarregado: "descarregadoEm",
  auditoria_aprovada: "auditoriaEm",
};

class TransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = "TransitionError";
    this.statusCode = 409;
  }
}

function principalRole(principal) {
  if (principal.principalType === "atelier") return ROLE_ATELIER;
  return ROLE_ADMIN_OWNER;
}

function assertTransition({ currentStatus, toStatus, principal, isOwnAtelier }) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new TransitionError(`Transicao de "${currentStatus}" para "${toStatus}" nao permitida`);
  }

  if (principal.principalType === "atelier" && !isOwnAtelier) {
    throw new TransitionError("Atelie nao pode alterar trabalhos de outro atelie");
  }

  const key = `${currentStatus}->${toStatus}`;
  const allowedRoles = WHO_CAN_TRANSITION[key] || [];
  const role = principalRole(principal);
  if (!allowedRoles.includes(role)) {
    throw new TransitionError(`Perfil "${role}" nao pode executar a transicao "${key}"`);
  }
}

function dateFieldFor(status) {
  return STATUS_DATE_FIELD[status];
}

module.exports = {
  ALLOWED_TRANSITIONS,
  WHO_CAN_TRANSITION,
  TransitionError,
  assertTransition,
  dateFieldFor,
  ROLE_ATELIER,
  ROLE_ADMIN_OWNER,
};
