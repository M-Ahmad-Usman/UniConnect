// ─── System Stats (from GET /admin/stats) ───────────────────────────────────

export interface AdminStats {
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
    active: number;
  };
  servers: {
    total: number;
    department: number;
    class: number;
    society: number;
  };
  posts: {
    total: number;
  };
}
