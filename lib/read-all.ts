/** Read every row; callers provide a deterministic order including a unique key. */
export async function readAll<T>(query: { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }> }) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await query.range(offset, offset + 499);
    if (result.error) throw new Error("Database report could not be read.");
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) return { data: rows, error: null };
  }
}

export async function readInBatches<T>(ids: string[], query: (ids: string[]) => { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }> }) {
  const data: T[] = [];
  const unique = [...new Set(ids)];
  for (let offset=0; offset<unique.length; offset+=100) data.push(...(await readAll(query(unique.slice(offset,offset+100)))).data);
  return { data, error: null };
}
