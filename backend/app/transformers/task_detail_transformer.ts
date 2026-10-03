import TaskTransformer from '#transformers/task_transformer'

export default class TaskDetailTransformer extends TaskTransformer {
  toObject() {
    return { ...super.toObject(), dueDate: this.resource.dueDate }
  }
}
