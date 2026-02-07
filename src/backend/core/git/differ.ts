import type { Logger } from '../../contracts/logger';
import type { createRunner } from '../runner';

type Deps = {
    logger: Logger;
    runner: ReturnType<typeof createRunner>;
};
export const createDiffer = ({ logger, runner }: Deps) => {};
