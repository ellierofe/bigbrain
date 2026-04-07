import { FalkorDB } from "falkordb"

let client: FalkorDB | null = null

export async function getGraphClient(): Promise<FalkorDB> {
  if (client) return client

  client = await FalkorDB.connect({
    username: process.env.FALKORDB_USERNAME!,
    password: process.env.FALKORDB_PASSWORD!,
    socket: {
      host: process.env.FALKORDB_HOST!,
      port: parseInt(process.env.FALKORDB_PORT!),
    },
  })

  return client
}

export function getGraph(graphName: string) {
  if (!client) throw new Error("Graph client not initialised — call getGraphClient() first")
  return client.selectGraph(graphName)
}

export const GRAPH_NAME = "bigbrain"
