import vine from '@vinejs/vine'

export const createTaskValidator = vine.create({
  title: vine.string().maxLength(255).regex(/\S/u),
})

const civilDate = vine.createRule((value, _options, field) => {
  if (typeof value !== 'string') return
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    field.report('Introduce una fecha válida en YYYY-MM-DD.', 'civilDate', field)
    return
  }
  const [, y, m, d] = match
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    field.report('Introduce un día de calendario válido.', 'civilDate', field)
  }
})

const date = () => vine.string().use(civilDate()).nullable()

export const updateDueDateValidator = vine.create({
  dueDate: date(),
  expectedDueDate: date(),
  expectedStatus: vine.enum(['pending', 'in_progress', 'done']),
})
