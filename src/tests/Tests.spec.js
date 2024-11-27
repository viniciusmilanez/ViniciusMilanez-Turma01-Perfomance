import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas
export const getWeatherDuration = new Trend('get_weather', true); // Tempo da requisição GET para obter o clima
export const failedRequests = new Rate('failed_requests'); // Taxa de falhas nas requisições

// Configurações de thresholds (valores máximos e mínimos para as métricas)
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.12'], // Menos de 12% de falhas
    http_req_duration: ['avg<10000', 'p(95)<5700'] // A média deve ser abaixo de 10 segundos, e 95% das requisições abaixo de 5700ms
  },
  stages: [
    { duration: '30s', target: 10 }, // Crescendo de 0 para 10 VUs em 30s
    { duration: '1m', target: 50 }, // Crescendo de 10 para 50 VUs em 1 minuto
    { duration: '1m', target: 100 }, // Crescendo de 50 para 100 VUs em 1 minuto
    { duration: '1m', target: 200 }, // Crescendo de 100 para 200 VUs em 1 minuto
    { duration: '1m', target: 300 }, // Crescendo de 200 para 300 VUs em 1 minuto
    { duration: '30s', target: 300 } // Mantendo 300 VUs por 30s
  ],
  ext: {
    loadimpact: {
      projectID: 123456,
      name: 'k6-load-test'
    }
  }
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const apiKey = '9b15f7c64840ba7541e03e5ab549f538';
  const city = 'London'; 
  const baseUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`; // URL da OpenWeatherMap API
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  // Fazendo uma requisição GET para obter o clima atual da cidade
  const res = http.get(baseUrl, params);

  // Adicionando o tempo de resposta à métrica 'get_weather' (medido em milissegundos)
  getWeatherDuration.add(res.timings.duration);

  // Verificando o status da resposta e registrando falhas
  const isSuccess = check(res, {
    'GET Weather - Status 200': () => res.status === OK
  });

  failedRequests.add(!isSuccess);
}
