import * as vscode from 'vscode';
import { InputBox } from 'vscode';
import * as fs from 'file-system';
import { promisify } from 'util';
import * as alphaSort from 'alpha-sort';
import translationMethods from '../helpers/saveMethod';
import { InputUtils } from '../utils/input-utils';
import { TranslationFile } from '../utils/translation-file';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

class TranslateCommand{
    config: vscode.WorkspaceConfiguration;
    inputUtils: InputUtils;
    files: TranslationFile[] = [];
    translationValues: Map<string, string> = new Map();
    translationKey: string = '';
    saveTranslation: any;
    
    constructor(config: vscode.WorkspaceConfiguration){
        this.config = config;
        this.inputUtils = new InputUtils();
        this.loadTranslationFiles();

        if(!this.files || this.files.length === 0){
            throw new Error('No translation files provided.');
        }

        if(this.config['saveTranslationMethod'] === translationMethods.sortAlphabetically){
            throw new Error(`${translationMethods.sortAlphabetically} is not yet implemented, switch to ${translationMethods.saveInRightGroup}`);
        } else if(this.config['saveTranslationMethod'] === translationMethods.saveAtTheEndOfFile){
            throw new Error(`${translationMethods.saveAtTheEndOfFile} is not yet implemented, switch to ${translationMethods.saveInRightGroup}`);
        } else {
            this.saveTranslation = this.saveTranslationInRightGroup;
        }
    }

    public async run() {
        const mainTranslationFile: TranslationFile = this.files[0];
        this.translationKey = await this.inputUtils.getTranslationKey(mainTranslationFile).catch();
        if(!this.translationKey){ return; }
        try{
            await this.checkIfTranslationKeyIsUnusedInEveryFile();
            await this.generateTranslationValuesMap();
            await this.saveTranslation();
        } catch (e){
            vscode.window.showErrorMessage(e.message);
        }
    }

    public loadTranslationFiles(){
        const translationFilePaths = this.config['translationFilePath'].split(';');
        translationFilePaths.forEach((path: string) => this.files.push(new TranslationFile(path)));
    }

    public async checkIfTranslationKeyIsUnusedInEveryFile(){
        for(let file of this.files){
            if(await file.propertyExsists(this.translationKey)){
                throw new Error(`Property ${this.translationKey} already exsists in file ${file.getPath()}`);
            }
        }
    }

    public async generateTranslationValuesMap(){
        for(let file of this.files){
            const question = `Provide translation for: ${file.getFilename()} [ ${file.getPath()} ]`;
            const value = await this.inputUtils.getTextValueFromUser(question);
            if(value === undefined){
                this.translationValues.set(file.getPath(), "");
            } else {
                this.translationValues.set(file.getPath(), value as string);
            }
        }
    }

    public async saveTranslationInRightGroup(){
        for(let file of this.files){
            await file.saveTranslationInRightGroup(this.translationKey, this.translationValues.get(file.getPath()) as string);
        }
    }
}

export const translate = vscode.commands.registerCommand('extension.translate', async () => {
    try{
        const translateCommand: TranslateCommand = new TranslateCommand(vscode.workspace.getConfiguration('autoTranslatorExt'));
        translateCommand.run();
    } catch (e){
        vscode.window.showErrorMessage(e.message);
    }
});