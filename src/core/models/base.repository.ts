import type {
  Model,
  ModelStatic,
  WhereOptions,
  FindOptions,
  CreateOptions,
  UpdateOptions,
  DestroyOptions,
  Order,
  Transaction,
} from "sequelize";

/**
 * Generic CRUD repository with transaction passthrough used by the engines.
 * Ordered by created_at DESC by default.
 */
export class BaseRepository<T extends Model> {
  protected model: ModelStatic<T>;

  constructor(model: ModelStatic<T>) {
    this.model = model;
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    return this.model.findAll({ order: [["created_at", "DESC"]], ...options });
  }

  async findByPk(id: string | number, options?: FindOptions): Promise<T | null> {
    return this.model.findByPk(id, options);
  }

  async findOne(where: WhereOptions, options?: FindOptions): Promise<T | null> {
    return this.model.findOne({ where, ...options });
  }

  async findWhere(where: WhereOptions, options?: FindOptions): Promise<T[]> {
    return this.model.findAll({ where, ...options });
  }

  async count(where?: WhereOptions): Promise<number> {
    return this.model.count({ where });
  }

  async paginate(
    page = 1,
    limit = 10,
    where?: WhereOptions,
    order?: Order,
    options?: FindOptions
  ): Promise<{
    data: T[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.model.findAndCountAll({
      where,
      order: order ?? [["created_at", "DESC"]],
      limit,
      offset,
      ...options,
    });
    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async create(
    data: Partial<T["_creationAttributes"]>,
    options?: CreateOptions
  ): Promise<T> {
    return this.model.create(data as T["_creationAttributes"], options);
  }

  async bulkCreate(
    data: Array<Partial<T["_creationAttributes"]>>,
    options?: CreateOptions
  ): Promise<T[]> {
    return this.model.bulkCreate(data as T["_creationAttributes"][], options);
  }

  async updateByPk(
    id: string | number,
    data: Partial<T["_creationAttributes"]>,
    transaction?: Transaction
  ): Promise<T | null> {
    const record = await this.findByPk(id);
    if (!record) return null;
    return record.update(data, { transaction });
  }

  async updateWhere(
    data: Partial<T["_creationAttributes"]>,
    where: WhereOptions,
    options?: UpdateOptions
  ): Promise<[number]> {
    return this.model.update(data as Record<string, unknown>, {
      where,
      ...options,
    }) as unknown as [number];
  }

  async deleteByPk(id: string | number): Promise<boolean> {
    const record = await this.findByPk(id);
    if (!record) return false;
    await record.destroy();
    return true;
  }

  async deleteWhere(where: WhereOptions, options?: DestroyOptions): Promise<number> {
    return this.model.destroy({ where, ...options });
  }
}
