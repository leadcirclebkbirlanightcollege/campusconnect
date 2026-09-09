declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
  export function connectTls(options: { hostname: string; port: number }): Promise<any>;
}

declare module "npm:@supabase/supabase-js@2.90.1" {
  export * from "@supabase/supabase-js";
}

declare module "npm:@supabase/supabase-js" {
  export * from "@supabase/supabase-js";
}

declare module "npm:nodemailer@6.9.16" {
  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
  }
  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<any>;
  }
  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
  }
  export function createTransport(options: TransportOptions): Transporter;
  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };
  export default nodemailer;
}

declare module "npm:nodemailer" {
  export * from "npm:nodemailer@6.9.16";
  import nodemailer from "npm:nodemailer@6.9.16";
  export default nodemailer;
}

declare module "https://*" {
  const content: any;
  export default content;
  export const createClient: any;
}
