import { v4 as uuidv4 } from 'uuid';

export function shortUUID(length = 6): string {
  return Buffer.from(uuidv4().replace(/-/g, ''), 'hex')
    .toString('base64')
    .replace(/[/+=]/g, '') // remove non-URL-safe chars
    .slice(0, length);
}

