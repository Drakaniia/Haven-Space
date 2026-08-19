import { Hono } from 'hono';
import type { Env } from '../env';
import {
  handleGoogleAuthorize,
  handleGoogleCallback,
  handleGoogleComplete,
} from './auth/google.js';
import {
  handleCheckEmail,
  handleLogin,
  handleMe,
  handleRegister,
} from './auth/password.js';

const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post('/auth/check-email', handleCheckEmail);
authRoutes.post('/api/auth/check-email', handleCheckEmail);
authRoutes.post('/auth/register', handleRegister);
authRoutes.post('/api/auth/register', handleRegister);
authRoutes.post('/auth/login', handleLogin);
authRoutes.post('/api/auth/login', handleLogin);
authRoutes.get('/auth/me', handleMe);
authRoutes.get('/api/auth/me', handleMe);
authRoutes.get('/auth/google/authorize', handleGoogleAuthorize);
authRoutes.get('/api/auth/google/authorize', handleGoogleAuthorize);
authRoutes.get('/auth/google/callback', handleGoogleCallback);
authRoutes.get('/api/auth/google/callback', handleGoogleCallback);
authRoutes.post('/auth/google/complete', handleGoogleComplete);
authRoutes.post('/api/auth/google/complete', handleGoogleComplete);

export default authRoutes;
