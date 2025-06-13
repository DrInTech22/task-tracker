const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const taskCounter = new promClient.Counter({
  name: 'tasks_total',
  help: 'Total number of task operations',
  labelNames: ['operation']
});

const activeTasksGauge = new promClient.Gauge({
  name: 'active_tasks',
  help: 'Number of active (non-completed) tasks'
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(taskCounter);
register.registerMetric(activeTasksGauge);

module.exports = {
  register,
  httpRequestDuration,
  taskCounter,
  activeTasksGauge
};