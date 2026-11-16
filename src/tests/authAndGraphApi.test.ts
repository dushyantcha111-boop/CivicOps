import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { ApiService, apiClient, setAuthToken } from '../services/api.ts';

function withMockAdapter<T>(
  handler: (config: InternalAxiosRequestConfig) => Promise<{ status: number; data: any }>,
  fn: () => Promise<T>
): Promise<T> {
  const originalAdapter = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async (config) => {
    const res = await handler(config);
    if (res.status >= 400) {
      const err: any = new Error(`HTTP ${res.status}`);
      err.isAxiosError = true;
      err.config = config;
      err.response = {
        status: res.status,
        statusText: 'Error',
        headers: new AxiosHeaders(),
        config,
        data: res.data
      };
      throw err;
    }
    return {
      status: res.status,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
      data: res.data
    };
  };
  return fn().finally(() => {
    apiClient.defaults.adapter = originalAdapter;
  });
}

test('ApiService Memory Graph calls hit backend REST endpoints and return backend payloads without hardcoded fallback', async () => {
  setAuthToken('jwt-test-token');
  const calls: { method?: string; url?: string; params?: any; data?: any }[] = [];

  await withMockAdapter(
    async (config) => {
      calls.push({
        method: config.method,
        url: config.url,
        params: config.params,
        data: config.data ? JSON.parse(String(config.data)) : undefined
      });
      if (config.url === '/analytics/memory-graph') {
        return {
          status: 200,
          data: {
            nodes: [
              {
                id: 'tower-tower-b',
                sourceId: 'Tower B',
                sourceType: 'TOWER',
                label: 'Tower B',
                type: 'TOWER',
                category: 'INFRASTRUCTURE',
                status: 'ATTENTION',
                tower: 'Tower B',
                details: 'Live DB node'
              }
            ],
            edges: [],
            totalNodes: 1,
            totalEdges: 0,
            scopeRole: 'MANAGEMENT',
            availableNodeTypes: ['TOWER'],
            availableRelationships: [],
            generatedAt: '2026-11-15T12:00:00'
          }
        };
      }
      if (config.url?.startsWith('/analytics/memory-graph/nodes/tower-tower-b/expand')) {
        return { status: 200, data: { rootNodeId: 'tower-tower-b', nodes: [], edges: [] } };
      }
      if (config.url?.startsWith('/analytics/memory-graph/nodes/tower-tower-b')) {
        return {
          status: 200,
          data: {
            node: { id: 'tower-tower-b', label: 'Tower B' },
            incomingEdges: [],
            outgoingEdges: [],
            connectedNodes: []
          }
        };
      }
      if (config.url === '/analytics/memory-graph/search') {
        return {
          status: 200,
          data: { nodes: [], edges: [], totalNodes: 0, totalEdges: 0, scopeRole: 'MANAGEMENT' }
        };
      }
      if (config.url === '/analytics/memory-graph/path') {
        return {
          status: 200,
          data: { found: true, fromNodeId: 'a', toNodeId: 'b', hopCount: 1, pathNodeIds: ['a', 'b'], pathEdgeIds: ['e1'], steps: [] }
        };
      }
      if (config.url === '/analytics/memory-graph/layout') {
        return { status: 200, data: { savedCount: 1 } };
      }
      return { status: 404, data: { error: 'Not found' } };
    },
    async () => {
      const graph = await ApiService.getMemoryGraph({ tower: 'Tower B' });
      assert.equal(graph.nodes[0].details, 'Live DB node');
      await ApiService.getMemoryGraphNode('tower-tower-b');
      await ApiService.expandMemoryGraphNode('tower-tower-b');
      await ApiService.searchMemoryGraph('PRV');
      const path = await ApiService.findMemoryGraphPath('a', 'b');
      assert.equal(path.hopCount, 1);
      const saved = await ApiService.saveMemoryGraphLayout([{ nodeId: 'tower-tower-b', posX: 120, posY: 200, pinned: true }]);
      assert.equal(saved.savedCount, 1);
      await ApiService.resetMemoryGraphLayout();
    }
  );

  assert.deepEqual(
    calls.map((c) => `${c.method?.toUpperCase()} ${c.url}`),
    [
      'GET /analytics/memory-graph',
      'GET /analytics/memory-graph/nodes/tower-tower-b',
      'GET /analytics/memory-graph/nodes/tower-tower-b/expand',
      'GET /analytics/memory-graph/search',
      'GET /analytics/memory-graph/path',
      'PUT /analytics/memory-graph/layout',
      'DELETE /analytics/memory-graph/layout'
    ]
  );
  setAuthToken(null);
});

test('ApiService multi-role registration, pending approval login error, and invitation flow normalize backend responses cleanly', async () => {
  await withMockAdapter(
    async (config) => {
      if (config.url === '/auth/register') {
        const body = JSON.parse(String(config.data));
        if (body.requestedRole === 'ADMIN') {
          return {
            status: 403,
            data: { error: 'Administrator accounts cannot be created via public registration.' }
          };
        }
        return {
          status: 201,
          data: {
            token: null,
            pendingApproval: true,
            approvalStatus: 'PENDING_APPROVAL',
            authorizedRoles: [body.requestedRole],
            message: 'Pending admin approval.',
            user: {
              id: 'u-200',
              name: body.name,
              email: body.email,
              phone: body.phone,
              activeRole: body.requestedRole,
              requestedRole: body.requestedRole,
              approvalStatus: 'PENDING_APPROVAL',
              active: false
            }
          }
        };
      }
      if (config.url === '/auth/login') {
        return {
          status: 403,
          data: {
            error: 'Your MANAGEMENT registration is awaiting approval by an authorized administrator.',
            approvalStatus: 'PENDING_APPROVAL',
            requestedRole: 'MANAGEMENT'
          }
        };
      }
      if (config.url === '/auth/invitations/validate') {
        return {
          status: 200,
          data: {
            valid: true,
            targetRole: 'ADMIN',
            societyName: 'Green Valley Residency',
            designation: 'Chief Admin',
            emailLocked: true,
            invitedEmailHint: 'an***@civicops.in',
            expiresAt: '2026-11-18T12:00:00'
          }
        };
      }
      if (config.url === '/auth/accept-invitation') {
        return {
          status: 201,
          data: {
            token: 'jwt-admin-invite',
            authorizedRoles: ['ADMIN', 'MANAGEMENT'],
            requiresRoleSelection: true,
            user: {
              id: 'u-adm-2',
              name: 'Ananya Iyer',
              email: 'ananya@civicops.in',
              phone: '9999911111',
              activeRole: 'ADMIN',
              authorizedRoles: ['ADMIN', 'MANAGEMENT'],
              approvalStatus: 'APPROVED',
              active: true
            }
          }
        };
      }
      return { status: 404, data: { error: 'Unknown route' } };
    },
    async () => {
      await assert.rejects(
        () =>
          ApiService.register({
            name: 'Attacker',
            email: 'a@test.com',
            phone: '9999999999',
            password: 'Password123',
            requestedRole: 'ADMIN'
          }),
        /Administrator accounts cannot be created via public registration/
      );

      const mgmtReg = await ApiService.register({
        name: 'Meera Nair',
        email: 'meera@greenvalley.in',
        phone: '9811122334',
        password: 'Password123',
        requestedRole: 'MANAGEMENT',
        societyName: 'Green Valley Residency',
        designation: 'Treasurer'
      });
      assert.equal(mgmtReg.pendingApproval, true);
      assert.equal(mgmtReg.approvalStatus, 'PENDING_APPROVAL');
      assert.equal(mgmtReg.token, null);

      try {
        await ApiService.login('meera@greenvalley.in', 'Password123');
        assert.fail('Expected 403 error for pending approval');
      } catch (err: any) {
        assert.equal(err.approvalStatus, 'PENDING_APPROVAL');
        assert.equal(err.requestedRole, 'MANAGEMENT');
        assert.match(err.message, /awaiting approval/);
      }

      const invite = await ApiService.validateInvitation('CIV-ADM-123456');
      assert.equal(invite.valid, true);
      assert.equal(invite.targetRole, 'ADMIN');

      const accepted = await ApiService.acceptInvitation({
        inviteCode: 'CIV-ADM-123456',
        name: 'Ananya Iyer',
        email: 'ananya@civicops.in',
        phone: '9999911111',
        password: 'StrongPassword123'
      });
      assert.equal(accepted.token, 'jwt-admin-invite');
      assert.equal(accepted.requiresRoleSelection, true);
      assert.deepEqual(accepted.authorizedRoles, ['ADMIN', 'MANAGEMENT']);
    }
  );
  setAuthToken(null);
});
