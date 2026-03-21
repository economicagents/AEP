import type { IndexedProvider } from "./types.js";
import type { SearchResult } from "./search-result.js";
import { getSearchDatasetId } from "./dataset-id.js";
import { buildSearchDocument } from "./search-document.js";
import { mergeRrf, toRrfRanks, RRF_K } from "./rrf.js";
import { ensureMigrated } from "./pg/migrate.js";
import { getPgPool } from "./pg/pool.js";
import { embedQueryText } from "./embeddings.js";

const LEXICAL_LIMIT = 50;
const VECTOR_LIMIT = 50;

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function buildPgSearchIndex(indexPath: string, providers: IndexedProvider[]): Promise<void> {
  const pool = getPgPool();
  await ensureMigrated(pool);
  const datasetId = getSearchDatasetId(indexPath);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sql = `
      INSERT INTO provider_search (dataset_id, agent_id, chain_id, search_document, updated_at, embedding)
      VALUES ($1, $2, $3, $4, $5, NULL)
      ON CONFLICT (dataset_id, agent_id) DO UPDATE SET
        chain_id = EXCLUDED.chain_id,
        search_document = EXCLUDED.search_document,
        updated_at = EXCLUDED.updated_at,
        embedding = CASE
          WHEN provider_search.search_document IS DISTINCT FROM EXCLUDED.search_document THEN NULL
          ELSE provider_search.embedding
        END
    `;
    for (const p of providers) {
      const doc = buildSearchDocument(p);
      await client.query(sql, [
        datasetId,
        p.agentId.toString(),
        p.chainId,
        doc,
        Date.now(),
      ]);
    }
    const agentIds = providers.map((p) => p.agentId.toString());
    if (agentIds.length === 0) {
      await client.query(`DELETE FROM provider_search WHERE dataset_id = $1`, [datasetId]);
    } else {
      await client.query(
        `DELETE FROM provider_search
         WHERE dataset_id = $1
           AND NOT (agent_id = ANY($2::text[]))`,
        [datasetId, agentIds]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function pgSearchIndexExists(indexPath: string): Promise<boolean> {
  const pool = getPgPool();
  await ensureMigrated(pool);
  const datasetId = getSearchDatasetId(indexPath);
  const r = await pool.query<{ n: string }>(
    "SELECT COUNT(*)::text AS n FROM provider_search WHERE dataset_id = $1",
    [datasetId]
  );
  const n = parseInt(r.rows[0]?.n ?? "0", 10);
  return n > 0;
}

export async function pgHasVectorIndex(indexPath: string): Promise<boolean> {
  const pool = getPgPool();
  await ensureMigrated(pool);
  const datasetId = getSearchDatasetId(indexPath);
  const r = await pool.query(
    `SELECT 1 FROM provider_search WHERE dataset_id = $1 AND embedding IS NOT NULL LIMIT 1`,
    [datasetId]
  );
  return r.rows.length > 0;
}

export async function pgSearchByCapability(
  indexPath: string,
  capability: string,
  providerIds?: Set<string>,
  limit = 50
): Promise<SearchResult> {
  const pool = getPgPool();
  await ensureMigrated(pool);
  const datasetId = getSearchDatasetId(indexPath);

  const lexicalRows = await pool.query<{ agent_id: string }>(
    `SELECT p.agent_id
     FROM provider_search p,
          plainto_tsquery('english', $2) q
     WHERE p.dataset_id = $1
       AND p.tsv @@ q
     ORDER BY ts_rank_cd(p.tsv, q) DESC
     LIMIT $3`,
    [datasetId, capability, LEXICAL_LIMIT]
  );
  const lexicalIds = lexicalRows.rows.map((r) => r.agent_id);

  const hasKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0);
  let vectorIds: string[] = [];
  if (hasKey) {
    try {
      const qvec = await embedQueryText(capability);
      const vecStr = vectorLiteral(qvec);
      const vectorRows = await pool.query<{ agent_id: string }>(
        `SELECT agent_id
         FROM provider_search
         WHERE dataset_id = $1 AND embedding IS NOT NULL
         ORDER BY embedding <=> $2::vector
         LIMIT $3`,
        [datasetId, vecStr, VECTOR_LIMIT]
      );
      vectorIds = vectorRows.rows.map((r) => r.agent_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[aep-index] hybrid vector search skipped (lexical only): ${msg}`);
      vectorIds = [];
    }
  }

  const lists: { id: string; rank: number }[][] = [];
  if (lexicalIds.length > 0) {
    lists.push(toRrfRanks(lexicalIds));
  }
  if (vectorIds.length > 0) {
    lists.push(toRrfRanks(vectorIds));
  }

  if (lists.length === 0) {
    return { agentIds: [], scores: [] };
  }

  const merged = mergeRrf(lists, RRF_K);
  const filter = (ids: { id: string; score: number }[]) =>
    providerIds ? ids.filter((x) => providerIds.has(x.id)) : ids;
  const filtered = filter(merged);
  const top = filtered.slice(0, limit);

  return {
    agentIds: top.map((x) => x.id),
    scores: top.map((x) => x.score),
  };
}

/**
 * Update embeddings for the given agent IDs (batch API).
 */
export async function updatePgEmbeddings(
  indexPath: string,
  agentIds: string[],
  vectors: number[][]
): Promise<void> {
  if (agentIds.length !== vectors.length) {
    throw new Error("agentIds and vectors length mismatch");
  }
  const pool = getPgPool();
  await ensureMigrated(pool);
  const datasetId = getSearchDatasetId(indexPath);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sql = `UPDATE provider_search SET embedding = $3::vector WHERE dataset_id = $1 AND agent_id = $2`;
    for (let i = 0; i < agentIds.length; i++) {
      await client.query(sql, [datasetId, agentIds[i], vectorLiteral(vectors[i]!)]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function writePgEmbeddings(
  indexPath: string,
  embeddings: Map<string, Float32Array>
): Promise<void> {
  const ids = [...embeddings.keys()];
  const vectors = ids.map((id) => [...embeddings.get(id)!]);
  await updatePgEmbeddings(indexPath, ids, vectors);
}
