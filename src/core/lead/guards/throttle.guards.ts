import { ExecutionContext, Injectable } from '@nestjs/common';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { ErrorHelper } from '../../../common/utils';
import { User } from '../../users';


@Injectable()
export class LeadSubmissionThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const ip = this.getClientIp(req);
    return `lead-submission:${ip}`;
  }

  protected getClientIp(req: Request): string {
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'x-client-ip',
      'true-client-ip',
    ];

    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        const ip = typeof value === 'string'
          ? value.split(',')[0].trim()
          : value[0];
        if (ip) return ip;
      }
    }

    return req.socket.remoteAddress || 'unknown';
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    ErrorHelper.ThrottlerException(
      'Too many submissions. Please try again in a few minutes.'
    );
  }
}

/**
 * More lenient throttle guard for authenticated users
 */
@Injectable()
export class AuthenticatedThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // Track by user ID for authenticated requests
    const user = req['user'] as User;
    if (user && user.id) {
      return `user:${user.id}`;
    }

    // Fallback to IP if no user (shouldn't happen with auth guard)
    return `ip:${this.getClientIp(req)}`;
  }

  protected getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    ErrorHelper.ThrottlerException(
      'Too many requests. Please slow down.'
    );
  }
}

/**
 * IP-based throttle guard with configurable limits
 */
@Injectable()
export class IpThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const ip = this.getClientIp(req);
    return `ip:${ip}`;
  }

  protected getClientIp(req: Request): string {
    // Check multiple headers for real IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip', // Cloudflare
      'x-client-ip',
      'true-client-ip',
    ];

    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        const ip = typeof value === 'string'
          ? value.split(',')[0].trim()
          : value[0];
        if (ip) return ip;
      }
    }

    return req.socket.remoteAddress || 'unknown';
  }
}

/**
 * Strict throttle guard for form preview/embed endpoints
 */
@Injectable()
export class FormAccessThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const ip = this.getClientIp(req);
    const formId = req.params?.publicId || 'unknown';
    return `form-access:${formId}:${ip}`;
  }

  protected getClientIp(req: Request): string {
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'x-client-ip',
    ];

    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        const ip = typeof value === 'string'
          ? value.split(',')[0].trim()
          : value[0];
        if (ip) return ip;
      }
    }

    return req.socket.remoteAddress || 'unknown';
  }
}