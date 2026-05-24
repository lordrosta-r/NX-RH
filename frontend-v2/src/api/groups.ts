import client from './client'

export const groupsApi = {
  list: () => client.get('/api/admin/groups'),
  get: (id: string) => client.get(`/api/admin/groups/${id}`),
  create: (data: { name: string; description?: string; memberIds?: string[] }) =>
    client.post('/api/admin/groups', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    client.put(`/api/admin/groups/${id}`, data),
  delete: (id: string) => client.delete(`/api/admin/groups/${id}`),
  updateMembers: (id: string, action: 'add' | 'remove', userIds: string[]) =>
    client.patch(`/api/admin/groups/${id}/members`, { action, userIds }),
}
