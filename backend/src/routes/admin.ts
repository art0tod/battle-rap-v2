import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { setUserRole, getUserRoles, listUsersForAdmin } from '../services/users.js';
import { finalizeMatch, refreshPublicViews } from '../services/judging.js';
import { getProfileForViewer } from '../services/profile.js';
import { listAuditLog } from '../services/audit.js';
import { AppError } from '../lib/errors.js';
import { MATCH_STATUSES, ROUND_STATUSES, TOURNAMENT_STATUSES } from '../lib/status.js';
import {
  createAdminBattle,
  deleteAdminBattle,
  getAdminBattle,
  listAdminBattles,
  updateAdminBattle,
} from '../services/battlesAdmin.js';
import { getAdminOverview } from '../services/adminMetrics.js';
import {
  listAdminTournaments,
  createAdminTournament,
  updateAdminTournament,
  createAdminRound,
  updateAdminRound,
  deleteAdminRound,
} from '../services/tournamentAdmin.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const requireAdmin = fastify.requireRole(['admin']);
  const matchStatusEnum = z.enum(MATCH_STATUSES);
  const roundStatusEnum = z.enum(ROUND_STATUSES);
  const tournamentStatusEnum = z.enum(TOURNAMENT_STATUSES);

  fastify.post('/roles/:userId', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request, reply) => {
    const params = z.object({ userId: z.string().uuid() }).parse(request.params);
    const body = z.object({
      op: z.enum(['grant', 'revoke']),
      role: z.enum(['artist', 'judge', 'listener', 'moderator', 'admin']),
    }).parse(request.body);
    await setUserRole(request.authUser!.id, params.userId, body.role, body.op);
    const roles = await getUserRoles(params.userId);
    reply.send({ user_id: params.userId, roles });
  });

  fastify.post('/finalize/battles/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    await finalizeMatch(params.id);
    await refreshPublicViews();
    reply.status(204).send();
  });

  fastify.get('/battles', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        status: matchStatusEnum.optional(),
        round_id: z.string().uuid().optional(),
        tournament_id: z.string().uuid().optional(),
      })
      .parse(request.query);
    return listAdminBattles(query);
  });

  fastify.get('/overview', { preHandler: [fastify.requireAuth, requireAdmin] }, async () => {
    return getAdminOverview();
  });

  fastify.get('/tournaments', { preHandler: [fastify.requireAuth, requireAdmin] }, async () => {
    return listAdminTournaments();
  });

  fastify.post('/tournaments', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const body = z
      .object({
        title: z.string().min(3),
        max_bracket_size: z.number().int().positive().nullable().optional(),
        status: tournamentStatusEnum.optional(),
        registration_open_at: z.string().datetime().nullable().optional(),
        submission_deadline_at: z.string().datetime().nullable().optional(),
        judging_deadline_at: z.string().datetime().nullable().optional(),
        public_at: z.string().datetime().nullable().optional(),
      })
      .parse(request.body);
    return createAdminTournament(body);
  });

  fastify.patch('/tournaments/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        title: z.string().min(3).optional(),
        max_bracket_size: z.number().int().positive().nullable().optional(),
        status: tournamentStatusEnum.optional(),
        registration_open_at: z.string().datetime().nullable().optional(),
        submission_deadline_at: z.string().datetime().nullable().optional(),
        judging_deadline_at: z.string().datetime().nullable().optional(),
        public_at: z.string().datetime().nullable().optional(),
      })
      .parse(request.body);
    return updateAdminTournament(params.id, body);
  });

  fastify.post('/tournaments/:id/rounds', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        kind: z.enum(['qualifier1', 'qualifier2', 'bracket']),
        number: z.number().int().min(1),
        scoring: z.enum(['pass_fail', 'points', 'rubric']),
        status: roundStatusEnum.optional(),
        rubric_keys: z.array(z.string()).optional(),
        starts_at: z.string().datetime().nullable().optional(),
        submission_deadline_at: z.string().datetime().nullable().optional(),
        judging_deadline_at: z.string().datetime().nullable().optional(),
        strategy: z.enum(['weighted', 'majority']).optional(),
      })
      .parse(request.body);
    return createAdminRound({ ...body, tournament_id: params.id });
  });

  fastify.patch('/rounds/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        kind: z.enum(['qualifier1', 'qualifier2', 'bracket']).optional(),
        number: z.number().int().min(1).optional(),
        scoring: z.enum(['pass_fail', 'points', 'rubric']).optional(),
        status: roundStatusEnum.optional(),
        rubric_keys: z.array(z.string()).nullable().optional(),
        starts_at: z.string().datetime().nullable().optional(),
        submission_deadline_at: z.string().datetime().nullable().optional(),
        judging_deadline_at: z.string().datetime().nullable().optional(),
        strategy: z.enum(['weighted', 'majority']).optional(),
      })
      .parse(request.body);
    return updateAdminRound(params.id, body);
  });

  fastify.delete('/rounds/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    await deleteAdminRound(params.id);
    reply.status(204).send();
  });

  fastify.post('/battles', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request, reply) => {
    const body = z
      .object({
        round_id: z.string().uuid(),
        starts_at: z.string().datetime().nullable().optional(),
        ends_at: z.string().datetime().nullable().optional(),
        status: matchStatusEnum.optional(),
        participants: z
          .array(
            z.object({
              participant_id: z.string().uuid(),
              seed: z.number().int().min(0).max(64).nullable().optional(),
            }),
          )
          .min(2),
      })
      .parse(request.body);

    const battle = await createAdminBattle(body);
    reply.status(201).send(battle);
  });

  fastify.get('/battles/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const battle = await getAdminBattle(params.id);
    if (!battle) {
      throw new AppError({ status: 404, code: 'battle_not_found', message: 'Battle not found.' });
    }
    return battle;
  });

  fastify.patch('/battles/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        round_id: z.string().uuid().optional(),
        starts_at: z.string().datetime().nullable().optional(),
        ends_at: z.string().datetime().nullable().optional(),
        status: matchStatusEnum.optional(),
        participants: z
          .array(
            z.object({
              participant_id: z.string().uuid(),
              seed: z.number().int().min(0).max(64).nullable().optional(),
            }),
          )
          .min(2)
          .optional(),
      })
      .parse(request.body);
    return updateAdminBattle(params.id, body);
  });

  fastify.delete('/battles/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    await deleteAdminBattle(params.id);
    reply.status(204).send();
  });

  fastify.get('/users', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        search: z.string().trim().optional(),
        role: z.enum(['admin', 'moderator', 'artist', 'judge', 'listener']).optional(),
        sort: z.enum(['created_at', '-created_at', 'display_name', '-display_name']).optional(),
      })
      .parse(request.query);
    return listUsersForAdmin(query);
  });

  fastify.get('/users/:id', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const profile = await getProfileForViewer({
      targetUserId: params.id,
      viewerId: request.authUser!.id,
      viewerRoles: request.authUser!.roles,
    });
    if (!profile) {
      throw new AppError({ status: 404, code: 'profile_not_found', message: 'Profile not found.' });
    }
    return profile;
  });

  fastify.get('/audit-log', { preHandler: [fastify.requireAuth, requireAdmin] }, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        actor_id: z.string().uuid().optional(),
        action: z.string().optional(),
        target_table: z.string().optional(),
        target_id: z.string().uuid().optional(),
      })
      .parse(request.query);
    return listAuditLog({
      page: query.page,
      limit: query.limit,
      actorId: query.actor_id,
      action: query.action,
      targetTable: query.target_table,
      targetId: query.target_id,
    });
  });
};

export default adminRoutes;
