import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import sequelize from '../src/config/database.js';

describe('Automation API', () => {
  let authToken;
  let automationId;
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  const testAutomation = {
    name: 'Test Automation',
    targetUrl: 'https://example.com',
    schedule: '*/5 * * * *' // Every 5 minutes
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/v1/auth/users/register')
      .send(testUser);
    
    authToken = registerResponse.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/v1/automations/create-automation', () => {
    it('should create a new automation', async () => {
      const response = await request(app)
        .post('/api/v1/automations/create-automation')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAutomation)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.automation.name).toBe(testAutomation.name);
      expect(response.body.automation.isActive).toBe(true);
      automationId = response.body.automation.id;
    });

    it('should validate cron schedule', async () => {
      const response = await request(app)
        .post('/api/v1/automations/create-automation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testAutomation,
          schedule: 'invalid-cron'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid cron');
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/v1/automations/create-automation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testAutomation,
          targetUrl: 'not-a-url'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce plan limits', async () => {
      // Create 5 automations (free plan limit)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/automations/create-automation')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testAutomation, name: `Test ${i}` });
      }

      // 6th should fail
      const response = await request(app)
        .post('/api/v1/automations/create-automation')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAutomation)
        .expect(400);

      expect(response.body.message).toContain('limit reached');
    });
  });

  describe('GET /api/v1/automations', () => {
    it('should get all user automations', async () => {
      const response = await request(app)
        .get('/api/v1/automations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.automations)).toBe(true);
      expect(response.body.automations.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/automations/:id', () => {
    it('should get single automation', async () => {
      const response = await request(app)
        .get(`/api/v1/automations/${automationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.automation.id).toBe(automationId);
    });

    it('should not get automation from another user', async () => {
      // Create another user
      const anotherUser = {
        email: `another${Date.now()}@example.com`,
        password: 'Password123!'
      };
      
      const registerResponse = await request(app)
        .post('/api/v1/auth/users/register')
        .send(anotherUser);

      const anotherToken = registerResponse.body.token;

      const response = await request(app)
        .get(`/api/v1/automations/${automationId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/automations/:id', () => {
    it('should update automation', async () => {
      const response = await request(app)
        .put(`/api/v1/automations/${automationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Automation',
          isActive: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.automation.name).toBe('Updated Automation');
      expect(response.body.automation.isActive).toBe(false);
    });
  });

  describe('DELETE /api/v1/automations/:id', () => {
    it('should delete automation', async () => {
      const response = await request(app)
        .delete(`/api/v1/automations/${automationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });
});
