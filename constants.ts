import { User, Post, Task, ScheduleEvent, Course } from './types';

// Dados inicializados vazios para forçar o uso exclusivo do Supabase
export const USERS: User[] = [];

export const CURRENT_USER: User | null = null; 

export const POSTS: Post[] = [];

export const TASKS: Task[] = [];

export const SCHEDULES: ScheduleEvent[] = [];

export const COURSES: Course[] = [];