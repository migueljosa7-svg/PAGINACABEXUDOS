export type ApiResponse<T> = {
  data: T;
};

export type ApiError = {
  message: string;
  status?: number;
};

// Futura capa de integración con APIs oficiales del Ayuntamiento.
// Por ahora actúa como “cliente” sin consumir endpoints reales.
export class ApiClient {
  constructor(_baseUrl: string = '') {
    // Placeholder constructor.
    void _baseUrl;
  }

  async get<T>(_path: string): Promise<ApiResponse<T>> {
    // Placeholder: firma lista para integrar con fetch real.
    void _path;
    throw {
      message: `API GET no implementado (pendiente de integración)`,
    } as ApiError;
  }

  async post<T>(_path: string, _body: unknown): Promise<ApiResponse<T>> {
    // Placeholder: firma lista para integrar con fetch real.
    void _path;
    void _body;
    throw {
      message: `API POST no implementado (pendiente de integración)`,
    } as ApiError;
  }
}


