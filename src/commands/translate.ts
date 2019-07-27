import * as vscode from 'vscode';
import * as fs from 'file-system';
import { promisify } from 'util';
import * as alphaSort from 'alpha-sort';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export const translate = vscode.commands.registerCommand('extension.translate', async () => {
    const config = vscode.workspace.getConfiguration('autoTranslatorExt');
    const translationFilePath = config['translationFilePath'];
    let translations = null;

    //Check if file exists
    if(!doesFileExists(translationFilePath)){
        vscode.window.showErrorMessage("Provided translation file path is not correct! File does not exists!");
        return;
    }
    //Parse file content to javascript object
    try{
        const data = await readFile(translationFilePath, "utf-8");
        translations = JSON.parse(data);
    } catch(err) {
        throw err;
    }

    //Read input 
    const translationKey = await askUser("Provide translation key");
    if(!translationKey){
        return;
    }
    //Check if translation key is unique
    if(!isThisKeyUnique(translationKey, translations)){
        vscode.window.showErrorMessage("Translation with this translation key already exists");
        return;
    }

    const translationValue = await askUser("Provide translation value");
    if(!translationValue){
        return;
    }
 
    //Add new property and value to object
    translations[translationKey] = translationValue;

    //Sort properties aplhabetically
    translations = sortPropertiesAlphabetically(translations);
    
    //Save file
    try{
        await writeFile(translationFilePath, JSON.stringify(translations, null, 4));
    } catch(err) {
        throw err;
    }

    vscode.window.showInformationMessage("Translation correctly saved!");
});

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