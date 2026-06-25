import { api } from './client.js'

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
}

export const userApi = {
  me: () => api.get('/users/me').then((r) => r.data.user),
  updateProfile: (data) => api.patch('/users/me', data).then((r) => r.data.user),
  setStatus: (status) => api.put('/users/me/status', { status }).then((r) => r.data),
  search: (q) => api.get('/users/search', { params: { q } }).then((r) => r.data.users),
}

export const friendApi = {
  list: () => api.get('/friends').then((r) => r.data.friends),
  requests: () => api.get('/friends/requests').then((r) => r.data.requests),
  send: (username) => api.post('/friends/request', { username }).then((r) => r.data),
  accept: (id) => api.post(`/friends/${id}/accept`).then((r) => r.data),
  decline: (id) => api.post(`/friends/${id}/decline`).then((r) => r.data),
}

export const chatApi = {
  conversations: () => api.get('/conversations').then((r) => r.data.conversations),
  start: (userId) => api.post('/conversations', { userId }).then((r) => r.data.conversation),
  messages: (id, cursor) =>
    api.get(`/conversations/${id}/messages`, { params: { cursor } }).then((r) => r.data),
  seen: (id, messageId) => api.post(`/conversations/${id}/seen`, { messageId }).then((r) => r.data),
}

export const postApi = {
  feed: (cursor) => api.get('/posts/feed', { params: { cursor } }).then((r) => r.data),
  create: (data) => api.post('/posts', data).then((r) => r.data.post),
  comments: (id, cursor) =>
    api.get(`/posts/${id}/comments`, { params: { cursor } }).then((r) => r.data),
  addComment: (id, text) => api.post(`/posts/${id}/comments`, { text }).then((r) => r.data.comment),
  react: (id, emote) => api.put(`/posts/${id}/reactions`, { emote }).then((r) => r.data),
}

export const uploadApi = {
  image: (file) => {
    const fd = new FormData()
    fd.append('image', file)
    return api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
  },
}
