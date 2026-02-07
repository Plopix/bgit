import { mkdir } from 'node:fs/promises';
import type { Logger } from '../contracts/logger';

type Deps = {
    logger: Logger;
    homeDir: string;
};

export const createStorage = ({ logger, homeDir }: Deps) => {
    const storageDir = `${homeDir}/.bgit/storage`;
    let dirEnsured = false;

    const ensureDir = async () => {
        if (!dirEnsured) {
            await mkdir(storageDir, { recursive: true });
            dirEnsured = true;
        }
    };

    return (collection: string) => {
        const storagePath = `${storageDir}/${collection}.json`;

        const load = async (): Promise<Record<string, unknown>> => {
            const file = Bun.file(storagePath);
            if (!(await file.exists())) {
                return {};
            }
            try {
                return await file.json();
            } catch {
                logger.warn(`Storage collection "${collection}" is corrupt, resetting`);
                return {};
            }
        };

        const save = async (data: Record<string, unknown>) => {
            await ensureDir();
            await Bun.write(storagePath, JSON.stringify(data, null, 2));
        };

        return {
            get: async (key: string) => {
                const data = await load();
                return data[key];
            },
            set: async (key: string, value: unknown) => {
                const data = await load();
                data[key] = value;
                await save(data);
            },
            delete: async (key: string) => {
                const data = await load();
                delete data[key];
                await save(data);
            },
            clear: async () => {
                await save({});
            },
        };
    };
};
