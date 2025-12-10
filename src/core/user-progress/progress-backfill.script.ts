import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users";
import { UserProgressEvaluator } from "./user-progress-evaluator";
import { UserProgressService } from "./user-progress.service";

@Injectable()
export class ProgressBackfillService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private userProgressService: UserProgressService,
    private evaluator: UserProgressEvaluator,
  ) { }

  async runBackfill() {
    const users = await this.userRepo.find();


    for (const user of users) {
      const expectedProgress = await this.evaluator.evaluate(user);


      for (const event of expectedProgress) {
        await this.userProgressService.addProgressIfMissing(user.id, event);
      }
    }

    return { message: 'Backfill completed successfully' };
  }
}
