export class ViaCommandQueue {
    private running = false;
    private pending: Array<{
        operation: () => Promise<unknown>;
        resolve: (value: unknown) => void;
        reject: (reason: Error) => void;
    }> = [];

    get idle(): boolean {
        return !this.running && this.pending.length === 0;
    }

    enqueue<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.pending.push({ operation, resolve: (value) => resolve(value as T), reject });
            void this.flush();
        });
    }

    cancelPending(reason: Error): void {
        for (const item of this.pending.splice(0)) {
            item.reject(reason);
        }
    }

    private async flush(): Promise<void> {
        if (this.running) return;
        this.running = true;
        while (this.pending.length) {
            const item = this.pending.shift();
            if (!item) continue;
            try {
                item.resolve(await item.operation());
            } catch (error) {
                item.reject(error instanceof Error ? error : new Error(String(error)));
            }
        }
        this.running = false;
    }
}
