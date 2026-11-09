import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';

export type Entity = { id: string; createdAt?: string; updatedAt?: string; [key: string]: any };

@Injectable({
    providedIn: 'root'
})
export class DomainService {
    protected readonly core = inject(CoreDataService);

    protected collection: keyof typeof import('@/app/core/services/core-data.service').Store;

    constructor(collection: keyof typeof import('@/app/core/services/core-data.service').Store) {
        this.collection = collection;
    }

    list(): Entity[] {
        return this.core.list(this.collection) as Entity[];
    }

    get(id: string): Entity | undefined {
        return this.core.get(this.collection, id);
    }

    create(entity: Partial<Entity>): Entity {
        return this.core.create(this.collection, entity as any);
    }

    update(entity: Entity): Entity {
        return this.core.update(this.collection, entity);
    }

    remove(id: string): void {
        this.core.remove(this.collection, id);
    }

    upsert(entity: Entity): Entity {
        return this.core.upsert(this.collection, entity);
    }
}
