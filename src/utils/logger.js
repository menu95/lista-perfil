import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';

const GRAFANA_FARO_URL = import.meta.env.VITE_GRAFANA_FARO_URL;
const IS_PRODUCTION = import.meta.env.PROD;

let faro;

if (GRAFANA_FARO_URL) {
  faro = initializeFaro({
    url: GRAFANA_FARO_URL,
    app: {
      name: 'lista-psis-frontend',
      version: '1.0.0',
    },
    instrumentations: [
      ...getWebInstrumentations(),
    ],
  });
}

const logger = {
  log: (message, context = {}) => {
    // Em desenvolvimento: mostra no console
    if (!IS_PRODUCTION) {
      console.log(message, context);
    }
    // pushLog NÃO aparece no console - vai direto para Grafana
    if (faro) {
      faro.api.pushLog([message], {
        level: 'info',
        context: context,
      });
    }
  },
  
  info: (message, context = {}) => {
    if (!IS_PRODUCTION) console.info(message, context);
    if (faro) faro.api.pushLog([message], { level: 'info', context });
  },
  
  warn: (message, context = {}) => {
    if (!IS_PRODUCTION) console.warn(message, context);  
    if (faro) faro.api.pushLog([message], { level: 'warn', context });
  },
  
  error: (message, context = {}) => {
    console.error(message, context); // Erros sempre no console
    if (faro) faro.api.pushLog([message], { level: 'error', context });
  },
};

export default logger;
