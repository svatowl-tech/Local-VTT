import {
  DetectedSourceFormat,
  UniversalParsedEntity,
  UniversalParseResult,
  NormalizedStats,
  NormalizedAction,
  NormalizedTrait,
} from '../../src/types/systemDataTypes';

export type {
  DetectedSourceFormat,
  UniversalParsedEntity,
  UniversalParseResult,
  NormalizedStats,
  NormalizedAction,
  NormalizedTrait,
};

export interface ParserInput {
  filename: string;
  rawBuffer?: Buffer;
  rawText?: string;
  parsedJson?: any;
  targetSystemId?: string;
  suggestedCategory?: string;
}

export interface IFormatParser {
  canParse(input: ParserInput): boolean;
  parse(input: ParserInput): Promise<UniversalParseResult> | UniversalParseResult;
}
