import mysql from "mysql2/promise";

export type NamedLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false };

export async function withMysqlNamedLock<T>(
  name: string,
  work: () => Promise<T>,
  waitSeconds = 0
): Promise<NamedLockResult<T>> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for MySQL named locks");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  let acquired = false;
  try {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT GET_LOCK(?, ?) AS acquired",
      [name, waitSeconds]
    );
    acquired = Number(rows[0]?.acquired) === 1;
    if (!acquired) return { acquired: false };
    return { acquired: true, value: await work() };
  } finally {
    if (acquired) {
      await connection.execute("SELECT RELEASE_LOCK(?)", [name]).catch(() => undefined);
    }
    await connection.end();
  }
}
