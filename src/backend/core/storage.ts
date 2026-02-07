import type { Logger } from "../contracts/logger";

type Deps = {
    logger: Logger;
    homeDir: string;
};

export const createStorage = ({ logger, homeDir }: Deps) => {
    const storagePath = `${homeDir}/.bgit/storage.json`;

    const load = async (): Promise<Record<string, unknown>> => {
        const file = Bun.file(storagePath);
        if (!(await file.exists())) {
            return {};
        }
        try {
            return await file.json();
        } catch {
            logger.warn('Storage file is corrupt, resetting');
            return {};
        }
    };

    const save = async (data: Record<string, unknown>) => {
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
