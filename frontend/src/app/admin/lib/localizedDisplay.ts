/** Best-effort display value for read-only admin contexts (table rows, dropdown
 * labels, preview/delete dialogs) that aren't tied to a specific edit-form
 * language tab — prefers Kazakh (the product default), then English, then Russian. */
export function displayField(entity: object, field: string): string {
  const record = entity as unknown as Record<string, unknown>;
  return (record[`${field}_kk`] || record[`${field}_en`] || record[`${field}_ru`] || "") as string;
}
