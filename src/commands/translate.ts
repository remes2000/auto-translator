import * as vscode from 'vscode';
import { InputBox } from 'vscode';
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

    //Read translation key
    const translationKey: string|undefined = await getTranslationKey(translations);
    if(!translationKey){
        return;
    }

    //Check if translation key is unique
    if(!isThisKeyUnique(translationKey, translations)){
        vscode.window.showErrorMessage("Translation with this translation key already exists");
        return;
    }

    //Read translation value
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