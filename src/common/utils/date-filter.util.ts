import { DateTime } from 'luxon';
import { DateFilterEnum } from '../../core/admin/enums/admin-filter.enum';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class DateFilterUtil {
  /**
   * Get date range based on filter type
   */
  static getDateRange(
    filter: DateFilterEnum,
    customStartDate?: Date,
    customEndDate?: Date,
    timezone: string = process.env.TIMEZONE || 'UTC',
  ): DateRange {
    const now = DateTime.now().setZone(timezone);

    switch (filter) {
      case DateFilterEnum.TODAY:
        return {
          startDate: now.startOf('day').toJSDate(),
          endDate: now.endOf('day').toJSDate(),
        };

      case DateFilterEnum.THIS_WEEK:
        return {
          startDate: now.startOf('week').toJSDate(),
          endDate: now.endOf('week').toJSDate(),
        };

      case DateFilterEnum.LAST_WEEK:
        const lastWeek = now.minus({ weeks: 1 });
        return {
          startDate: lastWeek.startOf('week').toJSDate(),
          endDate: lastWeek.endOf('week').toJSDate(),
        };

      case DateFilterEnum.THIS_MONTH:
        return {
          startDate: now.startOf('month').toJSDate(),
          endDate: now.endOf('month').toJSDate(),
        };

      case DateFilterEnum.LAST_MONTH:
        const lastMonth = now.minus({ months: 1 });
        return {
          startDate: lastMonth.startOf('month').toJSDate(),
          endDate: lastMonth.endOf('month').toJSDate(),
        };

      case DateFilterEnum.LAST_30_DAYS:
        return {
          startDate: now.minus({ days: 30 }).startOf('day').toJSDate(),
          endDate: now.endOf('day').toJSDate(),
        };

      case DateFilterEnum.LAST_90_DAYS:
        return {
          startDate: now.minus({ days: 90 }).startOf('day').toJSDate(),
          endDate: now.endOf('day').toJSDate(),
        };

      case DateFilterEnum.THIS_YEAR:
        return {
          startDate: now.startOf('year').toJSDate(),
          endDate: now.endOf('year').toJSDate(),
        };

      case DateFilterEnum.CUSTOM:
        if (!customStartDate || !customEndDate) {
          throw new Error('Custom date range requires both start and end dates');
        }
        return {
          startDate: DateTime.fromJSDate(customStartDate).startOf('day').toJSDate(),
          endDate: DateTime.fromJSDate(customEndDate).endOf('day').toJSDate(),
        };

      default:
        return {
          startDate: now.startOf('month').toJSDate(),
          endDate: now.endOf('month').toJSDate(),
        };
    }
  }

  /**
   * Check if date is within range
   */
  static isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    const checkDate = DateTime.fromJSDate(date);
    const start = DateTime.fromJSDate(startDate);
    const end = DateTime.fromJSDate(endDate);
    return checkDate >= start && checkDate <= end;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, format = 'yyyy-MM-dd'): string {
    return DateTime.fromJSDate(date).toFormat(format);
  }
}
