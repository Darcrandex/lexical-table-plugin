import { EditorConfig, ElementNode, LexicalEditor, LexicalNode } from 'lexical'
import './styles.css'

export class SubfieldItemNode extends ElementNode {
  static getType() {
    return 'subfield-item-node'
  }

  static clone(_data: unknown): LexicalNode {
    return new SubfieldItemNode()
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const el = document.createElement('div')
    el.classList.add('subfield-item-node')

    const toolbar = document.createElement('div')
    toolbar.classList.add('subfield-item-toolbar')
    toolbar.appendChild(document.createTextNode('删除分栏'))
    toolbar.addEventListener('click', () => {
      _editor.update(() => {
        console.log('删除分栏')
        this.remove()
      })
    })

    el.appendChild(toolbar)

    return el
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, _config: EditorConfig): boolean {
    return false
  }

  static importJSON() {
    return new SubfieldItemNode()
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'subfield-item-node',
      version: 1,
    }
  }
}

export function $createSubfieldItemNode() {
  return new SubfieldItemNode()
}
