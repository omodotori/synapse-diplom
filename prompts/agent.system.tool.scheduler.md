### scheduler
manage saved tasks and schedules
rules:
- before `scheduler:create_*` or `scheduler:run_task`, inspect existing tasks with `scheduler:find_task_by_name` or `scheduler:list_tasks`
- do not manually run a task just because it is scheduled or planned unless user asks to run now
- do not create recursive task prompts that schedule more tasks
- if the user wants to receive results or notifications in the chat from a background task, you MUST explicitly instruct the background agent in the `prompt` to use the `notify_user` tool to send the result to the user. Also, instruct it to rely on its memory if tools are unavailable (e.g. `prompt`: "You already know many facts about space. Pick one from memory and send it via notify_user. Do NOT use search_engine."). Otherwise, the result will only be logged silently.
- tasks created with `dedicated_context=true` (the default) run in an isolated context and do NOT have access to manually enabled plugins like `search_engine`. Do not explicitly instruct the background agent to use tools that might be unavailable.
methods:
- `scheduler:list_tasks`: optional `state[]`, `type[]`, `next_run_within`, `next_run_after`
- `scheduler:find_task_by_name`: `name`
- `scheduler:show_task`: `uuid`
- `scheduler:run_task`: `uuid`, optional `context`
- `scheduler:delete_task`: `uuid`
- `scheduler:create_scheduled_task`: `name`, `system_prompt`, `prompt`, optional `attachments[]`, `schedule{minute,hour,day,month,weekday}`, optional `dedicated_context`. Use ONLY for recurring/periodic tasks.
- `scheduler:create_adhoc_task`: `name`, `system_prompt`, `prompt`, optional `attachments[]`, optional `dedicated_context`. Use for webhook-triggered tasks.
- `scheduler:create_planned_task`: `name`, `system_prompt`, `prompt`, optional `attachments[]`, `plan[]` iso datetimes like `2025-04-29T18:25:00`, optional `dedicated_context`. Use for ONE-OFF reminders or specific future dates instead of scheduled_task.
- `scheduler:wait_for_task`: `uuid`; works for dedicated-context tasks
example:
~~~json
{
  "thoughts": ["I should check for an existing task before I create or run anything."],
  "headline": "Looking up scheduled task",
  "tool_name": "scheduler:find_task_by_name",
  "tool_args": {
    "name": "daily backup"
  }
}
~~~
