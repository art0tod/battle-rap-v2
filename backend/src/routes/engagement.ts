import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { addComment, likeTrack, listComments, unlikeTrack } from '../services/engagement.js';

const engagementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/likes', { preHandler: fastify.requireAuth }, async (request) => {
    const body = z.object({ match_track_id: z.string().uuid() }).parse(request.body);
    return likeTrack(request.authUser!.id, body.match_track_id);
  });

  fastify.delete('/likes/:matchTrackId', { preHandler: fastify.requireAuth }, async (request) => {
    const params = z.object({ matchTrackId: z.string().uuid() }).parse(request.params);
    return unlikeTrack(request.authUser!.id, params.matchTrackId);
  });

  fastify.get('/comments', async (request) => {
    const query = z
      .object({
        match_id: z.string().uuid(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        before_id: z.string().uuid().optional(),
      })
      .parse(request.query);
    return listComments({ matchId: query.match_id, limit: query.limit, beforeId: query.before_id });
  });

  fastify.post('/comments', { preHandler: fastify.requireAuth }, async (request) => {
    const body = z
      .object({
        match_id: z.string().uuid(),
        match_track_id: z.string().uuid().optional(),
        body: z.string().min(1).max(2000),
      })
      .parse(request.body);
    return addComment({
      userId: request.authUser!.id,
      matchId: body.match_id,
      matchTrackId: body.match_track_id ?? null,
      body: body.body,
    });
  });
};

export default engagementRoutes;

