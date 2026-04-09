import fr      from './fr'
import en      from './en'
import { makeT } from '../../../i18n'

// Page-scoped translator — used via useLocale(pageT) in Login.jsx
export const t = makeT({ fr, en })
