import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import {
  ParserInput,
  UniversalParseResult,
  UniversalParsedEntity,
  IFormatParser,
} from './types';
import { FormatDetector } from './formatDetector';
import { FoundryParser } from './foundryParser';
import { Roll20Parser } from './roll20Parser';
import { FiveToolsParser } from './fiveToolsParser';
import { PdfParser } from './pdfParser';
import { TextStatblockParser } from './textStatblockParser';
import { XmlYamlCsvParser } from './xmlYamlCsvParser';
import { CodeQualityDetector } from './codeQualityDetector';

export class UniversalParserEngine {
  private foundryParser = new FoundryParser();
  private roll20Parser = new Roll20Parser();
  private fiveToolsParser = new FiveToolsParser();
  private pdfParser = new PdfParser();
  private textParser = new TextStatblockParser();
  private xmlYamlCsvParser = new XmlYamlCsvParser();

  /**
   * Parses any given file / buffer / text into normalized TTRPG entities
   */
  public async parseInput(input: ParserInput): Promise<UniversalParseResult> {
    const ext = path.extname(input.filename || '').toLowerCase();
    if ((ext === '.yaml' || ext === '.yml') && !input.parsedJson && input.rawText) {
      try {
        input.parsedJson = YAML.parse(input.rawText);
      } catch (err) {
        // ignore parsing errors and let fallback parser handle them
      }
    }

    const detected = FormatDetector.detect(input);
    let rawResult: UniversalParseResult;

    // 1. PDF
    if (detected === 'pdf_document' || this.pdfParser.canParse(input)) {
      rawResult = await this.pdfParser.parse(input);
    }
    // 2. 5eTools, JSON & YAML Rules / Compendiums
    else if (
      detected === '5etools_monster' ||
      detected === '5etools_spell' ||
      detected === '5etools_item' ||
      detected === '5etools_compendium' ||
      detected === 'generic_json'
    ) {
      const res = this.fiveToolsParser.parse(input);
      if (res.success && res.entities.length > 0) {
        rawResult = res;
      } else {
        rawResult = this.textParser.parse(input);
      }
    }
    // 3. Foundry VTT
    else if (
      detected === 'foundry_actor' ||
      detected === 'foundry_item' ||
      detected === 'foundry_journal' ||
      detected === 'foundry_rolltable' ||
      detected === 'foundry_compendium' ||
      this.foundryParser.canParse(input)
    ) {
      rawResult = this.foundryParser.parse(input);
    }
    // 4. Roll20
    else if (detected === 'roll20_character' || detected === 'roll20_handout' || this.roll20Parser.canParse(input)) {
      rawResult = this.roll20Parser.parse(input);
    }
    // 5. XML / YAML / CSV
    else if (
      detected === 'xml_export' ||
      detected === 'csv_table' ||
      detected === 'gurps_gcs' ||
      this.xmlYamlCsvParser.canParse(input)
    ) {
      rawResult = this.xmlYamlCsvParser.parse(input);
    }
    // 6. Generic JSON / 5eTools Fallback
    else if (this.fiveToolsParser.canParse(input)) {
      const res = this.fiveToolsParser.parse(input);
      if (res.success && res.entities.length > 0) {
        rawResult = res;
      } else {
        rawResult = this.textParser.parse(input);
      }
    }
    // 7. Plain Text / Markdown / Generic JSON fallback
    else {
      rawResult = this.textParser.parse(input);
    }

    // Run Code Quality Detector to verify no raw unparsed code dumps exist
    return CodeQualityDetector.evaluateAndFix(rawResult, input.filename, input.targetSystemId);
  }

  /**
   * Imports and writes parsed entities directly into the target system folder on disk
   */
  public importEntitiesToSystem(
    systemsRoot: string,
    systemId: string,
    entities: UniversalParsedEntity[]
  ): {
    importedCount: number;
    savedFiles: Array<{ filename: string; category: string; relativePath: string }>;
    errors: string[];
  } {
    const savedFiles: Array<{ filename: string; category: string; relativePath: string }> = [];
    const errors: string[] = [];
    let importedCount = 0;

    // Find system directory
    const sysEntries = fs.readdirSync(systemsRoot, { withFileTypes: true });
    let targetDirName = systemId;
    for (const ent of sysEntries) {
      if (ent.isDirectory() && ent.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === systemId.toLowerCase()) {
        targetDirName = ent.name;
        break;
      }
    }

    const sysDir = path.join(systemsRoot, targetDirName);
    if (!fs.existsSync(sysDir)) {
      fs.mkdirSync(sysDir, { recursive: true });
    }

    for (const entity of entities) {
      try {
        const category = (entity.category || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const catDir = path.join(sysDir, category);
        if (!fs.existsSync(catDir)) {
          fs.mkdirSync(catDir, { recursive: true });
        }

        const safeFilename = (entity.suggestedFilename || `${entity.id}.json`).replace(
          /[^a-zA-Z0-9_.\u0400-\u04FF-]/g,
          '_'
        );
        const targetFilePath = path.join(catDir, safeFilename);

        let fileContent = '';
        if (safeFilename.endsWith('.md') || safeFilename.endsWith('.txt')) {
          fileContent = entity.description || entity.summary || JSON.stringify(entity.rawContent || entity, null, 2);
        } else {
          // Standard JSON payload
          const jsonPayload = {
            id: entity.id,
            name: entity.name,
            originalName: entity.originalName,
            category: entity.category,
            sourceFormat: entity.sourceFormat,
            sourceSystem: entity.sourceSystem || systemId,
            summary: entity.summary,
            description: entity.description,
            tags: entity.tags,
            stats: entity.stats,
            actions: entity.actions,
            traits: entity.traits,
            spells: entity.spells,
            items: entity.items,
            tableData: entity.tableData,
            pdfSource: entity.pdfSource,
            data: entity.rawContent,
          };
          fileContent = JSON.stringify(jsonPayload, null, 2);
        }

        fs.writeFileSync(targetFilePath, fileContent, 'utf8');
        savedFiles.push({
          filename: safeFilename,
          category,
          relativePath: `${targetDirName}/${category}/${safeFilename}`,
        });
        importedCount++;
      } catch (err: any) {
        errors.push(`Не удалось сохранить сущность «${entity.name}»: ${err?.message || err}`);
      }
    }

    return {
      importedCount,
      savedFiles,
      errors,
    };
  }
}

export const universalParserEngine = new UniversalParserEngine();
