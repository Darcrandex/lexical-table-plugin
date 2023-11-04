import { EditorConfig, ElementNode, LexicalEditor, LexicalNode } from 'lexical'

export class SubfieldNode extends ElementNode {
  static getType() {
    return 'subfield-node'
  }

  static clone(_data: unknown): LexicalNode {
    return new SubfieldNode()
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const el = document.createElement('section')
    // 这里使用了 tailwind
    // 但不确定打包之后行不行
    el.classList.add('subfield-node', 'flex', 'bg-blue-200', 'p-4', 'border', 'space-x-4')

    return el
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, _config: EditorConfig): boolean {
    return false
  }

  static importJSON() {
    return new SubfieldNode()
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'subfield-node',
      version: 1,
    }
  }

  canExtractContents() {
    return false
  }

  canBeEmpty() {
    return false
  }

  isShadowRoot() {
    return true
  }
}

export function $createSubfieldNode(): SubfieldNode {
  return new SubfieldNode()
}
