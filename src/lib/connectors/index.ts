import "server-only";
import { googleConnector } from "./google";
import { microsoftConnector } from "./microsoft";
import type { DocEditorConnector, DocEditorProvider } from "./types";

const CONNECTORS: Record<DocEditorProvider, DocEditorConnector> = {
  google: googleConnector,
  microsoft: microsoftConnector,
};

export function getConnector(provider: DocEditorProvider): DocEditorConnector {
  return CONNECTORS[provider];
}

export * from "./types";
