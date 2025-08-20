
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Game
 * 
 */
export type Game = $Result.DefaultSelection<Prisma.$GamePayload>
/**
 * Model Room
 * 
 */
export type Room = $Result.DefaultSelection<Prisma.$RoomPayload>
/**
 * Model Connection
 * 
 */
export type Connection = $Result.DefaultSelection<Prisma.$ConnectionPayload>
/**
 * Model GameState
 * 
 */
export type GameState = $Result.DefaultSelection<Prisma.$GameStatePayload>
/**
 * Model Region
 * 
 */
export type Region = $Result.DefaultSelection<Prisma.$RegionPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Games
 * const games = await prisma.game.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Games
   * const games = await prisma.game.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.game`: Exposes CRUD operations for the **Game** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Games
    * const games = await prisma.game.findMany()
    * ```
    */
  get game(): Prisma.GameDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.room`: Exposes CRUD operations for the **Room** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Rooms
    * const rooms = await prisma.room.findMany()
    * ```
    */
  get room(): Prisma.RoomDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.connection`: Exposes CRUD operations for the **Connection** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Connections
    * const connections = await prisma.connection.findMany()
    * ```
    */
  get connection(): Prisma.ConnectionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.gameState`: Exposes CRUD operations for the **GameState** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GameStates
    * const gameStates = await prisma.gameState.findMany()
    * ```
    */
  get gameState(): Prisma.GameStateDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.region`: Exposes CRUD operations for the **Region** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Regions
    * const regions = await prisma.region.findMany()
    * ```
    */
  get region(): Prisma.RegionDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.14.0
   * Query Engine version: 717184b7b35ea05dfa71a3236b7af656013e1e49
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Game: 'Game',
    Room: 'Room',
    Connection: 'Connection',
    GameState: 'GameState',
    Region: 'Region'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "game" | "room" | "connection" | "gameState" | "region"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Game: {
        payload: Prisma.$GamePayload<ExtArgs>
        fields: Prisma.GameFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GameFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GameFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          findFirst: {
            args: Prisma.GameFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GameFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          findMany: {
            args: Prisma.GameFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>[]
          }
          create: {
            args: Prisma.GameCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          createMany: {
            args: Prisma.GameCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GameCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>[]
          }
          delete: {
            args: Prisma.GameDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          update: {
            args: Prisma.GameUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          deleteMany: {
            args: Prisma.GameDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GameUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GameUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>[]
          }
          upsert: {
            args: Prisma.GameUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GamePayload>
          }
          aggregate: {
            args: Prisma.GameAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGame>
          }
          groupBy: {
            args: Prisma.GameGroupByArgs<ExtArgs>
            result: $Utils.Optional<GameGroupByOutputType>[]
          }
          count: {
            args: Prisma.GameCountArgs<ExtArgs>
            result: $Utils.Optional<GameCountAggregateOutputType> | number
          }
        }
      }
      Room: {
        payload: Prisma.$RoomPayload<ExtArgs>
        fields: Prisma.RoomFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RoomFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RoomFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          findFirst: {
            args: Prisma.RoomFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RoomFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          findMany: {
            args: Prisma.RoomFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>[]
          }
          create: {
            args: Prisma.RoomCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          createMany: {
            args: Prisma.RoomCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RoomCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>[]
          }
          delete: {
            args: Prisma.RoomDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          update: {
            args: Prisma.RoomUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          deleteMany: {
            args: Prisma.RoomDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RoomUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RoomUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>[]
          }
          upsert: {
            args: Prisma.RoomUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomPayload>
          }
          aggregate: {
            args: Prisma.RoomAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRoom>
          }
          groupBy: {
            args: Prisma.RoomGroupByArgs<ExtArgs>
            result: $Utils.Optional<RoomGroupByOutputType>[]
          }
          count: {
            args: Prisma.RoomCountArgs<ExtArgs>
            result: $Utils.Optional<RoomCountAggregateOutputType> | number
          }
        }
      }
      Connection: {
        payload: Prisma.$ConnectionPayload<ExtArgs>
        fields: Prisma.ConnectionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConnectionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConnectionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>
          }
          findFirst: {
            args: Prisma.ConnectionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConnectionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>
          }
          findMany: {
            args: Prisma.ConnectionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>[]
          }
          create: {
            args: Prisma.ConnectionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>
          }
          createMany: {
            args: Prisma.ConnectionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConnectionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>[]
          }
          delete: {
            args: Prisma.ConnectionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>
          }
          update: {
            args: Prisma.ConnectionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>
          }
          deleteMany: {
            args: Prisma.ConnectionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConnectionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ConnectionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>[]
          }
          upsert: {
            args: Prisma.ConnectionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectionPayload>
          }
          aggregate: {
            args: Prisma.ConnectionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConnection>
          }
          groupBy: {
            args: Prisma.ConnectionGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConnectionGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConnectionCountArgs<ExtArgs>
            result: $Utils.Optional<ConnectionCountAggregateOutputType> | number
          }
        }
      }
      GameState: {
        payload: Prisma.$GameStatePayload<ExtArgs>
        fields: Prisma.GameStateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GameStateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GameStateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>
          }
          findFirst: {
            args: Prisma.GameStateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GameStateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>
          }
          findMany: {
            args: Prisma.GameStateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>[]
          }
          create: {
            args: Prisma.GameStateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>
          }
          createMany: {
            args: Prisma.GameStateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GameStateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>[]
          }
          delete: {
            args: Prisma.GameStateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>
          }
          update: {
            args: Prisma.GameStateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>
          }
          deleteMany: {
            args: Prisma.GameStateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GameStateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GameStateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>[]
          }
          upsert: {
            args: Prisma.GameStateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GameStatePayload>
          }
          aggregate: {
            args: Prisma.GameStateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGameState>
          }
          groupBy: {
            args: Prisma.GameStateGroupByArgs<ExtArgs>
            result: $Utils.Optional<GameStateGroupByOutputType>[]
          }
          count: {
            args: Prisma.GameStateCountArgs<ExtArgs>
            result: $Utils.Optional<GameStateCountAggregateOutputType> | number
          }
        }
      }
      Region: {
        payload: Prisma.$RegionPayload<ExtArgs>
        fields: Prisma.RegionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RegionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RegionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          findFirst: {
            args: Prisma.RegionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RegionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          findMany: {
            args: Prisma.RegionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>[]
          }
          create: {
            args: Prisma.RegionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          createMany: {
            args: Prisma.RegionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RegionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>[]
          }
          delete: {
            args: Prisma.RegionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          update: {
            args: Prisma.RegionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          deleteMany: {
            args: Prisma.RegionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RegionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RegionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>[]
          }
          upsert: {
            args: Prisma.RegionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          aggregate: {
            args: Prisma.RegionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRegion>
          }
          groupBy: {
            args: Prisma.RegionGroupByArgs<ExtArgs>
            result: $Utils.Optional<RegionGroupByOutputType>[]
          }
          count: {
            args: Prisma.RegionCountArgs<ExtArgs>
            result: $Utils.Optional<RegionCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    game?: GameOmit
    room?: RoomOmit
    connection?: ConnectionOmit
    gameState?: GameStateOmit
    region?: RegionOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type GameCountOutputType
   */

  export type GameCountOutputType = {
    rooms: number
    connections: number
    regions: number
  }

  export type GameCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rooms?: boolean | GameCountOutputTypeCountRoomsArgs
    connections?: boolean | GameCountOutputTypeCountConnectionsArgs
    regions?: boolean | GameCountOutputTypeCountRegionsArgs
  }

  // Custom InputTypes
  /**
   * GameCountOutputType without action
   */
  export type GameCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameCountOutputType
     */
    select?: GameCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * GameCountOutputType without action
   */
  export type GameCountOutputTypeCountRoomsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoomWhereInput
  }

  /**
   * GameCountOutputType without action
   */
  export type GameCountOutputTypeCountConnectionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectionWhereInput
  }

  /**
   * GameCountOutputType without action
   */
  export type GameCountOutputTypeCountRegionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RegionWhereInput
  }


  /**
   * Count Type RoomCountOutputType
   */

  export type RoomCountOutputType = {
    connectionsFrom: number
    connectionsTo: number
    gameStates: number
  }

  export type RoomCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    connectionsFrom?: boolean | RoomCountOutputTypeCountConnectionsFromArgs
    connectionsTo?: boolean | RoomCountOutputTypeCountConnectionsToArgs
    gameStates?: boolean | RoomCountOutputTypeCountGameStatesArgs
  }

  // Custom InputTypes
  /**
   * RoomCountOutputType without action
   */
  export type RoomCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomCountOutputType
     */
    select?: RoomCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RoomCountOutputType without action
   */
  export type RoomCountOutputTypeCountConnectionsFromArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectionWhereInput
  }

  /**
   * RoomCountOutputType without action
   */
  export type RoomCountOutputTypeCountConnectionsToArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectionWhereInput
  }

  /**
   * RoomCountOutputType without action
   */
  export type RoomCountOutputTypeCountGameStatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameStateWhereInput
  }


  /**
   * Count Type RegionCountOutputType
   */

  export type RegionCountOutputType = {
    rooms: number
  }

  export type RegionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rooms?: boolean | RegionCountOutputTypeCountRoomsArgs
  }

  // Custom InputTypes
  /**
   * RegionCountOutputType without action
   */
  export type RegionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegionCountOutputType
     */
    select?: RegionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RegionCountOutputType without action
   */
  export type RegionCountOutputTypeCountRoomsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoomWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Game
   */

  export type AggregateGame = {
    _count: GameCountAggregateOutputType | null
    _avg: GameAvgAggregateOutputType | null
    _sum: GameSumAggregateOutputType | null
    _min: GameMinAggregateOutputType | null
    _max: GameMaxAggregateOutputType | null
  }

  export type GameAvgAggregateOutputType = {
    id: number | null
  }

  export type GameSumAggregateOutputType = {
    id: number | null
  }

  export type GameMinAggregateOutputType = {
    id: number | null
    name: string | null
    createdAt: Date | null
    lastPlayedAt: Date | null
  }

  export type GameMaxAggregateOutputType = {
    id: number | null
    name: string | null
    createdAt: Date | null
    lastPlayedAt: Date | null
  }

  export type GameCountAggregateOutputType = {
    id: number
    name: number
    createdAt: number
    lastPlayedAt: number
    _all: number
  }


  export type GameAvgAggregateInputType = {
    id?: true
  }

  export type GameSumAggregateInputType = {
    id?: true
  }

  export type GameMinAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    lastPlayedAt?: true
  }

  export type GameMaxAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    lastPlayedAt?: true
  }

  export type GameCountAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    lastPlayedAt?: true
    _all?: true
  }

  export type GameAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Game to aggregate.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Games
    **/
    _count?: true | GameCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GameAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GameSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GameMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GameMaxAggregateInputType
  }

  export type GetGameAggregateType<T extends GameAggregateArgs> = {
        [P in keyof T & keyof AggregateGame]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGame[P]>
      : GetScalarType<T[P], AggregateGame[P]>
  }




  export type GameGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameWhereInput
    orderBy?: GameOrderByWithAggregationInput | GameOrderByWithAggregationInput[]
    by: GameScalarFieldEnum[] | GameScalarFieldEnum
    having?: GameScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GameCountAggregateInputType | true
    _avg?: GameAvgAggregateInputType
    _sum?: GameSumAggregateInputType
    _min?: GameMinAggregateInputType
    _max?: GameMaxAggregateInputType
  }

  export type GameGroupByOutputType = {
    id: number
    name: string
    createdAt: Date
    lastPlayedAt: Date
    _count: GameCountAggregateOutputType | null
    _avg: GameAvgAggregateOutputType | null
    _sum: GameSumAggregateOutputType | null
    _min: GameMinAggregateOutputType | null
    _max: GameMaxAggregateOutputType | null
  }

  type GetGameGroupByPayload<T extends GameGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GameGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GameGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GameGroupByOutputType[P]>
            : GetScalarType<T[P], GameGroupByOutputType[P]>
        }
      >
    >


  export type GameSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    createdAt?: boolean
    lastPlayedAt?: boolean
    rooms?: boolean | Game$roomsArgs<ExtArgs>
    connections?: boolean | Game$connectionsArgs<ExtArgs>
    gameState?: boolean | Game$gameStateArgs<ExtArgs>
    regions?: boolean | Game$regionsArgs<ExtArgs>
    _count?: boolean | GameCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["game"]>

  export type GameSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    createdAt?: boolean
    lastPlayedAt?: boolean
  }, ExtArgs["result"]["game"]>

  export type GameSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    createdAt?: boolean
    lastPlayedAt?: boolean
  }, ExtArgs["result"]["game"]>

  export type GameSelectScalar = {
    id?: boolean
    name?: boolean
    createdAt?: boolean
    lastPlayedAt?: boolean
  }

  export type GameOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "createdAt" | "lastPlayedAt", ExtArgs["result"]["game"]>
  export type GameInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rooms?: boolean | Game$roomsArgs<ExtArgs>
    connections?: boolean | Game$connectionsArgs<ExtArgs>
    gameState?: boolean | Game$gameStateArgs<ExtArgs>
    regions?: boolean | Game$regionsArgs<ExtArgs>
    _count?: boolean | GameCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type GameIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type GameIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $GamePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Game"
    objects: {
      rooms: Prisma.$RoomPayload<ExtArgs>[]
      connections: Prisma.$ConnectionPayload<ExtArgs>[]
      gameState: Prisma.$GameStatePayload<ExtArgs> | null
      regions: Prisma.$RegionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      createdAt: Date
      lastPlayedAt: Date
    }, ExtArgs["result"]["game"]>
    composites: {}
  }

  type GameGetPayload<S extends boolean | null | undefined | GameDefaultArgs> = $Result.GetResult<Prisma.$GamePayload, S>

  type GameCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GameFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GameCountAggregateInputType | true
    }

  export interface GameDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Game'], meta: { name: 'Game' } }
    /**
     * Find zero or one Game that matches the filter.
     * @param {GameFindUniqueArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GameFindUniqueArgs>(args: SelectSubset<T, GameFindUniqueArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Game that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GameFindUniqueOrThrowArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GameFindUniqueOrThrowArgs>(args: SelectSubset<T, GameFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Game that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameFindFirstArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GameFindFirstArgs>(args?: SelectSubset<T, GameFindFirstArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Game that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameFindFirstOrThrowArgs} args - Arguments to find a Game
     * @example
     * // Get one Game
     * const game = await prisma.game.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GameFindFirstOrThrowArgs>(args?: SelectSubset<T, GameFindFirstOrThrowArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Games that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Games
     * const games = await prisma.game.findMany()
     * 
     * // Get first 10 Games
     * const games = await prisma.game.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gameWithIdOnly = await prisma.game.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GameFindManyArgs>(args?: SelectSubset<T, GameFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Game.
     * @param {GameCreateArgs} args - Arguments to create a Game.
     * @example
     * // Create one Game
     * const Game = await prisma.game.create({
     *   data: {
     *     // ... data to create a Game
     *   }
     * })
     * 
     */
    create<T extends GameCreateArgs>(args: SelectSubset<T, GameCreateArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Games.
     * @param {GameCreateManyArgs} args - Arguments to create many Games.
     * @example
     * // Create many Games
     * const game = await prisma.game.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GameCreateManyArgs>(args?: SelectSubset<T, GameCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Games and returns the data saved in the database.
     * @param {GameCreateManyAndReturnArgs} args - Arguments to create many Games.
     * @example
     * // Create many Games
     * const game = await prisma.game.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Games and only return the `id`
     * const gameWithIdOnly = await prisma.game.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GameCreateManyAndReturnArgs>(args?: SelectSubset<T, GameCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Game.
     * @param {GameDeleteArgs} args - Arguments to delete one Game.
     * @example
     * // Delete one Game
     * const Game = await prisma.game.delete({
     *   where: {
     *     // ... filter to delete one Game
     *   }
     * })
     * 
     */
    delete<T extends GameDeleteArgs>(args: SelectSubset<T, GameDeleteArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Game.
     * @param {GameUpdateArgs} args - Arguments to update one Game.
     * @example
     * // Update one Game
     * const game = await prisma.game.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GameUpdateArgs>(args: SelectSubset<T, GameUpdateArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Games.
     * @param {GameDeleteManyArgs} args - Arguments to filter Games to delete.
     * @example
     * // Delete a few Games
     * const { count } = await prisma.game.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GameDeleteManyArgs>(args?: SelectSubset<T, GameDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Games.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Games
     * const game = await prisma.game.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GameUpdateManyArgs>(args: SelectSubset<T, GameUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Games and returns the data updated in the database.
     * @param {GameUpdateManyAndReturnArgs} args - Arguments to update many Games.
     * @example
     * // Update many Games
     * const game = await prisma.game.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Games and only return the `id`
     * const gameWithIdOnly = await prisma.game.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GameUpdateManyAndReturnArgs>(args: SelectSubset<T, GameUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Game.
     * @param {GameUpsertArgs} args - Arguments to update or create a Game.
     * @example
     * // Update or create a Game
     * const game = await prisma.game.upsert({
     *   create: {
     *     // ... data to create a Game
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Game we want to update
     *   }
     * })
     */
    upsert<T extends GameUpsertArgs>(args: SelectSubset<T, GameUpsertArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Games.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameCountArgs} args - Arguments to filter Games to count.
     * @example
     * // Count the number of Games
     * const count = await prisma.game.count({
     *   where: {
     *     // ... the filter for the Games we want to count
     *   }
     * })
    **/
    count<T extends GameCountArgs>(
      args?: Subset<T, GameCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GameCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Game.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GameAggregateArgs>(args: Subset<T, GameAggregateArgs>): Prisma.PrismaPromise<GetGameAggregateType<T>>

    /**
     * Group by Game.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GameGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GameGroupByArgs['orderBy'] }
        : { orderBy?: GameGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GameGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGameGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Game model
   */
  readonly fields: GameFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Game.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GameClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    rooms<T extends Game$roomsArgs<ExtArgs> = {}>(args?: Subset<T, Game$roomsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    connections<T extends Game$connectionsArgs<ExtArgs> = {}>(args?: Subset<T, Game$connectionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    gameState<T extends Game$gameStateArgs<ExtArgs> = {}>(args?: Subset<T, Game$gameStateArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    regions<T extends Game$regionsArgs<ExtArgs> = {}>(args?: Subset<T, Game$regionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Game model
   */
  interface GameFieldRefs {
    readonly id: FieldRef<"Game", 'Int'>
    readonly name: FieldRef<"Game", 'String'>
    readonly createdAt: FieldRef<"Game", 'DateTime'>
    readonly lastPlayedAt: FieldRef<"Game", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Game findUnique
   */
  export type GameFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game findUniqueOrThrow
   */
  export type GameFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game findFirst
   */
  export type GameFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Games.
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Games.
     */
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * Game findFirstOrThrow
   */
  export type GameFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Game to fetch.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Games.
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Games.
     */
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * Game findMany
   */
  export type GameFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter, which Games to fetch.
     */
    where?: GameWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Games to fetch.
     */
    orderBy?: GameOrderByWithRelationInput | GameOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Games.
     */
    cursor?: GameWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Games from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Games.
     */
    skip?: number
    distinct?: GameScalarFieldEnum | GameScalarFieldEnum[]
  }

  /**
   * Game create
   */
  export type GameCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * The data needed to create a Game.
     */
    data: XOR<GameCreateInput, GameUncheckedCreateInput>
  }

  /**
   * Game createMany
   */
  export type GameCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Games.
     */
    data: GameCreateManyInput | GameCreateManyInput[]
  }

  /**
   * Game createManyAndReturn
   */
  export type GameCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * The data used to create many Games.
     */
    data: GameCreateManyInput | GameCreateManyInput[]
  }

  /**
   * Game update
   */
  export type GameUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * The data needed to update a Game.
     */
    data: XOR<GameUpdateInput, GameUncheckedUpdateInput>
    /**
     * Choose, which Game to update.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game updateMany
   */
  export type GameUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Games.
     */
    data: XOR<GameUpdateManyMutationInput, GameUncheckedUpdateManyInput>
    /**
     * Filter which Games to update
     */
    where?: GameWhereInput
    /**
     * Limit how many Games to update.
     */
    limit?: number
  }

  /**
   * Game updateManyAndReturn
   */
  export type GameUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * The data used to update Games.
     */
    data: XOR<GameUpdateManyMutationInput, GameUncheckedUpdateManyInput>
    /**
     * Filter which Games to update
     */
    where?: GameWhereInput
    /**
     * Limit how many Games to update.
     */
    limit?: number
  }

  /**
   * Game upsert
   */
  export type GameUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * The filter to search for the Game to update in case it exists.
     */
    where: GameWhereUniqueInput
    /**
     * In case the Game found by the `where` argument doesn't exist, create a new Game with this data.
     */
    create: XOR<GameCreateInput, GameUncheckedCreateInput>
    /**
     * In case the Game was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GameUpdateInput, GameUncheckedUpdateInput>
  }

  /**
   * Game delete
   */
  export type GameDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
    /**
     * Filter which Game to delete.
     */
    where: GameWhereUniqueInput
  }

  /**
   * Game deleteMany
   */
  export type GameDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Games to delete
     */
    where?: GameWhereInput
    /**
     * Limit how many Games to delete.
     */
    limit?: number
  }

  /**
   * Game.rooms
   */
  export type Game$roomsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    where?: RoomWhereInput
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    cursor?: RoomWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Game.connections
   */
  export type Game$connectionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    where?: ConnectionWhereInput
    orderBy?: ConnectionOrderByWithRelationInput | ConnectionOrderByWithRelationInput[]
    cursor?: ConnectionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConnectionScalarFieldEnum | ConnectionScalarFieldEnum[]
  }

  /**
   * Game.gameState
   */
  export type Game$gameStateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    where?: GameStateWhereInput
  }

  /**
   * Game.regions
   */
  export type Game$regionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    where?: RegionWhereInput
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    cursor?: RegionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RegionScalarFieldEnum | RegionScalarFieldEnum[]
  }

  /**
   * Game without action
   */
  export type GameDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Game
     */
    select?: GameSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Game
     */
    omit?: GameOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameInclude<ExtArgs> | null
  }


  /**
   * Model Room
   */

  export type AggregateRoom = {
    _count: RoomCountAggregateOutputType | null
    _avg: RoomAvgAggregateOutputType | null
    _sum: RoomSumAggregateOutputType | null
    _min: RoomMinAggregateOutputType | null
    _max: RoomMaxAggregateOutputType | null
  }

  export type RoomAvgAggregateOutputType = {
    id: number | null
    gameId: number | null
    regionId: number | null
    regionDistance: number | null
  }

  export type RoomSumAggregateOutputType = {
    id: number | null
    gameId: number | null
    regionId: number | null
    regionDistance: number | null
  }

  export type RoomMinAggregateOutputType = {
    id: number | null
    gameId: number | null
    name: string | null
    description: string | null
    regionId: number | null
    regionDistance: number | null
  }

  export type RoomMaxAggregateOutputType = {
    id: number | null
    gameId: number | null
    name: string | null
    description: string | null
    regionId: number | null
    regionDistance: number | null
  }

  export type RoomCountAggregateOutputType = {
    id: number
    gameId: number
    name: number
    description: number
    regionId: number
    regionDistance: number
    _all: number
  }


  export type RoomAvgAggregateInputType = {
    id?: true
    gameId?: true
    regionId?: true
    regionDistance?: true
  }

  export type RoomSumAggregateInputType = {
    id?: true
    gameId?: true
    regionId?: true
    regionDistance?: true
  }

  export type RoomMinAggregateInputType = {
    id?: true
    gameId?: true
    name?: true
    description?: true
    regionId?: true
    regionDistance?: true
  }

  export type RoomMaxAggregateInputType = {
    id?: true
    gameId?: true
    name?: true
    description?: true
    regionId?: true
    regionDistance?: true
  }

  export type RoomCountAggregateInputType = {
    id?: true
    gameId?: true
    name?: true
    description?: true
    regionId?: true
    regionDistance?: true
    _all?: true
  }

  export type RoomAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Room to aggregate.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Rooms
    **/
    _count?: true | RoomCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RoomAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RoomSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RoomMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RoomMaxAggregateInputType
  }

  export type GetRoomAggregateType<T extends RoomAggregateArgs> = {
        [P in keyof T & keyof AggregateRoom]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRoom[P]>
      : GetScalarType<T[P], AggregateRoom[P]>
  }




  export type RoomGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoomWhereInput
    orderBy?: RoomOrderByWithAggregationInput | RoomOrderByWithAggregationInput[]
    by: RoomScalarFieldEnum[] | RoomScalarFieldEnum
    having?: RoomScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RoomCountAggregateInputType | true
    _avg?: RoomAvgAggregateInputType
    _sum?: RoomSumAggregateInputType
    _min?: RoomMinAggregateInputType
    _max?: RoomMaxAggregateInputType
  }

  export type RoomGroupByOutputType = {
    id: number
    gameId: number
    name: string
    description: string
    regionId: number | null
    regionDistance: number | null
    _count: RoomCountAggregateOutputType | null
    _avg: RoomAvgAggregateOutputType | null
    _sum: RoomSumAggregateOutputType | null
    _min: RoomMinAggregateOutputType | null
    _max: RoomMaxAggregateOutputType | null
  }

  type GetRoomGroupByPayload<T extends RoomGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RoomGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RoomGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RoomGroupByOutputType[P]>
            : GetScalarType<T[P], RoomGroupByOutputType[P]>
        }
      >
    >


  export type RoomSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    name?: boolean
    description?: boolean
    regionId?: boolean
    regionDistance?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    region?: boolean | Room$regionArgs<ExtArgs>
    connectionsFrom?: boolean | Room$connectionsFromArgs<ExtArgs>
    connectionsTo?: boolean | Room$connectionsToArgs<ExtArgs>
    gameStates?: boolean | Room$gameStatesArgs<ExtArgs>
    _count?: boolean | RoomCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["room"]>

  export type RoomSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    name?: boolean
    description?: boolean
    regionId?: boolean
    regionDistance?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    region?: boolean | Room$regionArgs<ExtArgs>
  }, ExtArgs["result"]["room"]>

  export type RoomSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    name?: boolean
    description?: boolean
    regionId?: boolean
    regionDistance?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    region?: boolean | Room$regionArgs<ExtArgs>
  }, ExtArgs["result"]["room"]>

  export type RoomSelectScalar = {
    id?: boolean
    gameId?: boolean
    name?: boolean
    description?: boolean
    regionId?: boolean
    regionDistance?: boolean
  }

  export type RoomOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "gameId" | "name" | "description" | "regionId" | "regionDistance", ExtArgs["result"]["room"]>
  export type RoomInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    region?: boolean | Room$regionArgs<ExtArgs>
    connectionsFrom?: boolean | Room$connectionsFromArgs<ExtArgs>
    connectionsTo?: boolean | Room$connectionsToArgs<ExtArgs>
    gameStates?: boolean | Room$gameStatesArgs<ExtArgs>
    _count?: boolean | RoomCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RoomIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    region?: boolean | Room$regionArgs<ExtArgs>
  }
  export type RoomIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    region?: boolean | Room$regionArgs<ExtArgs>
  }

  export type $RoomPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Room"
    objects: {
      game: Prisma.$GamePayload<ExtArgs>
      region: Prisma.$RegionPayload<ExtArgs> | null
      connectionsFrom: Prisma.$ConnectionPayload<ExtArgs>[]
      connectionsTo: Prisma.$ConnectionPayload<ExtArgs>[]
      gameStates: Prisma.$GameStatePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      gameId: number
      name: string
      description: string
      regionId: number | null
      regionDistance: number | null
    }, ExtArgs["result"]["room"]>
    composites: {}
  }

  type RoomGetPayload<S extends boolean | null | undefined | RoomDefaultArgs> = $Result.GetResult<Prisma.$RoomPayload, S>

  type RoomCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RoomFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RoomCountAggregateInputType | true
    }

  export interface RoomDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Room'], meta: { name: 'Room' } }
    /**
     * Find zero or one Room that matches the filter.
     * @param {RoomFindUniqueArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RoomFindUniqueArgs>(args: SelectSubset<T, RoomFindUniqueArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Room that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RoomFindUniqueOrThrowArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RoomFindUniqueOrThrowArgs>(args: SelectSubset<T, RoomFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Room that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomFindFirstArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RoomFindFirstArgs>(args?: SelectSubset<T, RoomFindFirstArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Room that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomFindFirstOrThrowArgs} args - Arguments to find a Room
     * @example
     * // Get one Room
     * const room = await prisma.room.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RoomFindFirstOrThrowArgs>(args?: SelectSubset<T, RoomFindFirstOrThrowArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Rooms that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Rooms
     * const rooms = await prisma.room.findMany()
     * 
     * // Get first 10 Rooms
     * const rooms = await prisma.room.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const roomWithIdOnly = await prisma.room.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RoomFindManyArgs>(args?: SelectSubset<T, RoomFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Room.
     * @param {RoomCreateArgs} args - Arguments to create a Room.
     * @example
     * // Create one Room
     * const Room = await prisma.room.create({
     *   data: {
     *     // ... data to create a Room
     *   }
     * })
     * 
     */
    create<T extends RoomCreateArgs>(args: SelectSubset<T, RoomCreateArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Rooms.
     * @param {RoomCreateManyArgs} args - Arguments to create many Rooms.
     * @example
     * // Create many Rooms
     * const room = await prisma.room.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RoomCreateManyArgs>(args?: SelectSubset<T, RoomCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Rooms and returns the data saved in the database.
     * @param {RoomCreateManyAndReturnArgs} args - Arguments to create many Rooms.
     * @example
     * // Create many Rooms
     * const room = await prisma.room.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Rooms and only return the `id`
     * const roomWithIdOnly = await prisma.room.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RoomCreateManyAndReturnArgs>(args?: SelectSubset<T, RoomCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Room.
     * @param {RoomDeleteArgs} args - Arguments to delete one Room.
     * @example
     * // Delete one Room
     * const Room = await prisma.room.delete({
     *   where: {
     *     // ... filter to delete one Room
     *   }
     * })
     * 
     */
    delete<T extends RoomDeleteArgs>(args: SelectSubset<T, RoomDeleteArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Room.
     * @param {RoomUpdateArgs} args - Arguments to update one Room.
     * @example
     * // Update one Room
     * const room = await prisma.room.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RoomUpdateArgs>(args: SelectSubset<T, RoomUpdateArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Rooms.
     * @param {RoomDeleteManyArgs} args - Arguments to filter Rooms to delete.
     * @example
     * // Delete a few Rooms
     * const { count } = await prisma.room.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RoomDeleteManyArgs>(args?: SelectSubset<T, RoomDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Rooms
     * const room = await prisma.room.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RoomUpdateManyArgs>(args: SelectSubset<T, RoomUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rooms and returns the data updated in the database.
     * @param {RoomUpdateManyAndReturnArgs} args - Arguments to update many Rooms.
     * @example
     * // Update many Rooms
     * const room = await prisma.room.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Rooms and only return the `id`
     * const roomWithIdOnly = await prisma.room.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RoomUpdateManyAndReturnArgs>(args: SelectSubset<T, RoomUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Room.
     * @param {RoomUpsertArgs} args - Arguments to update or create a Room.
     * @example
     * // Update or create a Room
     * const room = await prisma.room.upsert({
     *   create: {
     *     // ... data to create a Room
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Room we want to update
     *   }
     * })
     */
    upsert<T extends RoomUpsertArgs>(args: SelectSubset<T, RoomUpsertArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomCountArgs} args - Arguments to filter Rooms to count.
     * @example
     * // Count the number of Rooms
     * const count = await prisma.room.count({
     *   where: {
     *     // ... the filter for the Rooms we want to count
     *   }
     * })
    **/
    count<T extends RoomCountArgs>(
      args?: Subset<T, RoomCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RoomCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Room.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RoomAggregateArgs>(args: Subset<T, RoomAggregateArgs>): Prisma.PrismaPromise<GetRoomAggregateType<T>>

    /**
     * Group by Room.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RoomGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RoomGroupByArgs['orderBy'] }
        : { orderBy?: RoomGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RoomGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRoomGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Room model
   */
  readonly fields: RoomFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Room.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RoomClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    game<T extends GameDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GameDefaultArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    region<T extends Room$regionArgs<ExtArgs> = {}>(args?: Subset<T, Room$regionArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    connectionsFrom<T extends Room$connectionsFromArgs<ExtArgs> = {}>(args?: Subset<T, Room$connectionsFromArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    connectionsTo<T extends Room$connectionsToArgs<ExtArgs> = {}>(args?: Subset<T, Room$connectionsToArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    gameStates<T extends Room$gameStatesArgs<ExtArgs> = {}>(args?: Subset<T, Room$gameStatesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Room model
   */
  interface RoomFieldRefs {
    readonly id: FieldRef<"Room", 'Int'>
    readonly gameId: FieldRef<"Room", 'Int'>
    readonly name: FieldRef<"Room", 'String'>
    readonly description: FieldRef<"Room", 'String'>
    readonly regionId: FieldRef<"Room", 'Int'>
    readonly regionDistance: FieldRef<"Room", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * Room findUnique
   */
  export type RoomFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room findUniqueOrThrow
   */
  export type RoomFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room findFirst
   */
  export type RoomFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rooms.
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rooms.
     */
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Room findFirstOrThrow
   */
  export type RoomFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Room to fetch.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rooms.
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rooms.
     */
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Room findMany
   */
  export type RoomFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter, which Rooms to fetch.
     */
    where?: RoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rooms to fetch.
     */
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Rooms.
     */
    cursor?: RoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rooms.
     */
    skip?: number
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Room create
   */
  export type RoomCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * The data needed to create a Room.
     */
    data: XOR<RoomCreateInput, RoomUncheckedCreateInput>
  }

  /**
   * Room createMany
   */
  export type RoomCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Rooms.
     */
    data: RoomCreateManyInput | RoomCreateManyInput[]
  }

  /**
   * Room createManyAndReturn
   */
  export type RoomCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * The data used to create many Rooms.
     */
    data: RoomCreateManyInput | RoomCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Room update
   */
  export type RoomUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * The data needed to update a Room.
     */
    data: XOR<RoomUpdateInput, RoomUncheckedUpdateInput>
    /**
     * Choose, which Room to update.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room updateMany
   */
  export type RoomUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Rooms.
     */
    data: XOR<RoomUpdateManyMutationInput, RoomUncheckedUpdateManyInput>
    /**
     * Filter which Rooms to update
     */
    where?: RoomWhereInput
    /**
     * Limit how many Rooms to update.
     */
    limit?: number
  }

  /**
   * Room updateManyAndReturn
   */
  export type RoomUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * The data used to update Rooms.
     */
    data: XOR<RoomUpdateManyMutationInput, RoomUncheckedUpdateManyInput>
    /**
     * Filter which Rooms to update
     */
    where?: RoomWhereInput
    /**
     * Limit how many Rooms to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Room upsert
   */
  export type RoomUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * The filter to search for the Room to update in case it exists.
     */
    where: RoomWhereUniqueInput
    /**
     * In case the Room found by the `where` argument doesn't exist, create a new Room with this data.
     */
    create: XOR<RoomCreateInput, RoomUncheckedCreateInput>
    /**
     * In case the Room was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RoomUpdateInput, RoomUncheckedUpdateInput>
  }

  /**
   * Room delete
   */
  export type RoomDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    /**
     * Filter which Room to delete.
     */
    where: RoomWhereUniqueInput
  }

  /**
   * Room deleteMany
   */
  export type RoomDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Rooms to delete
     */
    where?: RoomWhereInput
    /**
     * Limit how many Rooms to delete.
     */
    limit?: number
  }

  /**
   * Room.region
   */
  export type Room$regionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    where?: RegionWhereInput
  }

  /**
   * Room.connectionsFrom
   */
  export type Room$connectionsFromArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    where?: ConnectionWhereInput
    orderBy?: ConnectionOrderByWithRelationInput | ConnectionOrderByWithRelationInput[]
    cursor?: ConnectionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConnectionScalarFieldEnum | ConnectionScalarFieldEnum[]
  }

  /**
   * Room.connectionsTo
   */
  export type Room$connectionsToArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    where?: ConnectionWhereInput
    orderBy?: ConnectionOrderByWithRelationInput | ConnectionOrderByWithRelationInput[]
    cursor?: ConnectionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConnectionScalarFieldEnum | ConnectionScalarFieldEnum[]
  }

  /**
   * Room.gameStates
   */
  export type Room$gameStatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    where?: GameStateWhereInput
    orderBy?: GameStateOrderByWithRelationInput | GameStateOrderByWithRelationInput[]
    cursor?: GameStateWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GameStateScalarFieldEnum | GameStateScalarFieldEnum[]
  }

  /**
   * Room without action
   */
  export type RoomDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
  }


  /**
   * Model Connection
   */

  export type AggregateConnection = {
    _count: ConnectionCountAggregateOutputType | null
    _avg: ConnectionAvgAggregateOutputType | null
    _sum: ConnectionSumAggregateOutputType | null
    _min: ConnectionMinAggregateOutputType | null
    _max: ConnectionMaxAggregateOutputType | null
  }

  export type ConnectionAvgAggregateOutputType = {
    id: number | null
    gameId: number | null
    fromRoomId: number | null
    toRoomId: number | null
  }

  export type ConnectionSumAggregateOutputType = {
    id: number | null
    gameId: number | null
    fromRoomId: number | null
    toRoomId: number | null
  }

  export type ConnectionMinAggregateOutputType = {
    id: number | null
    gameId: number | null
    fromRoomId: number | null
    toRoomId: number | null
    direction: string | null
    name: string | null
    processing: boolean | null
  }

  export type ConnectionMaxAggregateOutputType = {
    id: number | null
    gameId: number | null
    fromRoomId: number | null
    toRoomId: number | null
    direction: string | null
    name: string | null
    processing: boolean | null
  }

  export type ConnectionCountAggregateOutputType = {
    id: number
    gameId: number
    fromRoomId: number
    toRoomId: number
    direction: number
    name: number
    processing: number
    _all: number
  }


  export type ConnectionAvgAggregateInputType = {
    id?: true
    gameId?: true
    fromRoomId?: true
    toRoomId?: true
  }

  export type ConnectionSumAggregateInputType = {
    id?: true
    gameId?: true
    fromRoomId?: true
    toRoomId?: true
  }

  export type ConnectionMinAggregateInputType = {
    id?: true
    gameId?: true
    fromRoomId?: true
    toRoomId?: true
    direction?: true
    name?: true
    processing?: true
  }

  export type ConnectionMaxAggregateInputType = {
    id?: true
    gameId?: true
    fromRoomId?: true
    toRoomId?: true
    direction?: true
    name?: true
    processing?: true
  }

  export type ConnectionCountAggregateInputType = {
    id?: true
    gameId?: true
    fromRoomId?: true
    toRoomId?: true
    direction?: true
    name?: true
    processing?: true
    _all?: true
  }

  export type ConnectionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Connection to aggregate.
     */
    where?: ConnectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connections to fetch.
     */
    orderBy?: ConnectionOrderByWithRelationInput | ConnectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConnectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Connections
    **/
    _count?: true | ConnectionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ConnectionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ConnectionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConnectionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConnectionMaxAggregateInputType
  }

  export type GetConnectionAggregateType<T extends ConnectionAggregateArgs> = {
        [P in keyof T & keyof AggregateConnection]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConnection[P]>
      : GetScalarType<T[P], AggregateConnection[P]>
  }




  export type ConnectionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectionWhereInput
    orderBy?: ConnectionOrderByWithAggregationInput | ConnectionOrderByWithAggregationInput[]
    by: ConnectionScalarFieldEnum[] | ConnectionScalarFieldEnum
    having?: ConnectionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConnectionCountAggregateInputType | true
    _avg?: ConnectionAvgAggregateInputType
    _sum?: ConnectionSumAggregateInputType
    _min?: ConnectionMinAggregateInputType
    _max?: ConnectionMaxAggregateInputType
  }

  export type ConnectionGroupByOutputType = {
    id: number
    gameId: number
    fromRoomId: number
    toRoomId: number | null
    direction: string | null
    name: string
    processing: boolean
    _count: ConnectionCountAggregateOutputType | null
    _avg: ConnectionAvgAggregateOutputType | null
    _sum: ConnectionSumAggregateOutputType | null
    _min: ConnectionMinAggregateOutputType | null
    _max: ConnectionMaxAggregateOutputType | null
  }

  type GetConnectionGroupByPayload<T extends ConnectionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConnectionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConnectionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConnectionGroupByOutputType[P]>
            : GetScalarType<T[P], ConnectionGroupByOutputType[P]>
        }
      >
    >


  export type ConnectionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    fromRoomId?: boolean
    toRoomId?: boolean
    direction?: boolean
    name?: boolean
    processing?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    fromRoom?: boolean | RoomDefaultArgs<ExtArgs>
    toRoom?: boolean | Connection$toRoomArgs<ExtArgs>
  }, ExtArgs["result"]["connection"]>

  export type ConnectionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    fromRoomId?: boolean
    toRoomId?: boolean
    direction?: boolean
    name?: boolean
    processing?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    fromRoom?: boolean | RoomDefaultArgs<ExtArgs>
    toRoom?: boolean | Connection$toRoomArgs<ExtArgs>
  }, ExtArgs["result"]["connection"]>

  export type ConnectionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    fromRoomId?: boolean
    toRoomId?: boolean
    direction?: boolean
    name?: boolean
    processing?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    fromRoom?: boolean | RoomDefaultArgs<ExtArgs>
    toRoom?: boolean | Connection$toRoomArgs<ExtArgs>
  }, ExtArgs["result"]["connection"]>

  export type ConnectionSelectScalar = {
    id?: boolean
    gameId?: boolean
    fromRoomId?: boolean
    toRoomId?: boolean
    direction?: boolean
    name?: boolean
    processing?: boolean
  }

  export type ConnectionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "gameId" | "fromRoomId" | "toRoomId" | "direction" | "name" | "processing", ExtArgs["result"]["connection"]>
  export type ConnectionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    fromRoom?: boolean | RoomDefaultArgs<ExtArgs>
    toRoom?: boolean | Connection$toRoomArgs<ExtArgs>
  }
  export type ConnectionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    fromRoom?: boolean | RoomDefaultArgs<ExtArgs>
    toRoom?: boolean | Connection$toRoomArgs<ExtArgs>
  }
  export type ConnectionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    fromRoom?: boolean | RoomDefaultArgs<ExtArgs>
    toRoom?: boolean | Connection$toRoomArgs<ExtArgs>
  }

  export type $ConnectionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Connection"
    objects: {
      game: Prisma.$GamePayload<ExtArgs>
      fromRoom: Prisma.$RoomPayload<ExtArgs>
      toRoom: Prisma.$RoomPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      gameId: number
      fromRoomId: number
      toRoomId: number | null
      direction: string | null
      name: string
      processing: boolean
    }, ExtArgs["result"]["connection"]>
    composites: {}
  }

  type ConnectionGetPayload<S extends boolean | null | undefined | ConnectionDefaultArgs> = $Result.GetResult<Prisma.$ConnectionPayload, S>

  type ConnectionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ConnectionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ConnectionCountAggregateInputType | true
    }

  export interface ConnectionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Connection'], meta: { name: 'Connection' } }
    /**
     * Find zero or one Connection that matches the filter.
     * @param {ConnectionFindUniqueArgs} args - Arguments to find a Connection
     * @example
     * // Get one Connection
     * const connection = await prisma.connection.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConnectionFindUniqueArgs>(args: SelectSubset<T, ConnectionFindUniqueArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Connection that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ConnectionFindUniqueOrThrowArgs} args - Arguments to find a Connection
     * @example
     * // Get one Connection
     * const connection = await prisma.connection.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConnectionFindUniqueOrThrowArgs>(args: SelectSubset<T, ConnectionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Connection that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectionFindFirstArgs} args - Arguments to find a Connection
     * @example
     * // Get one Connection
     * const connection = await prisma.connection.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConnectionFindFirstArgs>(args?: SelectSubset<T, ConnectionFindFirstArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Connection that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectionFindFirstOrThrowArgs} args - Arguments to find a Connection
     * @example
     * // Get one Connection
     * const connection = await prisma.connection.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConnectionFindFirstOrThrowArgs>(args?: SelectSubset<T, ConnectionFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Connections that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Connections
     * const connections = await prisma.connection.findMany()
     * 
     * // Get first 10 Connections
     * const connections = await prisma.connection.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const connectionWithIdOnly = await prisma.connection.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConnectionFindManyArgs>(args?: SelectSubset<T, ConnectionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Connection.
     * @param {ConnectionCreateArgs} args - Arguments to create a Connection.
     * @example
     * // Create one Connection
     * const Connection = await prisma.connection.create({
     *   data: {
     *     // ... data to create a Connection
     *   }
     * })
     * 
     */
    create<T extends ConnectionCreateArgs>(args: SelectSubset<T, ConnectionCreateArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Connections.
     * @param {ConnectionCreateManyArgs} args - Arguments to create many Connections.
     * @example
     * // Create many Connections
     * const connection = await prisma.connection.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConnectionCreateManyArgs>(args?: SelectSubset<T, ConnectionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Connections and returns the data saved in the database.
     * @param {ConnectionCreateManyAndReturnArgs} args - Arguments to create many Connections.
     * @example
     * // Create many Connections
     * const connection = await prisma.connection.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Connections and only return the `id`
     * const connectionWithIdOnly = await prisma.connection.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConnectionCreateManyAndReturnArgs>(args?: SelectSubset<T, ConnectionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Connection.
     * @param {ConnectionDeleteArgs} args - Arguments to delete one Connection.
     * @example
     * // Delete one Connection
     * const Connection = await prisma.connection.delete({
     *   where: {
     *     // ... filter to delete one Connection
     *   }
     * })
     * 
     */
    delete<T extends ConnectionDeleteArgs>(args: SelectSubset<T, ConnectionDeleteArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Connection.
     * @param {ConnectionUpdateArgs} args - Arguments to update one Connection.
     * @example
     * // Update one Connection
     * const connection = await prisma.connection.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConnectionUpdateArgs>(args: SelectSubset<T, ConnectionUpdateArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Connections.
     * @param {ConnectionDeleteManyArgs} args - Arguments to filter Connections to delete.
     * @example
     * // Delete a few Connections
     * const { count } = await prisma.connection.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConnectionDeleteManyArgs>(args?: SelectSubset<T, ConnectionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Connections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Connections
     * const connection = await prisma.connection.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConnectionUpdateManyArgs>(args: SelectSubset<T, ConnectionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Connections and returns the data updated in the database.
     * @param {ConnectionUpdateManyAndReturnArgs} args - Arguments to update many Connections.
     * @example
     * // Update many Connections
     * const connection = await prisma.connection.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Connections and only return the `id`
     * const connectionWithIdOnly = await prisma.connection.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ConnectionUpdateManyAndReturnArgs>(args: SelectSubset<T, ConnectionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Connection.
     * @param {ConnectionUpsertArgs} args - Arguments to update or create a Connection.
     * @example
     * // Update or create a Connection
     * const connection = await prisma.connection.upsert({
     *   create: {
     *     // ... data to create a Connection
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Connection we want to update
     *   }
     * })
     */
    upsert<T extends ConnectionUpsertArgs>(args: SelectSubset<T, ConnectionUpsertArgs<ExtArgs>>): Prisma__ConnectionClient<$Result.GetResult<Prisma.$ConnectionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Connections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectionCountArgs} args - Arguments to filter Connections to count.
     * @example
     * // Count the number of Connections
     * const count = await prisma.connection.count({
     *   where: {
     *     // ... the filter for the Connections we want to count
     *   }
     * })
    **/
    count<T extends ConnectionCountArgs>(
      args?: Subset<T, ConnectionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConnectionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Connection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConnectionAggregateArgs>(args: Subset<T, ConnectionAggregateArgs>): Prisma.PrismaPromise<GetConnectionAggregateType<T>>

    /**
     * Group by Connection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConnectionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConnectionGroupByArgs['orderBy'] }
        : { orderBy?: ConnectionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConnectionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConnectionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Connection model
   */
  readonly fields: ConnectionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Connection.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConnectionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    game<T extends GameDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GameDefaultArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    fromRoom<T extends RoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RoomDefaultArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    toRoom<T extends Connection$toRoomArgs<ExtArgs> = {}>(args?: Subset<T, Connection$toRoomArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Connection model
   */
  interface ConnectionFieldRefs {
    readonly id: FieldRef<"Connection", 'Int'>
    readonly gameId: FieldRef<"Connection", 'Int'>
    readonly fromRoomId: FieldRef<"Connection", 'Int'>
    readonly toRoomId: FieldRef<"Connection", 'Int'>
    readonly direction: FieldRef<"Connection", 'String'>
    readonly name: FieldRef<"Connection", 'String'>
    readonly processing: FieldRef<"Connection", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * Connection findUnique
   */
  export type ConnectionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * Filter, which Connection to fetch.
     */
    where: ConnectionWhereUniqueInput
  }

  /**
   * Connection findUniqueOrThrow
   */
  export type ConnectionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * Filter, which Connection to fetch.
     */
    where: ConnectionWhereUniqueInput
  }

  /**
   * Connection findFirst
   */
  export type ConnectionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * Filter, which Connection to fetch.
     */
    where?: ConnectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connections to fetch.
     */
    orderBy?: ConnectionOrderByWithRelationInput | ConnectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Connections.
     */
    cursor?: ConnectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Connections.
     */
    distinct?: ConnectionScalarFieldEnum | ConnectionScalarFieldEnum[]
  }

  /**
   * Connection findFirstOrThrow
   */
  export type ConnectionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * Filter, which Connection to fetch.
     */
    where?: ConnectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connections to fetch.
     */
    orderBy?: ConnectionOrderByWithRelationInput | ConnectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Connections.
     */
    cursor?: ConnectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Connections.
     */
    distinct?: ConnectionScalarFieldEnum | ConnectionScalarFieldEnum[]
  }

  /**
   * Connection findMany
   */
  export type ConnectionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * Filter, which Connections to fetch.
     */
    where?: ConnectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connections to fetch.
     */
    orderBy?: ConnectionOrderByWithRelationInput | ConnectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Connections.
     */
    cursor?: ConnectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connections.
     */
    skip?: number
    distinct?: ConnectionScalarFieldEnum | ConnectionScalarFieldEnum[]
  }

  /**
   * Connection create
   */
  export type ConnectionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * The data needed to create a Connection.
     */
    data: XOR<ConnectionCreateInput, ConnectionUncheckedCreateInput>
  }

  /**
   * Connection createMany
   */
  export type ConnectionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Connections.
     */
    data: ConnectionCreateManyInput | ConnectionCreateManyInput[]
  }

  /**
   * Connection createManyAndReturn
   */
  export type ConnectionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * The data used to create many Connections.
     */
    data: ConnectionCreateManyInput | ConnectionCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Connection update
   */
  export type ConnectionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * The data needed to update a Connection.
     */
    data: XOR<ConnectionUpdateInput, ConnectionUncheckedUpdateInput>
    /**
     * Choose, which Connection to update.
     */
    where: ConnectionWhereUniqueInput
  }

  /**
   * Connection updateMany
   */
  export type ConnectionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Connections.
     */
    data: XOR<ConnectionUpdateManyMutationInput, ConnectionUncheckedUpdateManyInput>
    /**
     * Filter which Connections to update
     */
    where?: ConnectionWhereInput
    /**
     * Limit how many Connections to update.
     */
    limit?: number
  }

  /**
   * Connection updateManyAndReturn
   */
  export type ConnectionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * The data used to update Connections.
     */
    data: XOR<ConnectionUpdateManyMutationInput, ConnectionUncheckedUpdateManyInput>
    /**
     * Filter which Connections to update
     */
    where?: ConnectionWhereInput
    /**
     * Limit how many Connections to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Connection upsert
   */
  export type ConnectionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * The filter to search for the Connection to update in case it exists.
     */
    where: ConnectionWhereUniqueInput
    /**
     * In case the Connection found by the `where` argument doesn't exist, create a new Connection with this data.
     */
    create: XOR<ConnectionCreateInput, ConnectionUncheckedCreateInput>
    /**
     * In case the Connection was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConnectionUpdateInput, ConnectionUncheckedUpdateInput>
  }

  /**
   * Connection delete
   */
  export type ConnectionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
    /**
     * Filter which Connection to delete.
     */
    where: ConnectionWhereUniqueInput
  }

  /**
   * Connection deleteMany
   */
  export type ConnectionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Connections to delete
     */
    where?: ConnectionWhereInput
    /**
     * Limit how many Connections to delete.
     */
    limit?: number
  }

  /**
   * Connection.toRoom
   */
  export type Connection$toRoomArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    where?: RoomWhereInput
  }

  /**
   * Connection without action
   */
  export type ConnectionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connection
     */
    select?: ConnectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Connection
     */
    omit?: ConnectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectionInclude<ExtArgs> | null
  }


  /**
   * Model GameState
   */

  export type AggregateGameState = {
    _count: GameStateCountAggregateOutputType | null
    _avg: GameStateAvgAggregateOutputType | null
    _sum: GameStateSumAggregateOutputType | null
    _min: GameStateMinAggregateOutputType | null
    _max: GameStateMaxAggregateOutputType | null
  }

  export type GameStateAvgAggregateOutputType = {
    id: number | null
    gameId: number | null
    currentRoomId: number | null
  }

  export type GameStateSumAggregateOutputType = {
    id: number | null
    gameId: number | null
    currentRoomId: number | null
  }

  export type GameStateMinAggregateOutputType = {
    id: number | null
    gameId: number | null
    currentRoomId: number | null
    playerName: string | null
  }

  export type GameStateMaxAggregateOutputType = {
    id: number | null
    gameId: number | null
    currentRoomId: number | null
    playerName: string | null
  }

  export type GameStateCountAggregateOutputType = {
    id: number
    gameId: number
    currentRoomId: number
    playerName: number
    _all: number
  }


  export type GameStateAvgAggregateInputType = {
    id?: true
    gameId?: true
    currentRoomId?: true
  }

  export type GameStateSumAggregateInputType = {
    id?: true
    gameId?: true
    currentRoomId?: true
  }

  export type GameStateMinAggregateInputType = {
    id?: true
    gameId?: true
    currentRoomId?: true
    playerName?: true
  }

  export type GameStateMaxAggregateInputType = {
    id?: true
    gameId?: true
    currentRoomId?: true
    playerName?: true
  }

  export type GameStateCountAggregateInputType = {
    id?: true
    gameId?: true
    currentRoomId?: true
    playerName?: true
    _all?: true
  }

  export type GameStateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GameState to aggregate.
     */
    where?: GameStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameStates to fetch.
     */
    orderBy?: GameStateOrderByWithRelationInput | GameStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GameStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GameStates
    **/
    _count?: true | GameStateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GameStateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GameStateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GameStateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GameStateMaxAggregateInputType
  }

  export type GetGameStateAggregateType<T extends GameStateAggregateArgs> = {
        [P in keyof T & keyof AggregateGameState]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGameState[P]>
      : GetScalarType<T[P], AggregateGameState[P]>
  }




  export type GameStateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GameStateWhereInput
    orderBy?: GameStateOrderByWithAggregationInput | GameStateOrderByWithAggregationInput[]
    by: GameStateScalarFieldEnum[] | GameStateScalarFieldEnum
    having?: GameStateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GameStateCountAggregateInputType | true
    _avg?: GameStateAvgAggregateInputType
    _sum?: GameStateSumAggregateInputType
    _min?: GameStateMinAggregateInputType
    _max?: GameStateMaxAggregateInputType
  }

  export type GameStateGroupByOutputType = {
    id: number
    gameId: number
    currentRoomId: number
    playerName: string | null
    _count: GameStateCountAggregateOutputType | null
    _avg: GameStateAvgAggregateOutputType | null
    _sum: GameStateSumAggregateOutputType | null
    _min: GameStateMinAggregateOutputType | null
    _max: GameStateMaxAggregateOutputType | null
  }

  type GetGameStateGroupByPayload<T extends GameStateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GameStateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GameStateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GameStateGroupByOutputType[P]>
            : GetScalarType<T[P], GameStateGroupByOutputType[P]>
        }
      >
    >


  export type GameStateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    currentRoomId?: boolean
    playerName?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    currentRoom?: boolean | RoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gameState"]>

  export type GameStateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    currentRoomId?: boolean
    playerName?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    currentRoom?: boolean | RoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gameState"]>

  export type GameStateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    currentRoomId?: boolean
    playerName?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    currentRoom?: boolean | RoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gameState"]>

  export type GameStateSelectScalar = {
    id?: boolean
    gameId?: boolean
    currentRoomId?: boolean
    playerName?: boolean
  }

  export type GameStateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "gameId" | "currentRoomId" | "playerName", ExtArgs["result"]["gameState"]>
  export type GameStateInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    currentRoom?: boolean | RoomDefaultArgs<ExtArgs>
  }
  export type GameStateIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    currentRoom?: boolean | RoomDefaultArgs<ExtArgs>
  }
  export type GameStateIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    currentRoom?: boolean | RoomDefaultArgs<ExtArgs>
  }

  export type $GameStatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "GameState"
    objects: {
      game: Prisma.$GamePayload<ExtArgs>
      currentRoom: Prisma.$RoomPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      gameId: number
      currentRoomId: number
      playerName: string | null
    }, ExtArgs["result"]["gameState"]>
    composites: {}
  }

  type GameStateGetPayload<S extends boolean | null | undefined | GameStateDefaultArgs> = $Result.GetResult<Prisma.$GameStatePayload, S>

  type GameStateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GameStateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GameStateCountAggregateInputType | true
    }

  export interface GameStateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GameState'], meta: { name: 'GameState' } }
    /**
     * Find zero or one GameState that matches the filter.
     * @param {GameStateFindUniqueArgs} args - Arguments to find a GameState
     * @example
     * // Get one GameState
     * const gameState = await prisma.gameState.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GameStateFindUniqueArgs>(args: SelectSubset<T, GameStateFindUniqueArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GameState that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GameStateFindUniqueOrThrowArgs} args - Arguments to find a GameState
     * @example
     * // Get one GameState
     * const gameState = await prisma.gameState.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GameStateFindUniqueOrThrowArgs>(args: SelectSubset<T, GameStateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GameState that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameStateFindFirstArgs} args - Arguments to find a GameState
     * @example
     * // Get one GameState
     * const gameState = await prisma.gameState.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GameStateFindFirstArgs>(args?: SelectSubset<T, GameStateFindFirstArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GameState that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameStateFindFirstOrThrowArgs} args - Arguments to find a GameState
     * @example
     * // Get one GameState
     * const gameState = await prisma.gameState.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GameStateFindFirstOrThrowArgs>(args?: SelectSubset<T, GameStateFindFirstOrThrowArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GameStates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameStateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GameStates
     * const gameStates = await prisma.gameState.findMany()
     * 
     * // Get first 10 GameStates
     * const gameStates = await prisma.gameState.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gameStateWithIdOnly = await prisma.gameState.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GameStateFindManyArgs>(args?: SelectSubset<T, GameStateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GameState.
     * @param {GameStateCreateArgs} args - Arguments to create a GameState.
     * @example
     * // Create one GameState
     * const GameState = await prisma.gameState.create({
     *   data: {
     *     // ... data to create a GameState
     *   }
     * })
     * 
     */
    create<T extends GameStateCreateArgs>(args: SelectSubset<T, GameStateCreateArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GameStates.
     * @param {GameStateCreateManyArgs} args - Arguments to create many GameStates.
     * @example
     * // Create many GameStates
     * const gameState = await prisma.gameState.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GameStateCreateManyArgs>(args?: SelectSubset<T, GameStateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GameStates and returns the data saved in the database.
     * @param {GameStateCreateManyAndReturnArgs} args - Arguments to create many GameStates.
     * @example
     * // Create many GameStates
     * const gameState = await prisma.gameState.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GameStates and only return the `id`
     * const gameStateWithIdOnly = await prisma.gameState.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GameStateCreateManyAndReturnArgs>(args?: SelectSubset<T, GameStateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GameState.
     * @param {GameStateDeleteArgs} args - Arguments to delete one GameState.
     * @example
     * // Delete one GameState
     * const GameState = await prisma.gameState.delete({
     *   where: {
     *     // ... filter to delete one GameState
     *   }
     * })
     * 
     */
    delete<T extends GameStateDeleteArgs>(args: SelectSubset<T, GameStateDeleteArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GameState.
     * @param {GameStateUpdateArgs} args - Arguments to update one GameState.
     * @example
     * // Update one GameState
     * const gameState = await prisma.gameState.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GameStateUpdateArgs>(args: SelectSubset<T, GameStateUpdateArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GameStates.
     * @param {GameStateDeleteManyArgs} args - Arguments to filter GameStates to delete.
     * @example
     * // Delete a few GameStates
     * const { count } = await prisma.gameState.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GameStateDeleteManyArgs>(args?: SelectSubset<T, GameStateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GameStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameStateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GameStates
     * const gameState = await prisma.gameState.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GameStateUpdateManyArgs>(args: SelectSubset<T, GameStateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GameStates and returns the data updated in the database.
     * @param {GameStateUpdateManyAndReturnArgs} args - Arguments to update many GameStates.
     * @example
     * // Update many GameStates
     * const gameState = await prisma.gameState.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GameStates and only return the `id`
     * const gameStateWithIdOnly = await prisma.gameState.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GameStateUpdateManyAndReturnArgs>(args: SelectSubset<T, GameStateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GameState.
     * @param {GameStateUpsertArgs} args - Arguments to update or create a GameState.
     * @example
     * // Update or create a GameState
     * const gameState = await prisma.gameState.upsert({
     *   create: {
     *     // ... data to create a GameState
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GameState we want to update
     *   }
     * })
     */
    upsert<T extends GameStateUpsertArgs>(args: SelectSubset<T, GameStateUpsertArgs<ExtArgs>>): Prisma__GameStateClient<$Result.GetResult<Prisma.$GameStatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GameStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameStateCountArgs} args - Arguments to filter GameStates to count.
     * @example
     * // Count the number of GameStates
     * const count = await prisma.gameState.count({
     *   where: {
     *     // ... the filter for the GameStates we want to count
     *   }
     * })
    **/
    count<T extends GameStateCountArgs>(
      args?: Subset<T, GameStateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GameStateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GameState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameStateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GameStateAggregateArgs>(args: Subset<T, GameStateAggregateArgs>): Prisma.PrismaPromise<GetGameStateAggregateType<T>>

    /**
     * Group by GameState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GameStateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GameStateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GameStateGroupByArgs['orderBy'] }
        : { orderBy?: GameStateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GameStateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGameStateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GameState model
   */
  readonly fields: GameStateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GameState.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GameStateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    game<T extends GameDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GameDefaultArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    currentRoom<T extends RoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RoomDefaultArgs<ExtArgs>>): Prisma__RoomClient<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the GameState model
   */
  interface GameStateFieldRefs {
    readonly id: FieldRef<"GameState", 'Int'>
    readonly gameId: FieldRef<"GameState", 'Int'>
    readonly currentRoomId: FieldRef<"GameState", 'Int'>
    readonly playerName: FieldRef<"GameState", 'String'>
  }
    

  // Custom InputTypes
  /**
   * GameState findUnique
   */
  export type GameStateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * Filter, which GameState to fetch.
     */
    where: GameStateWhereUniqueInput
  }

  /**
   * GameState findUniqueOrThrow
   */
  export type GameStateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * Filter, which GameState to fetch.
     */
    where: GameStateWhereUniqueInput
  }

  /**
   * GameState findFirst
   */
  export type GameStateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * Filter, which GameState to fetch.
     */
    where?: GameStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameStates to fetch.
     */
    orderBy?: GameStateOrderByWithRelationInput | GameStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GameStates.
     */
    cursor?: GameStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GameStates.
     */
    distinct?: GameStateScalarFieldEnum | GameStateScalarFieldEnum[]
  }

  /**
   * GameState findFirstOrThrow
   */
  export type GameStateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * Filter, which GameState to fetch.
     */
    where?: GameStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameStates to fetch.
     */
    orderBy?: GameStateOrderByWithRelationInput | GameStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GameStates.
     */
    cursor?: GameStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GameStates.
     */
    distinct?: GameStateScalarFieldEnum | GameStateScalarFieldEnum[]
  }

  /**
   * GameState findMany
   */
  export type GameStateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * Filter, which GameStates to fetch.
     */
    where?: GameStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GameStates to fetch.
     */
    orderBy?: GameStateOrderByWithRelationInput | GameStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GameStates.
     */
    cursor?: GameStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GameStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GameStates.
     */
    skip?: number
    distinct?: GameStateScalarFieldEnum | GameStateScalarFieldEnum[]
  }

  /**
   * GameState create
   */
  export type GameStateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * The data needed to create a GameState.
     */
    data: XOR<GameStateCreateInput, GameStateUncheckedCreateInput>
  }

  /**
   * GameState createMany
   */
  export type GameStateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many GameStates.
     */
    data: GameStateCreateManyInput | GameStateCreateManyInput[]
  }

  /**
   * GameState createManyAndReturn
   */
  export type GameStateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * The data used to create many GameStates.
     */
    data: GameStateCreateManyInput | GameStateCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * GameState update
   */
  export type GameStateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * The data needed to update a GameState.
     */
    data: XOR<GameStateUpdateInput, GameStateUncheckedUpdateInput>
    /**
     * Choose, which GameState to update.
     */
    where: GameStateWhereUniqueInput
  }

  /**
   * GameState updateMany
   */
  export type GameStateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update GameStates.
     */
    data: XOR<GameStateUpdateManyMutationInput, GameStateUncheckedUpdateManyInput>
    /**
     * Filter which GameStates to update
     */
    where?: GameStateWhereInput
    /**
     * Limit how many GameStates to update.
     */
    limit?: number
  }

  /**
   * GameState updateManyAndReturn
   */
  export type GameStateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * The data used to update GameStates.
     */
    data: XOR<GameStateUpdateManyMutationInput, GameStateUncheckedUpdateManyInput>
    /**
     * Filter which GameStates to update
     */
    where?: GameStateWhereInput
    /**
     * Limit how many GameStates to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * GameState upsert
   */
  export type GameStateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * The filter to search for the GameState to update in case it exists.
     */
    where: GameStateWhereUniqueInput
    /**
     * In case the GameState found by the `where` argument doesn't exist, create a new GameState with this data.
     */
    create: XOR<GameStateCreateInput, GameStateUncheckedCreateInput>
    /**
     * In case the GameState was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GameStateUpdateInput, GameStateUncheckedUpdateInput>
  }

  /**
   * GameState delete
   */
  export type GameStateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
    /**
     * Filter which GameState to delete.
     */
    where: GameStateWhereUniqueInput
  }

  /**
   * GameState deleteMany
   */
  export type GameStateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GameStates to delete
     */
    where?: GameStateWhereInput
    /**
     * Limit how many GameStates to delete.
     */
    limit?: number
  }

  /**
   * GameState without action
   */
  export type GameStateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GameState
     */
    select?: GameStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GameState
     */
    omit?: GameStateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GameStateInclude<ExtArgs> | null
  }


  /**
   * Model Region
   */

  export type AggregateRegion = {
    _count: RegionCountAggregateOutputType | null
    _avg: RegionAvgAggregateOutputType | null
    _sum: RegionSumAggregateOutputType | null
    _min: RegionMinAggregateOutputType | null
    _max: RegionMaxAggregateOutputType | null
  }

  export type RegionAvgAggregateOutputType = {
    id: number | null
    gameId: number | null
    centerRoomId: number | null
  }

  export type RegionSumAggregateOutputType = {
    id: number | null
    gameId: number | null
    centerRoomId: number | null
  }

  export type RegionMinAggregateOutputType = {
    id: number | null
    gameId: number | null
    name: string | null
    type: string | null
    description: string | null
    centerRoomId: number | null
    createdAt: Date | null
  }

  export type RegionMaxAggregateOutputType = {
    id: number | null
    gameId: number | null
    name: string | null
    type: string | null
    description: string | null
    centerRoomId: number | null
    createdAt: Date | null
  }

  export type RegionCountAggregateOutputType = {
    id: number
    gameId: number
    name: number
    type: number
    description: number
    centerRoomId: number
    createdAt: number
    _all: number
  }


  export type RegionAvgAggregateInputType = {
    id?: true
    gameId?: true
    centerRoomId?: true
  }

  export type RegionSumAggregateInputType = {
    id?: true
    gameId?: true
    centerRoomId?: true
  }

  export type RegionMinAggregateInputType = {
    id?: true
    gameId?: true
    name?: true
    type?: true
    description?: true
    centerRoomId?: true
    createdAt?: true
  }

  export type RegionMaxAggregateInputType = {
    id?: true
    gameId?: true
    name?: true
    type?: true
    description?: true
    centerRoomId?: true
    createdAt?: true
  }

  export type RegionCountAggregateInputType = {
    id?: true
    gameId?: true
    name?: true
    type?: true
    description?: true
    centerRoomId?: true
    createdAt?: true
    _all?: true
  }

  export type RegionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Region to aggregate.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Regions
    **/
    _count?: true | RegionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RegionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RegionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RegionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RegionMaxAggregateInputType
  }

  export type GetRegionAggregateType<T extends RegionAggregateArgs> = {
        [P in keyof T & keyof AggregateRegion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRegion[P]>
      : GetScalarType<T[P], AggregateRegion[P]>
  }




  export type RegionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RegionWhereInput
    orderBy?: RegionOrderByWithAggregationInput | RegionOrderByWithAggregationInput[]
    by: RegionScalarFieldEnum[] | RegionScalarFieldEnum
    having?: RegionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RegionCountAggregateInputType | true
    _avg?: RegionAvgAggregateInputType
    _sum?: RegionSumAggregateInputType
    _min?: RegionMinAggregateInputType
    _max?: RegionMaxAggregateInputType
  }

  export type RegionGroupByOutputType = {
    id: number
    gameId: number
    name: string | null
    type: string
    description: string
    centerRoomId: number | null
    createdAt: Date
    _count: RegionCountAggregateOutputType | null
    _avg: RegionAvgAggregateOutputType | null
    _sum: RegionSumAggregateOutputType | null
    _min: RegionMinAggregateOutputType | null
    _max: RegionMaxAggregateOutputType | null
  }

  type GetRegionGroupByPayload<T extends RegionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RegionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RegionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RegionGroupByOutputType[P]>
            : GetScalarType<T[P], RegionGroupByOutputType[P]>
        }
      >
    >


  export type RegionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    name?: boolean
    type?: boolean
    description?: boolean
    centerRoomId?: boolean
    createdAt?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
    rooms?: boolean | Region$roomsArgs<ExtArgs>
    _count?: boolean | RegionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["region"]>

  export type RegionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    name?: boolean
    type?: boolean
    description?: boolean
    centerRoomId?: boolean
    createdAt?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["region"]>

  export type RegionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    gameId?: boolean
    name?: boolean
    type?: boolean
    description?: boolean
    centerRoomId?: boolean
    createdAt?: boolean
    game?: boolean | GameDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["region"]>

  export type RegionSelectScalar = {
    id?: boolean
    gameId?: boolean
    name?: boolean
    type?: boolean
    description?: boolean
    centerRoomId?: boolean
    createdAt?: boolean
  }

  export type RegionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "gameId" | "name" | "type" | "description" | "centerRoomId" | "createdAt", ExtArgs["result"]["region"]>
  export type RegionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
    rooms?: boolean | Region$roomsArgs<ExtArgs>
    _count?: boolean | RegionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RegionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
  }
  export type RegionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    game?: boolean | GameDefaultArgs<ExtArgs>
  }

  export type $RegionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Region"
    objects: {
      game: Prisma.$GamePayload<ExtArgs>
      rooms: Prisma.$RoomPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      gameId: number
      name: string | null
      type: string
      description: string
      centerRoomId: number | null
      createdAt: Date
    }, ExtArgs["result"]["region"]>
    composites: {}
  }

  type RegionGetPayload<S extends boolean | null | undefined | RegionDefaultArgs> = $Result.GetResult<Prisma.$RegionPayload, S>

  type RegionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RegionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RegionCountAggregateInputType | true
    }

  export interface RegionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Region'], meta: { name: 'Region' } }
    /**
     * Find zero or one Region that matches the filter.
     * @param {RegionFindUniqueArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RegionFindUniqueArgs>(args: SelectSubset<T, RegionFindUniqueArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Region that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RegionFindUniqueOrThrowArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RegionFindUniqueOrThrowArgs>(args: SelectSubset<T, RegionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Region that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionFindFirstArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RegionFindFirstArgs>(args?: SelectSubset<T, RegionFindFirstArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Region that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionFindFirstOrThrowArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RegionFindFirstOrThrowArgs>(args?: SelectSubset<T, RegionFindFirstOrThrowArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Regions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Regions
     * const regions = await prisma.region.findMany()
     * 
     * // Get first 10 Regions
     * const regions = await prisma.region.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const regionWithIdOnly = await prisma.region.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RegionFindManyArgs>(args?: SelectSubset<T, RegionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Region.
     * @param {RegionCreateArgs} args - Arguments to create a Region.
     * @example
     * // Create one Region
     * const Region = await prisma.region.create({
     *   data: {
     *     // ... data to create a Region
     *   }
     * })
     * 
     */
    create<T extends RegionCreateArgs>(args: SelectSubset<T, RegionCreateArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Regions.
     * @param {RegionCreateManyArgs} args - Arguments to create many Regions.
     * @example
     * // Create many Regions
     * const region = await prisma.region.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RegionCreateManyArgs>(args?: SelectSubset<T, RegionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Regions and returns the data saved in the database.
     * @param {RegionCreateManyAndReturnArgs} args - Arguments to create many Regions.
     * @example
     * // Create many Regions
     * const region = await prisma.region.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Regions and only return the `id`
     * const regionWithIdOnly = await prisma.region.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RegionCreateManyAndReturnArgs>(args?: SelectSubset<T, RegionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Region.
     * @param {RegionDeleteArgs} args - Arguments to delete one Region.
     * @example
     * // Delete one Region
     * const Region = await prisma.region.delete({
     *   where: {
     *     // ... filter to delete one Region
     *   }
     * })
     * 
     */
    delete<T extends RegionDeleteArgs>(args: SelectSubset<T, RegionDeleteArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Region.
     * @param {RegionUpdateArgs} args - Arguments to update one Region.
     * @example
     * // Update one Region
     * const region = await prisma.region.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RegionUpdateArgs>(args: SelectSubset<T, RegionUpdateArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Regions.
     * @param {RegionDeleteManyArgs} args - Arguments to filter Regions to delete.
     * @example
     * // Delete a few Regions
     * const { count } = await prisma.region.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RegionDeleteManyArgs>(args?: SelectSubset<T, RegionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Regions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Regions
     * const region = await prisma.region.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RegionUpdateManyArgs>(args: SelectSubset<T, RegionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Regions and returns the data updated in the database.
     * @param {RegionUpdateManyAndReturnArgs} args - Arguments to update many Regions.
     * @example
     * // Update many Regions
     * const region = await prisma.region.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Regions and only return the `id`
     * const regionWithIdOnly = await prisma.region.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RegionUpdateManyAndReturnArgs>(args: SelectSubset<T, RegionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Region.
     * @param {RegionUpsertArgs} args - Arguments to update or create a Region.
     * @example
     * // Update or create a Region
     * const region = await prisma.region.upsert({
     *   create: {
     *     // ... data to create a Region
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Region we want to update
     *   }
     * })
     */
    upsert<T extends RegionUpsertArgs>(args: SelectSubset<T, RegionUpsertArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Regions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionCountArgs} args - Arguments to filter Regions to count.
     * @example
     * // Count the number of Regions
     * const count = await prisma.region.count({
     *   where: {
     *     // ... the filter for the Regions we want to count
     *   }
     * })
    **/
    count<T extends RegionCountArgs>(
      args?: Subset<T, RegionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RegionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Region.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RegionAggregateArgs>(args: Subset<T, RegionAggregateArgs>): Prisma.PrismaPromise<GetRegionAggregateType<T>>

    /**
     * Group by Region.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RegionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RegionGroupByArgs['orderBy'] }
        : { orderBy?: RegionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RegionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRegionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Region model
   */
  readonly fields: RegionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Region.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RegionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    game<T extends GameDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GameDefaultArgs<ExtArgs>>): Prisma__GameClient<$Result.GetResult<Prisma.$GamePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    rooms<T extends Region$roomsArgs<ExtArgs> = {}>(args?: Subset<T, Region$roomsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Region model
   */
  interface RegionFieldRefs {
    readonly id: FieldRef<"Region", 'Int'>
    readonly gameId: FieldRef<"Region", 'Int'>
    readonly name: FieldRef<"Region", 'String'>
    readonly type: FieldRef<"Region", 'String'>
    readonly description: FieldRef<"Region", 'String'>
    readonly centerRoomId: FieldRef<"Region", 'Int'>
    readonly createdAt: FieldRef<"Region", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Region findUnique
   */
  export type RegionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region findUniqueOrThrow
   */
  export type RegionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region findFirst
   */
  export type RegionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Regions.
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Regions.
     */
    distinct?: RegionScalarFieldEnum | RegionScalarFieldEnum[]
  }

  /**
   * Region findFirstOrThrow
   */
  export type RegionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Regions.
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Regions.
     */
    distinct?: RegionScalarFieldEnum | RegionScalarFieldEnum[]
  }

  /**
   * Region findMany
   */
  export type RegionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Regions to fetch.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Regions.
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    distinct?: RegionScalarFieldEnum | RegionScalarFieldEnum[]
  }

  /**
   * Region create
   */
  export type RegionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * The data needed to create a Region.
     */
    data: XOR<RegionCreateInput, RegionUncheckedCreateInput>
  }

  /**
   * Region createMany
   */
  export type RegionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Regions.
     */
    data: RegionCreateManyInput | RegionCreateManyInput[]
  }

  /**
   * Region createManyAndReturn
   */
  export type RegionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * The data used to create many Regions.
     */
    data: RegionCreateManyInput | RegionCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Region update
   */
  export type RegionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * The data needed to update a Region.
     */
    data: XOR<RegionUpdateInput, RegionUncheckedUpdateInput>
    /**
     * Choose, which Region to update.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region updateMany
   */
  export type RegionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Regions.
     */
    data: XOR<RegionUpdateManyMutationInput, RegionUncheckedUpdateManyInput>
    /**
     * Filter which Regions to update
     */
    where?: RegionWhereInput
    /**
     * Limit how many Regions to update.
     */
    limit?: number
  }

  /**
   * Region updateManyAndReturn
   */
  export type RegionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * The data used to update Regions.
     */
    data: XOR<RegionUpdateManyMutationInput, RegionUncheckedUpdateManyInput>
    /**
     * Filter which Regions to update
     */
    where?: RegionWhereInput
    /**
     * Limit how many Regions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Region upsert
   */
  export type RegionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * The filter to search for the Region to update in case it exists.
     */
    where: RegionWhereUniqueInput
    /**
     * In case the Region found by the `where` argument doesn't exist, create a new Region with this data.
     */
    create: XOR<RegionCreateInput, RegionUncheckedCreateInput>
    /**
     * In case the Region was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RegionUpdateInput, RegionUncheckedUpdateInput>
  }

  /**
   * Region delete
   */
  export type RegionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter which Region to delete.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region deleteMany
   */
  export type RegionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Regions to delete
     */
    where?: RegionWhereInput
    /**
     * Limit how many Regions to delete.
     */
    limit?: number
  }

  /**
   * Region.rooms
   */
  export type Region$roomsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Room
     */
    select?: RoomSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Room
     */
    omit?: RoomOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RoomInclude<ExtArgs> | null
    where?: RoomWhereInput
    orderBy?: RoomOrderByWithRelationInput | RoomOrderByWithRelationInput[]
    cursor?: RoomWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RoomScalarFieldEnum | RoomScalarFieldEnum[]
  }

  /**
   * Region without action
   */
  export type RegionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const GameScalarFieldEnum: {
    id: 'id',
    name: 'name',
    createdAt: 'createdAt',
    lastPlayedAt: 'lastPlayedAt'
  };

  export type GameScalarFieldEnum = (typeof GameScalarFieldEnum)[keyof typeof GameScalarFieldEnum]


  export const RoomScalarFieldEnum: {
    id: 'id',
    gameId: 'gameId',
    name: 'name',
    description: 'description',
    regionId: 'regionId',
    regionDistance: 'regionDistance'
  };

  export type RoomScalarFieldEnum = (typeof RoomScalarFieldEnum)[keyof typeof RoomScalarFieldEnum]


  export const ConnectionScalarFieldEnum: {
    id: 'id',
    gameId: 'gameId',
    fromRoomId: 'fromRoomId',
    toRoomId: 'toRoomId',
    direction: 'direction',
    name: 'name',
    processing: 'processing'
  };

  export type ConnectionScalarFieldEnum = (typeof ConnectionScalarFieldEnum)[keyof typeof ConnectionScalarFieldEnum]


  export const GameStateScalarFieldEnum: {
    id: 'id',
    gameId: 'gameId',
    currentRoomId: 'currentRoomId',
    playerName: 'playerName'
  };

  export type GameStateScalarFieldEnum = (typeof GameStateScalarFieldEnum)[keyof typeof GameStateScalarFieldEnum]


  export const RegionScalarFieldEnum: {
    id: 'id',
    gameId: 'gameId',
    name: 'name',
    type: 'type',
    description: 'description',
    centerRoomId: 'centerRoomId',
    createdAt: 'createdAt'
  };

  export type RegionScalarFieldEnum = (typeof RegionScalarFieldEnum)[keyof typeof RegionScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type GameWhereInput = {
    AND?: GameWhereInput | GameWhereInput[]
    OR?: GameWhereInput[]
    NOT?: GameWhereInput | GameWhereInput[]
    id?: IntFilter<"Game"> | number
    name?: StringFilter<"Game"> | string
    createdAt?: DateTimeFilter<"Game"> | Date | string
    lastPlayedAt?: DateTimeFilter<"Game"> | Date | string
    rooms?: RoomListRelationFilter
    connections?: ConnectionListRelationFilter
    gameState?: XOR<GameStateNullableScalarRelationFilter, GameStateWhereInput> | null
    regions?: RegionListRelationFilter
  }

  export type GameOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    lastPlayedAt?: SortOrder
    rooms?: RoomOrderByRelationAggregateInput
    connections?: ConnectionOrderByRelationAggregateInput
    gameState?: GameStateOrderByWithRelationInput
    regions?: RegionOrderByRelationAggregateInput
  }

  export type GameWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    name?: string
    AND?: GameWhereInput | GameWhereInput[]
    OR?: GameWhereInput[]
    NOT?: GameWhereInput | GameWhereInput[]
    createdAt?: DateTimeFilter<"Game"> | Date | string
    lastPlayedAt?: DateTimeFilter<"Game"> | Date | string
    rooms?: RoomListRelationFilter
    connections?: ConnectionListRelationFilter
    gameState?: XOR<GameStateNullableScalarRelationFilter, GameStateWhereInput> | null
    regions?: RegionListRelationFilter
  }, "id" | "name">

  export type GameOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    lastPlayedAt?: SortOrder
    _count?: GameCountOrderByAggregateInput
    _avg?: GameAvgOrderByAggregateInput
    _max?: GameMaxOrderByAggregateInput
    _min?: GameMinOrderByAggregateInput
    _sum?: GameSumOrderByAggregateInput
  }

  export type GameScalarWhereWithAggregatesInput = {
    AND?: GameScalarWhereWithAggregatesInput | GameScalarWhereWithAggregatesInput[]
    OR?: GameScalarWhereWithAggregatesInput[]
    NOT?: GameScalarWhereWithAggregatesInput | GameScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Game"> | number
    name?: StringWithAggregatesFilter<"Game"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Game"> | Date | string
    lastPlayedAt?: DateTimeWithAggregatesFilter<"Game"> | Date | string
  }

  export type RoomWhereInput = {
    AND?: RoomWhereInput | RoomWhereInput[]
    OR?: RoomWhereInput[]
    NOT?: RoomWhereInput | RoomWhereInput[]
    id?: IntFilter<"Room"> | number
    gameId?: IntFilter<"Room"> | number
    name?: StringFilter<"Room"> | string
    description?: StringFilter<"Room"> | string
    regionId?: IntNullableFilter<"Room"> | number | null
    regionDistance?: IntNullableFilter<"Room"> | number | null
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    region?: XOR<RegionNullableScalarRelationFilter, RegionWhereInput> | null
    connectionsFrom?: ConnectionListRelationFilter
    connectionsTo?: ConnectionListRelationFilter
    gameStates?: GameStateListRelationFilter
  }

  export type RoomOrderByWithRelationInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    regionId?: SortOrderInput | SortOrder
    regionDistance?: SortOrderInput | SortOrder
    game?: GameOrderByWithRelationInput
    region?: RegionOrderByWithRelationInput
    connectionsFrom?: ConnectionOrderByRelationAggregateInput
    connectionsTo?: ConnectionOrderByRelationAggregateInput
    gameStates?: GameStateOrderByRelationAggregateInput
  }

  export type RoomWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: RoomWhereInput | RoomWhereInput[]
    OR?: RoomWhereInput[]
    NOT?: RoomWhereInput | RoomWhereInput[]
    gameId?: IntFilter<"Room"> | number
    name?: StringFilter<"Room"> | string
    description?: StringFilter<"Room"> | string
    regionId?: IntNullableFilter<"Room"> | number | null
    regionDistance?: IntNullableFilter<"Room"> | number | null
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    region?: XOR<RegionNullableScalarRelationFilter, RegionWhereInput> | null
    connectionsFrom?: ConnectionListRelationFilter
    connectionsTo?: ConnectionListRelationFilter
    gameStates?: GameStateListRelationFilter
  }, "id">

  export type RoomOrderByWithAggregationInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    regionId?: SortOrderInput | SortOrder
    regionDistance?: SortOrderInput | SortOrder
    _count?: RoomCountOrderByAggregateInput
    _avg?: RoomAvgOrderByAggregateInput
    _max?: RoomMaxOrderByAggregateInput
    _min?: RoomMinOrderByAggregateInput
    _sum?: RoomSumOrderByAggregateInput
  }

  export type RoomScalarWhereWithAggregatesInput = {
    AND?: RoomScalarWhereWithAggregatesInput | RoomScalarWhereWithAggregatesInput[]
    OR?: RoomScalarWhereWithAggregatesInput[]
    NOT?: RoomScalarWhereWithAggregatesInput | RoomScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Room"> | number
    gameId?: IntWithAggregatesFilter<"Room"> | number
    name?: StringWithAggregatesFilter<"Room"> | string
    description?: StringWithAggregatesFilter<"Room"> | string
    regionId?: IntNullableWithAggregatesFilter<"Room"> | number | null
    regionDistance?: IntNullableWithAggregatesFilter<"Room"> | number | null
  }

  export type ConnectionWhereInput = {
    AND?: ConnectionWhereInput | ConnectionWhereInput[]
    OR?: ConnectionWhereInput[]
    NOT?: ConnectionWhereInput | ConnectionWhereInput[]
    id?: IntFilter<"Connection"> | number
    gameId?: IntFilter<"Connection"> | number
    fromRoomId?: IntFilter<"Connection"> | number
    toRoomId?: IntNullableFilter<"Connection"> | number | null
    direction?: StringNullableFilter<"Connection"> | string | null
    name?: StringFilter<"Connection"> | string
    processing?: BoolFilter<"Connection"> | boolean
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    fromRoom?: XOR<RoomScalarRelationFilter, RoomWhereInput>
    toRoom?: XOR<RoomNullableScalarRelationFilter, RoomWhereInput> | null
  }

  export type ConnectionOrderByWithRelationInput = {
    id?: SortOrder
    gameId?: SortOrder
    fromRoomId?: SortOrder
    toRoomId?: SortOrderInput | SortOrder
    direction?: SortOrderInput | SortOrder
    name?: SortOrder
    processing?: SortOrder
    game?: GameOrderByWithRelationInput
    fromRoom?: RoomOrderByWithRelationInput
    toRoom?: RoomOrderByWithRelationInput
  }

  export type ConnectionWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ConnectionWhereInput | ConnectionWhereInput[]
    OR?: ConnectionWhereInput[]
    NOT?: ConnectionWhereInput | ConnectionWhereInput[]
    gameId?: IntFilter<"Connection"> | number
    fromRoomId?: IntFilter<"Connection"> | number
    toRoomId?: IntNullableFilter<"Connection"> | number | null
    direction?: StringNullableFilter<"Connection"> | string | null
    name?: StringFilter<"Connection"> | string
    processing?: BoolFilter<"Connection"> | boolean
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    fromRoom?: XOR<RoomScalarRelationFilter, RoomWhereInput>
    toRoom?: XOR<RoomNullableScalarRelationFilter, RoomWhereInput> | null
  }, "id">

  export type ConnectionOrderByWithAggregationInput = {
    id?: SortOrder
    gameId?: SortOrder
    fromRoomId?: SortOrder
    toRoomId?: SortOrderInput | SortOrder
    direction?: SortOrderInput | SortOrder
    name?: SortOrder
    processing?: SortOrder
    _count?: ConnectionCountOrderByAggregateInput
    _avg?: ConnectionAvgOrderByAggregateInput
    _max?: ConnectionMaxOrderByAggregateInput
    _min?: ConnectionMinOrderByAggregateInput
    _sum?: ConnectionSumOrderByAggregateInput
  }

  export type ConnectionScalarWhereWithAggregatesInput = {
    AND?: ConnectionScalarWhereWithAggregatesInput | ConnectionScalarWhereWithAggregatesInput[]
    OR?: ConnectionScalarWhereWithAggregatesInput[]
    NOT?: ConnectionScalarWhereWithAggregatesInput | ConnectionScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Connection"> | number
    gameId?: IntWithAggregatesFilter<"Connection"> | number
    fromRoomId?: IntWithAggregatesFilter<"Connection"> | number
    toRoomId?: IntNullableWithAggregatesFilter<"Connection"> | number | null
    direction?: StringNullableWithAggregatesFilter<"Connection"> | string | null
    name?: StringWithAggregatesFilter<"Connection"> | string
    processing?: BoolWithAggregatesFilter<"Connection"> | boolean
  }

  export type GameStateWhereInput = {
    AND?: GameStateWhereInput | GameStateWhereInput[]
    OR?: GameStateWhereInput[]
    NOT?: GameStateWhereInput | GameStateWhereInput[]
    id?: IntFilter<"GameState"> | number
    gameId?: IntFilter<"GameState"> | number
    currentRoomId?: IntFilter<"GameState"> | number
    playerName?: StringNullableFilter<"GameState"> | string | null
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    currentRoom?: XOR<RoomScalarRelationFilter, RoomWhereInput>
  }

  export type GameStateOrderByWithRelationInput = {
    id?: SortOrder
    gameId?: SortOrder
    currentRoomId?: SortOrder
    playerName?: SortOrderInput | SortOrder
    game?: GameOrderByWithRelationInput
    currentRoom?: RoomOrderByWithRelationInput
  }

  export type GameStateWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    gameId?: number
    AND?: GameStateWhereInput | GameStateWhereInput[]
    OR?: GameStateWhereInput[]
    NOT?: GameStateWhereInput | GameStateWhereInput[]
    currentRoomId?: IntFilter<"GameState"> | number
    playerName?: StringNullableFilter<"GameState"> | string | null
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    currentRoom?: XOR<RoomScalarRelationFilter, RoomWhereInput>
  }, "id" | "gameId">

  export type GameStateOrderByWithAggregationInput = {
    id?: SortOrder
    gameId?: SortOrder
    currentRoomId?: SortOrder
    playerName?: SortOrderInput | SortOrder
    _count?: GameStateCountOrderByAggregateInput
    _avg?: GameStateAvgOrderByAggregateInput
    _max?: GameStateMaxOrderByAggregateInput
    _min?: GameStateMinOrderByAggregateInput
    _sum?: GameStateSumOrderByAggregateInput
  }

  export type GameStateScalarWhereWithAggregatesInput = {
    AND?: GameStateScalarWhereWithAggregatesInput | GameStateScalarWhereWithAggregatesInput[]
    OR?: GameStateScalarWhereWithAggregatesInput[]
    NOT?: GameStateScalarWhereWithAggregatesInput | GameStateScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"GameState"> | number
    gameId?: IntWithAggregatesFilter<"GameState"> | number
    currentRoomId?: IntWithAggregatesFilter<"GameState"> | number
    playerName?: StringNullableWithAggregatesFilter<"GameState"> | string | null
  }

  export type RegionWhereInput = {
    AND?: RegionWhereInput | RegionWhereInput[]
    OR?: RegionWhereInput[]
    NOT?: RegionWhereInput | RegionWhereInput[]
    id?: IntFilter<"Region"> | number
    gameId?: IntFilter<"Region"> | number
    name?: StringNullableFilter<"Region"> | string | null
    type?: StringFilter<"Region"> | string
    description?: StringFilter<"Region"> | string
    centerRoomId?: IntNullableFilter<"Region"> | number | null
    createdAt?: DateTimeFilter<"Region"> | Date | string
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    rooms?: RoomListRelationFilter
  }

  export type RegionOrderByWithRelationInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrderInput | SortOrder
    type?: SortOrder
    description?: SortOrder
    centerRoomId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    game?: GameOrderByWithRelationInput
    rooms?: RoomOrderByRelationAggregateInput
  }

  export type RegionWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: RegionWhereInput | RegionWhereInput[]
    OR?: RegionWhereInput[]
    NOT?: RegionWhereInput | RegionWhereInput[]
    gameId?: IntFilter<"Region"> | number
    name?: StringNullableFilter<"Region"> | string | null
    type?: StringFilter<"Region"> | string
    description?: StringFilter<"Region"> | string
    centerRoomId?: IntNullableFilter<"Region"> | number | null
    createdAt?: DateTimeFilter<"Region"> | Date | string
    game?: XOR<GameScalarRelationFilter, GameWhereInput>
    rooms?: RoomListRelationFilter
  }, "id">

  export type RegionOrderByWithAggregationInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrderInput | SortOrder
    type?: SortOrder
    description?: SortOrder
    centerRoomId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: RegionCountOrderByAggregateInput
    _avg?: RegionAvgOrderByAggregateInput
    _max?: RegionMaxOrderByAggregateInput
    _min?: RegionMinOrderByAggregateInput
    _sum?: RegionSumOrderByAggregateInput
  }

  export type RegionScalarWhereWithAggregatesInput = {
    AND?: RegionScalarWhereWithAggregatesInput | RegionScalarWhereWithAggregatesInput[]
    OR?: RegionScalarWhereWithAggregatesInput[]
    NOT?: RegionScalarWhereWithAggregatesInput | RegionScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Region"> | number
    gameId?: IntWithAggregatesFilter<"Region"> | number
    name?: StringNullableWithAggregatesFilter<"Region"> | string | null
    type?: StringWithAggregatesFilter<"Region"> | string
    description?: StringWithAggregatesFilter<"Region"> | string
    centerRoomId?: IntNullableWithAggregatesFilter<"Region"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"Region"> | Date | string
  }

  export type GameCreateInput = {
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomCreateNestedManyWithoutGameInput
    connections?: ConnectionCreateNestedManyWithoutGameInput
    gameState?: GameStateCreateNestedOneWithoutGameInput
    regions?: RegionCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateInput = {
    id?: number
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomUncheckedCreateNestedManyWithoutGameInput
    connections?: ConnectionUncheckedCreateNestedManyWithoutGameInput
    gameState?: GameStateUncheckedCreateNestedOneWithoutGameInput
    regions?: RegionUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUpdateManyWithoutGameNestedInput
    connections?: ConnectionUpdateManyWithoutGameNestedInput
    gameState?: GameStateUpdateOneWithoutGameNestedInput
    regions?: RegionUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUncheckedUpdateManyWithoutGameNestedInput
    connections?: ConnectionUncheckedUpdateManyWithoutGameNestedInput
    gameState?: GameStateUncheckedUpdateOneWithoutGameNestedInput
    regions?: RegionUncheckedUpdateManyWithoutGameNestedInput
  }

  export type GameCreateManyInput = {
    id?: number
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
  }

  export type GameUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GameUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomCreateInput = {
    name: string
    description: string
    regionDistance?: number | null
    game: GameCreateNestedOneWithoutRoomsInput
    region?: RegionCreateNestedOneWithoutRoomsInput
    connectionsFrom?: ConnectionCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomUncheckedCreateInput = {
    id?: number
    gameId: number
    name: string
    description: string
    regionId?: number | null
    regionDistance?: number | null
    connectionsFrom?: ConnectionUncheckedCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionUncheckedCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateUncheckedCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    game?: GameUpdateOneRequiredWithoutRoomsNestedInput
    region?: RegionUpdateOneWithoutRoomsNestedInput
    connectionsFrom?: ConnectionUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionId?: NullableIntFieldUpdateOperationsInput | number | null
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    connectionsFrom?: ConnectionUncheckedUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUncheckedUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUncheckedUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomCreateManyInput = {
    id?: number
    gameId: number
    name: string
    description: string
    regionId?: number | null
    regionDistance?: number | null
  }

  export type RoomUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type RoomUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionId?: NullableIntFieldUpdateOperationsInput | number | null
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ConnectionCreateInput = {
    direction?: string | null
    name: string
    processing?: boolean
    game: GameCreateNestedOneWithoutConnectionsInput
    fromRoom: RoomCreateNestedOneWithoutConnectionsFromInput
    toRoom?: RoomCreateNestedOneWithoutConnectionsToInput
  }

  export type ConnectionUncheckedCreateInput = {
    id?: number
    gameId: number
    fromRoomId: number
    toRoomId?: number | null
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type ConnectionUpdateInput = {
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
    game?: GameUpdateOneRequiredWithoutConnectionsNestedInput
    fromRoom?: RoomUpdateOneRequiredWithoutConnectionsFromNestedInput
    toRoom?: RoomUpdateOneWithoutConnectionsToNestedInput
  }

  export type ConnectionUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    fromRoomId?: IntFieldUpdateOperationsInput | number
    toRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ConnectionCreateManyInput = {
    id?: number
    gameId: number
    fromRoomId: number
    toRoomId?: number | null
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type ConnectionUpdateManyMutationInput = {
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ConnectionUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    fromRoomId?: IntFieldUpdateOperationsInput | number
    toRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type GameStateCreateInput = {
    playerName?: string | null
    game: GameCreateNestedOneWithoutGameStateInput
    currentRoom: RoomCreateNestedOneWithoutGameStatesInput
  }

  export type GameStateUncheckedCreateInput = {
    id?: number
    gameId: number
    currentRoomId: number
    playerName?: string | null
  }

  export type GameStateUpdateInput = {
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
    game?: GameUpdateOneRequiredWithoutGameStateNestedInput
    currentRoom?: RoomUpdateOneRequiredWithoutGameStatesNestedInput
  }

  export type GameStateUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    currentRoomId?: IntFieldUpdateOperationsInput | number
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type GameStateCreateManyInput = {
    id?: number
    gameId: number
    currentRoomId: number
    playerName?: string | null
  }

  export type GameStateUpdateManyMutationInput = {
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type GameStateUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    currentRoomId?: IntFieldUpdateOperationsInput | number
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type RegionCreateInput = {
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
    game: GameCreateNestedOneWithoutRegionsInput
    rooms?: RoomCreateNestedManyWithoutRegionInput
  }

  export type RegionUncheckedCreateInput = {
    id?: number
    gameId: number
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
    rooms?: RoomUncheckedCreateNestedManyWithoutRegionInput
  }

  export type RegionUpdateInput = {
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    game?: GameUpdateOneRequiredWithoutRegionsNestedInput
    rooms?: RoomUpdateManyWithoutRegionNestedInput
  }

  export type RegionUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUncheckedUpdateManyWithoutRegionNestedInput
  }

  export type RegionCreateManyInput = {
    id?: number
    gameId: number
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
  }

  export type RegionUpdateManyMutationInput = {
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegionUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type RoomListRelationFilter = {
    every?: RoomWhereInput
    some?: RoomWhereInput
    none?: RoomWhereInput
  }

  export type ConnectionListRelationFilter = {
    every?: ConnectionWhereInput
    some?: ConnectionWhereInput
    none?: ConnectionWhereInput
  }

  export type GameStateNullableScalarRelationFilter = {
    is?: GameStateWhereInput | null
    isNot?: GameStateWhereInput | null
  }

  export type RegionListRelationFilter = {
    every?: RegionWhereInput
    some?: RegionWhereInput
    none?: RegionWhereInput
  }

  export type RoomOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConnectionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RegionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GameCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    lastPlayedAt?: SortOrder
  }

  export type GameAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type GameMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    lastPlayedAt?: SortOrder
  }

  export type GameMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    lastPlayedAt?: SortOrder
  }

  export type GameSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type GameScalarRelationFilter = {
    is?: GameWhereInput
    isNot?: GameWhereInput
  }

  export type RegionNullableScalarRelationFilter = {
    is?: RegionWhereInput | null
    isNot?: RegionWhereInput | null
  }

  export type GameStateListRelationFilter = {
    every?: GameStateWhereInput
    some?: GameStateWhereInput
    none?: GameStateWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type GameStateOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RoomCountOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    regionId?: SortOrder
    regionDistance?: SortOrder
  }

  export type RoomAvgOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    regionId?: SortOrder
    regionDistance?: SortOrder
  }

  export type RoomMaxOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    regionId?: SortOrder
    regionDistance?: SortOrder
  }

  export type RoomMinOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    regionId?: SortOrder
    regionDistance?: SortOrder
  }

  export type RoomSumOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    regionId?: SortOrder
    regionDistance?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type RoomScalarRelationFilter = {
    is?: RoomWhereInput
    isNot?: RoomWhereInput
  }

  export type RoomNullableScalarRelationFilter = {
    is?: RoomWhereInput | null
    isNot?: RoomWhereInput | null
  }

  export type ConnectionCountOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    fromRoomId?: SortOrder
    toRoomId?: SortOrder
    direction?: SortOrder
    name?: SortOrder
    processing?: SortOrder
  }

  export type ConnectionAvgOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    fromRoomId?: SortOrder
    toRoomId?: SortOrder
  }

  export type ConnectionMaxOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    fromRoomId?: SortOrder
    toRoomId?: SortOrder
    direction?: SortOrder
    name?: SortOrder
    processing?: SortOrder
  }

  export type ConnectionMinOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    fromRoomId?: SortOrder
    toRoomId?: SortOrder
    direction?: SortOrder
    name?: SortOrder
    processing?: SortOrder
  }

  export type ConnectionSumOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    fromRoomId?: SortOrder
    toRoomId?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type GameStateCountOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    currentRoomId?: SortOrder
    playerName?: SortOrder
  }

  export type GameStateAvgOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    currentRoomId?: SortOrder
  }

  export type GameStateMaxOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    currentRoomId?: SortOrder
    playerName?: SortOrder
  }

  export type GameStateMinOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    currentRoomId?: SortOrder
    playerName?: SortOrder
  }

  export type GameStateSumOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    currentRoomId?: SortOrder
  }

  export type RegionCountOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    description?: SortOrder
    centerRoomId?: SortOrder
    createdAt?: SortOrder
  }

  export type RegionAvgOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    centerRoomId?: SortOrder
  }

  export type RegionMaxOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    description?: SortOrder
    centerRoomId?: SortOrder
    createdAt?: SortOrder
  }

  export type RegionMinOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    description?: SortOrder
    centerRoomId?: SortOrder
    createdAt?: SortOrder
  }

  export type RegionSumOrderByAggregateInput = {
    id?: SortOrder
    gameId?: SortOrder
    centerRoomId?: SortOrder
  }

  export type RoomCreateNestedManyWithoutGameInput = {
    create?: XOR<RoomCreateWithoutGameInput, RoomUncheckedCreateWithoutGameInput> | RoomCreateWithoutGameInput[] | RoomUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutGameInput | RoomCreateOrConnectWithoutGameInput[]
    createMany?: RoomCreateManyGameInputEnvelope
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
  }

  export type ConnectionCreateNestedManyWithoutGameInput = {
    create?: XOR<ConnectionCreateWithoutGameInput, ConnectionUncheckedCreateWithoutGameInput> | ConnectionCreateWithoutGameInput[] | ConnectionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutGameInput | ConnectionCreateOrConnectWithoutGameInput[]
    createMany?: ConnectionCreateManyGameInputEnvelope
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
  }

  export type GameStateCreateNestedOneWithoutGameInput = {
    create?: XOR<GameStateCreateWithoutGameInput, GameStateUncheckedCreateWithoutGameInput>
    connectOrCreate?: GameStateCreateOrConnectWithoutGameInput
    connect?: GameStateWhereUniqueInput
  }

  export type RegionCreateNestedManyWithoutGameInput = {
    create?: XOR<RegionCreateWithoutGameInput, RegionUncheckedCreateWithoutGameInput> | RegionCreateWithoutGameInput[] | RegionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RegionCreateOrConnectWithoutGameInput | RegionCreateOrConnectWithoutGameInput[]
    createMany?: RegionCreateManyGameInputEnvelope
    connect?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
  }

  export type RoomUncheckedCreateNestedManyWithoutGameInput = {
    create?: XOR<RoomCreateWithoutGameInput, RoomUncheckedCreateWithoutGameInput> | RoomCreateWithoutGameInput[] | RoomUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutGameInput | RoomCreateOrConnectWithoutGameInput[]
    createMany?: RoomCreateManyGameInputEnvelope
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
  }

  export type ConnectionUncheckedCreateNestedManyWithoutGameInput = {
    create?: XOR<ConnectionCreateWithoutGameInput, ConnectionUncheckedCreateWithoutGameInput> | ConnectionCreateWithoutGameInput[] | ConnectionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutGameInput | ConnectionCreateOrConnectWithoutGameInput[]
    createMany?: ConnectionCreateManyGameInputEnvelope
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
  }

  export type GameStateUncheckedCreateNestedOneWithoutGameInput = {
    create?: XOR<GameStateCreateWithoutGameInput, GameStateUncheckedCreateWithoutGameInput>
    connectOrCreate?: GameStateCreateOrConnectWithoutGameInput
    connect?: GameStateWhereUniqueInput
  }

  export type RegionUncheckedCreateNestedManyWithoutGameInput = {
    create?: XOR<RegionCreateWithoutGameInput, RegionUncheckedCreateWithoutGameInput> | RegionCreateWithoutGameInput[] | RegionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RegionCreateOrConnectWithoutGameInput | RegionCreateOrConnectWithoutGameInput[]
    createMany?: RegionCreateManyGameInputEnvelope
    connect?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type RoomUpdateManyWithoutGameNestedInput = {
    create?: XOR<RoomCreateWithoutGameInput, RoomUncheckedCreateWithoutGameInput> | RoomCreateWithoutGameInput[] | RoomUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutGameInput | RoomCreateOrConnectWithoutGameInput[]
    upsert?: RoomUpsertWithWhereUniqueWithoutGameInput | RoomUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: RoomCreateManyGameInputEnvelope
    set?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    disconnect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    delete?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    update?: RoomUpdateWithWhereUniqueWithoutGameInput | RoomUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: RoomUpdateManyWithWhereWithoutGameInput | RoomUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: RoomScalarWhereInput | RoomScalarWhereInput[]
  }

  export type ConnectionUpdateManyWithoutGameNestedInput = {
    create?: XOR<ConnectionCreateWithoutGameInput, ConnectionUncheckedCreateWithoutGameInput> | ConnectionCreateWithoutGameInput[] | ConnectionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutGameInput | ConnectionCreateOrConnectWithoutGameInput[]
    upsert?: ConnectionUpsertWithWhereUniqueWithoutGameInput | ConnectionUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: ConnectionCreateManyGameInputEnvelope
    set?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    disconnect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    delete?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    update?: ConnectionUpdateWithWhereUniqueWithoutGameInput | ConnectionUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: ConnectionUpdateManyWithWhereWithoutGameInput | ConnectionUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
  }

  export type GameStateUpdateOneWithoutGameNestedInput = {
    create?: XOR<GameStateCreateWithoutGameInput, GameStateUncheckedCreateWithoutGameInput>
    connectOrCreate?: GameStateCreateOrConnectWithoutGameInput
    upsert?: GameStateUpsertWithoutGameInput
    disconnect?: GameStateWhereInput | boolean
    delete?: GameStateWhereInput | boolean
    connect?: GameStateWhereUniqueInput
    update?: XOR<XOR<GameStateUpdateToOneWithWhereWithoutGameInput, GameStateUpdateWithoutGameInput>, GameStateUncheckedUpdateWithoutGameInput>
  }

  export type RegionUpdateManyWithoutGameNestedInput = {
    create?: XOR<RegionCreateWithoutGameInput, RegionUncheckedCreateWithoutGameInput> | RegionCreateWithoutGameInput[] | RegionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RegionCreateOrConnectWithoutGameInput | RegionCreateOrConnectWithoutGameInput[]
    upsert?: RegionUpsertWithWhereUniqueWithoutGameInput | RegionUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: RegionCreateManyGameInputEnvelope
    set?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    disconnect?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    delete?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    connect?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    update?: RegionUpdateWithWhereUniqueWithoutGameInput | RegionUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: RegionUpdateManyWithWhereWithoutGameInput | RegionUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: RegionScalarWhereInput | RegionScalarWhereInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type RoomUncheckedUpdateManyWithoutGameNestedInput = {
    create?: XOR<RoomCreateWithoutGameInput, RoomUncheckedCreateWithoutGameInput> | RoomCreateWithoutGameInput[] | RoomUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutGameInput | RoomCreateOrConnectWithoutGameInput[]
    upsert?: RoomUpsertWithWhereUniqueWithoutGameInput | RoomUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: RoomCreateManyGameInputEnvelope
    set?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    disconnect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    delete?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    update?: RoomUpdateWithWhereUniqueWithoutGameInput | RoomUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: RoomUpdateManyWithWhereWithoutGameInput | RoomUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: RoomScalarWhereInput | RoomScalarWhereInput[]
  }

  export type ConnectionUncheckedUpdateManyWithoutGameNestedInput = {
    create?: XOR<ConnectionCreateWithoutGameInput, ConnectionUncheckedCreateWithoutGameInput> | ConnectionCreateWithoutGameInput[] | ConnectionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutGameInput | ConnectionCreateOrConnectWithoutGameInput[]
    upsert?: ConnectionUpsertWithWhereUniqueWithoutGameInput | ConnectionUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: ConnectionCreateManyGameInputEnvelope
    set?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    disconnect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    delete?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    update?: ConnectionUpdateWithWhereUniqueWithoutGameInput | ConnectionUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: ConnectionUpdateManyWithWhereWithoutGameInput | ConnectionUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
  }

  export type GameStateUncheckedUpdateOneWithoutGameNestedInput = {
    create?: XOR<GameStateCreateWithoutGameInput, GameStateUncheckedCreateWithoutGameInput>
    connectOrCreate?: GameStateCreateOrConnectWithoutGameInput
    upsert?: GameStateUpsertWithoutGameInput
    disconnect?: GameStateWhereInput | boolean
    delete?: GameStateWhereInput | boolean
    connect?: GameStateWhereUniqueInput
    update?: XOR<XOR<GameStateUpdateToOneWithWhereWithoutGameInput, GameStateUpdateWithoutGameInput>, GameStateUncheckedUpdateWithoutGameInput>
  }

  export type RegionUncheckedUpdateManyWithoutGameNestedInput = {
    create?: XOR<RegionCreateWithoutGameInput, RegionUncheckedCreateWithoutGameInput> | RegionCreateWithoutGameInput[] | RegionUncheckedCreateWithoutGameInput[]
    connectOrCreate?: RegionCreateOrConnectWithoutGameInput | RegionCreateOrConnectWithoutGameInput[]
    upsert?: RegionUpsertWithWhereUniqueWithoutGameInput | RegionUpsertWithWhereUniqueWithoutGameInput[]
    createMany?: RegionCreateManyGameInputEnvelope
    set?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    disconnect?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    delete?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    connect?: RegionWhereUniqueInput | RegionWhereUniqueInput[]
    update?: RegionUpdateWithWhereUniqueWithoutGameInput | RegionUpdateWithWhereUniqueWithoutGameInput[]
    updateMany?: RegionUpdateManyWithWhereWithoutGameInput | RegionUpdateManyWithWhereWithoutGameInput[]
    deleteMany?: RegionScalarWhereInput | RegionScalarWhereInput[]
  }

  export type GameCreateNestedOneWithoutRoomsInput = {
    create?: XOR<GameCreateWithoutRoomsInput, GameUncheckedCreateWithoutRoomsInput>
    connectOrCreate?: GameCreateOrConnectWithoutRoomsInput
    connect?: GameWhereUniqueInput
  }

  export type RegionCreateNestedOneWithoutRoomsInput = {
    create?: XOR<RegionCreateWithoutRoomsInput, RegionUncheckedCreateWithoutRoomsInput>
    connectOrCreate?: RegionCreateOrConnectWithoutRoomsInput
    connect?: RegionWhereUniqueInput
  }

  export type ConnectionCreateNestedManyWithoutFromRoomInput = {
    create?: XOR<ConnectionCreateWithoutFromRoomInput, ConnectionUncheckedCreateWithoutFromRoomInput> | ConnectionCreateWithoutFromRoomInput[] | ConnectionUncheckedCreateWithoutFromRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutFromRoomInput | ConnectionCreateOrConnectWithoutFromRoomInput[]
    createMany?: ConnectionCreateManyFromRoomInputEnvelope
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
  }

  export type ConnectionCreateNestedManyWithoutToRoomInput = {
    create?: XOR<ConnectionCreateWithoutToRoomInput, ConnectionUncheckedCreateWithoutToRoomInput> | ConnectionCreateWithoutToRoomInput[] | ConnectionUncheckedCreateWithoutToRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutToRoomInput | ConnectionCreateOrConnectWithoutToRoomInput[]
    createMany?: ConnectionCreateManyToRoomInputEnvelope
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
  }

  export type GameStateCreateNestedManyWithoutCurrentRoomInput = {
    create?: XOR<GameStateCreateWithoutCurrentRoomInput, GameStateUncheckedCreateWithoutCurrentRoomInput> | GameStateCreateWithoutCurrentRoomInput[] | GameStateUncheckedCreateWithoutCurrentRoomInput[]
    connectOrCreate?: GameStateCreateOrConnectWithoutCurrentRoomInput | GameStateCreateOrConnectWithoutCurrentRoomInput[]
    createMany?: GameStateCreateManyCurrentRoomInputEnvelope
    connect?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
  }

  export type ConnectionUncheckedCreateNestedManyWithoutFromRoomInput = {
    create?: XOR<ConnectionCreateWithoutFromRoomInput, ConnectionUncheckedCreateWithoutFromRoomInput> | ConnectionCreateWithoutFromRoomInput[] | ConnectionUncheckedCreateWithoutFromRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutFromRoomInput | ConnectionCreateOrConnectWithoutFromRoomInput[]
    createMany?: ConnectionCreateManyFromRoomInputEnvelope
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
  }

  export type ConnectionUncheckedCreateNestedManyWithoutToRoomInput = {
    create?: XOR<ConnectionCreateWithoutToRoomInput, ConnectionUncheckedCreateWithoutToRoomInput> | ConnectionCreateWithoutToRoomInput[] | ConnectionUncheckedCreateWithoutToRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutToRoomInput | ConnectionCreateOrConnectWithoutToRoomInput[]
    createMany?: ConnectionCreateManyToRoomInputEnvelope
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
  }

  export type GameStateUncheckedCreateNestedManyWithoutCurrentRoomInput = {
    create?: XOR<GameStateCreateWithoutCurrentRoomInput, GameStateUncheckedCreateWithoutCurrentRoomInput> | GameStateCreateWithoutCurrentRoomInput[] | GameStateUncheckedCreateWithoutCurrentRoomInput[]
    connectOrCreate?: GameStateCreateOrConnectWithoutCurrentRoomInput | GameStateCreateOrConnectWithoutCurrentRoomInput[]
    createMany?: GameStateCreateManyCurrentRoomInputEnvelope
    connect?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type GameUpdateOneRequiredWithoutRoomsNestedInput = {
    create?: XOR<GameCreateWithoutRoomsInput, GameUncheckedCreateWithoutRoomsInput>
    connectOrCreate?: GameCreateOrConnectWithoutRoomsInput
    upsert?: GameUpsertWithoutRoomsInput
    connect?: GameWhereUniqueInput
    update?: XOR<XOR<GameUpdateToOneWithWhereWithoutRoomsInput, GameUpdateWithoutRoomsInput>, GameUncheckedUpdateWithoutRoomsInput>
  }

  export type RegionUpdateOneWithoutRoomsNestedInput = {
    create?: XOR<RegionCreateWithoutRoomsInput, RegionUncheckedCreateWithoutRoomsInput>
    connectOrCreate?: RegionCreateOrConnectWithoutRoomsInput
    upsert?: RegionUpsertWithoutRoomsInput
    disconnect?: RegionWhereInput | boolean
    delete?: RegionWhereInput | boolean
    connect?: RegionWhereUniqueInput
    update?: XOR<XOR<RegionUpdateToOneWithWhereWithoutRoomsInput, RegionUpdateWithoutRoomsInput>, RegionUncheckedUpdateWithoutRoomsInput>
  }

  export type ConnectionUpdateManyWithoutFromRoomNestedInput = {
    create?: XOR<ConnectionCreateWithoutFromRoomInput, ConnectionUncheckedCreateWithoutFromRoomInput> | ConnectionCreateWithoutFromRoomInput[] | ConnectionUncheckedCreateWithoutFromRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutFromRoomInput | ConnectionCreateOrConnectWithoutFromRoomInput[]
    upsert?: ConnectionUpsertWithWhereUniqueWithoutFromRoomInput | ConnectionUpsertWithWhereUniqueWithoutFromRoomInput[]
    createMany?: ConnectionCreateManyFromRoomInputEnvelope
    set?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    disconnect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    delete?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    update?: ConnectionUpdateWithWhereUniqueWithoutFromRoomInput | ConnectionUpdateWithWhereUniqueWithoutFromRoomInput[]
    updateMany?: ConnectionUpdateManyWithWhereWithoutFromRoomInput | ConnectionUpdateManyWithWhereWithoutFromRoomInput[]
    deleteMany?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
  }

  export type ConnectionUpdateManyWithoutToRoomNestedInput = {
    create?: XOR<ConnectionCreateWithoutToRoomInput, ConnectionUncheckedCreateWithoutToRoomInput> | ConnectionCreateWithoutToRoomInput[] | ConnectionUncheckedCreateWithoutToRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutToRoomInput | ConnectionCreateOrConnectWithoutToRoomInput[]
    upsert?: ConnectionUpsertWithWhereUniqueWithoutToRoomInput | ConnectionUpsertWithWhereUniqueWithoutToRoomInput[]
    createMany?: ConnectionCreateManyToRoomInputEnvelope
    set?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    disconnect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    delete?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    update?: ConnectionUpdateWithWhereUniqueWithoutToRoomInput | ConnectionUpdateWithWhereUniqueWithoutToRoomInput[]
    updateMany?: ConnectionUpdateManyWithWhereWithoutToRoomInput | ConnectionUpdateManyWithWhereWithoutToRoomInput[]
    deleteMany?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
  }

  export type GameStateUpdateManyWithoutCurrentRoomNestedInput = {
    create?: XOR<GameStateCreateWithoutCurrentRoomInput, GameStateUncheckedCreateWithoutCurrentRoomInput> | GameStateCreateWithoutCurrentRoomInput[] | GameStateUncheckedCreateWithoutCurrentRoomInput[]
    connectOrCreate?: GameStateCreateOrConnectWithoutCurrentRoomInput | GameStateCreateOrConnectWithoutCurrentRoomInput[]
    upsert?: GameStateUpsertWithWhereUniqueWithoutCurrentRoomInput | GameStateUpsertWithWhereUniqueWithoutCurrentRoomInput[]
    createMany?: GameStateCreateManyCurrentRoomInputEnvelope
    set?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    disconnect?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    delete?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    connect?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    update?: GameStateUpdateWithWhereUniqueWithoutCurrentRoomInput | GameStateUpdateWithWhereUniqueWithoutCurrentRoomInput[]
    updateMany?: GameStateUpdateManyWithWhereWithoutCurrentRoomInput | GameStateUpdateManyWithWhereWithoutCurrentRoomInput[]
    deleteMany?: GameStateScalarWhereInput | GameStateScalarWhereInput[]
  }

  export type ConnectionUncheckedUpdateManyWithoutFromRoomNestedInput = {
    create?: XOR<ConnectionCreateWithoutFromRoomInput, ConnectionUncheckedCreateWithoutFromRoomInput> | ConnectionCreateWithoutFromRoomInput[] | ConnectionUncheckedCreateWithoutFromRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutFromRoomInput | ConnectionCreateOrConnectWithoutFromRoomInput[]
    upsert?: ConnectionUpsertWithWhereUniqueWithoutFromRoomInput | ConnectionUpsertWithWhereUniqueWithoutFromRoomInput[]
    createMany?: ConnectionCreateManyFromRoomInputEnvelope
    set?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    disconnect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    delete?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    update?: ConnectionUpdateWithWhereUniqueWithoutFromRoomInput | ConnectionUpdateWithWhereUniqueWithoutFromRoomInput[]
    updateMany?: ConnectionUpdateManyWithWhereWithoutFromRoomInput | ConnectionUpdateManyWithWhereWithoutFromRoomInput[]
    deleteMany?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
  }

  export type ConnectionUncheckedUpdateManyWithoutToRoomNestedInput = {
    create?: XOR<ConnectionCreateWithoutToRoomInput, ConnectionUncheckedCreateWithoutToRoomInput> | ConnectionCreateWithoutToRoomInput[] | ConnectionUncheckedCreateWithoutToRoomInput[]
    connectOrCreate?: ConnectionCreateOrConnectWithoutToRoomInput | ConnectionCreateOrConnectWithoutToRoomInput[]
    upsert?: ConnectionUpsertWithWhereUniqueWithoutToRoomInput | ConnectionUpsertWithWhereUniqueWithoutToRoomInput[]
    createMany?: ConnectionCreateManyToRoomInputEnvelope
    set?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    disconnect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    delete?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    connect?: ConnectionWhereUniqueInput | ConnectionWhereUniqueInput[]
    update?: ConnectionUpdateWithWhereUniqueWithoutToRoomInput | ConnectionUpdateWithWhereUniqueWithoutToRoomInput[]
    updateMany?: ConnectionUpdateManyWithWhereWithoutToRoomInput | ConnectionUpdateManyWithWhereWithoutToRoomInput[]
    deleteMany?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
  }

  export type GameStateUncheckedUpdateManyWithoutCurrentRoomNestedInput = {
    create?: XOR<GameStateCreateWithoutCurrentRoomInput, GameStateUncheckedCreateWithoutCurrentRoomInput> | GameStateCreateWithoutCurrentRoomInput[] | GameStateUncheckedCreateWithoutCurrentRoomInput[]
    connectOrCreate?: GameStateCreateOrConnectWithoutCurrentRoomInput | GameStateCreateOrConnectWithoutCurrentRoomInput[]
    upsert?: GameStateUpsertWithWhereUniqueWithoutCurrentRoomInput | GameStateUpsertWithWhereUniqueWithoutCurrentRoomInput[]
    createMany?: GameStateCreateManyCurrentRoomInputEnvelope
    set?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    disconnect?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    delete?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    connect?: GameStateWhereUniqueInput | GameStateWhereUniqueInput[]
    update?: GameStateUpdateWithWhereUniqueWithoutCurrentRoomInput | GameStateUpdateWithWhereUniqueWithoutCurrentRoomInput[]
    updateMany?: GameStateUpdateManyWithWhereWithoutCurrentRoomInput | GameStateUpdateManyWithWhereWithoutCurrentRoomInput[]
    deleteMany?: GameStateScalarWhereInput | GameStateScalarWhereInput[]
  }

  export type GameCreateNestedOneWithoutConnectionsInput = {
    create?: XOR<GameCreateWithoutConnectionsInput, GameUncheckedCreateWithoutConnectionsInput>
    connectOrCreate?: GameCreateOrConnectWithoutConnectionsInput
    connect?: GameWhereUniqueInput
  }

  export type RoomCreateNestedOneWithoutConnectionsFromInput = {
    create?: XOR<RoomCreateWithoutConnectionsFromInput, RoomUncheckedCreateWithoutConnectionsFromInput>
    connectOrCreate?: RoomCreateOrConnectWithoutConnectionsFromInput
    connect?: RoomWhereUniqueInput
  }

  export type RoomCreateNestedOneWithoutConnectionsToInput = {
    create?: XOR<RoomCreateWithoutConnectionsToInput, RoomUncheckedCreateWithoutConnectionsToInput>
    connectOrCreate?: RoomCreateOrConnectWithoutConnectionsToInput
    connect?: RoomWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type GameUpdateOneRequiredWithoutConnectionsNestedInput = {
    create?: XOR<GameCreateWithoutConnectionsInput, GameUncheckedCreateWithoutConnectionsInput>
    connectOrCreate?: GameCreateOrConnectWithoutConnectionsInput
    upsert?: GameUpsertWithoutConnectionsInput
    connect?: GameWhereUniqueInput
    update?: XOR<XOR<GameUpdateToOneWithWhereWithoutConnectionsInput, GameUpdateWithoutConnectionsInput>, GameUncheckedUpdateWithoutConnectionsInput>
  }

  export type RoomUpdateOneRequiredWithoutConnectionsFromNestedInput = {
    create?: XOR<RoomCreateWithoutConnectionsFromInput, RoomUncheckedCreateWithoutConnectionsFromInput>
    connectOrCreate?: RoomCreateOrConnectWithoutConnectionsFromInput
    upsert?: RoomUpsertWithoutConnectionsFromInput
    connect?: RoomWhereUniqueInput
    update?: XOR<XOR<RoomUpdateToOneWithWhereWithoutConnectionsFromInput, RoomUpdateWithoutConnectionsFromInput>, RoomUncheckedUpdateWithoutConnectionsFromInput>
  }

  export type RoomUpdateOneWithoutConnectionsToNestedInput = {
    create?: XOR<RoomCreateWithoutConnectionsToInput, RoomUncheckedCreateWithoutConnectionsToInput>
    connectOrCreate?: RoomCreateOrConnectWithoutConnectionsToInput
    upsert?: RoomUpsertWithoutConnectionsToInput
    disconnect?: RoomWhereInput | boolean
    delete?: RoomWhereInput | boolean
    connect?: RoomWhereUniqueInput
    update?: XOR<XOR<RoomUpdateToOneWithWhereWithoutConnectionsToInput, RoomUpdateWithoutConnectionsToInput>, RoomUncheckedUpdateWithoutConnectionsToInput>
  }

  export type GameCreateNestedOneWithoutGameStateInput = {
    create?: XOR<GameCreateWithoutGameStateInput, GameUncheckedCreateWithoutGameStateInput>
    connectOrCreate?: GameCreateOrConnectWithoutGameStateInput
    connect?: GameWhereUniqueInput
  }

  export type RoomCreateNestedOneWithoutGameStatesInput = {
    create?: XOR<RoomCreateWithoutGameStatesInput, RoomUncheckedCreateWithoutGameStatesInput>
    connectOrCreate?: RoomCreateOrConnectWithoutGameStatesInput
    connect?: RoomWhereUniqueInput
  }

  export type GameUpdateOneRequiredWithoutGameStateNestedInput = {
    create?: XOR<GameCreateWithoutGameStateInput, GameUncheckedCreateWithoutGameStateInput>
    connectOrCreate?: GameCreateOrConnectWithoutGameStateInput
    upsert?: GameUpsertWithoutGameStateInput
    connect?: GameWhereUniqueInput
    update?: XOR<XOR<GameUpdateToOneWithWhereWithoutGameStateInput, GameUpdateWithoutGameStateInput>, GameUncheckedUpdateWithoutGameStateInput>
  }

  export type RoomUpdateOneRequiredWithoutGameStatesNestedInput = {
    create?: XOR<RoomCreateWithoutGameStatesInput, RoomUncheckedCreateWithoutGameStatesInput>
    connectOrCreate?: RoomCreateOrConnectWithoutGameStatesInput
    upsert?: RoomUpsertWithoutGameStatesInput
    connect?: RoomWhereUniqueInput
    update?: XOR<XOR<RoomUpdateToOneWithWhereWithoutGameStatesInput, RoomUpdateWithoutGameStatesInput>, RoomUncheckedUpdateWithoutGameStatesInput>
  }

  export type GameCreateNestedOneWithoutRegionsInput = {
    create?: XOR<GameCreateWithoutRegionsInput, GameUncheckedCreateWithoutRegionsInput>
    connectOrCreate?: GameCreateOrConnectWithoutRegionsInput
    connect?: GameWhereUniqueInput
  }

  export type RoomCreateNestedManyWithoutRegionInput = {
    create?: XOR<RoomCreateWithoutRegionInput, RoomUncheckedCreateWithoutRegionInput> | RoomCreateWithoutRegionInput[] | RoomUncheckedCreateWithoutRegionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutRegionInput | RoomCreateOrConnectWithoutRegionInput[]
    createMany?: RoomCreateManyRegionInputEnvelope
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
  }

  export type RoomUncheckedCreateNestedManyWithoutRegionInput = {
    create?: XOR<RoomCreateWithoutRegionInput, RoomUncheckedCreateWithoutRegionInput> | RoomCreateWithoutRegionInput[] | RoomUncheckedCreateWithoutRegionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutRegionInput | RoomCreateOrConnectWithoutRegionInput[]
    createMany?: RoomCreateManyRegionInputEnvelope
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
  }

  export type GameUpdateOneRequiredWithoutRegionsNestedInput = {
    create?: XOR<GameCreateWithoutRegionsInput, GameUncheckedCreateWithoutRegionsInput>
    connectOrCreate?: GameCreateOrConnectWithoutRegionsInput
    upsert?: GameUpsertWithoutRegionsInput
    connect?: GameWhereUniqueInput
    update?: XOR<XOR<GameUpdateToOneWithWhereWithoutRegionsInput, GameUpdateWithoutRegionsInput>, GameUncheckedUpdateWithoutRegionsInput>
  }

  export type RoomUpdateManyWithoutRegionNestedInput = {
    create?: XOR<RoomCreateWithoutRegionInput, RoomUncheckedCreateWithoutRegionInput> | RoomCreateWithoutRegionInput[] | RoomUncheckedCreateWithoutRegionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutRegionInput | RoomCreateOrConnectWithoutRegionInput[]
    upsert?: RoomUpsertWithWhereUniqueWithoutRegionInput | RoomUpsertWithWhereUniqueWithoutRegionInput[]
    createMany?: RoomCreateManyRegionInputEnvelope
    set?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    disconnect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    delete?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    update?: RoomUpdateWithWhereUniqueWithoutRegionInput | RoomUpdateWithWhereUniqueWithoutRegionInput[]
    updateMany?: RoomUpdateManyWithWhereWithoutRegionInput | RoomUpdateManyWithWhereWithoutRegionInput[]
    deleteMany?: RoomScalarWhereInput | RoomScalarWhereInput[]
  }

  export type RoomUncheckedUpdateManyWithoutRegionNestedInput = {
    create?: XOR<RoomCreateWithoutRegionInput, RoomUncheckedCreateWithoutRegionInput> | RoomCreateWithoutRegionInput[] | RoomUncheckedCreateWithoutRegionInput[]
    connectOrCreate?: RoomCreateOrConnectWithoutRegionInput | RoomCreateOrConnectWithoutRegionInput[]
    upsert?: RoomUpsertWithWhereUniqueWithoutRegionInput | RoomUpsertWithWhereUniqueWithoutRegionInput[]
    createMany?: RoomCreateManyRegionInputEnvelope
    set?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    disconnect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    delete?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    connect?: RoomWhereUniqueInput | RoomWhereUniqueInput[]
    update?: RoomUpdateWithWhereUniqueWithoutRegionInput | RoomUpdateWithWhereUniqueWithoutRegionInput[]
    updateMany?: RoomUpdateManyWithWhereWithoutRegionInput | RoomUpdateManyWithWhereWithoutRegionInput[]
    deleteMany?: RoomScalarWhereInput | RoomScalarWhereInput[]
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type RoomCreateWithoutGameInput = {
    name: string
    description: string
    regionDistance?: number | null
    region?: RegionCreateNestedOneWithoutRoomsInput
    connectionsFrom?: ConnectionCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomUncheckedCreateWithoutGameInput = {
    id?: number
    name: string
    description: string
    regionId?: number | null
    regionDistance?: number | null
    connectionsFrom?: ConnectionUncheckedCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionUncheckedCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateUncheckedCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomCreateOrConnectWithoutGameInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutGameInput, RoomUncheckedCreateWithoutGameInput>
  }

  export type RoomCreateManyGameInputEnvelope = {
    data: RoomCreateManyGameInput | RoomCreateManyGameInput[]
  }

  export type ConnectionCreateWithoutGameInput = {
    direction?: string | null
    name: string
    processing?: boolean
    fromRoom: RoomCreateNestedOneWithoutConnectionsFromInput
    toRoom?: RoomCreateNestedOneWithoutConnectionsToInput
  }

  export type ConnectionUncheckedCreateWithoutGameInput = {
    id?: number
    fromRoomId: number
    toRoomId?: number | null
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type ConnectionCreateOrConnectWithoutGameInput = {
    where: ConnectionWhereUniqueInput
    create: XOR<ConnectionCreateWithoutGameInput, ConnectionUncheckedCreateWithoutGameInput>
  }

  export type ConnectionCreateManyGameInputEnvelope = {
    data: ConnectionCreateManyGameInput | ConnectionCreateManyGameInput[]
  }

  export type GameStateCreateWithoutGameInput = {
    playerName?: string | null
    currentRoom: RoomCreateNestedOneWithoutGameStatesInput
  }

  export type GameStateUncheckedCreateWithoutGameInput = {
    id?: number
    currentRoomId: number
    playerName?: string | null
  }

  export type GameStateCreateOrConnectWithoutGameInput = {
    where: GameStateWhereUniqueInput
    create: XOR<GameStateCreateWithoutGameInput, GameStateUncheckedCreateWithoutGameInput>
  }

  export type RegionCreateWithoutGameInput = {
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
    rooms?: RoomCreateNestedManyWithoutRegionInput
  }

  export type RegionUncheckedCreateWithoutGameInput = {
    id?: number
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
    rooms?: RoomUncheckedCreateNestedManyWithoutRegionInput
  }

  export type RegionCreateOrConnectWithoutGameInput = {
    where: RegionWhereUniqueInput
    create: XOR<RegionCreateWithoutGameInput, RegionUncheckedCreateWithoutGameInput>
  }

  export type RegionCreateManyGameInputEnvelope = {
    data: RegionCreateManyGameInput | RegionCreateManyGameInput[]
  }

  export type RoomUpsertWithWhereUniqueWithoutGameInput = {
    where: RoomWhereUniqueInput
    update: XOR<RoomUpdateWithoutGameInput, RoomUncheckedUpdateWithoutGameInput>
    create: XOR<RoomCreateWithoutGameInput, RoomUncheckedCreateWithoutGameInput>
  }

  export type RoomUpdateWithWhereUniqueWithoutGameInput = {
    where: RoomWhereUniqueInput
    data: XOR<RoomUpdateWithoutGameInput, RoomUncheckedUpdateWithoutGameInput>
  }

  export type RoomUpdateManyWithWhereWithoutGameInput = {
    where: RoomScalarWhereInput
    data: XOR<RoomUpdateManyMutationInput, RoomUncheckedUpdateManyWithoutGameInput>
  }

  export type RoomScalarWhereInput = {
    AND?: RoomScalarWhereInput | RoomScalarWhereInput[]
    OR?: RoomScalarWhereInput[]
    NOT?: RoomScalarWhereInput | RoomScalarWhereInput[]
    id?: IntFilter<"Room"> | number
    gameId?: IntFilter<"Room"> | number
    name?: StringFilter<"Room"> | string
    description?: StringFilter<"Room"> | string
    regionId?: IntNullableFilter<"Room"> | number | null
    regionDistance?: IntNullableFilter<"Room"> | number | null
  }

  export type ConnectionUpsertWithWhereUniqueWithoutGameInput = {
    where: ConnectionWhereUniqueInput
    update: XOR<ConnectionUpdateWithoutGameInput, ConnectionUncheckedUpdateWithoutGameInput>
    create: XOR<ConnectionCreateWithoutGameInput, ConnectionUncheckedCreateWithoutGameInput>
  }

  export type ConnectionUpdateWithWhereUniqueWithoutGameInput = {
    where: ConnectionWhereUniqueInput
    data: XOR<ConnectionUpdateWithoutGameInput, ConnectionUncheckedUpdateWithoutGameInput>
  }

  export type ConnectionUpdateManyWithWhereWithoutGameInput = {
    where: ConnectionScalarWhereInput
    data: XOR<ConnectionUpdateManyMutationInput, ConnectionUncheckedUpdateManyWithoutGameInput>
  }

  export type ConnectionScalarWhereInput = {
    AND?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
    OR?: ConnectionScalarWhereInput[]
    NOT?: ConnectionScalarWhereInput | ConnectionScalarWhereInput[]
    id?: IntFilter<"Connection"> | number
    gameId?: IntFilter<"Connection"> | number
    fromRoomId?: IntFilter<"Connection"> | number
    toRoomId?: IntNullableFilter<"Connection"> | number | null
    direction?: StringNullableFilter<"Connection"> | string | null
    name?: StringFilter<"Connection"> | string
    processing?: BoolFilter<"Connection"> | boolean
  }

  export type GameStateUpsertWithoutGameInput = {
    update: XOR<GameStateUpdateWithoutGameInput, GameStateUncheckedUpdateWithoutGameInput>
    create: XOR<GameStateCreateWithoutGameInput, GameStateUncheckedCreateWithoutGameInput>
    where?: GameStateWhereInput
  }

  export type GameStateUpdateToOneWithWhereWithoutGameInput = {
    where?: GameStateWhereInput
    data: XOR<GameStateUpdateWithoutGameInput, GameStateUncheckedUpdateWithoutGameInput>
  }

  export type GameStateUpdateWithoutGameInput = {
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
    currentRoom?: RoomUpdateOneRequiredWithoutGameStatesNestedInput
  }

  export type GameStateUncheckedUpdateWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    currentRoomId?: IntFieldUpdateOperationsInput | number
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type RegionUpsertWithWhereUniqueWithoutGameInput = {
    where: RegionWhereUniqueInput
    update: XOR<RegionUpdateWithoutGameInput, RegionUncheckedUpdateWithoutGameInput>
    create: XOR<RegionCreateWithoutGameInput, RegionUncheckedCreateWithoutGameInput>
  }

  export type RegionUpdateWithWhereUniqueWithoutGameInput = {
    where: RegionWhereUniqueInput
    data: XOR<RegionUpdateWithoutGameInput, RegionUncheckedUpdateWithoutGameInput>
  }

  export type RegionUpdateManyWithWhereWithoutGameInput = {
    where: RegionScalarWhereInput
    data: XOR<RegionUpdateManyMutationInput, RegionUncheckedUpdateManyWithoutGameInput>
  }

  export type RegionScalarWhereInput = {
    AND?: RegionScalarWhereInput | RegionScalarWhereInput[]
    OR?: RegionScalarWhereInput[]
    NOT?: RegionScalarWhereInput | RegionScalarWhereInput[]
    id?: IntFilter<"Region"> | number
    gameId?: IntFilter<"Region"> | number
    name?: StringNullableFilter<"Region"> | string | null
    type?: StringFilter<"Region"> | string
    description?: StringFilter<"Region"> | string
    centerRoomId?: IntNullableFilter<"Region"> | number | null
    createdAt?: DateTimeFilter<"Region"> | Date | string
  }

  export type GameCreateWithoutRoomsInput = {
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    connections?: ConnectionCreateNestedManyWithoutGameInput
    gameState?: GameStateCreateNestedOneWithoutGameInput
    regions?: RegionCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateWithoutRoomsInput = {
    id?: number
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    connections?: ConnectionUncheckedCreateNestedManyWithoutGameInput
    gameState?: GameStateUncheckedCreateNestedOneWithoutGameInput
    regions?: RegionUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameCreateOrConnectWithoutRoomsInput = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutRoomsInput, GameUncheckedCreateWithoutRoomsInput>
  }

  export type RegionCreateWithoutRoomsInput = {
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
    game: GameCreateNestedOneWithoutRegionsInput
  }

  export type RegionUncheckedCreateWithoutRoomsInput = {
    id?: number
    gameId: number
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
  }

  export type RegionCreateOrConnectWithoutRoomsInput = {
    where: RegionWhereUniqueInput
    create: XOR<RegionCreateWithoutRoomsInput, RegionUncheckedCreateWithoutRoomsInput>
  }

  export type ConnectionCreateWithoutFromRoomInput = {
    direction?: string | null
    name: string
    processing?: boolean
    game: GameCreateNestedOneWithoutConnectionsInput
    toRoom?: RoomCreateNestedOneWithoutConnectionsToInput
  }

  export type ConnectionUncheckedCreateWithoutFromRoomInput = {
    id?: number
    gameId: number
    toRoomId?: number | null
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type ConnectionCreateOrConnectWithoutFromRoomInput = {
    where: ConnectionWhereUniqueInput
    create: XOR<ConnectionCreateWithoutFromRoomInput, ConnectionUncheckedCreateWithoutFromRoomInput>
  }

  export type ConnectionCreateManyFromRoomInputEnvelope = {
    data: ConnectionCreateManyFromRoomInput | ConnectionCreateManyFromRoomInput[]
  }

  export type ConnectionCreateWithoutToRoomInput = {
    direction?: string | null
    name: string
    processing?: boolean
    game: GameCreateNestedOneWithoutConnectionsInput
    fromRoom: RoomCreateNestedOneWithoutConnectionsFromInput
  }

  export type ConnectionUncheckedCreateWithoutToRoomInput = {
    id?: number
    gameId: number
    fromRoomId: number
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type ConnectionCreateOrConnectWithoutToRoomInput = {
    where: ConnectionWhereUniqueInput
    create: XOR<ConnectionCreateWithoutToRoomInput, ConnectionUncheckedCreateWithoutToRoomInput>
  }

  export type ConnectionCreateManyToRoomInputEnvelope = {
    data: ConnectionCreateManyToRoomInput | ConnectionCreateManyToRoomInput[]
  }

  export type GameStateCreateWithoutCurrentRoomInput = {
    playerName?: string | null
    game: GameCreateNestedOneWithoutGameStateInput
  }

  export type GameStateUncheckedCreateWithoutCurrentRoomInput = {
    id?: number
    gameId: number
    playerName?: string | null
  }

  export type GameStateCreateOrConnectWithoutCurrentRoomInput = {
    where: GameStateWhereUniqueInput
    create: XOR<GameStateCreateWithoutCurrentRoomInput, GameStateUncheckedCreateWithoutCurrentRoomInput>
  }

  export type GameStateCreateManyCurrentRoomInputEnvelope = {
    data: GameStateCreateManyCurrentRoomInput | GameStateCreateManyCurrentRoomInput[]
  }

  export type GameUpsertWithoutRoomsInput = {
    update: XOR<GameUpdateWithoutRoomsInput, GameUncheckedUpdateWithoutRoomsInput>
    create: XOR<GameCreateWithoutRoomsInput, GameUncheckedCreateWithoutRoomsInput>
    where?: GameWhereInput
  }

  export type GameUpdateToOneWithWhereWithoutRoomsInput = {
    where?: GameWhereInput
    data: XOR<GameUpdateWithoutRoomsInput, GameUncheckedUpdateWithoutRoomsInput>
  }

  export type GameUpdateWithoutRoomsInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    connections?: ConnectionUpdateManyWithoutGameNestedInput
    gameState?: GameStateUpdateOneWithoutGameNestedInput
    regions?: RegionUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateWithoutRoomsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    connections?: ConnectionUncheckedUpdateManyWithoutGameNestedInput
    gameState?: GameStateUncheckedUpdateOneWithoutGameNestedInput
    regions?: RegionUncheckedUpdateManyWithoutGameNestedInput
  }

  export type RegionUpsertWithoutRoomsInput = {
    update: XOR<RegionUpdateWithoutRoomsInput, RegionUncheckedUpdateWithoutRoomsInput>
    create: XOR<RegionCreateWithoutRoomsInput, RegionUncheckedCreateWithoutRoomsInput>
    where?: RegionWhereInput
  }

  export type RegionUpdateToOneWithWhereWithoutRoomsInput = {
    where?: RegionWhereInput
    data: XOR<RegionUpdateWithoutRoomsInput, RegionUncheckedUpdateWithoutRoomsInput>
  }

  export type RegionUpdateWithoutRoomsInput = {
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    game?: GameUpdateOneRequiredWithoutRegionsNestedInput
  }

  export type RegionUncheckedUpdateWithoutRoomsInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectionUpsertWithWhereUniqueWithoutFromRoomInput = {
    where: ConnectionWhereUniqueInput
    update: XOR<ConnectionUpdateWithoutFromRoomInput, ConnectionUncheckedUpdateWithoutFromRoomInput>
    create: XOR<ConnectionCreateWithoutFromRoomInput, ConnectionUncheckedCreateWithoutFromRoomInput>
  }

  export type ConnectionUpdateWithWhereUniqueWithoutFromRoomInput = {
    where: ConnectionWhereUniqueInput
    data: XOR<ConnectionUpdateWithoutFromRoomInput, ConnectionUncheckedUpdateWithoutFromRoomInput>
  }

  export type ConnectionUpdateManyWithWhereWithoutFromRoomInput = {
    where: ConnectionScalarWhereInput
    data: XOR<ConnectionUpdateManyMutationInput, ConnectionUncheckedUpdateManyWithoutFromRoomInput>
  }

  export type ConnectionUpsertWithWhereUniqueWithoutToRoomInput = {
    where: ConnectionWhereUniqueInput
    update: XOR<ConnectionUpdateWithoutToRoomInput, ConnectionUncheckedUpdateWithoutToRoomInput>
    create: XOR<ConnectionCreateWithoutToRoomInput, ConnectionUncheckedCreateWithoutToRoomInput>
  }

  export type ConnectionUpdateWithWhereUniqueWithoutToRoomInput = {
    where: ConnectionWhereUniqueInput
    data: XOR<ConnectionUpdateWithoutToRoomInput, ConnectionUncheckedUpdateWithoutToRoomInput>
  }

  export type ConnectionUpdateManyWithWhereWithoutToRoomInput = {
    where: ConnectionScalarWhereInput
    data: XOR<ConnectionUpdateManyMutationInput, ConnectionUncheckedUpdateManyWithoutToRoomInput>
  }

  export type GameStateUpsertWithWhereUniqueWithoutCurrentRoomInput = {
    where: GameStateWhereUniqueInput
    update: XOR<GameStateUpdateWithoutCurrentRoomInput, GameStateUncheckedUpdateWithoutCurrentRoomInput>
    create: XOR<GameStateCreateWithoutCurrentRoomInput, GameStateUncheckedCreateWithoutCurrentRoomInput>
  }

  export type GameStateUpdateWithWhereUniqueWithoutCurrentRoomInput = {
    where: GameStateWhereUniqueInput
    data: XOR<GameStateUpdateWithoutCurrentRoomInput, GameStateUncheckedUpdateWithoutCurrentRoomInput>
  }

  export type GameStateUpdateManyWithWhereWithoutCurrentRoomInput = {
    where: GameStateScalarWhereInput
    data: XOR<GameStateUpdateManyMutationInput, GameStateUncheckedUpdateManyWithoutCurrentRoomInput>
  }

  export type GameStateScalarWhereInput = {
    AND?: GameStateScalarWhereInput | GameStateScalarWhereInput[]
    OR?: GameStateScalarWhereInput[]
    NOT?: GameStateScalarWhereInput | GameStateScalarWhereInput[]
    id?: IntFilter<"GameState"> | number
    gameId?: IntFilter<"GameState"> | number
    currentRoomId?: IntFilter<"GameState"> | number
    playerName?: StringNullableFilter<"GameState"> | string | null
  }

  export type GameCreateWithoutConnectionsInput = {
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomCreateNestedManyWithoutGameInput
    gameState?: GameStateCreateNestedOneWithoutGameInput
    regions?: RegionCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateWithoutConnectionsInput = {
    id?: number
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomUncheckedCreateNestedManyWithoutGameInput
    gameState?: GameStateUncheckedCreateNestedOneWithoutGameInput
    regions?: RegionUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameCreateOrConnectWithoutConnectionsInput = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutConnectionsInput, GameUncheckedCreateWithoutConnectionsInput>
  }

  export type RoomCreateWithoutConnectionsFromInput = {
    name: string
    description: string
    regionDistance?: number | null
    game: GameCreateNestedOneWithoutRoomsInput
    region?: RegionCreateNestedOneWithoutRoomsInput
    connectionsTo?: ConnectionCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomUncheckedCreateWithoutConnectionsFromInput = {
    id?: number
    gameId: number
    name: string
    description: string
    regionId?: number | null
    regionDistance?: number | null
    connectionsTo?: ConnectionUncheckedCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateUncheckedCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomCreateOrConnectWithoutConnectionsFromInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutConnectionsFromInput, RoomUncheckedCreateWithoutConnectionsFromInput>
  }

  export type RoomCreateWithoutConnectionsToInput = {
    name: string
    description: string
    regionDistance?: number | null
    game: GameCreateNestedOneWithoutRoomsInput
    region?: RegionCreateNestedOneWithoutRoomsInput
    connectionsFrom?: ConnectionCreateNestedManyWithoutFromRoomInput
    gameStates?: GameStateCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomUncheckedCreateWithoutConnectionsToInput = {
    id?: number
    gameId: number
    name: string
    description: string
    regionId?: number | null
    regionDistance?: number | null
    connectionsFrom?: ConnectionUncheckedCreateNestedManyWithoutFromRoomInput
    gameStates?: GameStateUncheckedCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomCreateOrConnectWithoutConnectionsToInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutConnectionsToInput, RoomUncheckedCreateWithoutConnectionsToInput>
  }

  export type GameUpsertWithoutConnectionsInput = {
    update: XOR<GameUpdateWithoutConnectionsInput, GameUncheckedUpdateWithoutConnectionsInput>
    create: XOR<GameCreateWithoutConnectionsInput, GameUncheckedCreateWithoutConnectionsInput>
    where?: GameWhereInput
  }

  export type GameUpdateToOneWithWhereWithoutConnectionsInput = {
    where?: GameWhereInput
    data: XOR<GameUpdateWithoutConnectionsInput, GameUncheckedUpdateWithoutConnectionsInput>
  }

  export type GameUpdateWithoutConnectionsInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUpdateManyWithoutGameNestedInput
    gameState?: GameStateUpdateOneWithoutGameNestedInput
    regions?: RegionUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateWithoutConnectionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUncheckedUpdateManyWithoutGameNestedInput
    gameState?: GameStateUncheckedUpdateOneWithoutGameNestedInput
    regions?: RegionUncheckedUpdateManyWithoutGameNestedInput
  }

  export type RoomUpsertWithoutConnectionsFromInput = {
    update: XOR<RoomUpdateWithoutConnectionsFromInput, RoomUncheckedUpdateWithoutConnectionsFromInput>
    create: XOR<RoomCreateWithoutConnectionsFromInput, RoomUncheckedCreateWithoutConnectionsFromInput>
    where?: RoomWhereInput
  }

  export type RoomUpdateToOneWithWhereWithoutConnectionsFromInput = {
    where?: RoomWhereInput
    data: XOR<RoomUpdateWithoutConnectionsFromInput, RoomUncheckedUpdateWithoutConnectionsFromInput>
  }

  export type RoomUpdateWithoutConnectionsFromInput = {
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    game?: GameUpdateOneRequiredWithoutRoomsNestedInput
    region?: RegionUpdateOneWithoutRoomsNestedInput
    connectionsTo?: ConnectionUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutConnectionsFromInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionId?: NullableIntFieldUpdateOperationsInput | number | null
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    connectionsTo?: ConnectionUncheckedUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUncheckedUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUpsertWithoutConnectionsToInput = {
    update: XOR<RoomUpdateWithoutConnectionsToInput, RoomUncheckedUpdateWithoutConnectionsToInput>
    create: XOR<RoomCreateWithoutConnectionsToInput, RoomUncheckedCreateWithoutConnectionsToInput>
    where?: RoomWhereInput
  }

  export type RoomUpdateToOneWithWhereWithoutConnectionsToInput = {
    where?: RoomWhereInput
    data: XOR<RoomUpdateWithoutConnectionsToInput, RoomUncheckedUpdateWithoutConnectionsToInput>
  }

  export type RoomUpdateWithoutConnectionsToInput = {
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    game?: GameUpdateOneRequiredWithoutRoomsNestedInput
    region?: RegionUpdateOneWithoutRoomsNestedInput
    connectionsFrom?: ConnectionUpdateManyWithoutFromRoomNestedInput
    gameStates?: GameStateUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutConnectionsToInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionId?: NullableIntFieldUpdateOperationsInput | number | null
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    connectionsFrom?: ConnectionUncheckedUpdateManyWithoutFromRoomNestedInput
    gameStates?: GameStateUncheckedUpdateManyWithoutCurrentRoomNestedInput
  }

  export type GameCreateWithoutGameStateInput = {
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomCreateNestedManyWithoutGameInput
    connections?: ConnectionCreateNestedManyWithoutGameInput
    regions?: RegionCreateNestedManyWithoutGameInput
  }

  export type GameUncheckedCreateWithoutGameStateInput = {
    id?: number
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomUncheckedCreateNestedManyWithoutGameInput
    connections?: ConnectionUncheckedCreateNestedManyWithoutGameInput
    regions?: RegionUncheckedCreateNestedManyWithoutGameInput
  }

  export type GameCreateOrConnectWithoutGameStateInput = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutGameStateInput, GameUncheckedCreateWithoutGameStateInput>
  }

  export type RoomCreateWithoutGameStatesInput = {
    name: string
    description: string
    regionDistance?: number | null
    game: GameCreateNestedOneWithoutRoomsInput
    region?: RegionCreateNestedOneWithoutRoomsInput
    connectionsFrom?: ConnectionCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionCreateNestedManyWithoutToRoomInput
  }

  export type RoomUncheckedCreateWithoutGameStatesInput = {
    id?: number
    gameId: number
    name: string
    description: string
    regionId?: number | null
    regionDistance?: number | null
    connectionsFrom?: ConnectionUncheckedCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionUncheckedCreateNestedManyWithoutToRoomInput
  }

  export type RoomCreateOrConnectWithoutGameStatesInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutGameStatesInput, RoomUncheckedCreateWithoutGameStatesInput>
  }

  export type GameUpsertWithoutGameStateInput = {
    update: XOR<GameUpdateWithoutGameStateInput, GameUncheckedUpdateWithoutGameStateInput>
    create: XOR<GameCreateWithoutGameStateInput, GameUncheckedCreateWithoutGameStateInput>
    where?: GameWhereInput
  }

  export type GameUpdateToOneWithWhereWithoutGameStateInput = {
    where?: GameWhereInput
    data: XOR<GameUpdateWithoutGameStateInput, GameUncheckedUpdateWithoutGameStateInput>
  }

  export type GameUpdateWithoutGameStateInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUpdateManyWithoutGameNestedInput
    connections?: ConnectionUpdateManyWithoutGameNestedInput
    regions?: RegionUpdateManyWithoutGameNestedInput
  }

  export type GameUncheckedUpdateWithoutGameStateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUncheckedUpdateManyWithoutGameNestedInput
    connections?: ConnectionUncheckedUpdateManyWithoutGameNestedInput
    regions?: RegionUncheckedUpdateManyWithoutGameNestedInput
  }

  export type RoomUpsertWithoutGameStatesInput = {
    update: XOR<RoomUpdateWithoutGameStatesInput, RoomUncheckedUpdateWithoutGameStatesInput>
    create: XOR<RoomCreateWithoutGameStatesInput, RoomUncheckedCreateWithoutGameStatesInput>
    where?: RoomWhereInput
  }

  export type RoomUpdateToOneWithWhereWithoutGameStatesInput = {
    where?: RoomWhereInput
    data: XOR<RoomUpdateWithoutGameStatesInput, RoomUncheckedUpdateWithoutGameStatesInput>
  }

  export type RoomUpdateWithoutGameStatesInput = {
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    game?: GameUpdateOneRequiredWithoutRoomsNestedInput
    region?: RegionUpdateOneWithoutRoomsNestedInput
    connectionsFrom?: ConnectionUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUpdateManyWithoutToRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutGameStatesInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionId?: NullableIntFieldUpdateOperationsInput | number | null
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    connectionsFrom?: ConnectionUncheckedUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUncheckedUpdateManyWithoutToRoomNestedInput
  }

  export type GameCreateWithoutRegionsInput = {
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomCreateNestedManyWithoutGameInput
    connections?: ConnectionCreateNestedManyWithoutGameInput
    gameState?: GameStateCreateNestedOneWithoutGameInput
  }

  export type GameUncheckedCreateWithoutRegionsInput = {
    id?: number
    name: string
    createdAt?: Date | string
    lastPlayedAt?: Date | string
    rooms?: RoomUncheckedCreateNestedManyWithoutGameInput
    connections?: ConnectionUncheckedCreateNestedManyWithoutGameInput
    gameState?: GameStateUncheckedCreateNestedOneWithoutGameInput
  }

  export type GameCreateOrConnectWithoutRegionsInput = {
    where: GameWhereUniqueInput
    create: XOR<GameCreateWithoutRegionsInput, GameUncheckedCreateWithoutRegionsInput>
  }

  export type RoomCreateWithoutRegionInput = {
    name: string
    description: string
    regionDistance?: number | null
    game: GameCreateNestedOneWithoutRoomsInput
    connectionsFrom?: ConnectionCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomUncheckedCreateWithoutRegionInput = {
    id?: number
    gameId: number
    name: string
    description: string
    regionDistance?: number | null
    connectionsFrom?: ConnectionUncheckedCreateNestedManyWithoutFromRoomInput
    connectionsTo?: ConnectionUncheckedCreateNestedManyWithoutToRoomInput
    gameStates?: GameStateUncheckedCreateNestedManyWithoutCurrentRoomInput
  }

  export type RoomCreateOrConnectWithoutRegionInput = {
    where: RoomWhereUniqueInput
    create: XOR<RoomCreateWithoutRegionInput, RoomUncheckedCreateWithoutRegionInput>
  }

  export type RoomCreateManyRegionInputEnvelope = {
    data: RoomCreateManyRegionInput | RoomCreateManyRegionInput[]
  }

  export type GameUpsertWithoutRegionsInput = {
    update: XOR<GameUpdateWithoutRegionsInput, GameUncheckedUpdateWithoutRegionsInput>
    create: XOR<GameCreateWithoutRegionsInput, GameUncheckedCreateWithoutRegionsInput>
    where?: GameWhereInput
  }

  export type GameUpdateToOneWithWhereWithoutRegionsInput = {
    where?: GameWhereInput
    data: XOR<GameUpdateWithoutRegionsInput, GameUncheckedUpdateWithoutRegionsInput>
  }

  export type GameUpdateWithoutRegionsInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUpdateManyWithoutGameNestedInput
    connections?: ConnectionUpdateManyWithoutGameNestedInput
    gameState?: GameStateUpdateOneWithoutGameNestedInput
  }

  export type GameUncheckedUpdateWithoutRegionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastPlayedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUncheckedUpdateManyWithoutGameNestedInput
    connections?: ConnectionUncheckedUpdateManyWithoutGameNestedInput
    gameState?: GameStateUncheckedUpdateOneWithoutGameNestedInput
  }

  export type RoomUpsertWithWhereUniqueWithoutRegionInput = {
    where: RoomWhereUniqueInput
    update: XOR<RoomUpdateWithoutRegionInput, RoomUncheckedUpdateWithoutRegionInput>
    create: XOR<RoomCreateWithoutRegionInput, RoomUncheckedCreateWithoutRegionInput>
  }

  export type RoomUpdateWithWhereUniqueWithoutRegionInput = {
    where: RoomWhereUniqueInput
    data: XOR<RoomUpdateWithoutRegionInput, RoomUncheckedUpdateWithoutRegionInput>
  }

  export type RoomUpdateManyWithWhereWithoutRegionInput = {
    where: RoomScalarWhereInput
    data: XOR<RoomUpdateManyMutationInput, RoomUncheckedUpdateManyWithoutRegionInput>
  }

  export type RoomCreateManyGameInput = {
    id?: number
    name: string
    description: string
    regionId?: number | null
    regionDistance?: number | null
  }

  export type ConnectionCreateManyGameInput = {
    id?: number
    fromRoomId: number
    toRoomId?: number | null
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type RegionCreateManyGameInput = {
    id?: number
    name?: string | null
    type: string
    description: string
    centerRoomId?: number | null
    createdAt?: Date | string
  }

  export type RoomUpdateWithoutGameInput = {
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    region?: RegionUpdateOneWithoutRoomsNestedInput
    connectionsFrom?: ConnectionUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionId?: NullableIntFieldUpdateOperationsInput | number | null
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    connectionsFrom?: ConnectionUncheckedUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUncheckedUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUncheckedUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUncheckedUpdateManyWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionId?: NullableIntFieldUpdateOperationsInput | number | null
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ConnectionUpdateWithoutGameInput = {
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
    fromRoom?: RoomUpdateOneRequiredWithoutConnectionsFromNestedInput
    toRoom?: RoomUpdateOneWithoutConnectionsToNestedInput
  }

  export type ConnectionUncheckedUpdateWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    fromRoomId?: IntFieldUpdateOperationsInput | number
    toRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ConnectionUncheckedUpdateManyWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    fromRoomId?: IntFieldUpdateOperationsInput | number
    toRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type RegionUpdateWithoutGameInput = {
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUpdateManyWithoutRegionNestedInput
  }

  export type RegionUncheckedUpdateWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rooms?: RoomUncheckedUpdateManyWithoutRegionNestedInput
  }

  export type RegionUncheckedUpdateManyWithoutGameInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    centerRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectionCreateManyFromRoomInput = {
    id?: number
    gameId: number
    toRoomId?: number | null
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type ConnectionCreateManyToRoomInput = {
    id?: number
    gameId: number
    fromRoomId: number
    direction?: string | null
    name: string
    processing?: boolean
  }

  export type GameStateCreateManyCurrentRoomInput = {
    id?: number
    gameId: number
    playerName?: string | null
  }

  export type ConnectionUpdateWithoutFromRoomInput = {
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
    game?: GameUpdateOneRequiredWithoutConnectionsNestedInput
    toRoom?: RoomUpdateOneWithoutConnectionsToNestedInput
  }

  export type ConnectionUncheckedUpdateWithoutFromRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    toRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ConnectionUncheckedUpdateManyWithoutFromRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    toRoomId?: NullableIntFieldUpdateOperationsInput | number | null
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ConnectionUpdateWithoutToRoomInput = {
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
    game?: GameUpdateOneRequiredWithoutConnectionsNestedInput
    fromRoom?: RoomUpdateOneRequiredWithoutConnectionsFromNestedInput
  }

  export type ConnectionUncheckedUpdateWithoutToRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    fromRoomId?: IntFieldUpdateOperationsInput | number
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ConnectionUncheckedUpdateManyWithoutToRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    fromRoomId?: IntFieldUpdateOperationsInput | number
    direction?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    processing?: BoolFieldUpdateOperationsInput | boolean
  }

  export type GameStateUpdateWithoutCurrentRoomInput = {
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
    game?: GameUpdateOneRequiredWithoutGameStateNestedInput
  }

  export type GameStateUncheckedUpdateWithoutCurrentRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type GameStateUncheckedUpdateManyWithoutCurrentRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    playerName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type RoomCreateManyRegionInput = {
    id?: number
    gameId: number
    name: string
    description: string
    regionDistance?: number | null
  }

  export type RoomUpdateWithoutRegionInput = {
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    game?: GameUpdateOneRequiredWithoutRoomsNestedInput
    connectionsFrom?: ConnectionUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUncheckedUpdateWithoutRegionInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
    connectionsFrom?: ConnectionUncheckedUpdateManyWithoutFromRoomNestedInput
    connectionsTo?: ConnectionUncheckedUpdateManyWithoutToRoomNestedInput
    gameStates?: GameStateUncheckedUpdateManyWithoutCurrentRoomNestedInput
  }

  export type RoomUncheckedUpdateManyWithoutRegionInput = {
    id?: IntFieldUpdateOperationsInput | number
    gameId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    regionDistance?: NullableIntFieldUpdateOperationsInput | number | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}