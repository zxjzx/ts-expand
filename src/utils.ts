import type {Program,SourceFile,Node} from "typescript"
import * as ts from "typescript";
import { resolve } from "path";
const {readConfigFile,sys,parseJsonConfigFileContent,createProgram : createProgramTs,getPositionOfLineAndCharacter} = ts;

import {getTypeInfoOfNode} from './api';
import {_localizeTypeInfo,getKind} from './api/localizedTree';

export type LocationType = {
    fileName:string;
    range:{start:{line:number,character:number}}
}

export function createProgram(tsconfigPath:string) {
    const configFile = readConfigFile(tsconfigPath, sys.readFile);
    if(typeof configFile.error !== "undefined") {
        throw new Error(`${configFile.error}`);
    }
    const {options,fileNames} = parseJsonConfigFileContent(configFile.config, {
        fileExists: sys.fileExists,
        readFile: sys.readFile,
        readDirectory: sys.readDirectory,
        useCaseSensitiveFileNames: sys.useCaseSensitiveFileNames,
    }, resolve(tsconfigPath,'..'));
        return createProgramTs({
        rootNames: fileNames,
        options
    })
}


export function getTypeFromPosition(program:Program,location: LocationType) {


    const sourceFile = program.getSourceFile(location?.fileName);
    if (!sourceFile) {
        if (location.fileName.endsWith('.ts') || location.fileName.endsWith('.tsx')) {
          throw new Error(`SourceFile not found: ${location.fileName}`)
        } else {
          throw new Error(`File extension is not supported: ${location.fileName}`)
        }
      }
    const pos = getPositionOfLineAndCharacter(sourceFile as SourceFile ,location.range.start.line,location.range.start.character)
    const maybeNode: any = getNodeFromPos(sourceFile,pos);
    return maybeNode
}

export function getProperties(program:Program,location:LocationType) {

   
    const ctx:any = getContext(program, location?.fileName);
    const typeChecker = ctx?.typeChecker;
   
    const maybeNode: any = getTypeFromPosition(ctx.program,location);

    const escapedName = typeChecker?.getSymbolAtLocation(maybeNode as any)?.getEscapedName();

    const refTypeInfo:any = getTypeInfoOfNode(ctx,maybeNode,{});

    // 只处理function
    if(refTypeInfo && refTypeInfo.kind === "function"){
        const signature = refTypeInfo.signatures[0];
        const info = signature.parameters[0];   
        const mapIndexInfo = (x: any): (any | undefined)[] => [
            x.type,
            x.keyType,
            x.parameterType,
        ]

        const all_properties = [
            ...info.properties,
            ...(info.indexInfos?.flatMap(mapIndexInfo) ?? []),
            info.objectClass,
        ]
        try {
            const _all_data = all_properties.map(item=>{
                if(!item) {
                    return null
                }
                return {
                    name: item?.symbolMeta?.name,
                    kind: item?.kind,
                    typeList: parsePropertyItem(item,ctx)
                }
            }).filter(item => item)

            const result = {
                propName: escapedName,
                props: _all_data
            }

            return result

        } catch (error) {
            console.log(error)
        }
        
    }
}

function parsePropertyItem(item:any,ctx?:any) {
    const _location = item?.symbolMeta?.declarations?.[0]?.location;
    if(item.kind === 'primitive') {
        return getKind(item);
    }
    if(item.kind === 'interface') {
        return item.properties.map((p:any) => ({
            name:p?.symbolMeta?.name,
            type:getKind(p) === 'union' ? parseLocation(ctx, p?.symbolMeta?.declarations?.[0]?.location) : getKind(p),
        }));
    }
    if(item.kind === 'object') {
        return item.properties.map((p:any) => ({
            name:p?.symbolMeta?.name,
            type:getKind(p),
        }));
        
    }

    if(item?.kind === 'union' || item.kind === 'reference') {
        return parseLocation(ctx,_location);
    }
    

    if(item.kind === 'array') {
        if(item.type.kind === 'reference') {
            return parseLocation(ctx,_location);
        }
        if(item.type.kind === 'object') {
            return item.type.properties.map((p:any) => ({
                name:p?.symbolMeta?.name,
                type:getKind(p),
            }));
        }
    }

}

function parseLocation(ctx:any,location:any) {
    if(!location?.fileName) {
        return null
    }
    const maybeNode = getTypeFromPosition(ctx.program,location)
    const refTypeInfo:any = getTypeInfoOfNode(ctx,maybeNode,{});
    if(refTypeInfo.kind === 'union'){
        return refTypeInfo.types.map((item:any)=>getKind(item));
    };
    if(refTypeInfo.kind === 'array'){
        return getKind(refTypeInfo.type);
    };
    return getKind(refTypeInfo)+'[]'
}

function getContext(program:Program,fileName:string) {
    if (!program)
        return undefined;
    const typeChecker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile)
        return undefined;
    return {
        program,
        typeChecker,
        sourceFile,
        ts
    };
}



function getNodeFromPos(
    sourceFile: SourceFile,
    pos: number,
  ): Node | undefined {
    let result: Node | undefined = undefined

    const getValidChildNodeRecursively = (node: Node): Node => {
      const validChild = node
        .getChildren()
        .find((childNode) => childNode.pos <= pos && pos <= childNode.end)

      if (!validChild) {
        return node
      }
      return getValidChildNodeRecursively(validChild)
    }

    sourceFile.forEachChild((node) => {
      if (node.pos <= pos && pos <= node.end) {
        result = getValidChildNodeRecursively(node)
      }
    })

    return result
  }