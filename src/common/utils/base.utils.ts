import * as isemail from 'isemail';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

export const isEmail = (email: string) => {
  return isemail.validate(email);
};

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }

  from(data: string): number {
    return parseFloat(data);
  }
}

export function removeEmpty(obj: object) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== '')
  );
}
export function getDateQuery({ from, to }: { from?: string; to?: string }) {
  if (from && to) {
    return Between(new Date(from).toISOString(), new Date(to).toISOString());
  }
  if (!from && to) {
    return LessThanOrEqual(new Date(to).toISOString());
  }
  if (from && !to) {
    return MoreThanOrEqual(new Date(from).toISOString());
  }
  return null;
}
