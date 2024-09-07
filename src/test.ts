import * as ts from "typescript";

function getContext(program: any, fileName: string) {
  if (!program) return undefined;
  const typeChecker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return undefined;
  return {
    program,
    typeChecker,
    sourceFile,
    ts,
  };
}

export function getProperties2(program: any, location: any) {
  const { sourceFile }: any = getContext(program, location?.fileName);
  // 查找 Button 组件的属性
  function visit(node: any) {
    if (ts.isImportDeclaration(node)) {
      const moduleName = node.moduleSpecifier
        .getText(sourceFile)
        .replace(/['"]/g, "");
      if (moduleName === "antd") {
        node.importClause?.namedBindings?.forEachChild((importSpecifier) => {
          if (ts.isImportSpecifier(importSpecifier)) {
            const importName = importSpecifier.name.getText(sourceFile);
            if (importName === "Button") {
              console.log("Found Button import");
            }
          }
        });
      }
    }

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    //   const tagName = node.openingElement.tagName.getText(sourceFile);
    //   if (tagName === "Button") {
    //     console.log("Found Button component");
    //     // Get the props from JSX attributes
    //     const openingElement:any = node.openingElement as any;
    //     openingElement.attributes.forEach((attribute:any) => {
    //       if (ts.isJsxAttribute(attribute)) {
    //         console.log(
    //           `Attribute: ${attribute.name.getText(
    //             sourceFile
    //           )} = ${attribute.initializer?.getText(sourceFile)}`
    //         );
    //       }
    //     });
    //   }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}
