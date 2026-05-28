import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import { LLMEngine } from './llm_engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TASKS_FILE = path.join(ROOT, 'memory', 'agent_tasks.json');

const llm = new LLMEngine();

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'blocked' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  goal: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  subtasks: string[];
  parentId: string | null;
  result?: string;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  metadata: Record<string, unknown>;
}

export interface AgentState {
  currentTaskId: string | null;
  taskQueue: string[];
  completedTasks: string[];
  failedTasks: string[];
  activeGoals: string[];
  reflectionHistory: Array<{ taskId: string; lesson: string; timestamp: number }>;
  startTime: number;
}

export class AgentRuntime {
  private tasks: Map<string, Task> = new Map();
  private state: AgentState = {
    currentTaskId: null,
    taskQueue: [],
    completedTasks: [],
    failedTasks: [],
    activeGoals: [],
    reflectionHistory: [],
    startTime: Date.now()
  };
  private isRunning = false;
  private maxConcurrent = 1;

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
    await this.load();
    logger.info('AgentRuntime', 'Initialized with ' + this.tasks.size + ' tasks');
  }

  private async load(): Promise<void> {
    try {
      const raw = await fs.readFile(TASKS_FILE, 'utf-8');
      const data = JSON.parse(raw) as { tasks: Task[]; state: AgentState };
      for (const t of data.tasks) this.tasks.set(t.id, t);
      this.state = { ...this.state, ...data.state };
    } catch { /* first run */ }
  }

  private async save(): Promise<void> {
    const data = {
      tasks: Array.from(this.tasks.values()),
      state: this.state
    };
    await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  async decomposeGoal(goal: string): Promise<Task[]> {
    logger.info('AgentRuntime', 'Decomposing goal: ' + goal);

    const raw = await llm.generate({
      systemPrompt: 'You are a task decomposition engine. Break complex goals into atomic sub-tasks. Reply with JSON.',
      userPrompt: 'Decompose this goal into sub-tasks:\n"' + goal + '"\n\nReturn JSON array:\n[{"description": "...", "priority": "critical|high|medium|low"}]\n\nMax 10 sub-tasks. Each should be independently executable.',
      maxTokens: 2000
    });

    let subtasks: Array<{ description: string; priority: TaskPriority }>;
    try {
      subtasks = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      subtasks = [{ description: goal, priority: 'high' }];
    }

    const tasks: Task[] = [];
    const goalId = 'goal_' + Date.now();

    for (let i = 0; i < subtasks.length; i++) {
      const task: Task = {
        id: goalId + '_' + i,
        goal,
        description: subtasks[i].description,
        status: 'pending',
        priority: subtasks[i].priority,
        subtasks: [],
        parentId: null,
        attempts: 0,
        maxAttempts: 3,
        createdAt: Date.now(),
        metadata: {}
      };
      this.tasks.set(task.id, task);
      this.state.taskQueue.push(task.id);
      tasks.push(task);
    }

    this.state.activeGoals.push(goal);
    await this.save();
    return tasks;
  }

  async createTask(description: string, priority: TaskPriority = 'medium', parentId: string | null = null): Promise<Task> {
    const task: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      goal: '',
      description,
      status: 'pending',
      priority,
      subtasks: [],
      parentId,
      attempts: 0,
      maxAttempts: 3,
      createdAt: Date.now(),
      metadata: {}
    };
    this.tasks.set(task.id, task);
    this.state.taskQueue.push(task.id);
    await this.save();
    return task;
  }

  async executeTask(taskId: string, executor: (task: Task) => Promise<string>): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = 'running';
    task.startedAt = Date.now();
    task.attempts++;
    this.state.currentTaskId = taskId;
    await this.save();

    logger.info('AgentRuntime', 'Executing: ' + task.description);

    try {
      const result = await executor(task);
      task.status = 'success';
      task.result = result;
      task.completedAt = Date.now();
      this.state.completedTasks.push(taskId);

      // Reflection
      await this.reflect(task, result);

      logger.info('AgentRuntime', 'Completed: ' + task.description);
    } catch (err) {
      task.error = (err as Error).message;
      if (task.attempts >= task.maxAttempts) {
        task.status = 'failed';
        this.state.failedTasks.push(taskId);
        logger.error('AgentRuntime', 'Failed permanently: ' + task.description);
      } else {
        task.status = 'pending';
        logger.warn('AgentRuntime', 'Failed (retry ' + task.attempts + '/' + task.maxAttempts + '): ' + task.description);
      }
    }

    this.state.currentTaskId = null;
    await this.save();
    return task;
  }

  private async reflect(task: Task, result: string): Promise<void> {
    try {
      const raw = await llm.generate({
        systemPrompt: 'You analyze completed tasks. Reply with a single lesson learned as JSON: {"lesson": "..."}',
        userPrompt: 'Task: "' + task.description + '"\nResult: "' + result.substring(0, 500) + '"\n\nWhat lesson can be learned?',
        maxTokens: 200
      });

      const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      if (parsed.lesson) {
        this.state.reflectionHistory.push({
          taskId: task.id,
          lesson: parsed.lesson,
          timestamp: Date.now()
        });
      }
    } catch { /* reflection is best-effort */ }
  }

  getNextTask(): Task | null {
    const pendingIds = this.state.taskQueue.filter(id => {
      const t = this.tasks.get(id);
      return t && t.status === 'pending' && t.attempts < t.maxAttempts;
    });

    if (pendingIds.length === 0) return null;

    // Sort by priority
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    pendingIds.sort((a, b) => {
      const ta = this.tasks.get(a)!;
      const tb = this.tasks.get(b)!;
      return (priorityOrder[ta.priority] || 2) - (priorityOrder[tb.priority] || 2);
    });

    return this.tasks.get(pendingIds[0]) || null;
  }

  async runAutonomously(executor: (task: Task) => Promise<string>, maxIterations = 20): Promise<void> {
    this.isRunning = true;
    let iterations = 0;

    while (this.isRunning && iterations < maxIterations) {
      const task = this.getNextTask();
      if (!task) break;

      await this.executeTask(task.id, executor);
      iterations++;
    }

    this.isRunning = false;
    logger.info('AgentRuntime', 'Autonomous run completed after ' + iterations + ' iterations');
  }

  stop(): void {
    this.isRunning = false;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getPendingTasks(): Task[] {
    return this.getAllTasks().filter(t => t.status === 'pending');
  }

  getCompletedTasks(): Task[] {
    return this.getAllTasks().filter(t => t.status === 'success');
  }

  getFailedTasks(): Task[] {
    return this.getAllTasks().filter(t => t.status === 'failed');
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getReflections(): Array<{ taskId: string; lesson: string; timestamp: number }> {
    return [...this.state.reflectionHistory];
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = 'cancelled';
    this.state.taskQueue = this.state.taskQueue.filter(id => id !== taskId);
    await this.save();
    return true;
  }

  async clearCompleted(): Promise<number> {
    let count = 0;
    for (const id of this.state.completedTasks) {
      this.tasks.delete(id);
      count++;
    }
    this.state.completedTasks = [];
    await this.save();
    return count;
  }
}
