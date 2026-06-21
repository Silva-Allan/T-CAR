// ======================================================================
// T-CAR 2.0 — Logger Seguro
// ======================================================================
// Silencia TODOS os logs em produção para evitar vazamento de dados.
// Em desenvolvimento, funciona normalmente.
// ======================================================================

const IS_DEV = import.meta.env.DEV;

/**
 * Logger seguro que só emite mensagens em ambiente de desenvolvimento.
 * Em produção, todas as chamadas são no-ops.
 */
export const Logger = {
  log: (message: string, ...args: any[]) => {
    if (IS_DEV) console.log(message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    if (IS_DEV) console.warn(message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    // Em produção só loga a mensagem, sem objetos que podem conter dados sensíveis.
    if (IS_DEV) {
      console.error(message, ...args);
    } else {
      console.error(message);
    }
  },
  /** Log com timestamp formatado (para serviços como SyncService) */
  service: (serviceName: string, message: string, data?: any) => {
    if (!IS_DEV) return;
    const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    if (data !== undefined) {
      console.log(`[${serviceName} ${ts}] ${message}`, data);
    } else {
      console.log(`[${serviceName} ${ts}] ${message}`);
    }
  },
};
