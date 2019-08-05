import * as vscode from 'vscode';
import { InputBox } from 'vscode';
import * as fs from 'file-system';
import { promisify } from 'util';
import * as alphaSort from 'alpha-sort';
import translationMethods from '../helpers/saveMethod';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export const translate = vscode.commands.registerCommand('extension.translate', async () => {
    const config = vscode.workspace.getConfiguration('autoTranslatorExt');
    const translationFilePaths = config['translationFilePath'].split(';');
    let fileData: any[] = [];

    //Check if file exists
    translationFilePaths.forEach((translationFilePath: string) => {
        if(!doesFileExists(translationFilePath)){
            vscode.window.showErrorMessage("Provided translation file path is not correct! File does not exists!");
            return;
        }
    })


    fileData = await getFilesData(translationFilePaths);

    //Read translation key
    const translationKey: string|undefined = await getTranslationKey(fileData[0].translation);
    if(!translationKey){
        return;
    }

    //Check if translation key is unique
    if(!isThisKeyUnique(translationKey, fileData[0].translation)){
        vscode.window.showErrorMessage("Translation with this translation key already exists");
        return;
    }

    for(let item of fileData) {
        let translationValue = await askUser(`Provide translation value (${item.filePath})`);
        if(translationValue === undefined){
            return;
        }
        
        if(config['saveTranslationMethod'] === translationMethods.sortAlphabetically){
            await saveAndSort(translationKey, translationValue, item.translation, item.filePath);
            vscode.window.showInformationMessage(`Translation correctly saved ${item.filePath}`);
        } else if(config['saveTranslationMethod'] === translationMethods.saveAtTheEndOfFile){
            await saveAtTheEndOfFile(translationKey, translationValue, item.fileData, item.filePath);
            vscode.window.showInformationMessage(`Translation correctly saved ${item.filePath}`);
        } else if(config['saveTranslationMethod'] === translationMethods.saveInRightGroup){
            await saveAfterKey(translationKey, translationValue, item.fileData, item.filePath, getLastMostCommonProperty(translationKey, item.translation));
            vscode.window.showInformationMessage(`Translation correctly saved ${item.filePath}`);
        }
    };

    if(vscode.window.activeTextEditor){
        vscode.window.activeTextEditor.insertSnippet(new vscode.SnippetString(translationKey), vscode.window.activeTextEditor.selection.active);
    }
});

const getFilesData = async (filePaths: any[]) => {
    let promises: Promise<any>[] = [];
    filePaths.forEach((filePath: string) => {
        try{
            promises.push(new Promise((resolve, reject) => {
                readFile(filePath, 'utf-8').then((data: string) => {
                    resolve({
                        fileData: data,
                        translation: JSON.parse(data),
                        filePath: filePath
                    })
                })
            }))
        } catch(err) {
            throw err;
        }
    });
    return await Promise.all(promises);
}

const saveAfterKey = (key: string, value: string, translations: string, filePath: string, afterKey: string|undefined) => {
    return new Promise(async (resolve, reject) => {
        let lines = getLinesFromFile(translations);
        const indentation = getIndentation(lines);
        const lineNumber = afterKey!==undefined?getLineNumberOfKey(lines, afterKey):undefined;
        if(lineNumber !== undefined){
            lines = addCommaToPreviousLine(lineNumber, lines);
            lines.splice(lineNumber + 1, 0, indentation + '"' + key + '": "' + value + '"' + (isLastJsonLine(lineNumber, lines)?'':','));
        }
        else{
            lines = addCommaToPreviousLine(lines.indexOf("}"), lines);
            lines.splice(lines.indexOf('}'), 0, indentation + '"' + key + '": "' + value + '"');
        }
        
        const fileContent = lines.reduce((pv: string, cv: string) => {
            return pv + cv + '\n'
        }, '');
        try{
            await writeFile(filePath, fileContent);
            resolve();
        } catch(err) {
            reject();
            throw err;
        }
    });
}

const saveAtTheEndOfFile = (key: string, value: string, translations: string, filePath: string) => {
    return new Promise(async (resolve, reject) => {
        let lines = getLinesFromFile(translations);
        const indentation = getIndentation(lines);
        lines = addCommaToPreviousLine(lines.indexOf('}'), lines);
        lines.splice(lines.indexOf('}'), 0, indentation + '"' + key + '": "' + value + '"');
        const fileContent = lines.reduce((pv: string, cv: string) => {
            return pv + cv + '\n'
        }, '');
        try{
            await writeFile(filePath, fileContent);
            resolve();
        } catch(err){
            reject();
            throw err;
        }
    });
} 

const isLastJsonLine = (lineNumber: number, lines: string[]) => {
    for(let i = lineNumber + 1; i<lines.length; i++){
        if(isValidJsonLine(lines[i])){
            return false;
        }
    }
    return true;
}

const addCommaToPreviousLine = (lineNumber: number, lines: string[]) => {
    for(let i = lineNumber; i>=0; i--){
        if(isValidJsonLine(lines[i])){
            if(!lines[i].trim().endsWith(',')){
                lines[i] = lines[i] + ',';
            }
            return lines;
        }
    }
    return lines;
}

const getIndentation = (lines: string[]) => {
    for(let i = 0; i<lines.length; i++){
        if(isValidJsonLine(lines[i])){
            return lines[i].slice(0, lines[i].indexOf('"'));
        }
    }
    return '    ';
}

const getLineNumberOfKey = (lines: string[], key: string) =>{
    for(let i = 0; i<lines.length; i++){
        if(isValidJsonLine(lines[i])){ 
            if(extractTranslationKeyFromLine(lines[i]) === key){
                return i;
            }
        }
    }
    throw 'No matching translation key found';
}

const extractTranslationKeyFromLine = (line: string) => {
    line = line.trim();
    let key = line.split(':')[0];
    key = key.replace(new RegExp('"', 'g'), '');
    return key;
}

const getLinesFromFile = (fileData: string) => {
    return fileData.split('\n');
}

const isValidJsonLine = (line: string) => {
    line = line.trim();
    const pattern = new RegExp(/^"(.*)":\s"(.*)",?/g);
    return pattern.test(line);
}

const saveAndSort = (key: string, value: string, translations: any, filePath: string) => {
    return new Promise(async (resolve, reject) => {

        translations[key] = value;
        //Sort properties aplhabetically
        translations = sortPropertiesAlphabetically(translations);
        //Save file
        try{
            await writeFile(filePath, JSON.stringify(translations, null, 4));
            resolve();
        } catch(err) {
            reject();
            throw err;
        }

    });
}

const getLastMostCommonProperty = (translationKey: string, translations: any) => {
    const translationKeyParts = translationKey.split('.');
    if(translationKeyParts.length <= 1){
        return undefined;
    }
    const translationKeys = Object.keys(translations);
    let partsLevel = translationKeyParts.length - 1;
    let foundKeys: string[] = [];
    do{
        let lookingFor = '';
        for(let i = 0; i<partsLevel; i++){
            if(lookingFor !== ''){
                lookingFor = lookingFor + '.' + translationKeyParts[i];
            }
            else {
                lookingFor = translationKeyParts[i];
            }
        }
        foundKeys = translationKeys.filter(k => k.startsWith(lookingFor));
        partsLevel--;
    } while(partsLevel >= 1 && foundKeys.length === 0);
    if(foundKeys.length === 0){
        return undefined;
    }
    return foundKeys[foundKeys.length - 1];
}

const getTranslationKey = (translations: any): Promise<string|undefined> => {
    return new Promise((resolve: any, reject: any) => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Provide translation key';

        const items = Object.keys(translations).map((t: string) => ({label: t, exists: true}));
        const getFilteredItems = (value: string) => {
            return items.filter((item: any) => item.label.startsWith(value));
        }
    
        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve(!!quickPick.value?quickPick.value:undefined);
        });

        quickPick.items = [];
        quickPick.ignoreFocusOut = true;
    
        quickPick.onDidAccept(() => {
            if(items.findIndex(i => i.label === quickPick.value) === -1){
                quickPick.dispose();
            }
        });
    
        quickPick.onDidChangeSelection((selectedItems: any) => {
            quickPick.value = selectedItems[0].label;
            quickPick.items = getFilteredItems(selectedItems[0].label);
        });
        
        quickPick.onDidChangeValue((value: string) => {
            let filtereditems = getFilteredItems(value);
            if(filtereditems.findIndex(l => l.label === value) === -1){
                filtereditems = filtereditems.concat([{label: value, exists: false}]);
            }
    
            quickPick.items = filtereditems;
        });
        
        quickPick.show();
    })
}

const doesFileExists = (filePath: string): boolean => {
    return fs.existsSync(filePath);
}

const askUser = async (question: string): Promise<string|undefined> => {
     return await vscode.window.showInputBox({prompt: question});
}

const isThisKeyUnique = (key: string, object: object):boolean => {
    return Object.keys(object).indexOf(key) === -1;
}  

const sortPropertiesAlphabetically = (object: any):any => {
    const keys: string[] = Object.keys(object);
    keys.sort(alphaSort.ascending);
    const newObject: any = {};
    for(let key of keys){
        newObject[key] = object[key];
    }
    return newObject;
}