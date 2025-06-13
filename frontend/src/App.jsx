import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      const task = await response.json();
      setTasks([...tasks, task]);
      setNewTask({ title: '', description: '' });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error creating task:', err);
    }
  };

  const toggleTask = async (id, completed) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      });
      
      if (!response.ok) throw new Error('Failed to update task');
      
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === id ? updatedTask : t));
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error updating task:', err);
    }
  };

  const deleteTask = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete task');
      
      setTasks(tasks.filter(t => t.id !== id));
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Task Tracker</h1>
      </header>
      
      <main>
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={createTask} className="task-form">
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <button type="submit">Add Task</button>
        </form>

        {loading ? (
          <div className="loading">Loading tasks...</div>
        ) : (
          <div className="task-list">
            {tasks.length === 0 ? (
              <p className="no-tasks">No tasks yet. Create one above!</p>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
                  <div className="task-content">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id, task.completed)}
                    />
                    <div>
                      <h3>{task.title}</h3>
                      {task.description && <p>{task.description}</p>}
                    </div>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;


