import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../utils/classError';
import { GraphQLError } from 'graphql';
type SchemaType = Partial<Record<'body' | 'params' | 'query', ZodType>>;
export const Validation = (schema: SchemaType) => (req: Request, res: Response, next: NextFunction) => {
  for (const key of Object.keys(schema) as (keyof SchemaType)[]) {
    const input = key === 'body' ? { ...req.body } : req[key];
    if (key === 'body') {
      if (Array.isArray(req.files) && req.files.length) input.attachments = req.files;
      for (const field of ['tags', 'participants']) {
        if (typeof input[field] === 'string') {
          try { input[field] = JSON.parse(input[field]); } catch { throw new AppError(field + ' must be a JSON array', 400); }
        }
      }
    }
    const parsed = schema[key]!.safeParse(input);
    if (!parsed.success) throw new AppError(parsed.error.issues.map(x => x.path.join('.') + ': ' + x.message).join('; '), 400);
    // Express 5 query is a getter; retain parsed defaults and transformations.
    Object.defineProperty(req, key, { value: parsed.data, writable: true, configurable: true, enumerable: true });
  }
  next();
};
export const ValidationGQL = async <T>(schema: ZodType, args: T) => {
  const result = schema.safeParse(args);
  if (!result.success) throw new GraphQLError('Invalid arguments', { extensions: { code: 'BAD_USER_INPUT' } });
  return result.data;
};
