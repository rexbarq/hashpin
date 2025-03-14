import request from 'supertest';
import app from './main';

describe('Hashpin Backend API', () => {
  describe('POST /api/hash', () => {
    it('should return 400 if hash is not provided', async () => {
      const response = await request(app)
        .post('/api/hash')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Hash is required');
    });

    it('should return 200 with success message when hash is provided', async () => {
      const testHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const response = await request(app)
        .post('/api/hash')
        .send({ hash: testHash });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('hash', testHash);
    });
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });
}); 