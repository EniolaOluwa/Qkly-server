import { DateTime, DurationLike } from 'luxon';
import { ErrorHelper } from './error.utils';

export class DateHelper {
  static addToCurrent(duration: DurationLike): Date {
    const dt = DateTime.now();
    return dt.plus(duration).toJSDate();
  }

  static addToDate(date: Date, duration: DurationLike): Date {
    const dt = DateTime.fromJSDate(date);
    return dt.plus(duration).toJSDate();
  }

  static subtractFromCurrent(duration: DurationLike): Date {
    const dt = DateTime.now();
    return dt.minus(duration).toJSDate();
  }

  static subtractFromDate(date: Date, duration: DurationLike): Date {
    const dt = DateTime.fromJSDate(date);
    return dt.minus(duration).toJSDate();
  }

  static isAfterCurrent(date: Date): boolean {
    const d1 = DateTime.fromJSDate(date ?? new Date());
    const d2 = DateTime.now();
    return d2 > d1;
  }

  static startOfDay(date: Date): Date {
    return DateTime.fromJSDate(date ?? new Date())
      .startOf('day')
      .toJSDate();
  }

  static endOfDay(date: Date): Date {
    return DateTime.fromJSDate(date ?? new Date())
      .endOf('day')
      .toJSDate();
  }

  static isValidDate(date: Date): boolean {
    // set date format to accept
    const dateFormat = 'yyyy-MM-dd';
    // check if date is valid
    return DateTime.fromFormat(date.toString(), dateFormat).isValid;
  }

  static startOfWeek(date: Date): Date {
    return DateTime.fromJSDate(date ?? new Date())
      .startOf('week')
      .toJSDate();
  }

  static endOfWeek(date: Date): Date {
    return DateTime.fromJSDate(date ?? new Date())
      .endOf('week')
      .toJSDate();
  }

  static startOfMonth(date: Date): Date {
    return DateTime.fromJSDate(date ?? new Date())
      .startOf('month')
      .toJSDate();
  }

  static endOfMonth(date: Date): Date {
    return DateTime.fromJSDate(date ?? new Date())
      .endOf('month')
      .toJSDate();
  }

  static buildDate(p: { date: string; time: string; timezone: string }) {
    return DateTime.fromFormat(`${p.date} ${p.time}`, 'yyyy-MM-dd HH:mm', {
      zone: p.timezone,
    })
      .toUTC()
      .toJSDate();
  }

  static calculateMinutesDifference(eventData: {
    date: string;
    startTime: string;
    endTime: string;
  }): number {
    // Combine date and time strings into a DateTime object
    const startDateTime = DateTime.fromFormat(
      `${eventData.date} ${eventData.startTime}`,
      'yyyy-MM-dd HH:mm'
    );

    const endDateTime = DateTime.fromFormat(
      `${eventData.date} ${eventData.endTime}`,
      'yyyy-MM-dd HH:mm'
    );

    // Check if end date is less than start date
    if (endDateTime < startDateTime) {
      ErrorHelper.BadRequestException('End date/time cannot be less than start date/time');
    }

    // Calculate the difference in minutes
    const minutesDifference = endDateTime.diff(startDateTime, 'minutes').as('minutes');

    return minutesDifference;
  }

  static splitDate(date: Date): { year: number; month: number; day: number } {
    const dt = DateTime.fromJSDate(date);

    return {
      year: dt.year,
      month: dt.month,
      day: dt.day,
    };
  }

  static toTimezone(data: {
    date: string;
    startTime: string;
    endTime: string;
    intialTimezone: string;
    timezone: string;
  }): {
    date: string;
    startTime: string;
    endTime: string;
  } {
    const { date, startTime, endTime, intialTimezone, timezone } = data;

    const dt = DateTime.fromFormat(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', {
      zone: intialTimezone,
    });

    const dt2 = DateTime.fromFormat(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', {
      zone: intialTimezone,
    });

    // Convert to new timezone
    const dt3 = dt.setZone(timezone);
    const dt4 = dt2.setZone(timezone);

    return {
      date: dt3.toFormat('yyyy-MM-dd'),
      startTime: dt3.toFormat('HH:mm'),
      endTime: dt4.toFormat('HH:mm'),
    };
  }

  static isSameMonth(date1: string, date2: string): boolean {
    const dt1 = DateTime.fromFormat(date1, 'yyyy-MM-dd');
    const dt2 = DateTime.fromFormat(date2, 'yyyy-MM-dd');

    return dt1.month === dt2.month;
  }

  static isValidTimezone(timezone: string): boolean {
    return DateTime.local().setZone(timezone).isValid;
  }

  static minuteDifference(date1: Date, date2: Date): number {
    const dt1 = DateTime.fromJSDate(date1);
    const dt2 = DateTime.fromJSDate(date2);

    return dt2.diff(dt1, 'minutes').toObject().minutes ?? 0;
  }

  static millisecondsBetweenDates(date1: Date | string, date2: Date | string): number {
    const d1 = DateTime.fromJSDate(new Date(date1));
    const d2 = DateTime.fromJSDate(new Date(date2));

    return d2.diff(d1).as('milliseconds');
  }

  static removeDuration(date: Date | string, duration: DurationLike): Date {
    const dt = DateTime.fromJSDate(new Date(date));
    return dt.minus(duration).toJSDate();
  }

  static toMillis(date: string | Date, timeZone = 'UTC') {
    const dt = DateTime.fromJSDate(new Date(date), {
      zone: timeZone,
    });
    return dt.toMillis();
  }


  static formatBvnDate(dateStr: string): string | null {
    const dt = DateTime.fromFormat(dateStr, 'dd-MMM-yyyy');
    return dt.isValid ? dt.toFormat('yyyy-MM-dd') : null;
  }
}
