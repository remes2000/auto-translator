import { promisify } from 'util';
import * as lineReader from 'line-reader';
import * as insertLine from 'insert-line';
import * as fs from 'file-system';
import { resolve } from 'dns';

export class TranslationFile{
  private filePath: string;
  private jsonPropertyRegex = /"[^"\\]*"(?=\s*:)/g;

  constructor(filePath: string){
    this.filePath = filePath;

    if(!fs.existsSync(filePath)){
      throw new Error(`File ${filePath} does not exsists`);
    }
  }

  getSimilarKeys (key: string): Promise<string[]> {
    return new Promise((resolve: any, reject: any) => {
      const results: string[] = [];

      lineReader.eachLine(this.filePath, (line: string, last: boolean) => {
        const jsonProperties = this.getPropertiesFromLine(line);       
        jsonProperties.forEach(property => {
          if(property.indexOf(key) !== -1){
            results.push(property);
          }
        });
  
        if(last){
          resolve(results);
        }
      });
    });
  }

  propertyExsists (key: string): Promise<boolean> {
    return new Promise((resolve: any, reject: any) => {
      lineReader.eachLine(this.filePath, (line: string, last: boolean) => {
        const properties = this.getPropertiesFromLine(line);
        if(properties.indexOf(key) !== -1){
          resolve(true);
        }

        if(last){
          resolve(false);
        }
      });
    });
  }

  private getPropertiesFromLine(line: string): string[]{
    const jsonProperties = line.match(this.jsonPropertyRegex);
    if(jsonProperties){
      return jsonProperties.map(property => property.substring(1, property.length - 1));
    } else {
      return [];
    }
  }

  public saveTranslationInRightGroup(key: string, value: string){
    return new Promise((resolve: any, reject: any) => {
      const keyParts = key.split('.');

      let maxCommonParts = 0;
      let maxCommonPartsPropertyLine = '';
      let maxCommonPartsIndentationPrefix = '';
      let maxCommonPartsLineNumber = 0;
      let maxCommonPartsCommaColumn = 0;
      let lineNumber = 1;
  
      lineReader.eachLine(this.filePath, (line: string, last: boolean) => {
  
        const properties = this.getPropertiesFromLine(line);
        for(let property of properties){
          const propertyParts = property.split('.');
          let commonParts = 0;
  
          for(let i = 0; i < Math.min(propertyParts.length, keyParts.length); i++){
            if(propertyParts[i] === keyParts[i]){
              commonParts += 1;
            }
          }
  
          if(commonParts >= maxCommonParts){
            maxCommonParts = commonParts;
            maxCommonPartsPropertyLine = line;
            maxCommonPartsLineNumber = lineNumber;
            maxCommonPartsCommaColumn = this.getPropertyCommaColumn(line, property);
            maxCommonPartsIndentationPrefix = line.substring(0, line.indexOf('"'));
          }
        }
  
        const newLine = '\n';
        if(last){
          const attributeToInsert = this.getJsonAttribute(key, value, this.isLastSymbolComma(maxCommonPartsPropertyLine, maxCommonPartsCommaColumn));
          let lineReplacement = maxCommonPartsPropertyLine;
          lineReplacement += this.isLastSymbolComma(maxCommonPartsPropertyLine, maxCommonPartsCommaColumn)?'':',';
          lineReplacement += newLine;
          lineReplacement += maxCommonPartsIndentationPrefix;
          lineReplacement += attributeToInsert;
          insertLine(this.filePath).content(lineReplacement, {overwrite: true}).at(maxCommonPartsLineNumber).then(() => {
            resolve(true);
          });
        }
  
        lineNumber += 1;
      });
    });
  }

  private isLastSymbolComma(line: string, commaColumn: number){
    if(commaColumn < 0 || commaColumn >= line.length){
      return false;
    }

    return line[commaColumn] === ',';
  }

  public getPropertyCommaColumn(line: string, property: string){
    const propertyStartIndex = line.indexOf(property) - 1;
    const nearestCommaIndex = line.substring(propertyStartIndex).indexOf(',');

    if(nearestCommaIndex === -1){
      return -1;
    }

    return propertyStartIndex + nearestCommaIndex;
  }

  public getJsonAttribute(key: string, value: string, endWithComma: boolean){
    return `"${key}": "${value}"${endWithComma?',':''}`;
  }

  public getPath() {
    return this.filePath;
  }

  public getFilename(){
    return this.filePath.replace(/^.*[\\\/]/, '');
  }
}