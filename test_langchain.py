import os
import sys

# Add the main project directory to the python path
sys.path.append(os.path.abspath('.'))

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage

system_text = """
- `scheduler:create_scheduled_task`: `name`, `system_prompt`, `prompt`, optional `attachments[]`, `schedule{minute,hour,day,month,weekday}`, optional `dedicated_context`. Use ONLY for recurring/periodic tasks.

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
"""
full_prompt = [SystemMessage(content=system_text)]
try:
    full_text = ChatPromptTemplate.from_messages(full_prompt).format()
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
