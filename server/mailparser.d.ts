declare module "mailparser" {
  export function simpleParser(source: string | Buffer): Promise<{
    text?: string;
    html?: string | false;
    subject?: string;
    from?: { text: string; value: Array<{ address: string; name: string }> };
    to?: { text: string; value: Array<{ address: string; name: string }> };
    date?: Date;
    messageId?: string;
  }>;
}
