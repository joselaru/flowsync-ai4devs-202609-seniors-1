import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tasks', (table) => {
      table.text('due_date').nullable()
    })
  }

  async down() {
    this.schema.alterTable('tasks', (table) => {
      table.dropColumn('due_date')
    })
  }
}
