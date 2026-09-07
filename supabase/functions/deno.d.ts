// Global Deno type declarations for IDE support in Supabase Edge Functions
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
  };
};
