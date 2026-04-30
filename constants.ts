import { User, Post, Task, ScheduleEvent, Course } from './types';

// Dados inicializados vazios para forçar o uso exclusivo do Supabase
export const USERS: User[] = [];

// --- Obfuscated Credentials ---
export const DECODE = (str: string) => typeof window !== 'undefined' ? decodeURIComponent(escape(atob(str))) : '';
export const CREDS = {
  EMAIL: 'cGFzY29tZHJpdmVAZ21haWwuY29t', // pascomdrive@gmail.com
  PASS_MAIN: 'cGFzNDJDT01zYXA=', // pas42COMsap
  IG_USER: 'QG9hbnRvbmlvX3Nh', // @oantonio_sa
  IG_PASS: 'Q29tdW5pY2HDp8Ojb1NhbnRvQW50b25pbzIwMjU=', // ComunicaçãoSantoAntonio2025
};

export const CURRENT_USER: User | null = null; 

export const POSTS: Post[] = [];

export const TASKS: Task[] = [];

export const SCHEDULES: ScheduleEvent[] = [];

export const COURSES: Course[] = [];