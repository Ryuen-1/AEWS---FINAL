import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
const require = createRequire(new URL('../../frontend/package.json',import.meta.url))
const {Document,Packer,Paragraph}=require('docx')
await fs.writeFile(new URL('word-render-diagnostic.docx',import.meta.url),await Packer.toBuffer(new Document({sections:[{children:[new Paragraph('Word rendering diagnostic')]}]})))
