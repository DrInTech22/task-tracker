const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { register, httpRequestDuration, taskCounter, activeTasksGauge } = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
    
    // Record metrics
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration / 1000);
  });
  next();
});

// In-memory task storage
let tasks = [];

// Update active tasks gauge
const updateActiveTasksGauge = () => {
  const activeTasks = tasks.filter(t => !t.completed).length;
  activeTasksGauge.set(activeTasks);
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  logger.info('Fetching all tasks', { count: tasks.length });
  res.json(tasks);
});

// Create task
app.post('/api/tasks', (req, res) => {
  const { title, description } = req.body;
  
  if (!title) {
    logger.warn('Task creation failed - missing title');
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const task = {
    id: uuidv4(),
    title,
    description: description || '',
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  tasks.push(task);
  taskCounter.labels('created').inc();
  updateActiveTasksGauge();
  
  logger.info('Task created', { 
    taskId: task.id, 
    title: task.title,
    businessEvent: 'task_created'
  });
  
  res.status(201).json(task);
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;
  
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) {
    logger.warn('Task update failed - not found', { taskId: id });
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const oldTask = tasks[taskIndex];
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    title: title !== undefined ? title : tasks[taskIndex].title,
    description: description !== undefined ? description : tasks[taskIndex].description,
    completed: completed !== undefined ? completed : tasks[taskIndex].completed,
    updatedAt: new Date().toISOString()
  };
  
  // Log business event
  if (oldTask.completed !== tasks[taskIndex].completed) {
    const event = tasks[taskIndex].completed ? 'task_completed' : 'task_reopened';
    taskCounter.labels(event).inc();
    logger.info('Task status changed', {
      taskId: id,
      businessEvent: event,
      completed: tasks[taskIndex].completed
    });
  }
  
  updateActiveTasksGauge();
  res.json(tasks[taskIndex]);
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) {
    logger.warn('Task deletion failed - not found', { taskId: id });
    return res.status(404).json({ error: 'Task not found' });
  }
  
  tasks.splice(taskIndex, 1);
  taskCounter.labels('deleted').inc();
  updateActiveTasksGauge();
  
  logger.info('Task deleted', { 
    taskId: id,
    businessEvent: 'task_deleted'
  });
  
  res.status(204).send();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT });
  console.log(`Server running on port ${PORT}`);
});