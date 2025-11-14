import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listChallenges,
  createChallenge,
  acceptChallenge,
  cancelChallenge,
  completeChallenge,
  voteChallenge,
  getChallengeById,
  submitChallengeResponse,
} from '../services/challenges.js';
import { AppError } from '../lib/errors.js';

const challengesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    return listChallenges();
  });

  fastify.get('/:id', async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const challenge = await getChallengeById(params.id);
    if (!challenge) {
      throw new AppError({ status: 404, code: 'challenge_not_found', message: 'Challenge not found.' });
    }
    return challenge;
  });

  fastify.post('/', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const body = z
      .object({
        opponent_id: z.string().uuid(),
        title: z.string().min(3).max(120),
        description: z.string().max(2000).optional(),
      })
      .parse(request.body);
    const challenge = await createChallenge({
      initiatorId: request.authUser!.id,
      opponentId: body.opponent_id,
      title: body.title,
      description: body.description,
    });
    reply.status(201).send(challenge);
  });

  fastify.post('/:id/accept', { preHandler: fastify.requireAuth }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    return acceptChallenge({ challengeId: params.id, userId: request.authUser!.id });
  });

  fastify.post('/:id/cancel', { preHandler: fastify.requireAuth }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    return cancelChallenge({ challengeId: params.id, userId: request.authUser!.id });
  });

  fastify.post('/:id/complete', { preHandler: fastify.requireAuth }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    return completeChallenge({ challengeId: params.id, userId: request.authUser!.id });
  });

  fastify.post('/:id/votes', { preHandler: fastify.requireAuth }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ side: z.enum(['initiator', 'opponent']) }).parse(request.body);
    return voteChallenge({ challengeId: params.id, userId: request.authUser!.id, side: body.side });
  });

  fastify.post('/:id/responses', { preHandler: fastify.requireAuth }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        audio_id: z.string().uuid(),
        description: z.string().max(2000).optional(),
      })
      .parse(request.body);
    return submitChallengeResponse({
      challengeId: params.id,
      userId: request.authUser!.id,
      audioId: body.audio_id,
      description: body.description,
    });
  });
};

export default challengesRoutes;
