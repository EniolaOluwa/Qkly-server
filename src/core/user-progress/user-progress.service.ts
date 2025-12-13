import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgress, UserProgressEvent } from './entities/user-progress.entity';
import e from 'express';

@Injectable()
export class UserProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private readonly progressRepo: Repository<UserProgress>,
  ) { }

  async addProgress(userId: number, event: UserProgressEvent) {
    const exists = await this.progressRepo.findOne({
      where: { userId, event }
    });

    if (exists) return exists;

    const record = this.progressRepo.create({ userId, event });
    return this.progressRepo.save(record);
  }

  async getProgress(userId: number) {
    return this.progressRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async getLevel(userId: number) {
    const progress = await this.getProgress(userId);

    // Level = number of unique events completed
    const uniqueEvents = new Set(progress.map(record => record.event));

    return {
      level: uniqueEvents.size,
      totalSteps: Object.keys(UserProgressEvent).length,
      completedEvents: [...uniqueEvents],
      timeline: progress,
    };
  }


  async addProgressIfMissing(userId: number, event: UserProgressEvent) {
    const exists = await this.progressRepo.findOne({
      where: { userId, event }
    });

    if (!exists) {
      await this.addProgress(userId, event);
    }
  }
}
