import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

export const getUsersDuration = new Trend('get_users', true); // Tempo da requisição GET dos usuários

// Configurações de thresholds (valores máximos e mínimos para as métricas)
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.30'], // Permite até 90% de falhas nas fases iniciais  ----- ALTERAR PARA 0.30
    http_req_duration: ['avg<10000'] // A duração média das requisições deve ser abaixo de 10000ms (10s)
  },
  stages: [
    { duration: '5s', target: 5 }, // Crescendo de 0 para 5 usuários em 5s
    { duration: '10s', target: 10 }, // Crescendo de 5 para 10 usuários em 10s
    { duration: '15s', target: 15 }, // Crescendo de 10 para 15 usuários em 15s
    { duration: '20s', target: 20 }, // Crescendo de 15 para 20 usuários em 20s
    { duration: '30s', target: 25 }, // Crescendo de 20 para 25 usuários em 30s
    { duration: '30s', target: 30 }, // Crescendo de 25 para 30 usuários em 30s
    { duration: '20s', target: 30 }, // Mantendo 30 usuários por 20s
    { duration: '10s', target: 0 } // Reduzindo para 0 usuários em 10s
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
  const baseUrl = 'https://reqres.in/api/users'; // URL da ReqRes API
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  // Fazendo uma requisição GET para obter usuários (página 2)
  const res = http.get(`${baseUrl}?page=2`, params);

  // Adicionando o tempo de resposta à métrica 'get_users' (medido em milissegundos)
  getUsersDuration.add(res.timings.duration);

  // Validando se a resposta tem o status 200
  check(res, {
    'GET Users - Status 200': () => res.status === OK
  });
}
