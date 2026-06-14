// ─── API Response Wrappers ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>[];
    requestId?: string;
  };
}

// ─── API Error Class ────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>[];
  readonly statusCode: number;
  readonly requestId?: string;

  constructor(
    code: string,
    message: string,
    details: Record<string, unknown>[],
    statusCode: number,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

// ─── Pagination Params ──────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
